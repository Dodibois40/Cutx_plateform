/**
 * Script pour corriger les dimensions manquantes des panneaux Bouney
 *
 * Ce script :
 * 1. Identifie les panneaux avec dimensions à 0
 * 2. Tente de récupérer les dimensions depuis B comme Bois
 * 3. Met à jour la base de données
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr
 * 3. npx tsx scripts/fix-bouney-missing-dimensions.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PanelToFix {
  id: string;
  reference: string;
  name: string;
  defaultThickness: number | null;
}

/**
 * Extrait les dimensions depuis une page produit B comme Bois
 */
async function scrapeDimensionsFromBCB(page: Page, name: string, reference: string): Promise<{
  length: number;
  width: number;
} | null> {
  try {
    // Recherche sur B comme Bois
    const searchQuery = encodeURIComponent(name.substring(0, 50));
    await page.goto(`https://www.bcommebois.fr/catalogsearch/result/?q=${searchQuery}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await new Promise(r => setTimeout(r, 2000));

    // Trouver le premier produit correspondant
    const productLink = await page.evaluate(() => {
      const links = document.querySelectorAll('a.product-item-link, a[href*=".html"]');
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (href && href.match(/\d{5,6}\.html$/)) {
          return href;
        }
      }
      return null;
    });

    if (!productLink) {
      console.log(`      ⚠️ Aucun produit trouvé pour: ${name.substring(0, 40)}...`);
      return null;
    }

    // Aller sur la page produit
    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Extraire les dimensions
    const dimensions = await page.evaluate(() => {
      let length = 0;
      let width = 0;

      // Chercher dans le tableau des variantes
      const rows = document.querySelectorAll('table tbody tr, table tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

          for (let i = 0; i < Math.min(3, cellTexts.length); i++) {
            const text = cellTexts[i];
            const numMatch = text.match(/[\d.,]+/);
            if (numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              const normalized = val < 100 ? Math.round(val * 1000) : Math.round(val);

              if (i === 0 && normalized > 500 && normalized < 10000) {
                length = normalized;
              } else if (i === 1 && normalized > 500 && normalized < 5000) {
                width = normalized;
              }
            }
          }

          if (length > 0 && width > 0) break;
        }
      }

      // Chercher dans le titre/nom du produit
      if (length === 0 || width === 0) {
        const title = document.querySelector('h1')?.textContent || '';
        const dimMatch = title.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
        if (dimMatch) {
          length = length || parseInt(dimMatch[1]);
          width = width || parseInt(dimMatch[2]);
        }
      }

      // Chercher dans les specs
      if (length === 0 || width === 0) {
        const specSelectors = [
          '.product-attribute',
          '.additional-attributes td',
          '.data.table.additional-attributes td'
        ];
        for (const sel of specSelectors) {
          const elements = document.querySelectorAll(sel);
          for (const el of elements) {
            const text = el.textContent || '';
            if (text.toLowerCase().includes('longueur') || text.toLowerCase().includes('length')) {
              const match = text.match(/(\d{3,4})/);
              if (match && parseInt(match[1]) > 500) {
                length = parseInt(match[1]);
              }
            }
            if (text.toLowerCase().includes('largeur') || text.toLowerCase().includes('width')) {
              const match = text.match(/(\d{3,4})/);
              if (match && parseInt(match[1]) > 500) {
                width = parseInt(match[1]);
              }
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
    console.log(`      ❌ Erreur scraping: ${(error as Error).message.substring(0, 50)}`);
    return null;
  }
}

/**
 * Tente d'extraire les dimensions du nom du produit
 */
function extractDimensionsFromName(name: string): { length: number; width: number } | null {
  // Patterns courants
  const patterns = [
    // Format: 2800 x 2070 mm ou 2800x2070
    /(\d{3,4})\s*[x×]\s*(\d{3,4})/i,
    // Format: 2800/2070
    /(\d{4})\s*\/\s*(\d{4})/,
    // Format avec mm: 2800 mm x 2070 mm
    /(\d{3,4})\s*mm?\s*[x×]\s*(\d{3,4})\s*mm?/i,
    // Format dans le nom: Larg.1100 Long.2200
    /larg\.?\s*(\d{3,4}).*long\.?\s*(\d{3,4})/i,
    /long\.?\s*(\d{3,4}).*larg\.?\s*(\d{3,4})/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const val1 = parseInt(match[1]);
      const val2 = parseInt(match[2]);

      // Valider que ce sont des dimensions plausibles
      if (val1 > 500 && val1 < 10000 && val2 > 500 && val2 < 5000) {
        // Longueur est généralement la plus grande valeur
        return {
          length: Math.max(val1, val2),
          width: Math.min(val1, val2)
        };
      }
    }
  }

  return null;
}

async function main() {
  console.log('🔧 CORRECTION DES DIMENSIONS MANQUANTES - BOUNEY');
  console.log('='.repeat(60));

  // Récupérer le catalogue Bouney
  const catalogue = await prisma.catalogue.findUnique({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.log('❌ Catalogue Bouney non trouvé');
    return;
  }

  // Récupérer les panneaux avec dimensions manquantes
  const panelsToFix = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      OR: [
        { defaultLength: 0 },
        { defaultWidth: 0 }
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultThickness: true
    }
  });

  console.log(`\n📊 ${panelsToFix.length} panneaux avec dimensions manquantes\n`);

  if (panelsToFix.length === 0) {
    console.log('✅ Aucun panneau à corriger!');
    return;
  }

  // Stats
  let fixedFromName = 0;
  let fixedFromScrape = 0;
  let notFixed = 0;

  // D'abord, essayer d'extraire depuis le nom (sans scraping)
  console.log('📝 PHASE 1: Extraction depuis les noms de produits...\n');

  const stillNeedScraping: PanelToFix[] = [];

  for (const panel of panelsToFix) {
    const dims = extractDimensionsFromName(panel.name);

    if (dims) {
      console.log(`   ✅ ${panel.reference}: ${dims.length} × ${dims.width} mm (depuis le nom)`);

      await prisma.panel.update({
        where: { id: panel.id },
        data: {
          defaultLength: dims.length,
          defaultWidth: dims.width
        }
      });

      fixedFromName++;
    } else {
      stillNeedScraping.push(panel);
    }
  }

  console.log(`\n📊 Phase 1 terminée: ${fixedFromName} corrigés depuis le nom`);
  console.log(`📊 ${stillNeedScraping.length} panneaux nécessitent scraping\n`);

  if (stillNeedScraping.length === 0) {
    console.log('✅ Tous les panneaux corrigés!');
    await prisma.$disconnect();
    return;
  }

  // Phase 2: Scraping (optionnel)
  console.log('📝 PHASE 2: Voulez-vous scraper les dimensions depuis B comme Bois?');
  console.log('   (Nécessite Chrome en mode debug avec session connectée)');
  console.log(`   ${stillNeedScraping.length} panneaux à scraper\n`);

  // Essayer de se connecter à Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Connecté à Chrome!\n');
  } catch (e) {
    console.log('⚠️ Chrome non disponible en mode debug.');
    console.log('   Pour scraper les dimensions, lancez Chrome avec:');
    console.log('   scripts/launch-chrome-debug.bat');
    console.log(`\n📊 RÉSUMÉ FINAL:`);
    console.log(`   Corrigés depuis le nom: ${fixedFromName}`);
    console.log(`   Non corrigés (besoin scraping): ${stillNeedScraping.length}`);
    await prisma.$disconnect();
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('🔍 Scraping des dimensions depuis B comme Bois...\n');

  for (let i = 0; i < stillNeedScraping.length; i++) {
    const panel = stillNeedScraping[i];
    console.log(`[${i + 1}/${stillNeedScraping.length}] ${panel.reference}`);
    console.log(`   ${panel.name.substring(0, 50)}...`);

    const dims = await scrapeDimensionsFromBCB(page, panel.name, panel.reference);

    if (dims) {
      console.log(`   ✅ Trouvé: ${dims.length} × ${dims.width} mm`);

      await prisma.panel.update({
        where: { id: panel.id },
        data: {
          defaultLength: dims.length,
          defaultWidth: dims.width
        }
      });

      fixedFromScrape++;
    } else {
      console.log(`   ❌ Dimensions non trouvées`);
      notFixed++;
    }

    // Pause entre les requêtes
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.disconnect();

  // Résumé
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ CORRECTION TERMINÉE!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Corrigés depuis le nom: ${fixedFromName}`);
  console.log(`   Corrigés par scraping: ${fixedFromScrape}`);
  console.log(`   Non corrigés: ${notFixed}`);
  console.log(`${'='.repeat(60)}\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
