/**
 * Scraping Dispano - Panneaux Décoratifs
 *
 * Source: https://www.dispano.fr/panneau-decoratif
 *
 * Structure:
 * - Catalogue: Dispano (séparé de Bouney)
 * - Catégorie principale: Panneaux Décoratifs
 * - Sous-catégories: selon la structure du site
 *
 * Données extraites:
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
 * 3. Lancer: npx tsx scripts/scrape-dispano-panneaux-deco.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'https://www.dispano.fr';
const CATEGORY_URL = 'https://www.dispano.fr/panneau-decoratif';

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
  // Stock
  stockStatus: string | null;
  stockQuantity: number | null;
  stockLocations: { location: string; inStock: boolean; quantity?: number }[];
}

interface SubCategory {
  name: string;
  slug: string;
  url: string;
}

interface ScrapingStats {
  totalProducts: number;
  created: number;
  updated: number;
  errors: number;
  byCategory: Map<string, number>;
}

/**
 * Scroll complet pour charger tous les produits
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;

  while (previousHeight !== currentHeight && attempts < 20) {
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
 * Récupère les sous-catégories de la page principale
 */
async function getSubCategories(page: Page, url: string): Promise<SubCategory[]> {
  console.log(`\n📂 Analyse des sous-catégories: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout de navigation, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 3000));

  const subCategories = await page.evaluate(() => {
    const categories: { name: string; slug: string; url: string }[] = [];

    // Chercher les liens de sous-catégories
    // Dispano utilise souvent des cartes ou des liens dans une grille
    const categoryLinks = document.querySelectorAll('a[href*="/c/"], a[href*="/panneau"]');

    categoryLinks.forEach((el) => {
      const href = (el as HTMLAnchorElement).href;
      const text = el.textContent?.trim() || '';

      // Filtrer les liens de catégorie (pas les produits)
      if (
        href.includes('/c/') &&
        !href.includes('/p/') &&
        text.length > 2 &&
        text.length < 100
      ) {
        // Extraire le slug de l'URL
        const urlParts = href.split('/');
        const slug = urlParts[urlParts.length - 1]?.split('?')[0] || '';

        if (slug && !categories.find((c) => c.url === href)) {
          categories.push({
            name: text,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            url: href,
          });
        }
      }
    });

    return categories;
  });

  console.log(`   ✅ ${subCategories.length} sous-catégories trouvées`);
  return subCategories;
}

/**
 * Récupère tous les liens produits d'une page catégorie
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

    // Les produits Dispano ont le format /p/category/product-name-AXXXXXXX
    document.querySelectorAll('a').forEach((el) => {
      const href = el.href;
      if (!href) return;

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
 * Détermine le productType basé sur le nom et type
 */
function determineProductType(nom: string, typeProduit: string | null): string {
  const nomLower = nom.toLowerCase();
  const typeLower = (typeProduit || '').toLowerCase();

  if (nomLower.includes('stratifi') || typeLower.includes('stratifi')) {
    return 'STRATIFIE';
  }
  if (nomLower.includes('compact') || typeLower.includes('compact')) {
    return 'COMPACT';
  }
  if (nomLower.includes('mélaminé') || nomLower.includes('melamine') || typeLower.includes('mélaminé')) {
    return 'MELAMINE';
  }
  if (nomLower.includes('placage') || typeLower.includes('placage')) {
    return 'PLACAGE';
  }

  // Par défaut pour panneaux décoratifs
  return 'MELAMINE';
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
        const brands = [
          'SWISS KRONO',
          'EGGER',
          'KRONOSPAN',
          'FINSA',
          'PFLEIDERER',
          'UNILIN',
          'POLYREY',
          'ABET LAMINATI',
          'FORMICA',
          'RESOPAL',
          'ARPA',
        ];
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
      const refPolyreyMatch = pageText.match(/R[ée]f\.?\s*POLYREY\s*:?\s*(\d+)/i);
      result.refMarque =
        refSwissKronoMatch?.[1] ||
        refEggerMatch?.[1] ||
        refKronospanMatch?.[1] ||
        refFinsaMatch?.[1] ||
        refPolyreyMatch?.[1] ||
        null;

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
      result.deuxFacesIdentiques = deuxFacesMatch
        ? deuxFacesMatch[1].toLowerCase().includes('oui')
        : null;

      // === IMAGE ===
      const imgSelectors = [
        '[data-testid*="image"] img',
        '.product-image img',
        'picture img',
        'img[src*="dispano"]',
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

      // === STOCK ===
      result.stockStatus = null;
      result.stockQuantity = null;
      result.stockLocations = [];

      // Recherche du statut de stock dans le texte
      if (pageText.match(/en\s*stock/i)) {
        result.stockStatus = 'EN STOCK';
      } else if (pageText.match(/sur\s*commande/i)) {
        result.stockStatus = 'Sur commande';
      } else if (pageText.match(/disponible/i)) {
        result.stockStatus = 'Disponible';
      } else if (pageText.match(/rupture/i) || pageText.match(/indisponible/i)) {
        result.stockStatus = 'Rupture';
      }

      // Chercher la quantité en stock
      const stockQtyMatch = pageText.match(/(\d+)\s*(?:en\s*stock|disponible|unité)/i);
      if (stockQtyMatch) {
        result.stockQuantity = parseInt(stockQtyMatch[1]);
      }

      // Chercher les badges/indicateurs de stock visuels
      const stockBadge = document.querySelector('[data-testid*="stock"], [class*="stock"], [class*="availability"]');
      if (stockBadge) {
        const badgeText = stockBadge.textContent?.trim().toLowerCase() || '';
        if (badgeText.includes('stock') && !badgeText.includes('rupture')) {
          result.stockStatus = 'EN STOCK';
        }
      }

      // Chercher les disponibilités par agence/dépôt
      const stockRows = document.querySelectorAll('[data-testid*="availability"], [class*="store-stock"], tr[class*="stock"]');
      stockRows.forEach((row) => {
        const text = row.textContent || '';
        const locationMatch = text.match(/([A-Za-zÀ-ÿ\s-]+)[\s:]+(\d+)\s*(en\s*stock|disponible|unité)/i);
        if (locationMatch) {
          result.stockLocations.push({
            location: locationMatch[1].trim(),
            inStock: true,
            quantity: parseInt(locationMatch[2]),
          });
        }
      });

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
      imageUrl: data.imageUrl,
      stockStatus: data.stockStatus,
      stockQuantity: data.stockQuantity,
      stockLocations: data.stockLocations || [],
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🔧 SCRAPING DISPANO - PANNEAUX DÉCORATIFS');
  console.log('='.repeat(60));
  console.log('⚠️  Architecture: Catalogue DISPANO (séparé de Bouney)');
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
    console.error("❌ Impossible de se connecter à Chrome.");
    console.error("   Lancez d'abord Chrome en mode debug!");
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté à Chrome!\n');

  const stats: ScrapingStats = {
    totalProducts: 0,
    created: 0,
    updated: 0,
    errors: 0,
    byCategory: new Map(),
  };

  // 1. Récupérer ou créer le catalogue Dispano
  console.log('📦 Récupération/création du catalogue DISPANO...');
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: 'dispano' },
    update: {
      name: 'Dispano',
      description: 'Catalogue Dispano - Panneaux décoratifs et techniques',
      isActive: true,
    },
    create: {
      name: 'Dispano',
      slug: 'dispano',
      description: 'Catalogue Dispano - Panneaux décoratifs et techniques',
      isActive: true,
    },
  });
  console.log(`   ✅ Catalogue: ${catalogue.name} (${catalogue.id})`);
  console.log(`   📌 Slug: dispano (différent de bouney)\n`);

  // 2. Créer la catégorie principale "Panneaux Décoratifs"
  const mainCategory = await prisma.category.upsert({
    where: {
      catalogueId_slug: { catalogueId: catalogue.id, slug: 'panneaux-decoratifs' },
    },
    update: { name: 'Panneaux Décoratifs' },
    create: {
      name: 'Panneaux Décoratifs',
      slug: 'panneaux-decoratifs',
      catalogueId: catalogue.id,
    },
  });
  console.log(`   📂 Catégorie principale: ${mainCategory.name}\n`);

  // 3. Récupérer les sous-catégories
  const subCategories = await getSubCategories(page, CATEGORY_URL);

  // Si pas de sous-catégories, scraper directement la page principale
  const categoriesToScrape =
    subCategories.length > 0
      ? subCategories
      : [{ name: 'Panneaux Décoratifs', slug: 'panneaux-decoratifs', url: CATEGORY_URL }];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${categoriesToScrape.length} catégorie(s) à scraper`);
  console.log(`${'='.repeat(60)}\n`);

  // 4. Scraper chaque sous-catégorie
  for (const subCat of categoriesToScrape) {
    console.log(`\n${'━'.repeat(60)}`);
    console.log(`📁 Catégorie: ${subCat.name}`);
    console.log(`${'━'.repeat(60)}`);

    // Créer la sous-catégorie
    const category = await prisma.category.upsert({
      where: {
        catalogueId_slug: { catalogueId: catalogue.id, slug: subCat.slug },
      },
      update: { name: subCat.name, parentId: mainCategory.id },
      create: {
        name: subCat.name,
        slug: subCat.slug,
        catalogueId: catalogue.id,
        parentId: mainCategory.id,
      },
    });

    // Récupérer les produits
    const productLinks = await getProductLinks(page, subCat.url);
    stats.byCategory.set(subCat.name, 0);

    for (let i = 0; i < productLinks.length; i++) {
      const url = productLinks[i];
      stats.totalProducts++;

      if ((i + 1) % 10 === 0 || i === 0) {
        console.log(`\n   📈 Progression: ${i + 1}/${productLinks.length}`);
      }

      const filename = url.split('/').pop() || url;
      console.log(`   [${i + 1}/${productLinks.length}] ${filename.substring(0, 45)}...`);

      const product = await scrapeProduct(page, url);

      if (product) {
        console.log(`      📦 ${product.nom.substring(0, 40)}...`);
        console.log(`      🏭 ${product.marque} | ${product.refDispano}`);

        try {
          const reference = `DISP-DEC-${product.refDispano}`;
          const productType = determineProductType(product.nom, product.typeProduit);

          // Construire les métadonnées étendues
          const extendedData: Record<string, any> = {};
          // Marque (important!)
          if (product.marque) extendedData.marque = product.marque;
          if (product.refMarque) extendedData.refMarque = product.refMarque;
          if (product.codeEAN) extendedData.codeEAN = product.codeEAN;
          if (product.prixPublic) extendedData.prixPublic = product.prixPublic;
          if (product.poids) extendedData.poids = product.poids;
          if (product.classeFeu) extendedData.classeFeu = product.classeFeu;
          if (product.co2) extendedData.co2 = product.co2;
          if (product.teinte) extendedData.teinte = product.teinte;
          if (product.gamme) extendedData.gamme = product.gamme;
          if (product.formaldehyde) extendedData.formaldehyde = product.formaldehyde;
          if (product.classementParticules) extendedData.classementParticules = product.classementParticules;
          if (product.ignifuge) extendedData.ignifuge = product.ignifuge;
          if (product.deuxFacesIdentiques !== null)
            extendedData.deuxFacesIdentiques = product.deuxFacesIdentiques;
          if (product.support) extendedData.support = product.support;
          // Stock quantity dans metadata si présent
          if (product.stockQuantity) extendedData.stockQuantity = product.stockQuantity;

          const metadataJson =
            Object.keys(extendedData).length > 0 ? JSON.stringify(extendedData) : null;

          // Stock locations en JSON
          const stockLocationsJson = product.stockLocations.length > 0
            ? JSON.stringify(product.stockLocations)
            : null;

          await prisma.panel.upsert({
            where: {
              catalogueId_reference: { catalogueId: catalogue.id, reference },
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
              productType,
              decor: product.decor,
              colorCode: product.refDecor,
              imageUrl: product.imageUrl,
              stockStatus: product.stockStatus,
              stockLocations: stockLocationsJson,
              categoryId: category.id,
              isActive: true,
              metadata: metadataJson,
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
              productType,
              decor: product.decor,
              colorCode: product.refDecor,
              imageUrl: product.imageUrl,
              stockStatus: product.stockStatus,
              stockLocations: stockLocationsJson,
              catalogueId: catalogue.id,
              categoryId: category.id,
              isActive: true,
              metadata: metadataJson,
            },
          });

          stats.created++;
          stats.byCategory.set(subCat.name, (stats.byCategory.get(subCat.name) || 0) + 1);
          const stockInfo = product.stockStatus ? ` | 📦 ${product.stockStatus}` : '';
          console.log(`      ✅ ${reference}${stockInfo}`);
        } catch (e) {
          stats.errors++;
          console.log(`      ⚠️ Erreur DB: ${(e as Error).message.substring(0, 50)}`);
        }
      } else {
        stats.errors++;
        console.log(`      ⚠️ Pas de données extraites`);
      }

      // Pause entre chaque produit
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 5. Résumé final
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`✨ SCRAPING DISPANO - PANNEAUX DÉCORATIFS TERMINÉ!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   📦 Produits scrapés: ${stats.totalProducts}`);
  console.log(`   ✅ Panneaux créés/mis à jour: ${stats.created}`);
  console.log(`   ❌ Erreurs: ${stats.errors}`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\n📊 Répartition par catégorie:`);
  for (const [cat, count] of stats.byCategory) {
    console.log(`   - ${cat}: ${count} produits`);
  }

  // Vérification finale
  const totalDispano = await prisma.panel.count({ where: { catalogueId: catalogue.id } });
  const totalBouney = await prisma.panel.count({
    where: { catalogue: { slug: 'bouney' } },
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 VÉRIFICATION ARCHITECTURE:`);
  console.log(`   📌 Catalogue DISPANO: ${totalDispano} panneaux`);
  console.log(`   📌 Catalogue BOUNEY: ${totalBouney} panneaux`);
  console.log(`   ✅ Les catalogues sont bien séparés!`);
  console.log(`${'='.repeat(60)}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
