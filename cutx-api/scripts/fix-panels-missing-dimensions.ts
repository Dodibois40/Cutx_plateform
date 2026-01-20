/**
 * Script pour corriger les dimensions manquantes des panneaux Bouney
 * Cible: panneaux avec prix/m² mais sans dimensions (25 panneaux identifiés)
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr
 * 3. npx tsx scripts/fix-panels-missing-dimensions.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dimensions standards connues pour certains types de panneaux
const STANDARD_DIMENSIONS: Record<string, { length: number; width: number }> = {
  // MDF/Mélaminés standards
  'MELAMINE_19': { length: 2800, width: 2070 },
  'MDF_19': { length: 2800, width: 2070 },
  // Plans de travail
  'PDT': { length: 4100, width: 600 },
  // Contreplaqués
  'CP': { length: 2500, width: 1220 },
};

/**
 * Scrape les dimensions depuis la page produit B comme Bois
 */
async function scrapeDimensionsFromPage(page: Page, reference: string): Promise<{
  length: number;
  width: number;
} | null> {
  try {
    // Extraire le code produit de la référence (ex: BCB-BAS-87981 -> 87981)
    const codeMatch = reference.match(/(\d{5,6})$/);
    if (!codeMatch) return null;

    const productCode = codeMatch[1];
    const url = `https://www.bcommebois.fr/catalogsearch/result/?q=${productCode}`;

    console.log(`      Recherche: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Trouver le lien du produit
    const productLink = await page.evaluate(() => {
      const links = document.querySelectorAll('a.product-item-link, .product-item a, a[href*=".html"]');
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (href && href.match(/\d{5,6}\.html$/)) {
          return href;
        }
      }
      return null;
    });

    if (!productLink) {
      console.log(`      ⚠️ Produit non trouvé sur le site`);
      return null;
    }

    console.log(`      Page produit: ${productLink.split('/').pop()}`);
    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Extraire les dimensions de la page
    const dimensions = await page.evaluate(() => {
      let length = 0;
      let width = 0;

      // 1. Chercher dans le tableau des variantes
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr, tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const texts = Array.from(cells).map(c => c.textContent?.trim() || '');

            // Chercher des valeurs de dimensions (>500mm)
            for (let i = 0; i < Math.min(3, texts.length); i++) {
              const numMatch = texts[i].match(/[\d.,]+/);
              if (numMatch) {
                const val = parseFloat(numMatch[0].replace(',', '.'));
                const normalized = val < 100 ? Math.round(val * 1000) : Math.round(val);

                if (normalized > 500 && normalized < 10000) {
                  if (i === 0) length = normalized;
                  else if (i === 1) width = normalized;
                }
              }
            }

            if (length > 0 && width > 0) return { length, width };
          }
        }
      }

      // 2. Chercher dans les specs/attributs
      const specElements = document.querySelectorAll('.product-attribute, .additional-attributes td, [class*="spec"]');
      for (const el of specElements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('longueur') || text.includes('length')) {
          const match = text.match(/(\d{3,4})/);
          if (match && parseInt(match[1]) > 500) length = parseInt(match[1]);
        }
        if (text.includes('largeur') || text.includes('width')) {
          const match = text.match(/(\d{3,4})/);
          if (match && parseInt(match[1]) > 500) width = parseInt(match[1]);
        }
      }

      // 3. Chercher dans le titre H1
      const h1 = document.querySelector('h1')?.textContent || '';
      const dimMatch = h1.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
      if (dimMatch) {
        length = length || parseInt(dimMatch[1]);
        width = width || parseInt(dimMatch[2]);
      }

      // 4. Chercher dans tout le body pour format dimension
      if (length === 0 || width === 0) {
        const bodyText = document.body.innerText;
        const patterns = [
          /(\d{4})\s*[x×]\s*(\d{4})\s*mm/gi,
          /(\d{4})\s*[x×]\s*(\d{3,4})/gi,
          /format\s*:?\s*(\d{3,4})\s*[x×]\s*(\d{3,4})/gi,
        ];
        for (const pattern of patterns) {
          const match = pattern.exec(bodyText);
          if (match) {
            const v1 = parseInt(match[1]);
            const v2 = parseInt(match[2]);
            if (v1 > 500 && v2 > 500) {
              length = length || Math.max(v1, v2);
              width = width || Math.min(v1, v2);
              break;
            }
          }
        }
      }

      return { length, width };
    });

    if (dimensions.length > 0 && dimensions.width > 0) {
      return dimensions;
    }

    return null;
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message.substring(0, 50)}`);
    return null;
  }
}

async function main() {
  console.log('🔧 CORRECTION DES DIMENSIONS - PANNEAUX AVEC PRIX/M²');
  console.log('='.repeat(60));

  const catalogue = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });
  if (!catalogue) {
    console.log('❌ Catalogue Bouney non trouvé');
    return;
  }

  // Récupérer les panneaux avec prix/m² mais sans dimensions
  const panelsToFix = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      defaultLength: 0,
      pricePerM2: { gt: 0 },
      NOT: { reference: { contains: 'CHANT' } },
      panelType: { not: 'CHANT' }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
      productType: true,
      defaultThickness: true,
      pricePerM2: true
    }
  });

  console.log(`\n📊 ${panelsToFix.length} panneaux avec prix/m² mais sans dimensions\n`);

  if (panelsToFix.length === 0) {
    console.log('✅ Aucun panneau à corriger!');
    await prisma.$disconnect();
    return;
  }

  // Lister les panneaux
  console.log('📋 PANNEAUX À CORRIGER:');
  for (const p of panelsToFix) {
    console.log(`   ${p.reference} | ${p.pricePerM2}€/m² | ${p.name.substring(0, 50)}`);
  }

  // Connexion Chrome
  let browser;
  try {
    console.log('\n🔌 Connexion à Chrome...');
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Connecté!\n');
  } catch (e) {
    console.log('\n⚠️ Chrome non disponible.');
    console.log('   Lancez Chrome avec: scripts/launch-chrome-debug.bat');

    // Essayer d'assigner des dimensions par défaut
    console.log('\n📝 Application des dimensions par défaut...\n');

    let fixed = 0;
    for (const panel of panelsToFix) {
      // Dimensions par défaut pour MDF/Mélaminés
      if (panel.panelType === 'MELAMINE' || panel.productType === 'MDF' || panel.name.includes('Fibralux')) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: { defaultLength: 2800, defaultWidth: 2070 }
        });
        console.log(`   ✅ ${panel.reference}: 2800 × 2070 mm (défaut MDF)`);
        fixed++;
      } else if (panel.reference.includes('PDT') || panel.name.includes('Plan de travail')) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: { defaultLength: 4100, defaultWidth: 600 }
        });
        console.log(`   ✅ ${panel.reference}: 4100 × 600 mm (défaut PDT)`);
        fixed++;
      } else if (panel.name.includes('Querkus')) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: { defaultLength: 2800, defaultWidth: 2070 }
        });
        console.log(`   ✅ ${panel.reference}: 2800 × 2070 mm (défaut Querkus)`);
        fixed++;
      } else {
        console.log(`   ⚠️ ${panel.reference}: dimensions inconnues`);
      }
    }

    console.log(`\n📊 ${fixed}/${panelsToFix.length} corrigés avec dimensions par défaut`);
    await prisma.$disconnect();
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  let fixed = 0;
  let notFixed = 0;

  console.log('🔍 Scraping des dimensions...\n');

  for (let i = 0; i < panelsToFix.length; i++) {
    const panel = panelsToFix[i];
    console.log(`\n[${i + 1}/${panelsToFix.length}] ${panel.reference}`);
    console.log(`   ${panel.name.substring(0, 50)}...`);

    const dims = await scrapeDimensionsFromPage(page, panel.reference);

    if (dims) {
      console.log(`   ✅ Trouvé: ${dims.length} × ${dims.width} mm`);

      await prisma.panel.update({
        where: { id: panel.id },
        data: {
          defaultLength: dims.length,
          defaultWidth: dims.width
        }
      });

      fixed++;
    } else {
      // Fallback sur dimensions par défaut
      let defaultDims: { length: number; width: number } | null = null;

      if (panel.panelType === 'MELAMINE' || panel.name.includes('Fibralux')) {
        defaultDims = { length: 2800, width: 2070 };
      } else if (panel.name.includes('Querkus')) {
        defaultDims = { length: 2800, width: 2070 };
      } else if (panel.reference.includes('PDT')) {
        defaultDims = { length: 4100, width: 600 };
      }

      if (defaultDims) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: {
            defaultLength: defaultDims.length,
            defaultWidth: defaultDims.width
          }
        });
        console.log(`   📐 Défaut appliqué: ${defaultDims.length} × ${defaultDims.width} mm`);
        fixed++;
      } else {
        console.log(`   ❌ Dimensions non trouvées`);
        notFixed++;
      }
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.disconnect();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ CORRECTION TERMINÉE!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Corrigés: ${fixed}`);
  console.log(`   Non corrigés: ${notFixed}`);
  console.log(`${'='.repeat(60)}\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
