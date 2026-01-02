/**
 * Script de test pour un seul produit chant
 *
 * Usage:
 *   npx tsx scripts/dispano/test-chant.ts [URL_PRODUIT]
 *
 * Exemple:
 *   npx tsx scripts/dispano/test-chant.ts https://www.dispano.fr/p/chant-abs-blanc-x-mm-x-m-A1234567
 *
 * Sans argument: va sur la première catégorie ABS et teste le premier produit
 *
 * Prérequis:
 *   Chrome lancé avec: chrome --remote-debugging-port=9222
 */

import { connectToChrome, scrapeChant, getChantProductLinks } from './scraper-chants';
import { ALL_CHANTS_SUBCATEGORIES, determineChantType } from './config-chants';

async function testSingleChant(): Promise<void> {
  const args = process.argv.slice(2);
  const productUrl = args[0];

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       TEST SCRAPER CHANT - DEBUG                 ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const browser = await connectToChrome();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  let testUrl = productUrl;
  let categorySlug = 'abs-standard-blanc'; // Default

  if (!testUrl) {
    // Aller chercher le premier produit de la première catégorie
    const firstCategory = ALL_CHANTS_SUBCATEGORIES[0];
    console.log(`Pas d'URL specifiee, utilisation de la categorie: ${firstCategory.name}`);
    console.log(`URL categorie: ${firstCategory.url}\n`);

    categorySlug = firstCategory.slug;

    // Récupérer les liens produits
    const links = await getChantProductLinks(page, firstCategory.url);

    if (links.length === 0) {
      console.log('Aucun produit trouve dans cette categorie');
      await page.close();
      return;
    }

    testUrl = links[0];
    console.log(`\nPremier produit trouve: ${testUrl}\n`);
  } else {
    // Détecter la catégorie depuis l'URL si possible
    if (testUrl.includes('laser')) categorySlug = 'abs-laser-blanc';
    else if (testUrl.includes('melamine')) categorySlug = 'chant-melamine-blanc';
    else if (testUrl.includes('bois')) categorySlug = 'bois-pre-encolle';
  }

  console.log('='.repeat(60));
  console.log('SCRAPING DU PRODUIT');
  console.log('='.repeat(60));
  console.log(`URL: ${testUrl}`);
  console.log(`Category slug: ${categorySlug}`);
  console.log(`Chant type: ${determineChantType(categorySlug)}`);
  console.log('');

  // Naviguer vers le produit et extraire les données brutes
  console.log('Navigation...');
  await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  // D'abord, afficher le texte brut de la page pour debug
  console.log('\n--- EXTRAIT DU TEXTE DE LA PAGE ---\n');
  const pageText = await page.evaluate(() => {
    return document.body.innerText.substring(0, 3000);
  });
  console.log(pageText);
  console.log('\n--- FIN EXTRAIT ---\n');

  // Maintenant, scraper avec notre fonction
  console.log('='.repeat(60));
  console.log('DONNEES EXTRAITES');
  console.log('='.repeat(60));

  const chant = await scrapeChant(page, testUrl, categorySlug);

  if (chant) {
    console.log('\n✅ Extraction reussie!\n');
    console.log(`  Nom:              ${chant.nom}`);
    console.log(`  Marque:           ${chant.marque}`);
    console.log(`  Ref Dispano:      ${chant.refDispano}`);
    console.log(`  Ref Fabricant:    ${chant.refMarque || 'N/A'}`);
    console.log(`  Code EAN:         ${chant.codeEAN || 'N/A'}`);
    console.log('');
    console.log('  --- PRIX ---');
    console.log(`  Prix rouleau:     ${chant.prixRouleau ? chant.prixRouleau.toFixed(2) + ' EUR' : 'N/A'}`);
    console.log(`  Prix au ml:       ${chant.prixMl ? chant.prixMl.toFixed(4) + ' EUR/ml' : 'N/A'}`);
    console.log('');
    console.log('  --- DIMENSIONS ---');
    console.log(`  Longueur rouleau: ${chant.longueurRouleau} m`);
    console.log(`  Largeur:          ${chant.largeur} mm`);
    console.log(`  Epaisseur:        ${chant.epaisseur} mm`);
    console.log('');
    console.log('  --- CARACTERISTIQUES ---');
    console.log(`  Type chant:       ${chant.chantType}`);
    console.log(`  Decor:            ${chant.decor || 'N/A'}`);
    console.log(`  Ref Decor:        ${chant.refDecor || 'N/A'}`);
    console.log(`  Couleur:          ${chant.couleur || 'N/A'}`);
    console.log(`  Finition:         ${chant.finition || 'N/A'}`);
    console.log(`  Pre-encolle:      ${chant.preEncolle === null ? 'N/A' : chant.preEncolle ? 'Oui' : 'Non'}`);
    console.log('');
    console.log('  --- STOCK ---');
    console.log(`  Statut:           ${chant.stockStatus || 'N/A'}`);
    console.log(`  Quantite:         ${chant.stockQuantity || 'N/A'}`);
    console.log('');
    console.log('  --- IMAGES ---');
    console.log(`  Image principale: ${chant.imageUrl || 'N/A'}`);
    console.log(`  Nb images total:  ${chant.imageUrls.length}`);
    if (chant.imageUrls.length > 0) {
      chant.imageUrls.forEach((url, i) => {
        console.log(`    [${i + 1}] ${url.substring(0, 80)}...`);
      });
    }
  } else {
    console.log('\n❌ Echec de l\'extraction\n');
  }

  await page.close();

  console.log('\n' + '='.repeat(60));
  console.log('TEST TERMINE');
  console.log('='.repeat(60) + '\n');
}

testSingleChant().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});
