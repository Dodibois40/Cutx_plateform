/**
 * Met à jour les épaisseurs des bandes de chant Bouney depuis la page recherche
 * Extrait les dimensions depuis le nom du produit et le ref depuis l'URL
 */

import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChantData {
  ref: string;
  name: string;
  width: number;
  thickness: number;
}

async function scrapeAllChants(): Promise<ChantData[]> {
  const url = 'https://www.bcommebois.fr/catalogsearch/result/?q=chant';

  console.log('🔍 Scraping chant data from:', url);

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    throw e;
  }

  const page = await browser.newPage();
  const allChants: ChantData[] = [];

  // Paginate through all results
  let currentPage = 1;
  const maxPages = 30;

  while (currentPage <= maxPages) {
    const pageUrl = currentPage === 1 ? url : `${url}&p=${currentPage}`;
    console.log(`📄 Page ${currentPage}: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const pageData = await page.evaluate(() => {
      const results: { chants: any[], hasNext: boolean } = { chants: [], hasNext: false };

      // Get all product items
      const items = document.querySelectorAll('.product-item');

      items.forEach((item) => {
        const nameEl = item.querySelector('.product-item-name a, .product-item-link, a[href*=".html"]');
        const name = nameEl?.textContent?.trim() || '';
        const href = nameEl?.getAttribute('href') || '';

        // Only process chant products with dimensions in name
        // Pattern: "Chant ABS XX x Y.Y mm ..." or "Chant ... XX x Y.Y mm ..."
        const dimMatch = name.match(/(\d{2,3})\s*[x×]\s*([\d.,]+)\s*mm/i);

        if (dimMatch) {
          // Extract ref from URL (last number before .html)
          const refMatch = href.match(/-(\d{5,6})\.html$/);

          if (refMatch) {
            results.chants.push({
              ref: refMatch[1],
              name: name.replace(/\s+/g, ' ').trim(),
              width: parseFloat(dimMatch[1]),
              thickness: parseFloat(dimMatch[2].replace(',', '.')),
            });
          }
        }
      });

      // Check if there's a next page
      const nextLink = document.querySelector('.pages-item-next a, a.next');
      results.hasNext = nextLink !== null;

      return results;
    });

    allChants.push(...pageData.chants);
    console.log(`   Trouvé: ${pageData.chants.length} chants avec dimensions`);

    if (!pageData.hasNext) {
      console.log('   → Dernière page atteinte');
      break;
    }

    currentPage++;
  }

  await page.close();
  await browser.disconnect();

  // Deduplicate by ref
  const uniqueMap = new Map<string, ChantData>();
  allChants.forEach(c => {
    if (!uniqueMap.has(c.ref)) {
      uniqueMap.set(c.ref, c);
    }
  });

  const unique = Array.from(uniqueMap.values());
  console.log(`\n📊 Total chants uniques avec dimensions: ${unique.length}`);

  return unique;
}

async function updateDatabase(chants: ChantData[]) {
  console.log('\n📝 Mise à jour de la base de données...\n');

  // Get all BCB chants
  const bcbChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultThickness: true,
      defaultLength: true,
    },
  });

  console.log(`📋 Chants BCB en base: ${bcbChants.length}`);

  // Create lookup map: ref number -> chant data
  const chantMap = new Map<string, ChantData>();
  chants.forEach(c => {
    chantMap.set(c.ref, c);
  });

  // Disable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`;

  let updated = 0;
  let notFound = 0;
  let alreadySet = 0;
  const updatedList: string[] = [];

  for (const panel of bcbChants) {
    // Extract ref number from BCB-xxxxx
    const refMatch = panel.reference.match(/BCB-(\d+)/);
    if (!refMatch) continue;

    const refNum = refMatch[1];
    const chantData = chantMap.get(refNum);

    if (!chantData) {
      notFound++;
      continue;
    }

    // Check if already has thickness
    if (panel.defaultThickness !== null) {
      alreadySet++;
      continue;
    }

    // Update with thickness from scraped data
    await prisma.panel.update({
      where: { id: panel.id },
      data: {
        defaultThickness: chantData.thickness,
        // Also update width (defaultLength) if different
        ...(panel.defaultLength !== chantData.width ? { defaultLength: chantData.width } : {}),
      },
    });

    updated++;
    updatedList.push(`${panel.reference}: ${chantData.width}x${chantData.thickness}mm`);

    if (updated % 50 === 0) {
      console.log(`   ✅ ${updated} chants mis à jour...`);
    }
  }

  // Re-enable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`;

  console.log(`\n✅ Mise à jour terminée:`);
  console.log(`   - Mis à jour: ${updated}`);
  console.log(`   - Déjà défini: ${alreadySet}`);
  console.log(`   - Non trouvé sur le site: ${notFound}`);

  // Show sample of updates
  if (updatedList.length > 0) {
    console.log(`\n📋 Exemples de mises à jour:`);
    updatedList.slice(0, 20).forEach(u => console.log(`   ${u}`));
    if (updatedList.length > 20) {
      console.log(`   ... et ${updatedList.length - 20} autres`);
    }
  }
}

async function main() {
  try {
    const chants = await scrapeAllChants();

    // Show sample of scraped data
    console.log('\n📋 Exemples de données extraites:');
    chants.slice(0, 15).forEach(c => {
      console.log(`   BCB-${c.ref}: ${c.width}x${c.thickness}mm - ${c.name.substring(0, 50)}...`);
    });

    await updateDatabase(chants);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
