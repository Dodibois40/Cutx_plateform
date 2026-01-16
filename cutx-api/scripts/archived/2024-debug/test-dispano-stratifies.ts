/**
 * Test scraping Dispano - Stratifiés HPL
 */
import puppeteer from 'puppeteer-core';

const URL = 'https://www.dispano.fr/c/stratifies-hpl/x2visu_dig_onv2_2027920R5';

async function main() {
  console.log('🔍 Test Dispano - Stratifiés HPL');
  console.log('='.repeat(60));

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];

  console.log(`\n📍 Chargement: ${URL}`);

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('⚠️ Timeout de navigation, on continue...');
  }
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger tous les produits
  console.log('📜 Scroll pour charger tous les produits...');
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;

  while (previousHeight !== currentHeight && attempts < 30) {
    previousHeight = currentHeight;
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 800);
          totalHeight += 800;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await new Promise(r => setTimeout(r, 2000));
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    attempts++;
    console.log(`   Scroll ${attempts}: ${currentHeight}px`);
  }

  // Compter les produits
  const productInfo = await page.evaluate(() => {
    const links: string[] = [];

    // Chercher les liens produits (format Dispano: /p/category/product-AXXXXXX)
    document.querySelectorAll('a').forEach(el => {
      const href = el.href;
      if (href && href.includes('/p/') && href.match(/-A\d{6,8}$/)) {
        if (!links.includes(href)) links.push(href);
      }
    });

    // Aussi chercher par data-testid ou classes courantes
    const cards = document.querySelectorAll('[data-testid*="product"], [class*="product-card"], [class*="ProductCard"]');

    return {
      productLinks: links,
      cardCount: cards.length,
      sampleLinks: links.slice(0, 5),
    };
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RÉSULTATS');
  console.log(`${'='.repeat(60)}`);
  console.log(`   🔗 Liens produits trouvés: ${productInfo.productLinks.length}`);
  console.log(`   📦 Cartes produits (DOM): ${productInfo.cardCount}`);

  if (productInfo.sampleLinks.length > 0) {
    console.log('\n   📋 Exemples de liens:');
    productInfo.sampleLinks.forEach((link, i) => {
      console.log(`      [${i + 1}] ${link.split('/').pop()}`);
    });
  }

  // Vérifier s'il y a des sous-catégories
  const subCategories = await page.evaluate(() => {
    const cats: { name: string; url: string }[] = [];

    document.querySelectorAll('a[href*="/c/"]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      const text = el.textContent?.trim() || '';

      if (href.includes('/c/') && !href.includes('/p/') && text.length > 2 && text.length < 80) {
        if (!cats.find(c => c.url === href) && !href.includes('stratifies-hpl/x2visu')) {
          cats.push({ name: text, url: href });
        }
      }
    });

    return cats;
  });

  if (subCategories.length > 0) {
    console.log(`\n   📂 Sous-catégories détectées: ${subCategories.length}`);
    subCategories.slice(0, 10).forEach((cat, i) => {
      console.log(`      [${i + 1}] ${cat.name.substring(0, 40)}`);
      console.log(`          ${cat.url}`);
    });
  }

  console.log(`\n${'='.repeat(60)}`);

  await browser.disconnect();
}

main().catch(console.error);
