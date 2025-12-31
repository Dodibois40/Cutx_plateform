/**
 * Scraping Stratifiés - Mélaminés - Compacts - Chants B comme Bois
 *
 * Source: https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants.html
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr avec son compte
 * 3. Lancer: npx tsx scripts/scrape-stratifies-melamines.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// URL principale
const MAIN_URL = 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants.html';

// Sous-catégories connues
const SUBCATEGORIES = [
  // Stratifiés
  { name: 'Unis', slug: 'unis', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html' },
  { name: 'Bois', slug: 'bois', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/bois.html' },
  { name: 'Fantaisies', slug: 'fantaisies', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/fantaisies.html' },
  { name: 'Pierres', slug: 'pierres', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/pierres.html' },
  { name: 'Métaux', slug: 'metaux', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/metaux.html' },

  // Mélaminés
  { name: 'Mélaminés unis', slug: 'melamines-unis', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/melamines-unis.html' },
  { name: 'Mélaminés bois', slug: 'melamines-bois', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/melamines-bois.html' },

  // Compacts
  { name: 'Compacts', slug: 'compacts', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/compacts.html' },

  // Chants
  { name: 'Chants ABS', slug: 'chants-abs', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/chants-abs.html' },
  { name: 'Chants PVC', slug: 'chants-pvc', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/chants-pvc.html' },
];

interface Variante {
  longueur: number;
  largeur: number;
  epaisseur: number;
  code: string;
  stock: string;
  prix: number | null;
}

interface ProduitComplet {
  nom: string;
  type: string;
  marque: string;
  finish: string | null;
  imageUrl: string | null;
  variantes: Variante[];
}

interface ScrapingStats {
  totalProducts: number;
  totalVariants: number;
  created: number;
  updated: number;
  errors: number;
  byCategory: Map<string, number>;
}

/**
 * Scroll jusqu'en bas avec plusieurs passes pour s'assurer de tout charger
 */
async function scrollToBottomCompletely(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let scrollAttempts = 0;
  const maxAttempts = 10;

  while (previousHeight !== currentHeight && scrollAttempts < maxAttempts) {
    previousHeight = currentHeight;

    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await new Promise((r) => setTimeout(r, 2000));
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    scrollAttempts++;
  }

  // Scroll final vers le haut puis vers le bas pour être sûr
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1000));
}

/**
 * Récupère tous les liens produits d'une page catégorie
 */
async function getProductLinksFromPage(page: Page, url: string): Promise<string[]> {
  console.log(`\n📋 Chargement de: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout de navigation, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 3000));

  // Scroll complet pour charger tous les produits
  console.log('   📜 Scroll complet pour charger tous les produits...');
  await scrollToBottomCompletely(page);

  // Récupérer le nombre de produits affiché sur la page
  const displayedCount = await page.evaluate(() => {
    const countEl = document.querySelector('.toolbar-amount, .category-product-count, .products-count');
    if (countEl) {
      const match = countEl.textContent?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  });

  if (displayedCount > 0) {
    console.log(`   📊 Page indique ${displayedCount} produits`);
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
            'stratifies-melamines-compacts-chants.html'
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

  if (displayedCount > 0 && productLinks.length < displayedCount * 0.8) {
    console.log(`   ⚠️ ATTENTION: Moins de liens que prévu (${productLinks.length}/${displayedCount})`);
  }

  return productLinks;
}

/**
 * Découvre dynamiquement les sous-catégories
 */
async function discoverAllSubcategories(page: Page): Promise<Array<{name: string, slug: string, url: string}>> {
  console.log(`\n🔍 Découverte des sous-catégories depuis ${MAIN_URL}...`);

  try {
    await page.goto(MAIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 2000));

  const discovered = await page.evaluate(() => {
    const cats: Array<{name: string, slug: string, url: string}> = [];

    // Chercher tous les liens de sous-catégories
    const selectors = [
      '.category-list a',
      '.subcategory-list a',
      '.categories a',
      'nav.categories a',
      '.block-category-list a',
      '.category-item a',
      '.sidebar-categories a',
      'a[href*="stratifies-melamines-compacts-chants/"]'
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        const name = el.textContent?.trim() || '';

        if (href && name &&
            href.includes('stratifies-melamines-compacts-chants') &&
            !href.endsWith('stratifies-melamines-compacts-chants.html') &&
            !cats.some(c => c.url === href)) {

          const slug = href.split('/').pop()?.replace('.html', '') || name.toLowerCase().replace(/\s+/g, '-');
          cats.push({ name, slug, url: href });
        }
      });
    }

    return cats;
  });

  console.log(`   📂 ${discovered.length} sous-catégories découvertes`);
  discovered.forEach(c => console.log(`      - ${c.name}`));

  return discovered;
}

/**
 * Scrape les données d'un produit avec toutes ses variantes
 */
async function scrapeProductWithVariantes(page: Page, url: string): Promise<ProduitComplet | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      // Nom du produit
      const nomEl = document.querySelector('h1.page-title span, h1.product-name, .product-info-main h1 span');
      const nom = nomEl?.textContent?.trim() || '';

      // Déterminer le type/marque depuis le nom
      let type = 'Stratifié';
      let marque = 'B comme Bois';
      let finish: string | null = null;

      const nomLower = nom.toLowerCase();

      // Type de produit
      if (nomLower.includes('stratifié') || nomLower.includes('stratifie') || nomLower.includes('hpl')) type = 'Stratifié';
      else if (nomLower.includes('mélaminé') || nomLower.includes('melamine')) type = 'Mélaminé';
      else if (nomLower.includes('compact')) type = 'Compact';
      else if (nomLower.includes('chant')) type = 'Chant';
      else if (nomLower.includes('contrebalancement')) type = 'Contrebalancement';

      // Finition
      if (nomLower.includes('mat')) finish = 'Mat';
      else if (nomLower.includes('brillant') || nomLower.includes('gloss')) finish = 'Brillant';
      else if (nomLower.includes('satiné') || nomLower.includes('satine')) finish = 'Satiné';
      else if (nomLower.includes('structuré') || nomLower.includes('structure')) finish = 'Structuré';
      else if (nomLower.includes('texturé') || nomLower.includes('texture')) finish = 'Texturé';

      // Marque si détectée
      if (nomLower.includes('egger')) marque = 'Egger';
      else if (nomLower.includes('kronospan')) marque = 'Kronospan';
      else if (nomLower.includes('finsa')) marque = 'Finsa';
      else if (nomLower.includes('pfleiderer')) marque = 'Pfleiderer';
      else if (nomLower.includes('polyrey')) marque = 'Polyrey';
      else if (nomLower.includes('abet')) marque = 'Abet Laminati';
      else if (nomLower.includes('arpa')) marque = 'Arpa';

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

      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr, tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

            let longueur = 0, largeur = 0, epaisseur = 0, code = '', stock = '', prix: number | null = null;

            for (let i = 0; i < cellTexts.length; i++) {
              const text = cellTexts[i];
              const numMatch = text.match(/[\d.,]+/);

              if (i === 0 && numMatch) {
                const val = parseFloat(numMatch[0].replace(',', '.'));
                longueur = val < 100 ? Math.round(val * 1000) : Math.round(val);
              } else if (i === 1 && numMatch) {
                const val = parseFloat(numMatch[0].replace(',', '.'));
                largeur = val < 100 ? Math.round(val * 1000) : Math.round(val);
              } else if (i === 2 && numMatch) {
                epaisseur = parseFloat(numMatch[0].replace(',', '.'));
              } else if (/^\d{4,6}$/.test(text.replace(/\s/g, ''))) {
                code = text.replace(/\s/g, '');
              } else if (text.toLowerCase().includes('stock') || text.toLowerCase().includes('commande')) {
                stock = text.includes('EN STOCK') || text.toLowerCase().includes('en stock')
                  ? 'EN STOCK'
                  : 'Sur commande';
              } else if (text.includes('€') || text.includes('EUR')) {
                const priceMatch = text.match(/[\d.,]+/);
                if (priceMatch) {
                  prix = parseFloat(priceMatch[0].replace(',', '.'));
                }
              }
            }

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

        let stock = 'Sur commande';
        const stockEl = document.querySelector('.stock.available, .availability, [title="Disponibilité"]');
        if (stockEl?.textContent?.toLowerCase().includes('stock')) {
          stock = 'EN STOCK';
        }
        if (stock === 'Sur commande' && document.body.innerText.includes('EN STOCK')) {
          stock = 'EN STOCK';
        }

        let epaisseur = 0, largeur = 0, longueur = 0;

        // Format: "8/10 mm blanc mat 3050" -> epaisseur 0.8, longueur 3050
        let dimMatch = nom.match(/(\d+)\/(\d+)\s*mm.*?(\d{3,4})/i);
        if (dimMatch) {
          epaisseur = parseFloat(dimMatch[1]) / 10; // 8/10 -> 0.8
          longueur = parseInt(dimMatch[3]);
        }

        // Format standard: "19 mm 2800 x 2070"
        if (!epaisseur) {
          dimMatch = nom.match(/(\d+)\s*mm\s+(\d+)\s*x\s*(\d+)/i);
          if (dimMatch) {
            epaisseur = parseInt(dimMatch[1]);
            longueur = parseInt(dimMatch[2]);
            largeur = parseInt(dimMatch[3]);
          }
        }

        if (!epaisseur) {
          const epMatch = nom.match(/(\d+(?:\/\d+)?)\s*mm\b/);
          const lwMatch = nom.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
          if (epMatch) {
            const epVal = epMatch[1];
            if (epVal.includes('/')) {
              epaisseur = parseFloat(epVal.split('/')[0]) / 10;
            } else {
              epaisseur = parseInt(epVal);
            }
          }
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

      return { nom, type, marque, finish, imageUrl, variantes };
    });

    if (!data.nom) {
      return null;
    }

    return {
      nom: data.nom,
      type: data.type,
      marque: data.marque,
      finish: data.finish,
      imageUrl: data.imageUrl,
      variantes: data.variantes
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🔧 SCRAPING STRATIFIÉS - MÉLAMINÉS - COMPACTS - CHANTS B COMME BOIS');
  console.log('===================================================================');
  console.log('⚠️  Cette catégorie contient les stratifiés, mélaminés et chants');
  console.log('===================================================================\n');

  // Connexion au navigateur Chrome
  console.log('🔌 Connexion à Chrome...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez d\'abord Chrome en mode debug:');
    console.error('   scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté à Chrome!\n');

  // Stats de scraping
  const stats: ScrapingStats = {
    totalProducts: 0,
    totalVariants: 0,
    created: 0,
    updated: 0,
    errors: 0,
    byCategory: new Map()
  };

  // 1. Utiliser le catalogue Bouney existant (ou bcommebois)
  console.log('📦 Récupération du catalogue...');
  let catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    catalogue = await prisma.catalogue.findFirst({
      where: { slug: 'bcommebois' }
    });
  }

  if (!catalogue) {
    console.error('❌ Aucun catalogue Bouney ou B comme Bois trouvé!');
    process.exit(1);
  }
  console.log(`   ✅ Catalogue: ${catalogue.name} (${catalogue.id})\n`);

  // 2. Récupérer ou créer la catégorie principale
  let mainCategory = await prisma.category.findFirst({
    where: {
      catalogueId: catalogue.id,
      slug: 'stratifies-melamines-compacts-chants'
    }
  });

  if (!mainCategory) {
    mainCategory = await prisma.category.create({
      data: {
        name: 'Stratifiés - Mélaminés - Compacts - Chants',
        slug: 'stratifies-melamines-compacts-chants',
        catalogueId: catalogue.id
      }
    });
  }
  console.log(`   📂 Catégorie principale: ${mainCategory.name}\n`);

  // 3. Découvrir les sous-catégories dynamiquement
  const discoveredSubcats = await discoverAllSubcategories(page);

  // Fusionner avec les sous-catégories prédéfinies
  const allSubcategories = [...SUBCATEGORIES];
  for (const disc of discoveredSubcats) {
    if (!allSubcategories.some(s => s.url === disc.url)) {
      allSubcategories.push(disc);
    }
  }

  console.log(`\n📊 Total sous-catégories à scraper: ${allSubcategories.length}\n`);

  // 4. Collecter tous les liens produits de toutes les sous-catégories
  const allProductLinks: Map<string, { subcategory: string, subcategorySlug: string }> = new Map();

  for (const subcat of allSubcategories) {
    console.log(`\n📂 Sous-catégorie: ${subcat.name}`);

    // Créer la sous-catégorie en base
    const dbSubcat = await prisma.category.upsert({
      where: {
        catalogueId_slug: { catalogueId: catalogue.id, slug: `stratifies-${subcat.slug}` }
      },
      update: { name: subcat.name, parentId: mainCategory.id },
      create: {
        name: subcat.name,
        slug: `stratifies-${subcat.slug}`,
        catalogueId: catalogue.id,
        parentId: mainCategory.id
      }
    });

    const links = await getProductLinksFromPage(page, subcat.url);
    let newLinks = 0;

    for (const link of links) {
      if (!allProductLinks.has(link)) {
        allProductLinks.set(link, {
          subcategory: subcat.name,
          subcategorySlug: `stratifies-${subcat.slug}`
        });
        newLinks++;
      }
    }

    stats.byCategory.set(subcat.name, links.length);
    console.log(`   📊 ${newLinks} nouveaux liens (${links.length} total, ${allProductLinks.size} cumulés)`);
  }

  // Ajouter aussi les produits de la page principale
  console.log(`\n📂 Page principale: Stratifiés - Mélaminés - Compacts - Chants`);
  const mainLinks = await getProductLinksFromPage(page, MAIN_URL);
  let newMainLinks = 0;
  for (const link of mainLinks) {
    if (!allProductLinks.has(link)) {
      allProductLinks.set(link, {
        subcategory: 'Stratifiés - Mélaminés - Compacts - Chants',
        subcategorySlug: 'stratifies-melamines-compacts-chants'
      });
      newMainLinks++;
    }
  }
  console.log(`   📊 ${newMainLinks} nouveaux liens depuis la page principale`);

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📊 TOTAL: ${allProductLinks.size} produits uniques à scraper`);
  console.log(`${'='.repeat(60)}\n`);

  // 5. Scraper chaque produit
  let count = 0;

  for (const [url, info] of allProductLinks) {
    count++;
    stats.totalProducts++;
    const filename = url.split('/').pop() || url;

    // Afficher progression tous les 10 produits
    if (count % 10 === 0 || count === 1) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📈 Progression: ${count}/${allProductLinks.size} (${Math.round(count/allProductLinks.size*100)}%)`);
      console.log(`${'─'.repeat(50)}`);
    }

    console.log(`\n[${count}/${allProductLinks.size}] ${filename.substring(0, 50)}...`);

    const product = await scrapeProductWithVariantes(page, url);

    if (product && product.variantes.length > 0) {
      console.log(`   📦 ${product.nom.substring(0, 45)}...`);
      console.log(`   🏷️  Type: ${product.type} | Marque: ${product.marque}${product.finish ? ` | ${product.finish}` : ''}`);
      console.log(`   📊 ${product.variantes.length} variantes`);

      // Récupérer la catégorie
      const category = await prisma.category.findFirst({
        where: {
          catalogueId: catalogue.id,
          slug: info.subcategorySlug
        }
      });

      for (const variante of product.variantes) {
        try {
          const reference = `BCB-${variante.code}`;

          await prisma.panel.upsert({
            where: {
              catalogueId_reference: { catalogueId: catalogue.id, reference }
            },
            update: {
              name: product.nom,
              material: product.type,
              finish: product.finish,
              thickness: variante.epaisseur > 0 ? [variante.epaisseur] : [],
              defaultLength: variante.longueur,
              defaultWidth: variante.largeur,
              pricePerM2: variante.prix,
              imageUrl: product.imageUrl || null,
              isActive: true,
              categoryId: category?.id || mainCategory.id
            },
            create: {
              reference,
              name: product.nom,
              material: product.type,
              finish: product.finish,
              thickness: variante.epaisseur > 0 ? [variante.epaisseur] : [],
              defaultLength: variante.longueur,
              defaultWidth: variante.largeur,
              pricePerM2: variante.prix,
              imageUrl: product.imageUrl || null,
              isActive: true,
              catalogueId: catalogue.id,
              categoryId: category?.id || mainCategory.id
            }
          });

          stats.totalVariants++;
          stats.created++;
          console.log(`      ✅ ${reference} (${variante.epaisseur}mm ${variante.longueur}x${variante.largeur})`);
        } catch (err) {
          stats.errors++;
          console.log(`      ❌ Erreur: ${(err as Error).message}`);
        }
      }
    } else {
      console.log(`   ⚠️ Pas de données exploitables`);
      stats.errors++;
    }

    // Pause anti-rate-limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // 6. Afficher le résumé
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 RÉSUMÉ DU SCRAPING');
  console.log(`${'='.repeat(60)}`);
  console.log(`📦 Produits traités: ${stats.totalProducts}`);
  console.log(`📋 Variantes créées/mises à jour: ${stats.totalVariants}`);
  console.log(`✅ Succès: ${stats.created}`);
  console.log(`❌ Erreurs: ${stats.errors}`);
  console.log(`\n📂 Par catégorie:`);
  for (const [cat, count] of stats.byCategory) {
    console.log(`   - ${cat}: ${count} produits`);
  }
  console.log(`${'='.repeat(60)}\n`);

  await prisma.$disconnect();
  console.log('✅ Scraping terminé!');
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e);
  prisma.$disconnect();
  process.exit(1);
});
