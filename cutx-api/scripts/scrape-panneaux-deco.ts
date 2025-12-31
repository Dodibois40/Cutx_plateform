/**
 * Scraping Panneaux Deco B comme Bois
 *
 * Source: https://www.bcommebois.fr/agencement/panneaux-deco.html
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: ./scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr avec son compte
 * 3. Lancer: npx tsx scripts/scrape-panneaux-deco.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Configuration Firebase (optionnel - pour upload des images)
let bucket: any = null;
const FIREBASE_ENABLED = false; // Mettre à true si Firebase configuré

// URL de la catégorie principale
const MAIN_CATEGORY_URL = 'https://www.bcommebois.fr/agencement/panneaux-deco.html';

// Sous-catégories à scraper (à adapter selon la structure du site)
const CATEGORIES = [
  {
    name: 'Panneaux Déco',
    slug: 'panneaux-deco',
    url: 'https://www.bcommebois.fr/agencement/panneaux-deco.html'
  },
  // Les sous-catégories seront découvertes automatiquement ou ajoutées ici
];

interface Variante {
  longueur: number;   // en mm
  largeur: number;    // en mm
  epaisseur: number;  // en mm
  code: string;
  stock: string;
  prix: number | null;
}

interface ProduitComplet {
  nom: string;
  type: string;
  marque: string;
  finish: string | null;
  colorCode: string | null;
  imageUrl: string | null;
  variantes: Variante[];
}

/**
 * Scroll jusqu'en bas de la page pour charger le lazy loading
 */
async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * Récupère tous les liens produits d'une page catégorie
 */
async function getProductLinksFromPage(page: Page, url: string): Promise<string[]> {
  console.log(`\n📋 Chargement de: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout de navigation, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 3000));

  // Scroll pour charger tous les produits
  console.log('   📜 Scroll pour charger tous les produits...');
  try {
    await scrollToBottom(page);
  } catch (e) {
    console.log(`   ⚠️ Erreur de scroll, on continue...`);
  }

  // Récupérer les liens produits
  const productLinks = await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll('a').forEach((el) => {
      const href = el.href;
      if (!href || href.includes('#')) return;

      try {
        const urlObj = new URL(href);
        if (urlObj.hostname !== 'www.bcommebois.fr') return;

        const pathParts = urlObj.pathname.split('/').filter((p) => p);
        // Les produits ont un format /xxxxx.html (5-6 chiffres)
        if (pathParts.length === 1 && pathParts[0].endsWith('.html')) {
          const excluded = [
            'agencement.html', 'sols-murs.html', 'bardage.html',
            'terrasse-exterieurs.html', 'menuiserie.html', 'bois-massif.html',
            'structure-charpente.html', 'isolation-etancheite.html',
            'libre-service.html', 'contact.html', 'panier.html',
            'connexion.html', 'inscription.html', 'deconnexion.html',
            'panneaux-deco.html' // Exclure la page catégorie elle-même
          ];
          if (!excluded.includes(pathParts[0]) && !links.includes(href)) {
            links.push(href);
          }
        }
      } catch (e) {}
    });
    return links;
  });

  console.log(`   ✅ ${productLinks.length} liens produits trouvés`);
  return productLinks;
}

/**
 * Découvre les sous-catégories d'une page
 */
async function discoverSubcategories(page: Page, url: string): Promise<Array<{name: string, url: string}>> {
  console.log(`\n🔍 Recherche des sous-catégories...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 2000));

  const subcategories = await page.evaluate(() => {
    const cats: Array<{name: string, url: string}> = [];

    // Chercher les liens de sous-catégories
    const categorySelectors = [
      '.category-list a',
      '.subcategory a',
      '.categories a',
      'nav.categories a',
      '.block-category-list a'
    ];

    for (const sel of categorySelectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        const name = el.textContent?.trim() || '';
        if (href && name && href.includes('panneaux-deco') && !cats.some(c => c.url === href)) {
          cats.push({ name, url: href });
        }
      });
    }

    return cats;
  });

  console.log(`   📂 ${subcategories.length} sous-catégories trouvées`);
  return subcategories;
}

/**
 * Scrape les données d'un produit avec toutes ses variantes
 */
async function scrapeProductWithVariantes(page: Page, url: string): Promise<ProduitComplet | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      // Nom du produit
      const nomEl = document.querySelector('h1.page-title span, h1.product-name, .product-info-main h1 span');
      const nom = nomEl?.textContent?.trim() || '';

      // Déterminer le type/marque depuis le nom
      let type = 'Panneau déco';
      let marque = 'B comme Bois';
      let finish: string | null = null;
      let colorCode: string | null = null;

      const nomLower = nom.toLowerCase();

      // Détecter la marque
      if (nomLower.includes('egger')) marque = 'Egger';
      else if (nomLower.includes('formica')) marque = 'Formica';
      else if (nomLower.includes('polyrey')) marque = 'Polyrey';
      else if (nomLower.includes('pfleiderer')) marque = 'Pfleiderer';
      else if (nomLower.includes('unilin') || nomLower.includes('kronospan')) marque = 'Unilin';
      else if (nomLower.includes('fenix')) marque = 'Fenix';
      else if (nomLower.includes('abet')) marque = 'Abet Laminati';

      // Détecter le type de panneau
      if (nomLower.includes('stratifié') || nomLower.includes('stratifie') || nomLower.includes('hpl')) type = 'Stratifié HPL';
      else if (nomLower.includes('mélaminé') || nomLower.includes('melamine')) type = 'Mélaminé';
      else if (nomLower.includes('compact')) type = 'Compact';
      else if (nomLower.includes('chant')) type = 'Chant';
      else if (nomLower.includes('mdf')) type = 'MDF';

      // Détecter la finition
      if (nomLower.includes('mat')) finish = 'Mat';
      else if (nomLower.includes('brillant') || nomLower.includes('gloss')) finish = 'Brillant';
      else if (nomLower.includes('satiné') || nomLower.includes('satine')) finish = 'Satiné';
      else if (nomLower.includes('texturé') || nomLower.includes('texture')) finish = 'Texturé';
      else if (nomLower.includes('soft') || nomLower.includes('soft touch')) finish = 'Soft Touch';

      // Chercher le code couleur dans le nom (ex: U999, W1000, etc.)
      const colorMatch = nom.match(/\b([A-Z]\d{3,4})\b/);
      if (colorMatch) colorCode = colorMatch[1];

      // Image
      let imageUrl = '';
      const imgSelectors = [
        '.fotorama__stage__frame img',
        '.fotorama__img',
        '.gallery-placeholder img',
        '.product-image-container img',
        'img.gallery-placeholder__image'
      ];
      for (const sel of imgSelectors) {
        const img = document.querySelector(sel) as HTMLImageElement;
        if (img) {
          const src = img.src || img.getAttribute('data-src');
          if (src && src.includes('bcommebois') && !src.includes('placeholder')) {
            imageUrl = src;
            break;
          }
        }
      }
      // Fallback: meta og:image
      if (!imageUrl) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          const content = ogImage.getAttribute('content');
          if (content && content.includes('bcommebois')) {
            imageUrl = content;
          }
        }
      }

      // Parser le tableau des variantes
      const variantes: Array<{
        longueur: number;
        largeur: number;
        epaisseur: number;
        code: string;
        stock: string;
        prix: number | null;
      }> = [];

      // Chercher le tableau des déclinaisons
      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr, tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

            let longueur = 0, largeur = 0, epaisseur = 0, code = '', stock = '', prix: number | null = null;

            for (let i = 0; i < cellTexts.length; i++) {
              const text = cellTexts[i];
              const numMatch = text.match(/[\d.,]+/);

              if (i === 0 && numMatch) {
                // Longueur (peut être en mètres ou mm)
                const val = parseFloat(numMatch[0].replace(',', '.'));
                longueur = val < 100 ? Math.round(val * 1000) : Math.round(val);
              } else if (i === 1 && numMatch) {
                // Largeur
                const val = parseFloat(numMatch[0].replace(',', '.'));
                largeur = val < 100 ? Math.round(val * 1000) : Math.round(val);
              } else if (i === 2 && numMatch) {
                // Épaisseur (en mm)
                epaisseur = parseFloat(numMatch[0].replace(',', '.'));
              } else if (i === 3 && /^\d{4,6}$/.test(text.replace(/\s/g, ''))) {
                // Code article (5-6 chiffres)
                code = text.replace(/\s/g, '');
              } else if (text.toLowerCase().includes('stock') || text.toLowerCase().includes('commande')) {
                // Stock
                stock = text.includes('EN STOCK') || text.toLowerCase().includes('en stock')
                  ? 'EN STOCK'
                  : 'Sur commande';
              } else if (text.includes('€') || text.includes('EUR')) {
                // Prix
                const priceMatch = text.match(/[\d.,]+/);
                if (priceMatch) {
                  prix = parseFloat(priceMatch[0].replace(',', '.'));
                }
              }
            }

            // Si pas de code trouvé, chercher dans toutes les cellules
            if (!code) {
              for (const text of cellTexts) {
                const codeMatch = text.match(/\b(\d{4,6})\b/);
                if (codeMatch) {
                  code = codeMatch[1];
                  break;
                }
              }
            }

            if (code && (longueur > 0 || epaisseur > 0)) {
              variantes.push({ longueur, largeur, epaisseur, code, stock, prix });
            }
          }
        }
      }

      // Si pas de tableau, récupérer depuis la page produit simple
      if (variantes.length === 0) {
        // Référence
        let code = '';
        const refEl = document.querySelector('.product.attribute.sku .value, [itemprop="sku"], .sku .value');
        if (refEl?.textContent) {
          const refMatch = refEl.textContent.trim().match(/(\d{5,6})/);
          if (refMatch) code = refMatch[1];
        }
        if (!code) {
          const refTextMatch = document.body.innerText.match(/R[ÉE]F\.?\s*:?\s*(\d{5,6})/i);
          if (refTextMatch) code = refTextMatch[1];
        }

        // Prix
        let prix: number | null = null;
        const priceSelectors = [
          '[data-price-type="finalPrice"] .price',
          '.price-box .price',
          '.product-info-price .price',
          '.price-wrapper .price',
          'span.price'
        ];
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent) {
            const priceText = el.textContent.trim().replace(/[^\d,\.]/g, '').replace(',', '.');
            const parsed = parseFloat(priceText);
            if (parsed > 0) {
              prix = parsed;
              break;
            }
          }
        }

        // Stock
        let stock = 'Sur commande';
        const stockEl = document.querySelector('.stock.available, .availability, [title="Disponibilité"]');
        if (stockEl?.textContent?.toLowerCase().includes('stock')) {
          stock = 'EN STOCK';
        }
        if (stock === 'Sur commande' && document.body.innerText.includes('EN STOCK')) {
          stock = 'EN STOCK';
        }

        // Dimensions depuis le nom
        let epaisseur = 0, largeur = 0, longueur = 0;
        let dimMatch = nom.match(/(\d+)\s*mm\s+(\d+)\s*x\s*(\d+)/i);
        if (dimMatch) {
          epaisseur = parseInt(dimMatch[1]);
          longueur = parseInt(dimMatch[2]);
          largeur = parseInt(dimMatch[3]);
        }

        if (!epaisseur) {
          const epMatch = nom.match(/(\d+)\s*mm\b/);
          const lwMatch = nom.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
          if (epMatch) epaisseur = parseInt(epMatch[1]);
          if (lwMatch) {
            longueur = parseInt(lwMatch[1]);
            largeur = parseInt(lwMatch[2]);
          }
        }

        if (code || epaisseur > 0 || longueur > 0) {
          variantes.push({
            longueur,
            largeur,
            epaisseur,
            code: code || `REF-${Date.now()}`,
            stock,
            prix
          });
        }
      }

      return { nom, type, marque, finish, colorCode, imageUrl, variantes };
    });

    if (!data.nom) {
      console.log(`      ❌ Pas de nom trouvé`);
      return null;
    }

    return {
      nom: data.nom,
      type: data.type,
      marque: data.marque,
      finish: data.finish,
      colorCode: data.colorCode,
      imageUrl: data.imageUrl,
      variantes: data.variantes
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🎨 SCRAPING PANNEAUX DECO B COMME BOIS');
  console.log('======================================\n');

  // Connexion au navigateur Chrome (doit être lancé avec --remote-debugging-port=9222)
  console.log('🔌 Connexion à Chrome...');
  console.log('   (Assurez-vous que Chrome est lancé avec launch-chrome-debug.bat)\n');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez d\'abord: scripts/launch-chrome-debug.bat');
    console.error('   Puis connectez-vous sur bcommebois.fr');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté à Chrome!\n');

  // 1. Créer ou récupérer le catalogue B comme Bois
  console.log('📦 Création/récupération du catalogue...');
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: 'bcommebois' },
    update: {
      name: 'B comme Bois',
      description: 'Catalogue B comme Bois - Panneaux Déco',
      isActive: true
    },
    create: {
      name: 'B comme Bois',
      slug: 'bcommebois',
      description: 'Catalogue B comme Bois - Panneaux Déco',
      isActive: true
    }
  });
  console.log(`   ✅ Catalogue: ${catalogue.name} (${catalogue.id})\n`);

  // 2. Créer la catégorie Panneaux Déco
  const category = await prisma.category.upsert({
    where: {
      catalogueId_slug: { catalogueId: catalogue.id, slug: 'panneaux-deco' }
    },
    update: { name: 'Panneaux Déco' },
    create: {
      name: 'Panneaux Déco',
      slug: 'panneaux-deco',
      catalogueId: catalogue.id
    }
  });
  console.log(`   📂 Catégorie: ${category.name}\n`);

  // 3. Découvrir les sous-catégories (optionnel)
  const subcategories = await discoverSubcategories(page, MAIN_CATEGORY_URL);

  // 4. Collecter tous les liens produits
  const allProductLinks: Map<string, string> = new Map();

  // D'abord depuis la page principale
  console.log(`\n📂 Catégorie principale: Panneaux Déco`);
  const mainLinks = await getProductLinksFromPage(page, MAIN_CATEGORY_URL);
  for (const link of mainLinks) {
    allProductLinks.set(link, 'Panneaux Déco');
  }

  // Puis depuis les sous-catégories découvertes
  for (const subcat of subcategories) {
    console.log(`\n📂 Sous-catégorie: ${subcat.name}`);
    const links = await getProductLinksFromPage(page, subcat.url);
    for (const link of links) {
      if (!allProductLinks.has(link)) {
        allProductLinks.set(link, subcat.name);
      }
    }
  }

  console.log(`\n\n📊 TOTAL: ${allProductLinks.size} produits uniques à scraper`);
  console.log('================================================\n');

  // 5. Scraper chaque produit
  let count = 0;
  let totalVariantes = 0;
  let created = 0;
  let skipped = 0;

  for (const [url, subcategoryName] of allProductLinks) {
    count++;
    const filename = url.split('/').pop() || url;
    console.log(`\n[${count}/${allProductLinks.size}] ${filename}`);

    const product = await scrapeProductWithVariantes(page, url);

    if (product && product.variantes.length > 0) {
      console.log(`   📦 ${product.nom.substring(0, 50)}...`);
      console.log(`   🏷️  Type: ${product.type} | Marque: ${product.marque}`);
      console.log(`   📊 ${product.variantes.length} variantes trouvées`);

      // Créer un Panel pour chaque variante
      for (const variante of product.variantes) {
        try {
          // Générer une référence unique
          const reference = `BCB-${variante.code}`;

          await prisma.panel.upsert({
            where: {
              catalogueId_reference: { catalogueId: catalogue.id, reference }
            },
            update: {
              name: product.nom,
              thickness: [variante.epaisseur],
              defaultLength: variante.longueur,
              defaultWidth: variante.largeur,
              pricePerM2: variante.prix,
              material: product.type,
              finish: product.finish || product.marque,
              colorCode: product.colorCode,
              imageUrl: product.imageUrl,
              categoryId: category.id,
              isActive: true
            },
            create: {
              reference,
              name: product.nom,
              thickness: [variante.epaisseur],
              defaultLength: variante.longueur,
              defaultWidth: variante.largeur,
              pricePerM2: variante.prix,
              material: product.type,
              finish: product.finish || product.marque,
              colorCode: product.colorCode,
              imageUrl: product.imageUrl,
              catalogueId: catalogue.id,
              categoryId: category.id,
              isActive: true
            }
          });

          totalVariantes++;
          created++;
          const priceStr = variante.prix ? `${variante.prix}€/m²` : 'N/A';
          console.log(`      ✅ ${reference}: ${variante.epaisseur}mm ${variante.longueur}x${variante.largeur} - ${priceStr} - ${variante.stock}`);
        } catch (e) {
          const errMsg = (e as Error).message;
          if (errMsg.includes('Unique constraint')) {
            skipped++;
            console.log(`      ⏭️  ${variante.code}: Déjà existant`);
          } else {
            console.log(`      ⚠️ Erreur ${variante.code}: ${errMsg}`);
          }
        }
      }
    } else if (product) {
      console.log(`   ⚠️ ${product.nom.substring(0, 40)}... - Pas de variantes trouvées`);
    }

    // Pause entre chaque produit pour ne pas surcharger le serveur
    await new Promise((r) => setTimeout(r, 1000));
  }

  // 6. Résumé
  console.log('\n\n================================================');
  console.log(`✨ SCRAPING TERMINÉ!`);
  console.log(`   Produits scrapés: ${count}`);
  console.log(`   Panneaux créés: ${created}`);
  console.log(`   Panneaux ignorés (doublons): ${skipped}`);
  console.log(`   Total variantes: ${totalVariantes}`);
  console.log('================================================\n');

  // Vérification finale
  const stats = await prisma.panel.count({ where: { catalogueId: catalogue.id } });
  console.log(`📊 Vérification: ${stats} panneaux en base pour ce catalogue\n`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
