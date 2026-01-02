/**
 * Script pour découvrir les URLs exactes des catégories Panneaux Bois sur Dispano
 *
 * Usage:
 *   npx tsx scripts/dispano/discover-urls.ts
 *
 * Prérequis:
 *   Chrome lancé avec: chrome --remote-debugging-port=9222
 */

import puppeteer from 'puppeteer-core';

const CHROME_DEBUG_URL = 'http://localhost:9222';

interface CategoryLink {
  name: string;
  url: string;
  parent?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('🔍 Découverte des URLs Dispano - Panneaux Bois\n');

  const browser = await puppeteer.connect({
    browserURL: CHROME_DEBUG_URL,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Page principale des panneaux bois
  const mainUrl = 'https://www.dispano.fr/l/panneaux-bois';
  console.log(`📄 Navigation vers ${mainUrl}\n`);

  await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await delay(5000);

  // Extraire la structure du menu
  const categories: CategoryLink[] = await page.evaluate(() => {
    const results: CategoryLink[] = [];

    // Chercher dans le menu de navigation
    const menuItems = document.querySelectorAll('nav a, .menu a, .category-list a, [class*="category"] a');

    menuItems.forEach(item => {
      const link = item as HTMLAnchorElement;
      const name = link.textContent?.trim() || '';
      const url = link.href;

      if (name && url && url.includes('/c/') && !results.some(r => r.url === url)) {
        results.push({ name, url });
      }
    });

    // Chercher aussi dans le contenu principal
    const contentLinks = document.querySelectorAll('main a[href*="/c/"], .content a[href*="/c/"]');
    contentLinks.forEach(item => {
      const link = item as HTMLAnchorElement;
      const name = link.textContent?.trim() || '';
      const url = link.href;

      if (name && url && !results.some(r => r.url === url)) {
        results.push({ name, url });
      }
    });

    return results;
  });

  console.log('📋 Catégories trouvées sur la page principale:\n');
  categories.forEach(cat => {
    console.log(`  "${cat.name}": "${cat.url}",`);
  });

  // Maintenant, visiter chaque catégorie pour trouver les sous-catégories
  const mainCategories = [
    { name: 'Contreplaqués', url: 'https://www.dispano.fr/l/contreplaques' },
    { name: 'Lattés', url: 'https://www.dispano.fr/l/lattes' },
    { name: 'MDF & fibres dures', url: 'https://www.dispano.fr/l/mdf-fibres-dures' },
    { name: 'Particules', url: 'https://www.dispano.fr/l/particules' },
    { name: 'OSB', url: 'https://www.dispano.fr/l/osb' },
    { name: 'Panneaux lamellés collés', url: 'https://www.dispano.fr/l/panneaux-lamelles-colles-panneaux-3-plis' },
    { name: 'Panneaux construction', url: 'https://www.dispano.fr/l/panneaux-pour-la-construction' },
    { name: 'Panneau Alvéolaire', url: 'https://www.dispano.fr/l/panneau-alveolaire' },
    { name: 'Colles', url: 'https://www.dispano.fr/l/colles' },
  ];

  console.log('\n\n🔄 Exploration des sous-catégories...\n');

  for (const mainCat of mainCategories) {
    console.log(`\n📂 ${mainCat.name}`);
    console.log(`   URL: ${mainCat.url}`);

    try {
      await page.goto(mainCat.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(2000);

      const subCategories = await page.evaluate(() => {
        const results: { name: string; url: string }[] = [];

        // Chercher les liens vers les sous-catégories
        const links = document.querySelectorAll('a[href*="/c/"]');
        links.forEach(link => {
          const anchor = link as HTMLAnchorElement;
          const name = anchor.textContent?.trim() || '';
          const url = anchor.href;

          if (name && url && !results.some(r => r.url === url)) {
            results.push({ name, url });
          }
        });

        return results;
      });

      subCategories.forEach(sub => {
        console.log(`   └─ "${sub.name}": "${sub.url}"`);
      });

    } catch (err) {
      console.log(`   ⚠️ Erreur: ${err}`);

      // Essayer avec /c/ au lieu de /l/
      const altUrl = mainCat.url.replace('/l/', '/c/');
      console.log(`   🔄 Essai avec: ${altUrl}`);

      try {
        await page.goto(altUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);

        const subCategories = await page.evaluate(() => {
          const results: { name: string; url: string }[] = [];
          const links = document.querySelectorAll('a[href*="/c/"]');
          links.forEach(link => {
            const anchor = link as HTMLAnchorElement;
            const name = anchor.textContent?.trim() || '';
            const url = anchor.href;
            if (name && url && !results.some(r => r.url === url)) {
              results.push({ name, url });
            }
          });
          return results;
        });

        subCategories.forEach(sub => {
          console.log(`   └─ "${sub.name}": "${sub.url}"`);
        });
      } catch (err2) {
        console.log(`   ❌ Échec: ${err2}`);
      }
    }
  }

  await page.close();
  console.log('\n✅ Découverte terminée\n');
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
