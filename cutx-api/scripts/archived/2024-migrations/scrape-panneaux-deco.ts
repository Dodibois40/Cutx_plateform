/**
 * Scraping Panneaux Déco B comme Bois
 *
 * Source: https://www.bcommebois.fr/agencement/panneaux-deco.html
 * Catégorie: Panneaux Déco
 * Contenu: Panneaux acoustiques, perforés, cannelés, tasseaux décoratifs, etc.
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr avec son compte
 * 3. Lancer: npx tsx scripts/scrape-panneaux-deco.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// URL principale
const MAIN_URL = 'https://www.bcommebois.fr/agencement/panneaux-deco.html';

// Catégorie principale
const MAIN_CATEGORY_NAME = 'Panneaux Déco';
const MAIN_CATEGORY_SLUG = 'panneaux-deco';

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
            'plans-de-travail.html', 'panneaux-bois.html', 'essences-fine.html',
            'panneaux-deco.html'
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
      'a[href*="panneaux-deco/"]'
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        const name = el.textContent?.trim() || '';

        if (href && name &&
            href.includes('panneaux-deco') &&
            !href.endsWith('panneaux-deco.html') &&
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
 * Détermine le type de panneau décoratif basé sur le nom
 */
function determineProductType(nom: string): { type: string; productType: string | null } {
  const nomLower = nom.toLowerCase();

  // Panneaux acoustiques
  if (nomLower.includes('acousti') || nomLower.includes('phonique') || nomLower.includes('absorbant')) {
    return { type: 'Panneau acoustique', productType: null };
  }

  // Panneaux perforés
  if (nomLower.includes('perfor') || nomLower.includes('ajouré') || nomLower.includes('ajour')) {
    return { type: 'Panneau perforé', productType: null };
  }

  // Panneaux cannelés / rainurés
  if (nomLower.includes('cannel') || nomLower.includes('rainur') || nomLower.includes('strié') ||
      nomLower.includes('groove') || nomLower.includes('slatwall')) {
    return { type: 'Panneau cannelé', productType: null };
  }

  // Tasseaux
  if (nomLower.includes('tasseau') || nomLower.includes('latte') || nomLower.includes('claustra')) {
    return { type: 'Tasseaux décoratifs', productType: null };
  }

  // Panneaux 3D / relief
  if (nomLower.includes('3d') || nomLower.includes('relief') || nomLower.includes('ondulé')) {
    return { type: 'Panneau 3D', productType: null };
  }

  // Panneaux muraux
  if (nomLower.includes('mural') || nomLower.includes('revêtement')) {
    return { type: 'Panneau mural', productType: null };
  }

  // Panneaux mélaminés décoratifs
  if (nomLower.includes('mélamin') || nomLower.includes('melamin')) {
    return { type: 'Panneau mélaminé décoratif', productType: 'MELAMINE' };
  }

  // Panneaux stratifiés décoratifs
  if (nomLower.includes('stratif') || nomLower.includes('hpl')) {
    return { type: 'Panneau stratifié décoratif', productType: 'STRATIFIE' };
  }

  // Panneaux MDF laqués
  if (nomLower.includes('laqué') || nomLower.includes('laque')) {
    return { type: 'Panneau laqué', productType: null };
  }

  // Par défaut - panneau décoratif
  return { type: 'Panneau décoratif', productType: null };
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

      // Détection des marques
      if (nomLower.includes('egger')) marque = 'Egger';
      else if (nomLower.includes('kronospan')) marque = 'Kronospan';
      else if (nomLower.includes('finsa')) marque = 'Finsa';
      else if (nomLower.includes('sonae') || nomLower.includes('innovus')) marque = 'Sonae Arauco';
      else if (nomLower.includes('cleaf')) marque = 'Cleaf';
      else if (nomLower.includes('pfleiderer')) marque = 'Pfleiderer';
      else if (nomLower.includes('decospan')) marque = 'Decospan';
      else if (nomLower.includes('xylos')) marque = 'Xylos';
      else if (nomLower.includes('polyrey')) marque = 'Polyrey';
      else if (nomLower.includes('formica')) marque = 'Formica';
      else if (nomLower.includes('fenix')) marque = 'Fenix';

      let finish: string | null = null;
      if (nomLower.includes('mat')) finish = 'Mat';
      else if (nomLower.includes('brillant')) finish = 'Brillant';
      else if (nomLower.includes('satiné') || nomLower.includes('satine')) finish = 'Satiné';
      else if (nomLower.includes('texturé') || nomLower.includes('texture')) finish = 'Texturé';
      else if (nomLower.includes('soft')) finish = 'Soft Touch';
      else if (nomLower.includes('structuré') || nomLower.includes('structure')) finish = 'Structuré';

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
                  ? 'EN STOCK' : 'Sur commande';
              } else if (text.includes('€')) {
                const priceMatch = text.match(/([\d\s]+[,.][\d]+)/);
                if (priceMatch) {
                  prix = parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.'));
                }
              }
            }

            if (code || (longueur > 0 && largeur > 0)) {
              variantes.push({ longueur, largeur, epaisseur, code, stock, prix });
            }
          }
        }
      }

      // Si pas de tableau, chercher dans le titre/description
      if (variantes.length === 0 && nom) {
        // Chercher référence dans la page
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

        const dimMatch = nom.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
        const epMatch = nom.match(/(\d+(?:[.,]\d+)?)\s*mm/);
        const codeMatch = nom.match(/(\d{5,6})/);

        variantes.push({
          longueur: dimMatch ? parseInt(dimMatch[1]) : 0,
          largeur: dimMatch ? parseInt(dimMatch[2]) : 0,
          epaisseur: epMatch ? parseFloat(epMatch[1].replace(',', '.')) : 0,
          code: code || (codeMatch ? codeMatch[1] : ''),
          stock: 'Sur commande',
          prix: null
        });
      }

      return { nom, marque, finish, imageUrl, variantes };
    });

    if (!data.nom) return null;

    const { type, productType } = determineProductType(data.nom);

    return {
      nom: data.nom,
      type,
      marque: data.marque,
      finish: data.finish,
      imageUrl: data.imageUrl || null,
      productType,
      variantes: data.variantes
    };
  } catch (error) {
    console.error(`   ❌ Erreur scraping ${url}:`, error);
    return null;
  }
}

/**
 * Enregistre ou met à jour un panel en base
 */
async function upsertPanel(
  catalogueId: string,
  categoryId: string,
  produit: ProduitComplet,
  variante: Variante,
  stats: ScrapingStats
): Promise<void> {
  const reference = variante.code ? `BCB-DEC-${variante.code}` : `BCB-DEC-${Date.now()}`;

  try {
    await prisma.panel.upsert({
      where: {
        catalogueId_reference: {
          catalogueId,
          reference
        }
      },
      update: {
        name: produit.nom,
        description: `${produit.type} - ${produit.marque}`,
        material: produit.type,
        finish: produit.finish || produit.marque,
        productType: produit.productType,
        defaultLength: variante.longueur,
        defaultWidth: variante.largeur,
        defaultThickness: variante.epaisseur,
        thickness: variante.epaisseur > 0 ? [variante.epaisseur] : [],
        pricePerM2: variante.prix,
        stockStatus: variante.stock || 'Sur commande',
        imageUrl: produit.imageUrl,
        isActive: true,
        categoryId
      },
      create: {
        catalogueId,
        categoryId,
        reference,
        name: produit.nom,
        description: `${produit.type} - ${produit.marque}`,
        material: produit.type,
        finish: produit.finish || produit.marque,
        productType: produit.productType,
        defaultLength: variante.longueur,
        defaultWidth: variante.largeur,
        defaultThickness: variante.epaisseur,
        thickness: variante.epaisseur > 0 ? [variante.epaisseur] : [],
        isVariableLength: false,
        pricePerM2: variante.prix,
        stockStatus: variante.stock || 'Sur commande',
        imageUrl: produit.imageUrl,
        isActive: true
      }
    });
    stats.created++;
  } catch (error) {
    console.error(`   ❌ Erreur upsert ${reference}:`, error);
    stats.errors++;
  }
}

async function main() {
  console.log(`
🎨 SCRAPING PANNEAUX DÉCO B COMME BOIS
==========================================
📦 Catégorie: Panneaux Déco
📋 Contenu: Acoustiques, Perforés, Cannelés, Tasseaux...
==========================================
`);

  console.log('🔌 Connexion à Chrome...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
  console.log('✅ Connecté à Chrome!');

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('\n📦 Récupération du catalogue...');
  let catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    catalogue = await prisma.catalogue.create({
      data: {
        name: 'Bouney',
        slug: 'bouney',
        description: 'Catalogue B comme Bois',
        isActive: true
      }
    });
  }
  console.log(`   ✅ Catalogue: ${catalogue.name} (${catalogue.id})`);

  // Créer/récupérer la catégorie principale
  let mainCategory = await prisma.category.findFirst({
    where: { catalogueId: catalogue.id, slug: MAIN_CATEGORY_SLUG }
  });

  if (!mainCategory) {
    mainCategory = await prisma.category.create({
      data: {
        catalogueId: catalogue.id,
        name: MAIN_CATEGORY_NAME,
        slug: MAIN_CATEGORY_SLUG
      }
    });
  }
  console.log(`   📂 Catégorie principale: ${mainCategory.name}`);

  // Découvrir les sous-catégories
  const subcategories = await discoverAllSubcategories(page);

  console.log(`\n📊 Total sous-catégories à scraper: ${subcategories.length}`);

  // Collecter tous les liens produits
  const allProductLinks = new Set<string>();
  const stats: ScrapingStats = {
    totalProducts: 0,
    totalVariants: 0,
    created: 0,
    updated: 0,
    errors: 0,
    byCategory: new Map()
  };

  // Scraper chaque sous-catégorie
  for (const subcat of subcategories) {
    console.log(`\n📂 Sous-catégorie: ${subcat.name}`);
    stats.byCategory.set(subcat.name, 0);

    const links = await getProductLinksFromPage(page, subcat.url);
    const newLinks = links.filter(l => !allProductLinks.has(l));
    newLinks.forEach(l => allProductLinks.add(l));

    console.log(`   📊 ${newLinks.length} nouveaux liens (${links.length} total, ${allProductLinks.size} cumulés)`);
    stats.byCategory.set(subcat.name, links.length);
  }

  // Aussi scraper la page principale pour les produits non catégorisés
  console.log(`\n📂 Page principale: ${MAIN_CATEGORY_NAME}`);
  const mainLinks = await getProductLinksFromPage(page, MAIN_URL);
  const newMainLinks = mainLinks.filter(l => !allProductLinks.has(l));
  newMainLinks.forEach(l => allProductLinks.add(l));
  if (newMainLinks.length > 0) {
    console.log(`   📊 ${newMainLinks.length} nouveaux liens depuis la page principale`);
  }

  const productLinks = Array.from(allProductLinks);
  stats.totalProducts = productLinks.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TOTAL: ${productLinks.length} produits uniques à scraper`);
  console.log(`${'='.repeat(60)}`);

  // Scraper chaque produit
  for (let i = 0; i < productLinks.length; i++) {
    const url = productLinks[i];
    const slug = url.split('/').pop()?.replace('.html', '') || '';

    if (i % 10 === 0) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📈 Progression: ${i + 1}/${productLinks.length} (${Math.round((i / productLinks.length) * 100)}%)`);
      console.log(`${'─'.repeat(50)}`);
    }

    console.log(`\n[${i + 1}/${productLinks.length}] ${slug.substring(0, 50)}...`);

    const produit = await scrapeProductWithVariantes(page, url);

    if (produit) {
      console.log(`   📦 ${produit.nom.substring(0, 50)}...`);
      console.log(`   🏷️  Type: ${produit.type}${produit.productType ? ` | ${produit.productType}` : ''}`);
      console.log(`   📊 ${produit.variantes.length} variantes`);

      for (const variante of produit.variantes) {
        await upsertPanel(catalogue.id, mainCategory.id, produit, variante, stats);
        stats.totalVariants++;
        console.log(`      ✅ BCB-DEC-${variante.code || 'NEW'} (${variante.epaisseur}mm ${variante.longueur}x${variante.largeur})`);
      }
    } else {
      console.log(`   ⚠️ Pas de données extraites`);
    }

    // Pause entre les produits
    await new Promise((r) => setTimeout(r, 500));
  }

  // Résumé final
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RÉSUMÉ DU SCRAPING PANNEAUX DÉCO`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📦 Produits traités: ${stats.totalProducts}`);
  console.log(`📋 Variantes créées/mises à jour: ${stats.totalVariants}`);
  console.log(`✅ Succès: ${stats.created}`);
  console.log(`❌ Erreurs: ${stats.errors}`);
  console.log(`\n📂 Par catégorie:`);
  stats.byCategory.forEach((count, cat) => {
    console.log(`   - ${cat}: ${count} produits`);
  });
  console.log(`${'='.repeat(60)}`);

  await prisma.$disconnect();
  console.log('\n✅ Scraping Panneaux Déco terminé!');
}

main().catch(async (e) => {
  console.error('❌ Erreur fatale:', e);
  await prisma.$disconnect();
  process.exit(1);
});
