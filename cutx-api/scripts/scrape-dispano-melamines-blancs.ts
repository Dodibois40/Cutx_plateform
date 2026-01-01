/**
 * Scraping Dispano - Panneaux Mélaminés Blancs
 *
 * Source: https://www.dispano.fr/c/panneau-melamine-blanc/x2visu_dig_onv2_2027892R5
 *
 * Données extraites (plus que Bouney):
 * - Nom, Marque, Prix (pro + public)
 * - Réf Dispano, Réf Marque, Code EAN
 * - Dimensions (L x l x ép), Poids
 * - Classe feu, Données carbone (CO2)
 * - Décor, Finition, Support, Teinte, Gamme
 * - Formaldéhyde, Classement particules
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur dispano.fr avec son compte
 * 3. Lancer: npx tsx scripts/scrape-dispano-melamines-blancs.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_URL = 'https://www.dispano.fr/c/panneau-melamine-blanc/x2visu_dig_onv2_2027892R5';

interface DispanoProduct {
  nom: string;
  marque: string;
  refDispano: string;
  refMarque: string | null;
  codeEAN: string | null;
  prixM2: number | null;
  prixPublic: number | null;
  longueur: number;
  largeur: number;
  epaisseur: number;
  poids: number | null;
  classeFeu: string | null;
  co2: number | null;
  typeProduit: string | null;
  decor: string | null;
  refDecor: string | null;
  teinte: string | null;
  finition: string | null;
  support: string | null;
  gamme: string | null;
  formaldehyde: string | null;
  classementParticules: string | null;
  ignifuge: string | null;
  deuxFacesIdentiques: boolean | null;
  imageUrl: string | null;
}

interface ScrapingStats {
  totalProducts: number;
  created: number;
  updated: number;
  errors: number;
}

/**
 * Scroll complet pour charger tous les produits
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;

  while (previousHeight !== currentHeight && attempts < 15) {
    previousHeight = currentHeight;

    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 800;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await new Promise((r) => setTimeout(r, 2000));
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    attempts++;
  }
}

/**
 * Récupère tous les liens produits de la page catégorie
 */
async function getProductLinks(page: Page, url: string): Promise<string[]> {
  console.log(`\n📋 Chargement de: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout de navigation, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 3000));

  // Scroll pour charger tous les produits
  console.log('   📜 Scroll pour charger tous les produits...');
  await scrollToLoadAll(page);

  // Extraire les liens produits
  const links = await page.evaluate(() => {
    const productLinks: string[] = [];

    // Chercher les liens de produits Dispano
    document.querySelectorAll('a').forEach((el) => {
      const href = el.href;
      if (!href) return;

      // Les produits Dispano ont le format /p/category/product-name-AXXXXXXX
      if (href.includes('/p/') && href.match(/-A\d{6,8}$/)) {
        if (!productLinks.includes(href)) {
          productLinks.push(href);
        }
      }
    });

    return productLinks;
  });

  console.log(`   ✅ ${links.length} liens produits trouvés`);
  return links;
}

/**
 * Scrape les données d'un produit Dispano
 */
async function scrapeProduct(page: Page, url: string): Promise<DispanoProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Scroll pour charger les specs
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 500);
          totalHeight += 500;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const result: Record<string, any> = {};
      const pageText = document.body.innerText;

      // === NOM ===
      const titleEl = document.querySelector('[data-testid="article-header/article-name"], h1');
      result.nom = titleEl?.textContent?.trim() || '';

      // === MARQUE (depuis le titre de page) ===
      const pageTitle = document.title;
      const titleBrandMatch = pageTitle.match(/^([A-Z\s]+)\s*-\s*/);
      if (titleBrandMatch) {
        result.marque = titleBrandMatch[1].trim();
      }
      if (!result.marque || result.marque === 'Marques') {
        const brands = ['SWISS KRONO', 'EGGER', 'KRONOSPAN', 'FINSA', 'PFLEIDERER', 'UNILIN', 'POLYREY'];
        for (const brand of brands) {
          if (pageText.toUpperCase().includes(brand)) {
            result.marque = brand;
            break;
          }
        }
      }

      // === RÉFÉRENCES ===
      const refDispanoMatch = pageText.match(/R[ée]f\.?\s*Dispano\s*:?\s*(\d+)/i);
      result.refDispano = refDispanoMatch ? refDispanoMatch[1] : null;

      const eanMatch = pageText.match(/Code\s*EAN\s*:?\s*(\d+)/i);
      result.codeEAN = eanMatch ? eanMatch[1] : null;

      const refSwissKronoMatch = pageText.match(/R[ée]f\.?\s*SWISS\s*KRONO\s*:?\s*(\d+)/i);
      const refEggerMatch = pageText.match(/R[ée]f\.?\s*EGGER\s*:?\s*(\d+)/i);
      const refKronospanMatch = pageText.match(/R[ée]f\.?\s*KRONOSPAN\s*:?\s*(\d+)/i);
      const refFinsaMatch = pageText.match(/R[ée]f\.?\s*FINSA\s*:?\s*(\d+)/i);
      result.refMarque = refSwissKronoMatch?.[1] || refEggerMatch?.[1] || refKronospanMatch?.[1] || refFinsaMatch?.[1] || null;

      // === PRIX ===
      const prixMatch = pageText.match(/([\d,]+)\s*€\s*HT\s*\/\s*[Mm][èe]tre\s*carr[ée]/);
      result.prixM2 = prixMatch ? parseFloat(prixMatch[1].replace(',', '.')) : null;

      const prixPublicMatch = pageText.match(/Prix\s*public\s*([\d,]+)\s*€/i);
      result.prixPublic = prixPublicMatch ? parseFloat(prixPublicMatch[1].replace(',', '.')) : null;

      // === DIMENSIONS ===
      const longueurMatch = pageText.match(/Longueur\s*:?\s*(\d+)\s*mm/i);
      result.longueur = longueurMatch ? parseInt(longueurMatch[1]) : 0;

      const largeurMatch = pageText.match(/Largeur\s*:?\s*(\d+)\s*mm/i);
      result.largeur = largeurMatch ? parseInt(largeurMatch[1]) : 0;

      const epaisseurMatch = pageText.match(/[EÉ]paisseur\s*:?\s*(\d+)\s*mm/i);
      result.epaisseur = epaisseurMatch ? parseInt(epaisseurMatch[1]) : 0;

      // === POIDS ===
      const poidsMatch = pageText.match(/Poids\s*(?:net)?\s*:?\s*([\d,\.]+)\s*kg/i);
      result.poids = poidsMatch ? parseFloat(poidsMatch[1].replace(',', '.')) : null;

      // === CLASSE FEU ===
      const classeFeuMatch = pageText.match(/Classe\s*(?:de\s*)?feu\s*:?\s*([^\n]+)/i);
      result.classeFeu = classeFeuMatch ? classeFeuMatch[1].trim().substring(0, 50) : null;

      // === CO2 ===
      const co2Match = pageText.match(/R[ée]chauffement\s*climatique[^:]*:\s*([\d,\.]+)/i);
      result.co2 = co2Match ? parseFloat(co2Match[1].replace(',', '.')) : null;

      if (!result.co2) {
        const co2Match2 = pageText.match(/[ée]quiv\.?\s*CO2[^:]*:\s*([\d,\.]+)/i);
        result.co2 = co2Match2 ? parseFloat(co2Match2[1].replace(',', '.')) : null;
      }

      // === TYPE PRODUIT ===
      const typeProduitMatch = pageText.match(/Type\s*de\s*produit\s*:?\s*([^\n]+)/i);
      result.typeProduit = typeProduitMatch ? typeProduitMatch[1].trim().substring(0, 100) : null;

      // === DÉCOR ===
      const nomDecorMatch = pageText.match(/Nom\s*D[ée]cor\s*:?\s*([^\n]+)/i);
      result.decor = nomDecorMatch ? nomDecorMatch[1].trim().substring(0, 50) : null;

      const refDecorMatch = pageText.match(/R[ée]f[ée]rence\s*D[ée]cor\s*:?\s*([A-Z0-9]+)/i);
      result.refDecor = refDecorMatch ? refDecorMatch[1].trim() : null;

      // === TEINTE ===
      const teinteMatch = pageText.match(/Teinte\s*:?\s*([^\n]+)/i);
      result.teinte = teinteMatch ? teinteMatch[1].trim().substring(0, 50) : null;

      // === FINITION ===
      const finitionMatch = pageText.match(/Finition[\/]?Structure\s*:?\s*([^\n]+)/i);
      result.finition = finitionMatch ? finitionMatch[1].trim().substring(0, 50) : null;

      // === SUPPORT ===
      const supportMatch = pageText.match(/Support\s*:?\s*([^\n]+)/i);
      result.support = supportMatch ? supportMatch[1].trim().substring(0, 100) : null;

      // === GAMME ===
      const gammeMatch = pageText.match(/Gamme\s*:?\s*([^\n]+)/i);
      result.gamme = gammeMatch ? gammeMatch[1].trim().substring(0, 50) : null;

      // === FORMALDÉHYDE ===
      const formalMatch = pageText.match(/[EÉ]mission\s*formald[ée]hyde\s*:?\s*([^\n]+)/i);
      result.formaldehyde = formalMatch ? formalMatch[1].trim().substring(0, 20) : null;

      // === CLASSEMENT ===
      const classementMatch = pageText.match(/Classement\s*particules\s*:?\s*([^\n]+)/i);
      result.classementParticules = classementMatch ? classementMatch[1].trim().substring(0, 20) : null;

      // === IGNIFUGE ===
      const ignifugeMatch = pageText.match(/Ignifuge\s*\([^\)]*\)\s*:?\s*([^\n]+)/i);
      result.ignifuge = ignifugeMatch ? ignifugeMatch[1].trim().substring(0, 20) : null;

      // === 2 FACES IDENTIQUES ===
      const deuxFacesMatch = pageText.match(/2\s*Faces\s*d[ée]cor\s*identique\s*:?\s*([^\n]+)/i);
      result.deuxFacesIdentiques = deuxFacesMatch ? deuxFacesMatch[1].toLowerCase().includes('oui') : null;

      // === IMAGE ===
      const imgSelectors = [
        '[data-testid*="image"] img',
        '.product-image img',
        'picture img',
        'img[src*="dispano"]'
      ];
      for (const sel of imgSelectors) {
        const img = document.querySelector(sel) as HTMLImageElement;
        if (img) {
          const src = img.src || img.getAttribute('data-src');
          if (src && !src.includes('placeholder') && !src.includes('data:image')) {
            result.imageUrl = src;
            break;
          }
        }
      }
      if (!result.imageUrl) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          result.imageUrl = ogImage.getAttribute('content');
        }
      }

      return result;
    });

    if (!data.nom || !data.refDispano) {
      return null;
    }

    return {
      nom: data.nom,
      marque: data.marque || 'Dispano',
      refDispano: data.refDispano,
      refMarque: data.refMarque,
      codeEAN: data.codeEAN,
      prixM2: data.prixM2,
      prixPublic: data.prixPublic,
      longueur: data.longueur || 0,
      largeur: data.largeur || 0,
      epaisseur: data.epaisseur || 0,
      poids: data.poids,
      classeFeu: data.classeFeu,
      co2: data.co2,
      typeProduit: data.typeProduit,
      decor: data.decor,
      refDecor: data.refDecor,
      teinte: data.teinte,
      finition: data.finition,
      support: data.support,
      gamme: data.gamme,
      formaldehyde: data.formaldehyde,
      classementParticules: data.classementParticules,
      ignifuge: data.ignifuge,
      deuxFacesIdentiques: data.deuxFacesIdentiques,
      imageUrl: data.imageUrl
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🔧 SCRAPING DISPANO - PANNEAUX MÉLAMINÉS BLANCS');
  console.log('='.repeat(60));
  console.log('');

  // Connexion à Chrome
  console.log('🔌 Connexion à Chrome...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez d\'abord Chrome en mode debug!');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté à Chrome!\n');

  const stats: ScrapingStats = {
    totalProducts: 0,
    created: 0,
    updated: 0,
    errors: 0
  };

  // 1. Créer ou récupérer le catalogue Dispano
  console.log('📦 Création/récupération du catalogue Dispano...');
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: 'dispano' },
    update: {
      name: 'Dispano',
      description: 'Catalogue Dispano - Panneaux décoratifs et techniques',
      isActive: true
    },
    create: {
      name: 'Dispano',
      slug: 'dispano',
      description: 'Catalogue Dispano - Panneaux décoratifs et techniques',
      isActive: true
    }
  });
  console.log(`   ✅ Catalogue: ${catalogue.name} (${catalogue.id})\n`);

  // 2. Créer la catégorie
  const category = await prisma.category.upsert({
    where: {
      catalogueId_slug: { catalogueId: catalogue.id, slug: 'melamines-blancs' }
    },
    update: { name: 'Mélaminés Blancs' },
    create: {
      name: 'Mélaminés Blancs',
      slug: 'melamines-blancs',
      catalogueId: catalogue.id
    }
  });
  console.log(`   📂 Catégorie: ${category.name}\n`);

  // 3. Collecter les liens produits
  const productLinks = await getProductLinks(page, CATEGORY_URL);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TOTAL: ${productLinks.length} produits à scraper`);
  console.log(`${'='.repeat(60)}\n`);

  // 4. Scraper chaque produit
  for (let i = 0; i < productLinks.length; i++) {
    const url = productLinks[i];
    stats.totalProducts++;

    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📈 Progression: ${i + 1}/${productLinks.length} (${Math.round((i + 1) / productLinks.length * 100)}%)`);
      console.log(`${'─'.repeat(50)}`);
    }

    const filename = url.split('/').pop() || url;
    console.log(`\n[${i + 1}/${productLinks.length}] ${filename.substring(0, 50)}...`);

    const product = await scrapeProduct(page, url);

    if (product) {
      console.log(`   📦 ${product.nom.substring(0, 45)}...`);
      console.log(`   🏭 ${product.marque} | ${product.refDispano}`);
      console.log(`   📐 ${product.longueur}x${product.largeur}x${product.epaisseur}mm | ${product.poids || '?'}kg`);
      console.log(`   💰 ${product.prixM2 || '?'} €/m²`);

      try {
        const reference = `DISP-MEL-${product.refDispano}`;

        // Construire les métadonnées étendues
        const extendedData: Record<string, any> = {};
        if (product.refMarque) extendedData.refMarque = product.refMarque;
        if (product.codeEAN) extendedData.codeEAN = product.codeEAN;
        if (product.prixPublic) extendedData.prixPublic = product.prixPublic;
        if (product.poids) extendedData.poids = product.poids;
        if (product.classeFeu) extendedData.classeFeu = product.classeFeu;
        if (product.co2) extendedData.co2 = product.co2;
        if (product.decor) extendedData.decor = product.decor;
        if (product.refDecor) extendedData.refDecor = product.refDecor;
        if (product.teinte) extendedData.teinte = product.teinte;
        if (product.gamme) extendedData.gamme = product.gamme;
        if (product.formaldehyde) extendedData.formaldehyde = product.formaldehyde;
        if (product.classementParticules) extendedData.classementParticules = product.classementParticules;
        if (product.ignifuge) extendedData.ignifuge = product.ignifuge;
        if (product.deuxFacesIdentiques !== null) extendedData.deuxFacesIdentiques = product.deuxFacesIdentiques;
        if (product.support) extendedData.support = product.support;

        // Stringifier les métadonnées pour stockage
        const metadataJson = Object.keys(extendedData).length > 0
          ? JSON.stringify(extendedData)
          : null;

        await prisma.panel.upsert({
          where: {
            catalogueId_reference: { catalogueId: catalogue.id, reference }
          },
          update: {
            name: product.nom,
            thickness: [product.epaisseur],
            defaultLength: product.longueur,
            defaultWidth: product.largeur,
            pricePerM2: product.prixM2,
            manufacturerRef: product.refMarque,
            material: product.support || 'Panneau de particules',
            finish: product.finition,
            productType: 'MELAMINE',
            decor: product.decor,
            colorCode: product.refDecor,
            imageUrl: product.imageUrl,
            categoryId: category.id,
            isActive: true,
            metadata: metadataJson
          },
          create: {
            reference,
            name: product.nom,
            thickness: [product.epaisseur],
            defaultLength: product.longueur,
            defaultWidth: product.largeur,
            pricePerM2: product.prixM2,
            manufacturerRef: product.refMarque,
            material: product.support || 'Panneau de particules',
            finish: product.finition,
            productType: 'MELAMINE',
            decor: product.decor,
            colorCode: product.refDecor,
            imageUrl: product.imageUrl,
            catalogueId: catalogue.id,
            categoryId: category.id,
            isActive: true,
            metadata: metadataJson
          }
        });

        stats.created++;
        console.log(`   ✅ ${reference}`);
      } catch (e) {
        stats.errors++;
        console.log(`   ⚠️ Erreur DB: ${(e as Error).message.substring(0, 50)}`);
      }
    } else {
      stats.errors++;
      console.log(`   ⚠️ Pas de données extraites`);
    }

    // Pause entre chaque produit
    await new Promise((r) => setTimeout(r, 1000));
  }

  // 5. Résumé final
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`✨ SCRAPING DISPANO TERMINÉ!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   📦 Produits scrapés: ${stats.totalProducts}`);
  console.log(`   ✅ Panneaux créés/mis à jour: ${stats.created}`);
  console.log(`   ❌ Erreurs: ${stats.errors}`);
  console.log(`${'='.repeat(60)}`);

  // Vérification finale
  const totalInDb = await prisma.panel.count({ where: { catalogueId: catalogue.id } });
  console.log(`\n📊 Total panneaux catalogue Dispano: ${totalInDb}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
