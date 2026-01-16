/**
 * Re-scraping complet de la section Agencement B comme Bois
 * avec extraction correcte des dimensions
 *
 * Structure découverte:
 * - Les produits sont affichés dans des tableaux sur les pages catégories
 * - Headers: Long. (m) | Larg. (m) | Haut. (mm) | Qualité/Support | Code | Stock | Prix (HT)
 * - Long/Larg sont en mètres (3.050 = 3050mm)
 * - Haut est en mm (0.900 = 0.9mm)
 *
 * Usage:
 * 1. Lancer Chrome debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr
 * 3. npx tsx scripts/rescrape-agencement-complete.ts
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Catégories à scraper sous /agencement
// Mise à jour: Ajout de toutes les sous-catégories par marque
const CATEGORIES = [
  {
    name: 'Stratifiés - Mélaminés - Compacts - Chants',
    slug: 'stratifies-melamines-compacts-chants',
    subcategories: [
      // Catégories génériques par type
      { name: 'Unis', slug: 'unis', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html' },
      { name: 'Bois', slug: 'bois', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/bois.html' },
      { name: 'Fantaisies', slug: 'fantaisies', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/fantaisies.html' },
      { name: 'Pierres', slug: 'pierres', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/pierres.html' },
      { name: 'Métaux', slug: 'metaux', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/metaux.html' },
      { name: 'Matières', slug: 'matieres', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/matieres.html' },
      // Catégories par marque
      { name: 'Egger', slug: 'egger', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/egger.html' },
      { name: 'Pfleiderer', slug: 'pfleiderer', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/pfleiderer.html' },
      { name: 'Polyrey', slug: 'polyrey', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/polyrey.html' },
      { name: 'Unilin', slug: 'unilin', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unilin.html' },
      { name: 'Fenix', slug: 'fenix', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/fenix.html' },
      { name: 'Formica', slug: 'formica', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/formica.html' },
      { name: 'Nebodesign', slug: 'nebodesign', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/nebodesign.html' },
      { name: 'Rehau Rauvisio', slug: 'rehau-rauvisio', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/rehau-rauvisio.html' },
      // Catégories spécifiques produits
      { name: 'Mélaminés Unis', slug: 'melamines-unis', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/melamines-unis.html' },
      { name: 'Mélaminés Bois', slug: 'melamines-bois', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/melamines-bois.html' },
      { name: 'Compacts', slug: 'compacts', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/compacts.html' },
      { name: 'Chants ABS', slug: 'chants-abs', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/chants-abs.html' },
      { name: 'Chants PVC', slug: 'chants-pvc', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/chants-pvc.html' },
      { name: 'Panneaux polymère et acrylique', slug: 'ppma', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/panneaux-polymere-acrylique.html' },
    ]
  },
  {
    name: 'Panneaux Basiques & Techniques',
    slug: 'panneaux-basiques-techniques',
    subcategories: [
      { name: 'Agglomérés', slug: 'agglomeres', url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/agglomeres.html' },
      { name: 'MDF', slug: 'mdf', url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf.html' },
      { name: 'Contreplaqués', slug: 'contreplaques', url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/contreplaques.html' },
      { name: 'OSB', slug: 'osb', url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/osb.html' },
    ]
  },
  {
    name: 'Panneaux Déco',
    slug: 'panneaux-deco',
    subcategories: [
      { name: 'Panneaux Déco', slug: 'panneaux-deco-all', url: 'https://www.bcommebois.fr/agencement/panneaux-deco.html' },
      { name: 'Querkus', slug: 'querkus', url: 'https://www.bcommebois.fr/agencement/panneaux-deco/querkus.html' },
      { name: 'Shinnoki', slug: 'shinnoki', url: 'https://www.bcommebois.fr/agencement/panneaux-deco/shinnoki.html' },
      { name: 'Nuxe Naturals', slug: 'nuxe-naturals', url: 'https://www.bcommebois.fr/agencement/panneaux-deco/nuxe-naturals.html' },
    ]
  },
  {
    name: 'Essences fines',
    slug: 'essences-fines',
    subcategories: [
      { name: 'Essences fines', slug: 'essences-fines-all', url: 'https://www.bcommebois.fr/agencement/essences-fines.html' },
      { name: 'Agglomérés replaqués', slug: 'agglomeres-replaques', url: 'https://www.bcommebois.fr/agencement/essences-fines/agglomeres-replaques.html' },
      { name: 'MDF replaqués', slug: 'mdf-replaques', url: 'https://www.bcommebois.fr/agencement/essences-fines/mdf-replaques.html' },
      { name: 'Contreplaqués replaqués', slug: 'contreplaques-replaques', url: 'https://www.bcommebois.fr/agencement/essences-fines/contreplaques-replaques.html' },
      { name: 'Lattés replaqués', slug: 'lattes-replaques', url: 'https://www.bcommebois.fr/agencement/essences-fines/lattes-replaques.html' },
      { name: 'Stratifiés et flex', slug: 'stratifies-flex', url: 'https://www.bcommebois.fr/agencement/essences-fines/stratifies-flex.html' },
    ]
  },
  {
    name: 'Plans de travail',
    slug: 'plans-de-travail',
    subcategories: [
      { name: 'Plans de travail', slug: 'plans-de-travail-all', url: 'https://www.bcommebois.fr/agencement/plans-de-travail.html' },
      { name: 'Bois', slug: 'bois', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/bois.html' },
      { name: 'Stratifiés', slug: 'stratifies', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/stratifies.html' },
      { name: 'Compacts', slug: 'compacts', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts.html' },
      { name: 'Résines', slug: 'resines', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/resines.html' },
    ]
  },
  {
    name: 'Panneaux bois massifs',
    slug: 'panneaux-bois-massifs',
    subcategories: [
      { name: 'Panneaux bois massifs', slug: 'panneaux-bois-massifs-all', url: 'https://www.bcommebois.fr/agencement/panneaux-bois-massifs.html' },
      { name: 'Lamellés-collés aboutés', slug: 'lamelles-colles-aboutes', url: 'https://www.bcommebois.fr/agencement/panneaux-bois-massifs/lamelles-colles-aboutes.html' },
      { name: 'Panneaux non aboutés', slug: 'panneaux-non-aboutes', url: 'https://www.bcommebois.fr/agencement/panneaux-bois-massifs/panneaux-non-aboutes.html' },
      { name: '3 plis essences fines', slug: '3-plis-essences-fines', url: 'https://www.bcommebois.fr/agencement/panneaux-bois-massifs/3-plis-essences-fines.html' },
    ]
  },
];

interface ProductVariant {
  reference: string;
  name: string;
  material: string;
  finish: string | null;
  thickness: number;
  length: number;
  width: number;
  pricePerM2: number | null;
  stock: string;
  imageUrl: string | null;
  categorySlug: string;
}

interface ScrapingStats {
  totalVariants: number;
  created: number;
  updated: number;
  errors: number;
  byCategory: Map<string, number>;
}

/**
 * Scroll complet pour charger tous les produits
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;
  const maxAttempts = 20;

  console.log('   📜 Scroll pour charger tous les produits...');

  while (attempts < maxAttempts) {
    previousHeight = currentHeight;

    // Scroll progressif
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        let totalHeight = 0;
        const distance = 800;
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

    await new Promise(r => setTimeout(r, 2000));
    currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight) {
      break;
    }

    attempts++;
    process.stdout.write(`      Scroll ${attempts}... (height: ${currentHeight})\r`);
  }

  // Retour en haut puis scroll complet pour s'assurer que tout est chargé
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2000));

  console.log(`   ✅ Scroll terminé (${attempts} passes)`);
}

/**
 * Parse tous les tableaux produits d'une page
 */
async function parseProductTables(page: Page, categorySlug: string): Promise<ProductVariant[]> {
  const variants = await page.evaluate((catSlug) => {
    const results: ProductVariant[] = [];

    // Trouver tous les conteneurs de produits
    // Structure: div avec image + titre + tableau
    const productContainers = document.querySelectorAll('[class*="product"], .product-item, article, section');

    // Si pas de conteneurs spécifiques, parser tous les tableaux
    const tables = document.querySelectorAll('table.min-w-full');

    let currentProductName = '';
    let currentProductImage = '';
    let currentMaterial = '';

    for (const table of tables) {
      // Chercher le nom du produit et l'image dans les éléments précédents
      let element = table.previousElementSibling;
      let searchDepth = 0;

      while (element && searchDepth < 5) {
        // Chercher le titre
        const titleEl = element.querySelector('h2, h3, h4, .product-name, .title');
        if (titleEl?.textContent) {
          currentProductName = titleEl.textContent.trim();
        }

        // Chercher l'image
        const imgEl = element.querySelector('img');
        if (imgEl) {
          const src = imgEl.src || imgEl.getAttribute('data-src');
          if (src && src.includes('bcommebois') && !src.includes('placeholder')) {
            currentProductImage = src;
          }
        }

        // Chercher le type de matériau
        const textContent = element.textContent?.toLowerCase() || '';
        if (textContent.includes('stratifié') || textContent.includes('hpl')) {
          currentMaterial = 'Stratifié';
        } else if (textContent.includes('mélaminé') || textContent.includes('melamine')) {
          currentMaterial = 'Mélaminé';
        } else if (textContent.includes('compact')) {
          currentMaterial = 'Compact';
        } else if (textContent.includes('chant')) {
          currentMaterial = 'Chant';
        } else if (textContent.includes('aggloméré') || textContent.includes('agglomere')) {
          currentMaterial = 'Aggloméré';
        } else if (textContent.includes('mdf')) {
          currentMaterial = 'MDF';
        } else if (textContent.includes('contreplaqué') || textContent.includes('contreplaque')) {
          currentMaterial = 'Contreplaqué';
        } else if (textContent.includes('osb')) {
          currentMaterial = 'OSB';
        }

        element = element.previousElementSibling;
        searchDepth++;
      }

      // Parser le premier élément avant le tableau (souvent le type de produit)
      const firstChild = table.parentElement?.querySelector('span, p, div');
      if (firstChild?.textContent) {
        const txt = firstChild.textContent.toLowerCase();
        if (txt.includes('stratifié')) currentMaterial = 'Stratifié';
        else if (txt.includes('mélaminé')) currentMaterial = 'Mélaminé';
        else if (txt.includes('chant')) currentMaterial = 'Chant';
      }

      // Parser les lignes du tableau
      const rows = table.querySelectorAll('tbody tr, tr');

      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) continue;

        // Format: Long. (m) | Larg. (m) | Haut. (mm) | Qualité/Support | Code | Stock | Prix
        const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

        let length = 0;
        let width = 0;
        let thickness = 0;
        let quality = '';
        let code = '';
        let stock = '';
        let price: number | null = null;

        for (let i = 0; i < cellTexts.length; i++) {
          const text = cellTexts[i];
          const numMatch = text.match(/[\d.,]+/);

          // Première colonne: Longueur en mètres
          if (i === 0 && numMatch) {
            const val = parseFloat(numMatch[0].replace(',', '.'));
            // Si < 10, c'est en mètres, sinon en mm
            length = val < 10 ? Math.round(val * 1000) : Math.round(val);
          }
          // Deuxième colonne: Largeur en mètres
          else if (i === 1 && numMatch) {
            const val = parseFloat(numMatch[0].replace(',', '.'));
            width = val < 10 ? Math.round(val * 1000) : Math.round(val);
          }
          // Troisième colonne: Épaisseur en mm
          else if (i === 2 && numMatch) {
            thickness = parseFloat(numMatch[0].replace(',', '.'));
          }
          // Qualité/Support
          else if (i === 3) {
            quality = text;
          }
          // Code (5-6 chiffres)
          else if (/^\d{5,6}$/.test(text.replace(/\s/g, ''))) {
            code = text.replace(/\s/g, '');
          }
          // Stock
          else if (text.toUpperCase().includes('STOCK') || text.toLowerCase().includes('commande')) {
            stock = text.toUpperCase().includes('EN STOCK') ? 'EN STOCK' : 'Sur commande';
          }
          // Prix
          else if (text.includes('€') || text.includes('EUR')) {
            const priceMatch = text.match(/[\d.,]+/);
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(',', '.'));
            }
          }
        }

        // Si pas de code trouvé, chercher dans les cellules
        if (!code) {
          for (const text of cellTexts) {
            const codeMatch = text.match(/\b(\d{5,6})\b/);
            if (codeMatch) {
              code = codeMatch[1];
              break;
            }
          }
        }

        // Déterminer le matériau depuis la qualité si pas déjà défini
        if (!currentMaterial && quality) {
          const q = quality.toLowerCase();
          if (q.includes('hpl') || q.includes('stratifié')) currentMaterial = 'Stratifié';
          else if (q.includes('mdf')) currentMaterial = 'MDF';
          else if (q.includes('particules') || q.includes('aggloméré')) currentMaterial = 'Aggloméré';
          else if (q.includes('contreplaqué')) currentMaterial = 'Contreplaqué';
        }

        // Finition depuis le nom ou la qualité
        let finish: string | null = null;
        const combinedText = (currentProductName + ' ' + quality).toLowerCase();
        if (combinedText.includes('mat')) finish = 'Mat';
        else if (combinedText.includes('brillant')) finish = 'Brillant';
        else if (combinedText.includes('satiné')) finish = 'Satiné';
        else if (combinedText.includes('structuré')) finish = 'Structuré';

        if (code && (length > 0 || thickness > 0)) {
          results.push({
            reference: `BCB-${code}`,
            name: currentProductName || `Panneau ${currentMaterial || 'Standard'}`,
            material: currentMaterial || 'Panneau',
            finish,
            thickness,
            length,
            width,
            pricePerM2: price,
            stock,
            imageUrl: currentProductImage || null,
            categorySlug: catSlug,
          });
        }
      }
    }

    return results;
  }, categorySlug);

  return variants;
}

async function main() {
  console.log('🔄 RE-SCRAPING COMPLET AGENCEMENT B COMME BOIS');
  console.log('='.repeat(60));
  console.log('📐 Extraction des dimensions: Long. (m) → mm, Larg. (m) → mm, Haut. (mm)');
  console.log('='.repeat(60) + '\n');

  // Connexion Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome non connecté. Lancez: scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté à Chrome\n');

  // Stats
  const stats: ScrapingStats = {
    totalVariants: 0,
    created: 0,
    updated: 0,
    errors: 0,
    byCategory: new Map(),
  };

  // Récupérer le catalogue Bouney
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney non trouvé');
    process.exit(1);
  }
  console.log(`📦 Catalogue: ${catalogue.name}\n`);

  // Parcourir chaque catégorie
  for (const category of CATEGORIES) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📂 ${category.name}`);
    console.log(`${'═'.repeat(60)}`);

    // Créer/récupérer la catégorie principale
    const mainCat = await prisma.category.upsert({
      where: {
        catalogueId_slug: { catalogueId: catalogue.id, slug: category.slug }
      },
      update: { name: category.name },
      create: {
        name: category.name,
        slug: category.slug,
        catalogueId: catalogue.id
      }
    });

    for (const subcat of category.subcategories) {
      console.log(`\n   📁 ${subcat.name}`);
      console.log(`      URL: ${subcat.url}`);

      // Créer la sous-catégorie
      const dbSubcat = await prisma.category.upsert({
        where: {
          catalogueId_slug: { catalogueId: catalogue.id, slug: `${category.slug}-${subcat.slug}` }
        },
        update: { name: subcat.name, parentId: mainCat.id },
        create: {
          name: subcat.name,
          slug: `${category.slug}-${subcat.slug}`,
          catalogueId: catalogue.id,
          parentId: mainCat.id
        }
      });

      try {
        // Naviguer vers la page
        await page.goto(subcat.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        // Scroll pour charger tous les produits
        await scrollToLoadAll(page);

        // Parser les tableaux
        const variants = await parseProductTables(page, `${category.slug}-${subcat.slug}`);
        console.log(`      📊 ${variants.length} variantes trouvées`);

        stats.byCategory.set(subcat.name, variants.length);

        // Sauvegarder en base
        let saved = 0;
        let errors = 0;

        for (const variant of variants) {
          try {
            await prisma.panel.upsert({
              where: {
                catalogueId_reference: { catalogueId: catalogue.id, reference: variant.reference }
              },
              update: {
                name: variant.name,
                material: variant.material,
                finish: variant.finish,
                thickness: variant.thickness > 0 ? [variant.thickness] : [],
                defaultLength: variant.length,
                defaultWidth: variant.width,
                pricePerM2: variant.pricePerM2,
                stockStatus: variant.stock || null,
                isActive: true,
                categoryId: dbSubcat.id,
              },
              create: {
                reference: variant.reference,
                name: variant.name,
                material: variant.material,
                finish: variant.finish,
                thickness: variant.thickness > 0 ? [variant.thickness] : [],
                defaultLength: variant.length,
                defaultWidth: variant.width,
                pricePerM2: variant.pricePerM2,
                stockStatus: variant.stock || null,
                imageUrl: variant.imageUrl,
                isActive: true,
                catalogueId: catalogue.id,
                categoryId: dbSubcat.id,
              }
            });
            saved++;
            stats.totalVariants++;
            stats.updated++;
          } catch (err) {
            errors++;
            stats.errors++;
          }
        }

        console.log(`      ✅ ${saved} sauvegardées, ${errors} erreurs`);

      } catch (err) {
        console.log(`      ❌ Erreur: ${(err as Error).message}`);
        stats.errors++;
      }

      // Pause anti-rate-limit
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Résumé
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log('📊 RÉSUMÉ DU RE-SCRAPING');
  console.log(`${'═'.repeat(60)}`);
  console.log(`📋 Total variantes traitées: ${stats.totalVariants}`);
  console.log(`✅ Mises à jour: ${stats.updated}`);
  console.log(`❌ Erreurs: ${stats.errors}`);
  console.log(`\n📂 Par catégorie:`);
  for (const [cat, count] of stats.byCategory) {
    console.log(`   - ${cat}: ${count}`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  await prisma.$disconnect();
  await browser.disconnect();
  console.log('✅ Re-scraping terminé!');
}

main().catch(e => {
  console.error('❌ Erreur fatale:', e);
  prisma.$disconnect();
  process.exit(1);
});
