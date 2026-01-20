/**
 * Scraper BCB - Chants simples (sans tableau de variantes)
 *
 * Pour les produits qui n'ont qu'une seule variante (pas de tableau)
 * Les infos sont dans les "Caractéristiques techniques"
 *
 * Usage:
 *   npx tsx scripts/scrape-bcb-chants-simples.ts           # Mode réel
 *   npx tsx scripts/scrape-bcb-chants-simples.ts --dry-run # Test
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { PrismaClient, ProductSubType, ProductType } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// URLs des produits simples à scraper (sans tableau de variantes)
const SIMPLE_PRODUCTS = [
  // Chants bois
  { url: 'https://www.bcommebois.fr/chant-bois-chene-de-fil-24-x-1-mm-non-encolle-87310.html', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-shinnoki-4-0-bondi-oak-non-encolle-106112.html', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-aniegre-24-x-0-6-mm-rouleau-de-20-ml-preencolle-80845.html', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-hetre-etuve-23-x-0-6-mm-rouleau-de-100-ml-preencolle-80150.html', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-orme-24-x-0-6-mm-rouleau-de-20-ml-preencolle-70909.html', subType: ProductSubType.CHANT_BOIS },
  // Chants mélaminés
  { url: 'https://www.bcommebois.fr/chant-mela-blanc-lisse-23-x-0-6-mm-rouleau-de-25-ml-preencolle-80847.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-blanc-veine-23-x-0-6-mm-rouleau-de-25-ml-preencolle-80849.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-gris-24-x-0-6-mm-rouleau-de-25-ml-preencolle-77993.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-hetre-24-x-0-6-mm-rouleau-de-25-ml-preencolle-76906.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-a-vernir-mdf-23-x-0-6-mm-89456.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-a-vernir-mdf-43-x-0-6-mm-106093.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-beige-rouleau-de-25-ml-preencolle-80846.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-chene-du-jura-rouleau-de-25-ml-preencolle-80859.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-hetre-40-x-0-6-mm-rouleau-de-20-ml-preencolle-78020.html', subType: ProductSubType.CHANT_MELAMINE },
  { url: 'https://www.bcommebois.fr/chant-mela-pin-24-x-0-4-mm-rouleau-de-25-ml-preencolle-76908.html', subType: ProductSubType.CHANT_MELAMINE },
  // Chants ABS
  { url: 'https://www.bcommebois.fr/chant-abs-23x2-0mm-f509-st2-egger-aluminium-81091.html', subType: ProductSubType.CHANT_ABS },
  { url: 'https://www.bcommebois.fr/chant-abs-tbrill-crystal-blanco-23-x-1-mm-air-chaud-86117.html', subType: ProductSubType.CHANT_ABS },
  { url: 'https://www.bcommebois.fr/chant-abs-030-soft-iii-23x0-8-mm-blanco-super-105690.html', subType: ProductSubType.CHANT_ABS },
  { url: 'https://www.bcommebois.fr/chant-abs-blanc-lunaire-23x0-8-mm-blanc-lunaire-sable-105691.html', subType: ProductSubType.CHANT_ABS },
];

interface SimpleProduct {
  name: string;
  reference: string;
  supplierCode: string | null;
  width: number | null;
  thickness: number | null;
  length: number | null;
  isVariableLength: boolean;
  isPreglued: boolean;
  stockStatus: string;
  supportQuality: string | null;
  imageUrl: string | null;
  decor: string | null;
}

async function connectBrowser(): Promise<Browser> {
  return puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
}

async function scrapeSimpleProduct(page: Page, url: string): Promise<SimpleProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log(`  ⚠️ Erreur navigation: ${url}`);
    return null;
  }

  const result = await page.evaluate(() => {
    // Nom du produit
    const nameEl = document.querySelector('h1.page-title span, h1.page-title, .product-name h1');
    const name = nameEl?.textContent?.trim() || '';

    // Image
    const imgEl = document.querySelector('.gallery-placeholder img, .product-image img, .fotorama__img');
    const imageUrl = imgEl?.getAttribute('src') || null;

    // Référence/Code produit
    let supplierCode: string | null = null;
    const refMatch = document.body.innerText.match(/Réf\.\s*:\s*(\d+)/);
    if (refMatch) {
      supplierCode = refMatch[1];
    }

    // Stock
    const bodyText = document.body.innerText.toLowerCase();
    const stockStatus = bodyText.includes('en stock') ? 'EN STOCK' : 'Sur commande';

    // Caractéristiques techniques
    let width: number | null = null;
    let thickness: number | null = null;
    let length: number | null = null;
    let isVariableLength = false;
    let supportQuality: string | null = null;
    let decor: string | null = null;
    let isPreglued = false;

    // Chercher dans les caractéristiques
    const allText = document.body.innerText;

    // Largeur (en mètres sur le site, donc x1000 pour mm)
    const largeurMatch = allText.match(/Largeur\s*\(?m?\)?\s*:?\s*([\d.,]+)/i);
    if (largeurMatch) {
      const val = parseFloat(largeurMatch[1].replace(',', '.'));
      // Si < 1, c'est en mètres, sinon en mm
      width = val < 1 ? Math.round(val * 1000) : val;
    }

    // Hauteur/Épaisseur (en mm)
    const hauteurMatch = allText.match(/Hauteur\s*\(?mm?\)?\s*:?\s*([\d.,]+)/i);
    if (hauteurMatch) {
      thickness = parseFloat(hauteurMatch[1].replace(',', '.'));
    }

    // Longueur
    const longueurMatch = allText.match(/Longueur\s*\(?(?:m|mm)?\)?\s*:?\s*([\d.,]+)/i);
    if (longueurMatch) {
      const val = parseFloat(longueurMatch[1].replace(',', '.'));
      length = val < 10 ? Math.round(val * 1000) : val; // Convertir m en mm si nécessaire
    }

    // Rouleau = longueur variable
    if (name.toLowerCase().includes('rouleau') || allText.toLowerCase().includes('rouleau')) {
      isVariableLength = true;
      // Extraire la longueur du rouleau si mentionnée
      const rouleauMatch = name.match(/rouleau\s*de\s*(\d+)\s*ml/i);
      if (rouleauMatch) {
        length = parseInt(rouleauMatch[1]) * 1000; // ml en mm
      }
    }

    // Qualité/Support
    const qualiteMatch = allText.match(/Qualité\/Support\s*:?\s*([^\n]+)/i);
    if (qualiteMatch) {
      supportQuality = qualiteMatch[1].trim();
    }

    // Préencollé
    if (name.toLowerCase().includes('préencollé') ||
        name.toLowerCase().includes('preencolle') ||
        (supportQuality && supportQuality.toLowerCase().includes('préencollé'))) {
      isPreglued = true;
    }
    // "non encollé" = pas préencollé
    if (name.toLowerCase().includes('non encollé') ||
        name.toLowerCase().includes('non encolle') ||
        (supportQuality && supportQuality.toLowerCase().includes('non encollé'))) {
      isPreglued = false;
    }

    // Décor/Essence
    const decorMatch = allText.match(/Décor\/Essence\s*:?\s*([^\n]+)/i);
    if (decorMatch) {
      decor = decorMatch[1].trim();
    }

    return {
      name,
      supplierCode,
      width,
      thickness,
      length,
      isVariableLength,
      isPreglued,
      stockStatus,
      supportQuality,
      imageUrl,
      decor
    };
  });

  if (!result.name) {
    return null;
  }

  return {
    ...result,
    reference: `BCB-${result.supplierCode || 'UNKN'}`
  };
}

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 MODE DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('📋 Scraping des chants simples (sans tableau)');
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

  for (const item of SIMPLE_PRODUCTS) {
    console.log(`\n📦 ${item.url.split('/').pop()}`);

    const product = await scrapeSimpleProduct(page, item.url);

    if (!product) {
      console.log('   ⚠️ Échec du scraping');
      continue;
    }

    console.log(`   Nom: ${product.name}`);
    console.log(`   Code: ${product.supplierCode}`);
    console.log(`   Dims: ${product.length || 'var'}x${product.width}x${product.thickness}mm`);
    console.log(`   Préencollé: ${product.isPreglued ? 'Oui' : 'Non'}`);

    // Vérifier si existe déjà
    if (product.supplierCode) {
      const existing = await prisma.panel.findFirst({
        where: {
          catalogueId: catalogue.id,
          supplierCode: product.supplierCode
        }
      });

      if (existing) {
        console.log('   ⏭️ Déjà existant');
        skipped++;
        continue;
      }
    }

    const reference = `BCB-CHANT-${product.supplierCode || Date.now()}`;

    const panelData = {
      reference,
      name: product.name,
      catalogueId: catalogue.id,
      panelType: ProductType.CHANT,
      panelSubType: item.subType,
      defaultLength: Math.round(product.isVariableLength ? 0 : (product.length || 0)),
      defaultWidth: Math.round(product.width || 0),
      defaultThickness: product.thickness || null,
      isVariableLength: product.isVariableLength,
      stockStatus: product.stockStatus,
      supportQuality: product.supportQuality,
      isPreglued: product.isPreglued,
      supplierCode: product.supplierCode,
      imageUrl: product.imageUrl,
      decor: product.decor
    };

    if (DRY_RUN) {
      console.log(`   ✅ [DRY] Créerait: ${reference}`);
    } else {
      await prisma.panel.create({ data: panelData });
      console.log(`   ✅ Créé: ${reference}`);
    }

    created++;
  }

  await page.close();

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Créés: ${created}`);
  console.log(`   Ignorés: ${skipped}`);
  console.log(`   Total: ${SIMPLE_PRODUCTS.length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
