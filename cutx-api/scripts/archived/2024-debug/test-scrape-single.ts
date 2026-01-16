/**
 * Test scraping sur une seule page avec log des erreurs
 */
import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Variant {
  reference: string;
  name: string;
  material: string;
  finish: string;
  thickness: number;
  length: number;
  width: number;
  pricePerM2: number | null;
  stock: string | null;
  imageUrl: string | null;
}

async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';

  console.log('🔍 Test scraping:', url);

  // Connect to Chrome
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });
  console.log('✅ Chrome connecté');

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll to load all
  console.log('📜 Scroll...');
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      window.scrollBy(0, 1000);
      await new Promise(r => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 2000));

  // Extract variants
  console.log('📊 Extraction des variantes...');
  const variants = await page.evaluate(() => {
    const results: Variant[] = [];
    const rows = document.querySelectorAll('table.results-table tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 7) return;

      // Type (mélaminé, stratifié, etc.)
      const type = cells[0]?.textContent?.trim() || '';

      // Dimensions
      const lengthText = cells[1]?.textContent?.trim() || '0';
      const widthText = cells[2]?.textContent?.trim() || '0';
      const thicknessText = cells[3]?.textContent?.trim() || '0';

      // Support
      const support = cells[4]?.textContent?.trim() || '';

      // Code fournisseur
      const code = cells[5]?.textContent?.trim() || '';

      // Stock
      const stock = cells[6]?.textContent?.trim() || '';

      // Prix
      const priceText = cells[7]?.textContent?.trim() || '';
      const priceMatch = priceText.match(/(\d+[.,]\d+)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

      // Get product name from wrapper
      const wrapper = row.closest('[id^="product-wrapper-"]');
      const nameEl = wrapper?.querySelector('.product-info p:not(.text-primary)');
      const name = nameEl?.textContent?.trim() || '';

      if (code) {
        results.push({
          reference: `BCB-${code}`,
          name: `${name} ${type}`.trim(),
          material: type,
          finish: support,
          thickness: parseFloat(thicknessText) || 0,
          length: parseFloat(lengthText) * 1000 || 0, // m to mm
          width: parseFloat(widthText) * 1000 || 0,   // m to mm
          pricePerM2: price,
          stock: stock || null,
          imageUrl: null,
        });
      }
    });

    return results;
  });

  console.log(`\n📊 ${variants.length} variantes extraites`);

  // Show first 5
  console.log('\n🔎 Premières 5 variantes:');
  variants.slice(0, 5).forEach((v, i) => {
    console.log(`[${i + 1}] ${v.reference}: ${v.name}`);
    console.log(`    Dim: ${v.length}x${v.width}x${v.thickness}mm`);
    console.log(`    Prix: ${v.pricePerM2}€/m²`);
    console.log(`    Stock: ${v.stock}`);
  });

  // Search for 79155
  console.log('\n🔍 Recherche de 79155...');
  const match79155 = variants.find(v => v.reference.includes('79155'));
  if (match79155) {
    console.log('✅ Trouvé:', match79155);
  } else {
    console.log('❌ Non trouvé');
    // Check similar
    const similar = variants.filter(v => v.reference.includes('791'));
    console.log(`   Refs similaires (791*): ${similar.map(v => v.reference).join(', ')}`);
  }

  // Try to save first one
  console.log('\n💾 Test sauvegarde du premier...');
  if (variants.length > 0) {
    const v = variants[0];
    try {
      const catalogue = await prisma.catalogue.findFirst({ where: { slug: 'bouney' } });
      if (!catalogue) throw new Error('Catalogue Bouney not found');

      const result = await prisma.panel.upsert({
        where: {
          catalogueId_reference: { catalogueId: catalogue.id, reference: v.reference }
        },
        update: {
          name: v.name,
          material: v.material,
          finish: v.finish,
          thickness: v.thickness > 0 ? [v.thickness] : [],
          defaultLength: v.length,
          defaultWidth: v.width,
          pricePerM2: v.pricePerM2,
          stockStatus: v.stock,
          isActive: true,
        },
        create: {
          reference: v.reference,
          name: v.name,
          material: v.material,
          finish: v.finish,
          thickness: v.thickness > 0 ? [v.thickness] : [],
          defaultLength: v.length,
          defaultWidth: v.width,
          pricePerM2: v.pricePerM2,
          stockStatus: v.stock,
          imageUrl: v.imageUrl,
          isActive: true,
          catalogueId: catalogue.id,
        }
      });
      console.log('✅ Sauvegardé:', result.reference);
    } catch (err) {
      console.log('❌ Erreur:', err);
    }
  }

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(console.error);
