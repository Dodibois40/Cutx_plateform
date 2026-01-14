/**
 * Met à jour les épaisseurs des bandes de chant Bouney depuis la page recherche
 * Extrait les dimensions (largeur x épaisseur) depuis la page et met à jour la DB
 */

import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChantDimension {
  ref: string;
  width: number;
  thickness: number;
}

async function scrapeChantDimensions(): Promise<ChantDimension[]> {
  const url = 'https://www.bcommebois.fr/catalogsearch/result/?q=chant';

  console.log('🔍 Scraping chant dimensions from:', url);

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
  const allDimensions: ChantDimension[] = [];

  // Scroll through pages to get all products
  let currentPage = 1;
  const maxPages = 20; // Safety limit

  while (currentPage <= maxPages) {
    const pageUrl = currentPage === 1 ? url : `${url}&p=${currentPage}`;
    console.log(`📄 Page ${currentPage}: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const pageData = await page.evaluate(() => {
      const results: { dimensions: any[], hasNext: boolean } = { dimensions: [], hasNext: false };

      const pageText = document.body.innerText || '';

      // Find pattern: ref (5-6 digits) ... dimension (NNxN.N)
      // The page shows products like: "Ref: 82631 ... 23x0.8mm"
      const blockPattern = /(\d{5,6})[^\d]*?(\d{2,3})\s*[x×]\s*([\d.,]+)/g;
      let match;
      while ((match = blockPattern.exec(pageText)) !== null) {
        results.dimensions.push({
          ref: match[1],
          width: parseFloat(match[2]),
          thickness: parseFloat(match[3].replace(',', '.')),
        });
      }

      // Check if there's a next page
      const nextLink = document.querySelector('.pages-item-next a, a.next');
      results.hasNext = nextLink !== null;

      return results;
    });

    allDimensions.push(...pageData.dimensions);
    console.log(`   Trouvé: ${pageData.dimensions.length} dimensions`);

    if (!pageData.hasNext) {
      console.log('   → Dernière page atteinte');
      break;
    }

    currentPage++;
  }

  await page.close();
  await browser.disconnect();

  // Deduplicate by ref (keep first occurrence)
  const uniqueMap = new Map<string, ChantDimension>();
  allDimensions.forEach(d => {
    if (!uniqueMap.has(d.ref)) {
      uniqueMap.set(d.ref, d);
    }
  });

  const unique = Array.from(uniqueMap.values());
  console.log(`\n📊 Total dimensions uniques: ${unique.length}`);

  return unique;
}

async function updateDatabase(dimensions: ChantDimension[]) {
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
      defaultLength: true,  // This is actually width for chants (23, 43, etc.)
      defaultWidth: true,   // This is actually length for chants (in mm, like 800)
    },
  });

  console.log(`📋 Chants BCB en base: ${bcbChants.length}`);

  // Create lookup map: ref number -> dimensions
  const dimMap = new Map<string, ChantDimension>();
  dimensions.forEach(d => {
    dimMap.set(d.ref, d);
  });

  // Disable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`;

  let updated = 0;
  let notFound = 0;
  let alreadySet = 0;

  for (const chant of bcbChants) {
    // Extract ref number from BCB-xxxxx
    const refMatch = chant.reference.match(/BCB-(\d+)/);
    if (!refMatch) continue;

    const refNum = refMatch[1];
    const dim = dimMap.get(refNum);

    if (!dim) {
      notFound++;
      continue;
    }

    // Check if already has thickness
    if (chant.defaultThickness !== null) {
      alreadySet++;
      continue;
    }

    // Update with thickness from scraped data
    // For chants: defaultLength = width (23, 43), defaultThickness = thickness (0.8, 1, 2)
    await prisma.panel.update({
      where: { id: chant.id },
      data: {
        defaultThickness: dim.thickness,
        // Also update width if different
        ...(chant.defaultLength !== dim.width ? { defaultLength: dim.width } : {}),
      },
    });

    updated++;
    if (updated % 50 === 0) {
      console.log(`   ✅ ${updated} chants mis à jour...`);
    }
  }

  // Re-enable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`;

  console.log(`\n✅ Mise à jour terminée:`);
  console.log(`   - Mis à jour: ${updated}`);
  console.log(`   - Déjà défini: ${alreadySet}`);
  console.log(`   - Non trouvé: ${notFound}`);
}

async function main() {
  try {
    const dimensions = await scrapeChantDimensions();

    // Show sample of dimensions
    console.log('\n📋 Exemples de dimensions extraites:');
    dimensions.slice(0, 10).forEach(d => {
      console.log(`   BCB-${d.ref}: ${d.width}x${d.thickness}mm`);
    });

    await updateDatabase(dimensions);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
