/**
 * SCRAPING B COMME BOIS - LIBRE SERVICE / CHANTS
 *
 * Scrape les 3 catégories de chants:
 * - Chants bois
 * - Chants mélaminés
 * - Chants ABS / PVC
 *
 * Usage:
 *   npx tsx scripts/scrape-bcb-libre-service-chants.ts [--dry-run] [--category=bois|melamines|abs]
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { PrismaClient, ProductSubType, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const CATEGORY_FILTER = process.argv.find(a => a.startsWith('--category='))?.split('=')[1];

// URLs des catégories de chants
const CHANT_CATEGORIES: Array<{
  name: string;
  url: string;
  subType: ProductSubType;
  key: string;
}> = [
  {
    name: 'Chants bois',
    url: 'https://www.bcommebois.fr/libre-service/chant/chants-bois.html',
    subType: ProductSubType.CHANT_BOIS,
    key: 'bois'
  },
  {
    name: 'Chants mélaminés',
    url: 'https://www.bcommebois.fr/libre-service/chant/chants-melamines.html',
    subType: ProductSubType.CHANT_MELAMINE,
    key: 'melamines'
  },
  {
    name: 'Chants ABS / PVC',
    url: 'https://www.bcommebois.fr/libre-service/chant/chants-abs-pvc.html',
    subType: ProductSubType.CHANT_ABS,
    key: 'abs'
  }
];

interface ProductVariant {
  length: number;           // mm (ou 0 si variable)
  width: number;            // mm
  thickness: number;        // mm
  supportQuality: string;   // "bois non encollé", "préencollé", etc.
  supplierCode: string;     // Code BCB (ex: "83814")
  stockStatus: string;      // "EN STOCK" ou "Sur commande"
  price: number | null;
  priceType: 'ML' | 'M2' | 'UNIT';
  isVariableLength: boolean;
  isPreglued: boolean;      // true = préencollé (fer à repasser), false = non encollé (plaqueuse)
}

interface ScrapedChant {
  name: string;
  detailUrl: string;
  imageUrl: string | null;
  variants: ProductVariant[];
  // Infos de la page détail
  essence?: string;
  finition?: string;
  decor?: string;
}

/**
 * Récupère la liste des produits d'une page catégorie
 */
async function getProductLinks(page: Page, categoryUrl: string): Promise<{ name: string; url: string; image: string | null }[]> {
  console.log(`\n📄 Récupération des liens: ${categoryUrl}`);

  try {
    await page.goto(categoryUrl + '?product_list_limit=500', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await new Promise(r => setTimeout(r, 5000)); // Attendre le chargement complet

    // Scroll lent pour charger tous les produits sans casser le contexte
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await new Promise(r => setTimeout(r, 500));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.error(`   ❌ Erreur navigation: ${(e as Error).message}`);
    return [];
  }

  let products: { name: string; url: string; image: string | null }[] = [];

  try {
    products = await page.evaluate(() => {
      const results: { name: string; url: string; image: string | null }[] = [];

      // Chercher tous les liens vers les pages produits
      const productLinks = document.querySelectorAll('a[href$=".html"]');

      productLinks.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        const pathname = new URL(href).pathname;

        // FILTRE STRICT: Seuls les produits chants (URLs /chant-xxx.html)
        // Exclut toutes les catégories et pages de navigation
        if (!pathname.startsWith('/chant-')) {
          return;
        }

        // Vérifier que c'est bien un lien produit avec du contenu
        const text = link.textContent?.trim() || '';
        const img = link.querySelector('img') as HTMLImageElement;

        // Ne garder que les liens avec du contenu (nom ou image)
        if (text.length > 3 || img) {
          const name = text || img?.alt || '';
          const imageUrl = img?.src || img?.getAttribute('data-src') || null;

          // Éviter les doublons
          if (name && !results.find(r => r.url === href)) {
            results.push({
              name: name.substring(0, 100),
              url: href,
              image: imageUrl
            });
          }
        }
      });

      return results;
    });
  } catch (e) {
    console.error(`   ❌ Erreur évaluation: ${(e as Error).message}`);
    return [];
  }

  console.log(`   ✅ ${products.length} produits trouvés`);
  return products;
}

/**
 * Scrape une page produit détaillée
 */
async function scrapeProductPage(page: Page, productUrl: string): Promise<ScrapedChant | null> {
  try {
    await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const result: ScrapedChant = {
        name: '',
        detailUrl: window.location.href,
        imageUrl: null,
        variants: []
      };

      // Nom du produit
      const titleEl = document.querySelector('h1, .page-title');
      result.name = titleEl?.textContent?.trim() || '';

      // Image
      const imgEl = document.querySelector('.product-image img, .gallery-placeholder img') as HTMLImageElement;
      result.imageUrl = imgEl?.src || null;

      // Caractéristiques techniques
      const techRows = document.querySelectorAll('.product-attributes tr, .additional-attributes tr, table tr');
      techRows.forEach(row => {
        const label = row.querySelector('th, td:first-child')?.textContent?.toLowerCase().trim() || '';
        const value = row.querySelector('td:last-child, td:nth-child(2)')?.textContent?.trim() || '';

        if (label.includes('essence')) result.essence = value;
        if (label.includes('finition')) result.finition = value;
        if (label.includes('décor') || label.includes('decor')) result.decor = value;
      });

      // Tableau des variantes
      const tables = document.querySelectorAll('table');

      tables.forEach(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th =>
          th.textContent?.toLowerCase().trim() || ''
        );

        // Vérifier que c'est bien un tableau de variantes (avec Code et Stock)
        const hasCode = headers.some(h => h.includes('code'));
        const hasStock = headers.some(h => h.includes('stock'));

        if (!hasCode || !hasStock) return;

        // Parser les lignes de données
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 5) return;

          const variant: ProductVariant = {
            length: 0,
            width: 0,
            thickness: 0,
            supportQuality: '',
            supplierCode: '',
            stockStatus: '',
            price: null,
            priceType: 'ML',
            isVariableLength: false,
            isPreglued: false
          };

          cells.forEach((cell, idx) => {
            const text = cell.textContent?.trim() || '';
            const header = headers[idx] || '';

            // Matcher par header ou position (colonnes: long, larg, haut, qualite, code, stock, prix)
            if (header.includes('long') || idx === 0) {
              if (text.toLowerCase() === 'variable') {
                variant.isVariableLength = true;
              } else {
                const val = parseFloat(text.replace(',', '.'));
                if (!isNaN(val)) {
                  // Si < 10, c'est en mètres
                  variant.length = val < 10 ? Math.round(val * 1000) : Math.round(val);
                }
              }
            } else if (header.includes('larg') || idx === 1) {
              const val = parseFloat(text.replace(',', '.'));
              if (!isNaN(val)) {
                // Si < 1, c'est en mètres
                variant.width = val < 1 ? Math.round(val * 1000) : Math.round(val);
              }
            } else if (header.includes('haut') || header.includes('ep') || idx === 2) {
              const val = parseFloat(text.replace(',', '.'));
              if (!isNaN(val)) {
                variant.thickness = val;
              }
            } else if (header.includes('qualit') || header.includes('support') || idx === 3) {
              variant.supportQuality = text;
              // Détecter préencollé vs non encollé
              const lowerText = text.toLowerCase();
              if (lowerText.includes('préencollé') || lowerText.includes('preencollé') || lowerText.includes('pre-encollé')) {
                variant.isPreglued = true;
              } else {
                variant.isPreglued = false;
              }
            } else if (header.includes('code') || idx === 4) {
              variant.supplierCode = text;
            } else if (header.includes('stock') || idx === 5) {
              variant.stockStatus = text.toUpperCase().includes('STOCK') ? 'EN STOCK' : 'Sur commande';
            } else if (header.includes('prix') || idx === 6) {
              const priceMatch = text.match(/([\d,\.]+)/);
              if (priceMatch) {
                variant.price = parseFloat(priceMatch[1].replace(',', '.'));
              }
              if (text.includes('/ml') || text.includes('/m')) {
                variant.priceType = 'ML';
              }
            }
          });

          // Ne garder que les variantes avec un code numérique
          if (variant.supplierCode && variant.supplierCode.match(/^\d+$/)) {
            result.variants.push(variant);
          }
        });
      });

      return result;
    });

    return data.variants.length > 0 ? data : null;
  } catch (e) {
    console.error(`   ❌ Erreur sur ${productUrl}:`, (e as Error).message);
    return null;
  }
}

/**
 * Sauvegarde un chant en base
 */
async function saveChant(
  chant: ScrapedChant,
  catalogueId: string,
  subType: ProductSubType,
  variant: ProductVariant
): Promise<boolean> {
  const reference = `BCB-${variant.supplierCode}`;

  // Vérifier si existe déjà
  const existing = await prisma.panel.findFirst({
    where: { reference }
  });

  if (existing) {
    console.log(`   ⏭️  ${reference} existe déjà`);
    return false;
  }

  // Construire le nom complet
  let fullName = chant.name;
  if (variant.width > 0) {
    fullName += ` ${variant.width}mm`;
  }
  if (variant.thickness > 0) {
    fullName += ` ép.${variant.thickness}mm`;
  }
  if (variant.supportQuality) {
    fullName += ` - ${variant.supportQuality}`;
  }

  const panelData = {
    reference,
    name: fullName,
    catalogueId,
    panelType: ProductType.CHANT,
    panelSubType: subType,
    // Dimensions
    defaultLength: variant.isVariableLength ? 0 : (variant.length || 0),
    defaultWidth: variant.width || 0,
    defaultThickness: variant.thickness || null,
    isVariableLength: variant.isVariableLength,
    // Prix et stock
    stockStatus: variant.stockStatus,
    pricePerMl: variant.priceType === 'ML' ? variant.price : null,
    pricePerM2: variant.priceType === 'M2' ? variant.price : null,
    // Métadonnées
    imageUrl: chant.imageUrl,
    productUrl: chant.detailUrl,
    decorName: chant.decor || chant.essence || null,
    finish: chant.finition || null,
    supportQuality: variant.supportQuality,
    isPreglued: variant.isPreglued,
    supplierCode: variant.supplierCode,
    lastScrapedAt: new Date()
  };

  if (DRY_RUN) {
    console.log(`   [DRY-RUN] Créerait: ${reference} - ${fullName.substring(0, 50)}`);
    return true;
  }

  await prisma.panel.create({ data: panelData });
  console.log(`   ✅ Créé: ${reference}`);
  return true;
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     SCRAPING B COMME BOIS - LIBRE SERVICE / CHANTS            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  if (DRY_RUN) {
    console.log('\n🔸 MODE DRY-RUN - Aucune modification en base\n');
  }

  // Récupérer le catalogue BCB (Bouney)
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue "bouney" non trouvé!');
    return;
  }

  console.log(`\n📁 Catalogue: ${catalogue.name} (${catalogue.id})`);

  // Connexion Chrome
  let browser: Browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté!');
    console.error('   Lancez: cd cutx-api && scripts\\launch-chrome-debug.bat');
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  let totalCreated = 0;
  let totalSkipped = 0;

  // Filtrer les catégories si demandé
  const categories = CATEGORY_FILTER
    ? CHANT_CATEGORIES.filter(c => c.key === CATEGORY_FILTER)
    : CHANT_CATEGORIES;

  for (const category of categories) {
    console.log('\n' + '═'.repeat(60));
    console.log(`📂 ${category.name}`);
    console.log('═'.repeat(60));

    // 1. Récupérer la liste des produits
    const productLinks = await getProductLinks(page, category.url);

    // 2. Scraper chaque page produit
    let categoryCreated = 0;

    for (let i = 0; i < productLinks.length; i++) {
      const product = productLinks[i];
      console.log(`\n[${i + 1}/${productLinks.length}] ${product.name.substring(0, 40)}...`);

      const chantData = await scrapeProductPage(page, product.url);

      if (!chantData) {
        console.log('   ⚠️ Pas de variantes trouvées');
        continue;
      }

      console.log(`   📦 ${chantData.variants.length} variantes`);

      // Sauvegarder chaque variante
      for (const variant of chantData.variants) {
        const created = await saveChant(chantData, catalogue.id, category.subType, variant);
        if (created) {
          categoryCreated++;
          totalCreated++;
        } else {
          totalSkipped++;
        }
      }

      // Pause entre les requêtes
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n✅ ${category.name}: ${categoryCreated} chants créés`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Créés: ${totalCreated}`);
  console.log(`   Ignorés (existants): ${totalSkipped}`);
  console.log(`   Total traités: ${totalCreated + totalSkipped}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(console.error);
