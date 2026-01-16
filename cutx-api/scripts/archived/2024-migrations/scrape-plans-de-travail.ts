/**
 * Scraping Plans de Travail B comme Bois
 *
 * Source: https://www.bcommebois.fr/agencement/plans-de-travail.html
 * Catégorie: Plans de Travail
 * Contenu: Plans de travail cuisine, salle de bain, stratifiés, massifs, etc.
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr avec son compte
 * 3. Lancer: npx tsx scripts/scrape-plans-de-travail.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// URL principale
const MAIN_URL = 'https://www.bcommebois.fr/agencement/plans-de-travail.html';

// Catégorie principale
const MAIN_CATEGORY_NAME = 'Plans de Travail';
const MAIN_CATEGORY_SLUG = 'plans-de-travail';

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
  productType: string | null;
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

  console.log('   📜 Scroll complet pour charger tous les produits...');
  await scrollToBottomCompletely(page);

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

  const productLinks = await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll('a').forEach((el) => {
      const href = el.href;
      if (!href || href.includes('#')) return;

      try {
        const urlObj = new URL(href);
        if (urlObj.hostname !== 'www.bcommebois.fr') return;

        const pathParts = urlObj.pathname.split('/').filter((p) => p);
        if (pathParts.length === 1 && pathParts[0].endsWith('.html')) {
          const excluded = [
            'agencement.html', 'sols-murs.html', 'bardage.html',
            'terrasse-exterieurs.html', 'menuiserie.html', 'bois-massif.html',
            'structure-charpente.html', 'isolation-etancheite.html',
            'libre-service.html', 'contact.html', 'panier.html',
            'connexion.html', 'inscription.html', 'deconnexion.html',
            'plans-de-travail.html', 'panneaux-bois.html', 'essences-fine.html'
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

    const selectors = [
      '.category-list a',
      '.subcategory-list a',
      '.categories a',
      'nav.categories a',
      '.block-category-list a',
      '.category-item a',
      '.sidebar-categories a',
      'a[href*="plans-de-travail/"]'
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        const name = el.textContent?.trim() || '';

        if (href && name &&
            href.includes('plans-de-travail') &&
            !href.endsWith('plans-de-travail.html') &&
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
 * Détermine le type de plan de travail basé sur le nom
 */
function determineProductType(nom: string): { type: string; productType: string | null } {
  const nomLower = nom.toLowerCase();

  // Plans de travail stratifiés
  if (nomLower.includes('stratifié') || nomLower.includes('stratifie') || nomLower.includes('hpl')) {
    return { type: 'Plan de travail stratifié', productType: 'STRATIFIE' };
  }

  // Plans de travail compact
  if (nomLower.includes('compact') || nomLower.includes('fenix') || nomLower.includes('solid')) {
    return { type: 'Plan de travail compact', productType: 'COMPACT' };
  }

  // Plans de travail massif
  if (nomLower.includes('massif') || nomLower.includes('chêne') || nomLower.includes('hêtre') ||
      nomLower.includes('noyer') || nomLower.includes('frêne')) {
    if (nomLower.includes('chêne')) return { type: 'Plan de travail chêne massif', productType: null };
    if (nomLower.includes('hêtre')) return { type: 'Plan de travail hêtre massif', productType: null };
    if (nomLower.includes('noyer')) return { type: 'Plan de travail noyer massif', productType: null };
    if (nomLower.includes('frêne')) return { type: 'Plan de travail frêne massif', productType: null };
    return { type: 'Plan de travail massif', productType: null };
  }

  // Plans de travail lamellé-collé
  if (nomLower.includes('lamellé') || nomLower.includes('lamelle')) {
    return { type: 'Plan de travail lamellé-collé', productType: null };
  }

  // Crédences
  if (nomLower.includes('crédence') || nomLower.includes('credence')) {
    return { type: 'Crédence', productType: 'STRATIFIE' };
  }

  // Profilés et finitions
  if (nomLower.includes('profilé') || nomLower.includes('profile') || nomLower.includes('chant')) {
    return { type: 'Profilé / Chant', productType: 'BANDE_DE_CHANT' };
  }

  // Par défaut
  return { type: 'Plan de travail', productType: null };
}

/**
 * Scrape les données d'un produit avec toutes ses variantes
 */
async function scrapeProductWithVariantes(page: Page, url: string): Promise<ProduitComplet | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const nomEl = document.querySelector('h1.page-title span, h1.product-name, .product-info-main h1 span');
      const nom = nomEl?.textContent?.trim() || '';

      let marque = 'B comme Bois';
      const nomLower = nom.toLowerCase();

      if (nomLower.includes('egger')) marque = 'Egger';
      else if (nomLower.includes('kronospan')) marque = 'Kronospan';
      else if (nomLower.includes('finsa')) marque = 'Finsa';
      else if (nomLower.includes('polyrey')) marque = 'Polyrey';
      else if (nomLower.includes('duropal')) marque = 'Duropal';
      else if (nomLower.includes('fenix')) marque = 'Fenix';

      let finish: string | null = null;
      if (nomLower.includes('mat')) finish = 'Mat';
      else if (nomLower.includes('brillant')) finish = 'Brillant';
      else if (nomLower.includes('satiné') || nomLower.includes('satine')) finish = 'Satiné';
      else if (nomLower.includes('texturé') || nomLower.includes('texture')) finish = 'Texturé';
      else if (nomLower.includes('soft')) finish = 'Soft Touch';

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
          if (cells.length >= 3) {
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

        // Format typique pour plans de travail: "3050 x 650 x 38 mm"
        let dimMatch = nom.match(/(\d{3,4})\s*x\s*(\d{3,4})\s*x\s*(\d+)/i);
        if (dimMatch) {
          longueur = parseInt(dimMatch[1]);
          largeur = parseInt(dimMatch[2]);
          epaisseur = parseFloat(dimMatch[3]);
        }

        if (!epaisseur) {
          const epMatch = nom.match(/(\d+)\s*mm\b/);
          const lwMatch = nom.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
          if (epMatch) {
            epaisseur = parseFloat(epMatch[1]);
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

      return { nom, marque, finish, imageUrl, variantes };
    });

    if (!data.nom) {
      return null;
    }

    const { type, productType } = determineProductType(data.nom);

    return {
      nom: data.nom,
      type,
      marque: data.marque,
      finish: data.finish,
      imageUrl: data.imageUrl,
      productType,
      variantes: data.variantes
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🪵 SCRAPING PLANS DE TRAVAIL B COMME BOIS');
  console.log('==========================================');
  console.log('📦 Catégorie: Plans de Travail');
  console.log('📋 Contenu: Stratifiés, Massifs, Compacts, Crédences...');
  console.log('==========================================\n');

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

  const stats: ScrapingStats = {
    totalProducts: 0,
    totalVariants: 0,
    created: 0,
    updated: 0,
    errors: 0,
    byCategory: new Map()
  };

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

  let mainCategory = await prisma.category.findFirst({
    where: {
      catalogueId: catalogue.id,
      slug: MAIN_CATEGORY_SLUG
    }
  });

  if (!mainCategory) {
    mainCategory = await prisma.category.create({
      data: {
        name: MAIN_CATEGORY_NAME,
        slug: MAIN_CATEGORY_SLUG,
        catalogueId: catalogue.id
      }
    });
  }
  console.log(`   📂 Catégorie principale: ${mainCategory.name}\n`);

  const discoveredSubcats = await discoverAllSubcategories(page);

  console.log(`\n📊 Total sous-catégories à scraper: ${discoveredSubcats.length}\n`);

  const allProductLinks: Map<string, { subcategory: string, subcategorySlug: string }> = new Map();

  for (const subcat of discoveredSubcats) {
    console.log(`\n📂 Sous-catégorie: ${subcat.name}`);

    const dbSubcat = await prisma.category.upsert({
      where: {
        catalogueId_slug: { catalogueId: catalogue.id, slug: `pdt-${subcat.slug}` }
      },
      update: { name: subcat.name, parentId: mainCategory.id },
      create: {
        name: subcat.name,
        slug: `pdt-${subcat.slug}`,
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
          subcategorySlug: `pdt-${subcat.slug}`
        });
        newLinks++;
      }
    }

    stats.byCategory.set(subcat.name, links.length);
    console.log(`   📊 ${newLinks} nouveaux liens (${links.length} total, ${allProductLinks.size} cumulés)`);
  }

  console.log(`\n📂 Page principale: ${MAIN_CATEGORY_NAME}`);
  const mainLinks = await getProductLinksFromPage(page, MAIN_URL);
  let newMainLinks = 0;
  for (const link of mainLinks) {
    if (!allProductLinks.has(link)) {
      allProductLinks.set(link, {
        subcategory: MAIN_CATEGORY_NAME,
        subcategorySlug: MAIN_CATEGORY_SLUG
      });
      newMainLinks++;
    }
  }
  console.log(`   📊 ${newMainLinks} nouveaux liens depuis la page principale`);

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📊 TOTAL: ${allProductLinks.size} produits uniques à scraper`);
  console.log(`${'='.repeat(60)}\n`);

  let count = 0;

  for (const [url, info] of allProductLinks) {
    count++;
    stats.totalProducts++;
    const filename = url.split('/').pop() || url;

    if (count % 10 === 0 || count === 1) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📈 Progression: ${count}/${allProductLinks.size} (${Math.round(count/allProductLinks.size*100)}%)`);
      console.log(`${'─'.repeat(50)}`);
    }

    console.log(`\n[${count}/${allProductLinks.size}] ${filename.substring(0, 50)}...`);

    const product = await scrapeProductWithVariantes(page, url);

    if (product && product.variantes.length > 0) {
      console.log(`   📦 ${product.nom.substring(0, 45)}...`);
      console.log(`   🏷️  Type: ${product.type}${product.finish ? ` | ${product.finish}` : ''}`);
      console.log(`   📊 ${product.variantes.length} variantes`);

      const category = await prisma.category.findFirst({
        where: {
          catalogueId: catalogue.id,
          slug: info.subcategorySlug
        }
      });

      for (const variante of product.variantes) {
        try {
          const reference = `BCB-PDT-${variante.code}`;

          await prisma.panel.upsert({
            where: {
              catalogueId_reference: { catalogueId: catalogue.id, reference }
            },
            update: {
              name: product.nom,
              material: product.type,
              finish: product.finish,
              productType: product.productType,
              thickness: variante.epaisseur > 0 ? [variante.epaisseur] : [],
              defaultThickness: variante.epaisseur > 0 ? variante.epaisseur : null,
              defaultLength: variante.longueur,
              defaultWidth: variante.largeur,
              pricePerM2: variante.prix,
              stockStatus: variante.stock || 'Sur commande',
              imageUrl: product.imageUrl || null,
              isActive: true,
              categoryId: category?.id || mainCategory.id
            },
            create: {
              reference,
              name: product.nom,
              material: product.type,
              finish: product.finish,
              productType: product.productType,
              thickness: variante.epaisseur > 0 ? [variante.epaisseur] : [],
              defaultThickness: variante.epaisseur > 0 ? variante.epaisseur : null,
              defaultLength: variante.longueur,
              defaultWidth: variante.largeur,
              pricePerM2: variante.prix,
              stockStatus: variante.stock || 'Sur commande',
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

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 RÉSUMÉ DU SCRAPING PLANS DE TRAVAIL');
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
  console.log('✅ Scraping Plans de Travail terminé!');
}

main().catch((e) => {
  console.error('❌ Erreur fatale:', e);
  prisma.$disconnect();
  process.exit(1);
});
