/**
 * Test du scraper principal sur un produit
 */

import { connectToChrome, scrapeProduct, prisma } from './scraper';

const TEST_URL = process.argv[2] || 'https://www.dispano.fr/p/panneaux-decoratifs/panneau-de-particule-e1-surface-melamine-blanc-front-white-u501-pe-u501-pe-format-280x207cm-en-19mm-A7581994';

async function main() {
  console.log('🧪 TEST SCRAPER DISPANO');
  console.log('='.repeat(60));
  console.log(`URL: ${TEST_URL}\n`);

  const browser = await connectToChrome();
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('🔍 Scraping du produit...\n');
  const product = await scrapeProduct(page, TEST_URL);

  if (!product) {
    console.log('❌ Échec du scraping');
    await browser.disconnect();
    return;
  }

  console.log('📦 PRODUIT EXTRAIT:');
  console.log('='.repeat(60));
  console.log(`Nom: ${product.nom}`);
  console.log(`Marque: ${product.marque}`);
  console.log(`Réf Dispano: ${product.refDispano}`);
  console.log(`Code EAN: ${product.codeEAN || 'N/A'}`);
  console.log(`Réf Fabricant: ${product.refMarque || 'N/A'}`);
  console.log(`Prix/m²: ${product.prixM2 ? product.prixM2 + ' €' : 'N/A'}`);
  console.log(`Dimensions: ${product.longueur}x${product.largeur}x${product.epaisseur} mm`);
  console.log(``);
  console.log(`🖼️  Image: ${product.imageUrl ? '✅' : '❌'}`);
  if (product.imageUrl) {
    console.log(`   ${product.imageUrl}`);
  }
  console.log(`   Total images: ${product.imageUrls.length}`);
  console.log(``);
  console.log(`📦 Stock: ${product.stockStatus || 'N/A'}`);
  console.log(`   Quantité: ${product.stockQuantity || 'N/A'}`);
  console.log(``);
  console.log(`🔧 Specs:`);
  console.log(`   Poids: ${product.poids ? product.poids + ' kg' : 'N/A'}`);
  console.log(`   Support: ${product.support || 'N/A'}`);
  console.log(`   Finition: ${product.finition || 'N/A'}`);
  console.log(`   Décor: ${product.decor || 'N/A'}`);
  console.log('='.repeat(60));

  // Résumé
  const checks = [
    { name: 'Nom', ok: !!product.nom },
    { name: 'Réf', ok: !!product.refDispano },
    { name: 'Prix', ok: !!product.prixM2 },
    { name: 'Dimensions', ok: product.longueur > 0 && product.largeur > 0 },
    { name: 'Image', ok: !!product.imageUrl },
    { name: 'Stock', ok: !!product.stockStatus },
  ];

  console.log('\n✅ VÉRIFICATION:');
  checks.forEach(c => {
    console.log(`   ${c.ok ? '✅' : '❌'} ${c.name}`);
  });

  const allOk = checks.every(c => c.ok);
  console.log(`\n${allOk ? '🎉 TOUT EST BON!' : '⚠️ Des données manquent'}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
