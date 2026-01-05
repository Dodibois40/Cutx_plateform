/**
 * Scraping Dispano - Stratifiés HPL
 *
 * Gère la pagination (55 pages, ~1304 produits)
 */
import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'https://www.dispano.fr/c/stratifies-hpl/x2visu_dig_onv2_2027920R5';

interface DispanoProduct {
  nom: string;
  marque: string;
  refDispano: string;
  refMarque: string | null;
  prixM2: number | null;
  longueur: number;
  largeur: number;
  epaisseur: number;
  decor: string | null;
  finition: string | null;
  support: string | null;
  imageUrl: string | null;
  stockStatus: string | null;
}

/**
 * Récupère les liens produits d'une page
 */
async function getProductLinksFromPage(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll('a').forEach(el => {
      const href = el.href;
      if (href && href.includes('/p/') && href.match(/-A\d{6,8}$/)) {
        if (!links.includes(href)) links.push(href);
      }
    });
    return links;
  });
}

/**
 * Navigue vers une page de pagination
 */
async function goToPage(page: Page, pageNum: number): Promise<boolean> {
  // Dispano uses /page-X suffix, not ?page=X
  const url = pageNum === 1 ? BASE_URL : `${BASE_URL}/page-${pageNum}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    return true;
  } catch (e) {
    console.log(`   ⚠️ Timeout page ${pageNum}`);
    return false;
  }
}

/**
 * Scrape un produit
 */
async function scrapeProduct(page: Page, url: string): Promise<DispanoProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Scroll pour charger les specs
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 500);
        await new Promise(r => setTimeout(r, 200));
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    const data = await page.evaluate(() => {
      const result: Record<string, any> = {};
      const pageText = document.body.innerText;

      // NOM
      const titleEl = document.querySelector('[data-testid="article-header/article-name"], h1');
      result.nom = titleEl?.textContent?.trim() || '';

      // MARQUE
      const brands = ['EGGER', 'POLYREY', 'ABET LAMINATI', 'FORMICA', 'ARPA', 'HOMAPAL', 'RESOPAL', 'PFLEIDERER', 'KRONOSPAN', 'UNILIN', 'SWISS KRONO', 'FINSA', 'DUROPAL'];
      const pageTitle = document.title.toUpperCase();
      const pageTextUpper = pageText.toUpperCase();
      for (const brand of brands) {
        if (pageTitle.includes(brand) || pageTextUpper.includes(brand)) {
          result.marque = brand;
          break;
        }
      }

      // RÉFÉRENCES
      const refDispanoMatch = pageText.match(/R[ée]f\.?\s*Dispano\s*:?\s*(\d+)/i);
      result.refDispano = refDispanoMatch ? refDispanoMatch[1] : null;

      // Référence marque
      const refPatterns = [
        /R[ée]f\.?\s*(?:EGGER|fabricant)\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*POLYREY\s*:?\s*([A-Z0-9-]+)/i,
      ];
      for (const pattern of refPatterns) {
        const match = pageText.match(pattern);
        if (match) { result.refMarque = match[1]; break; }
      }

      // PRIX
      const prixPatterns = [
        /([\d,]+)\s*€\s*HT\s*\/\s*[Mm][èe]tre\s*carr[ée]/,
        /([\d,]+)\s*€\s*\/\s*m²/i,
        /([\d,]+)\s*€\s*HT\s*\/\s*m²/i,
      ];
      for (const pattern of prixPatterns) {
        const match = pageText.match(pattern);
        if (match) { result.prixM2 = parseFloat(match[1].replace(',', '.')); break; }
      }

      // DIMENSIONS depuis le nom ou le texte
      // Format: 305x131cm, 279x206cm, etc.
      const dimFromName = result.nom?.match(/(\d{2,3})x(\d{2,3})\s*cm/i);
      if (dimFromName) {
        result.longueur = parseInt(dimFromName[1]) * 10;
        result.largeur = parseInt(dimFromName[2]) * 10;
      }

      // ÉPAISSEUR depuis le nom (ex: 0,8mm, 0.8mm, ép. 0,8mm)
      const epMatch = result.nom?.match(/(?:[ée]p\.?\s*)?([\d,\.]+)\s*mm/i);
      if (epMatch) result.epaisseur = parseFloat(epMatch[1].replace(',', '.'));

      // Fallback dimensions from text
      if (!result.longueur) {
        const longueurMatch = pageText.match(/Longueur\s*:?\s*(\d+)\s*(?:mm|cm)/i);
        if (longueurMatch) {
          result.longueur = parseInt(longueurMatch[1]);
          if (result.longueur < 400) result.longueur *= 10;
        }
      }
      if (!result.largeur) {
        const largeurMatch = pageText.match(/Largeur\s*:?\s*(\d+)\s*(?:mm|cm)/i);
        if (largeurMatch) {
          result.largeur = parseInt(largeurMatch[1]);
          if (result.largeur < 200) result.largeur *= 10;
        }
      }

      // DÉCOR
      const decorMatch = pageText.match(/(?:Nom\s*)?[Dd][ée]cor\s*:?\s*([^\n]+)/i);
      result.decor = decorMatch ? decorMatch[1].trim().substring(0, 50) : null;

      // FINITION
      const finitionMatch = pageText.match(/Finition[\/]?Structure\s*:?\s*([^\n]+)/i);
      result.finition = finitionMatch ? finitionMatch[1].trim().substring(0, 50) : null;

      // SUPPORT
      const supportMatch = pageText.match(/Support\s*:?\s*([^\n]+)/i);
      result.support = supportMatch ? supportMatch[1].trim().substring(0, 100) : null;

      // IMAGE
      const imgSelectors = ['[data-testid*="image"] img', '.product-image img', 'picture img', 'img[src*="dispano"]'];
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
        if (ogImage) result.imageUrl = ogImage.getAttribute('content');
      }

      // STOCK
      if (pageText.match(/en\s*stock/i)) result.stockStatus = 'EN STOCK';
      else if (pageText.match(/sur\s*commande/i)) result.stockStatus = 'Sur commande';
      else if (pageText.match(/disponible/i)) result.stockStatus = 'Disponible';

      return result;
    });

    if (!data.nom) return null;

    // Extraire refDispano depuis l'URL si pas trouvé
    if (!data.refDispano) {
      const urlMatch = url.match(/-A(\d{6,8})$/);
      data.refDispano = urlMatch ? urlMatch[1] : null;
    }

    if (!data.refDispano) return null;

    return {
      nom: data.nom,
      marque: data.marque || 'Dispano',
      refDispano: data.refDispano,
      refMarque: data.refMarque || null,
      prixM2: data.prixM2 || null,
      longueur: data.longueur || 0,
      largeur: data.largeur || 0,
      epaisseur: data.epaisseur || 0,
      decor: data.decor || null,
      finition: data.finition || null,
      support: data.support || null,
      imageUrl: data.imageUrl || null,
      stockStatus: data.stockStatus || null,
    };
  } catch (error) {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const maxPagesArg = args.find(a => a.startsWith('--pages='));
  const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 55;

  console.log('═'.repeat(60));
  console.log('🔄 SCRAPER DISPANO - STRATIFIÉS HPL');
  console.log('═'.repeat(60));
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`🧪 Mode test: ${isTest ? 'OUI' : 'NON'}`);
  console.log(`📄 Max pages: ${maxPages}`);
  if (limit) console.log(`📌 Limite produits: ${limit}`);

  // Connexion Chrome
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
    console.error("❌ Chrome non connecté. Lancez Chrome en mode debug!");
    process.exit(1);
  }
  const pages = await browser.pages();
  const page = pages[0];
  console.log('\n✅ Chrome connecté');

  // Catalogue Dispano
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: 'dispano' },
    update: {},
    create: { name: 'Dispano', slug: 'dispano', description: 'Catalogue Dispano', isActive: true },
  });
  console.log(`📦 Catalogue: ${catalogue.name}`);

  // Catégorie Stratifiés HPL
  const category = await prisma.category.upsert({
    where: { catalogueId_slug: { catalogueId: catalogue.id, slug: 'stratifies-hpl' } },
    update: { name: 'Stratifiés HPL' },
    create: { name: 'Stratifiés HPL', slug: 'stratifies-hpl', catalogueId: catalogue.id },
  });

  // PHASE 1: Collecter tous les liens produits
  console.log('\n📋 PHASE 1: Collecte des liens produits...');
  const allProductLinks: string[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    process.stdout.write(`   Page ${pageNum}/${maxPages}...`);

    const success = await goToPage(page, pageNum);
    if (!success) {
      console.log(' ⚠️ Skip');
      continue;
    }

    const links = await getProductLinksFromPage(page);
    links.forEach(link => {
      if (!allProductLinks.includes(link)) allProductLinks.push(link);
    });
    console.log(` ${links.length} liens (total: ${allProductLinks.length})`);

    if (limit && allProductLinks.length >= limit) {
      console.log(`   📌 Limite atteinte`);
      break;
    }
  }

  console.log(`\n   ✅ Total liens collectés: ${allProductLinks.length}`);

  // PHASE 2: Scraper chaque produit
  const linksToProcess = limit ? allProductLinks.slice(0, limit) : allProductLinks;
  console.log(`\n📊 PHASE 2: Extraction de ${linksToProcess.length} produits...`);

  // Désactiver les triggers
  await prisma.$executeRawUnsafe('ALTER TABLE "Panel" DISABLE TRIGGER ALL');

  let saved = 0;
  let errors = 0;
  const byBrand: Record<string, number> = {};

  for (let i = 0; i < linksToProcess.length; i++) {
    const url = linksToProcess[i];
    const filename = url.split('/').pop()?.substring(0, 45) || '';

    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`\n   📈 Progression: ${i + 1}/${linksToProcess.length}`);
    }
    process.stdout.write(`   [${i + 1}] ${filename}...`);

    const product = await scrapeProduct(page, url);

    if (product) {
      byBrand[product.marque] = (byBrand[product.marque] || 0) + 1;

      if (!isTest) {
        try {
          const reference = `DISP-STR-${product.refDispano}`;

          await prisma.panel.upsert({
            where: { catalogueId_reference: { catalogueId: catalogue.id, reference } },
            update: {
              name: product.nom,
              thickness: product.epaisseur ? [product.epaisseur] : [],
              defaultLength: product.longueur,
              defaultWidth: product.largeur,
              pricePerM2: product.prixM2,
              manufacturerRef: product.refMarque,
              material: product.support || 'HPL',
              finish: product.finition,
              productType: 'STRATIFIE',
              decor: product.decor,
              imageUrl: product.imageUrl,
              stockStatus: product.stockStatus,
              categoryId: category.id,
              isActive: true,
              metadata: JSON.stringify({ marque: product.marque }),
            },
            create: {
              reference,
              name: product.nom,
              thickness: product.epaisseur ? [product.epaisseur] : [],
              defaultLength: product.longueur,
              defaultWidth: product.largeur,
              pricePerM2: product.prixM2,
              manufacturerRef: product.refMarque,
              material: product.support || 'HPL',
              finish: product.finition,
              productType: 'STRATIFIE',
              decor: product.decor,
              imageUrl: product.imageUrl,
              stockStatus: product.stockStatus,
              catalogueId: catalogue.id,
              categoryId: category.id,
              isActive: true,
              metadata: JSON.stringify({ marque: product.marque }),
            },
          });
          saved++;
          console.log(` ✅ ${product.marque}`);
        } catch (e) {
          errors++;
          console.log(` ⚠️ DB err`);
        }
      } else {
        console.log(` ✅ ${product.marque} (test)`);
      }
    } else {
      errors++;
      console.log(` ⚠️ No data`);
    }
  }

  // Réactiver les triggers
  await prisma.$executeRawUnsafe('ALTER TABLE "Panel" ENABLE TRIGGER ALL');

  // Résumé
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📈 RÉSUMÉ');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Pages parcourues: ${maxPages}`);
  console.log(`   Liens collectés: ${allProductLinks.length}`);
  console.log(`   Produits traités: ${linksToProcess.length}`);
  console.log(`   Sauvegardés: ${saved}`);
  console.log(`   Erreurs: ${errors}`);

  console.log('\n   Par marque:');
  Object.entries(byBrand).sort((a, b) => b[1] - a[1]).forEach(([brand, count]) => {
    console.log(`      ${brand}: ${count}`);
  });

  await browser.disconnect();
  await prisma.$disconnect();

  console.log('\n✅ Terminé!');
}

main().catch(console.error);
