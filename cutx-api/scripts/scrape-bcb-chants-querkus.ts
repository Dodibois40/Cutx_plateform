/**
 * Scraper BCB - Chants Querkus et autres avec format spécial
 *
 * Ces produits ont un tableau avec une colonne "bande de chant" en première position
 * Format: bande de chant | Long. | Larg. | Haut. | Code | Stock | Prix
 *
 * Usage:
 *   npx tsx scripts/scrape-bcb-chants-querkus.ts           # Mode réel
 *   npx tsx scripts/scrape-bcb-chants-querkus.ts --dry-run # Test
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { PrismaClient, ProductSubType, ProductType } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// URLs des produits avec format spécial (colonne "bande de chant" en premier)
const SPECIAL_PRODUCTS = [
  // Querkus
  'https://www.bcommebois.fr/chant-querkus-adagio-brosse-10-10ieme-non-encolle.html',
  'https://www.bcommebois.fr/chant-querkus-adagio-scratched.html',
  'https://www.bcommebois.fr/chant-querkus-allegrobrosse-10-10ieme-non-encolle.html',
  'https://www.bcommebois.fr/chant-querkus-smoked-havana-scratched-8-10ieme-non-encolle.html',
  'https://www.bcommebois.fr/chant-querkus-vintage-hoboken-brossebrushed-10-10ieme-non-encolle.html',
  'https://www.bcommebois.fr/chant-querkus-vivace-brosse.html',
  'https://www.bcommebois.fr/chant-querkus-vivace-scratched.html',
  // Autres
  'https://www.bcommebois.fr/chant-bois-hetre-blanc.html',
  'https://www.bcommebois.fr/chant-abs-blanc-lisse.html',
];

interface Variant {
  length: number | null;
  width: number | null;
  thickness: number | null;
  supplierCode: string | null;
  stockStatus: string;
}

interface Product {
  name: string;
  imageUrl: string | null;
  variants: Variant[];
  isPreglued: boolean;
}

async function connectBrowser(): Promise<Browser> {
  return puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
}

async function scrapeProduct(page: Page, url: string): Promise<Product | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log(`  ⚠️ Erreur navigation: ${url}`);
    return null;
  }

  const result = await page.evaluate(() => {
    // Nom du produit
    const nameEl = document.querySelector('h1.page-title span, h1.page-title');
    const name = nameEl?.textContent?.trim() || '';

    // Image
    const imgEl = document.querySelector('.gallery-placeholder img, .product-image img, .fotorama__img');
    const imageUrl = imgEl?.getAttribute('src') || null;

    // Préencollé ?
    const isPreglued = name.toLowerCase().includes('préencollé') ||
                       name.toLowerCase().includes('preencolle');

    // Tableau des variantes
    const table = document.querySelector('table');
    const variants: Variant[] = [];

    if (table) {
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) return;

        // Format: [description] | Long. | Larg. | Haut. | Code | Stock | Prix
        // Ou:     Long. | Larg. | Haut. | Code | Stock | Prix

        let longIdx = 0;
        let largIdx = 1;
        let hautIdx = 2;
        let codeIdx = 3;
        let stockIdx = 4;

        // Détecter si première colonne est une description (texte sans chiffre)
        const firstCell = cells[0].textContent?.trim() || '';
        if (firstCell === '-' || firstCell === '' || !firstCell.match(/^\d/)) {
          // Première colonne est une description, décaler les index
          longIdx = 1;
          largIdx = 2;
          hautIdx = 3;
          codeIdx = 4;
          stockIdx = 5;
        }

        const variant: Variant = {
          length: null,
          width: null,
          thickness: null,
          supplierCode: null,
          stockStatus: 'Sur commande'
        };

        // Longueur (en mètres, convertir en mm)
        const longText = cells[longIdx]?.textContent?.trim() || '';
        const longMatch = longText.match(/([\d.,]+)/);
        if (longMatch) {
          const val = parseFloat(longMatch[1].replace(',', '.'));
          variant.length = val < 100 ? Math.round(val * 1000) : val; // m -> mm
        }

        // Largeur (en mètres, convertir en mm)
        const largText = cells[largIdx]?.textContent?.trim() || '';
        const largMatch = largText.match(/([\d.,]+)/);
        if (largMatch) {
          const val = parseFloat(largMatch[1].replace(',', '.'));
          variant.width = val < 1 ? Math.round(val * 1000) : val; // m -> mm
        }

        // Hauteur/Épaisseur (en mm)
        const hautText = cells[hautIdx]?.textContent?.trim() || '';
        const hautMatch = hautText.match(/([\d.,]+)/);
        if (hautMatch) {
          variant.thickness = parseFloat(hautMatch[1].replace(',', '.'));
        }

        // Code
        const codeText = cells[codeIdx]?.textContent?.trim() || '';
        if (codeText && codeText.match(/^\d+$/)) {
          variant.supplierCode = codeText;
        }

        // Stock
        const stockText = cells[stockIdx]?.textContent?.trim().toLowerCase() || '';
        variant.stockStatus = stockText.includes('stock') ? 'EN STOCK' : 'Sur commande';

        if (variant.width || variant.supplierCode) {
          variants.push(variant);
        }
      });
    }

    return { name, imageUrl, variants, isPreglued };
  });

  if (!result.name) {
    return null;
  }

  return result;
}

function getSubType(url: string): ProductSubType {
  if (url.includes('abs') || url.includes('pvc')) {
    return ProductSubType.CHANT_ABS;
  }
  if (url.includes('mela')) {
    return ProductSubType.CHANT_MELAMINE;
  }
  return ProductSubType.CHANT_BOIS;
}

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 MODE DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('📋 Scraping des chants Querkus et format spécial');
  console.log('');

  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue "bouney" non trouvé');
    process.exit(1);
  }

  console.log(`📦 Catalogue: ${catalogue.name}`);
  console.log('');

  const browser = await connectBrowser();
  const page = await browser.newPage();

  let created = 0;
  let skipped = 0;

  for (const url of SPECIAL_PRODUCTS) {
    console.log(`\n📦 ${url.split('/').pop()}`);

    const product = await scrapeProduct(page, url);

    if (!product) {
      console.log('   ⚠️ Échec du scraping');
      continue;
    }

    console.log(`   Nom: ${product.name}`);
    console.log(`   Variantes trouvées: ${product.variants.length}`);

    if (product.variants.length === 0) {
      console.log('   ⚠️ Aucune variante parsée');
      continue;
    }

    const subType = getSubType(url);

    for (const variant of product.variants) {
      console.log(`   → ${variant.width}mm x ${variant.thickness}mm (${variant.supplierCode})`);

      // Vérifier si existe déjà
      if (variant.supplierCode) {
        const existing = await prisma.panel.findFirst({
          where: {
            catalogueId: catalogue.id,
            supplierCode: variant.supplierCode
          }
        });

        if (existing) {
          console.log('     ⏭️ Déjà existant');
          skipped++;
          continue;
        }
      }

      const reference = `BCB-QUERKUS-${variant.supplierCode || Date.now()}`;

      const panelData = {
        reference,
        name: `${product.name} ${variant.width}mm ép.${variant.thickness}mm`,
        catalogueId: catalogue.id,
        panelType: ProductType.CHANT,
        panelSubType: subType,
        defaultLength: Math.round(variant.length || 0),
        defaultWidth: Math.round(variant.width || 0),
        defaultThickness: variant.thickness || null,
        isVariableLength: false,
        stockStatus: variant.stockStatus,
        supportQuality: product.isPreglued ? 'préencollé' : 'non encollé',
        isPreglued: product.isPreglued,
        supplierCode: variant.supplierCode,
        imageUrl: product.imageUrl
      };

      if (DRY_RUN) {
        console.log(`     ✅ [DRY] Créerait: ${reference}`);
      } else {
        await prisma.panel.create({ data: panelData });
        console.log(`     ✅ Créé: ${reference}`);
      }

      created++;
    }
  }

  await page.close();

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Créés: ${created}`);
  console.log(`   Ignorés: ${skipped}`);

  await prisma.$disconnect();
}

main().catch(console.error);
