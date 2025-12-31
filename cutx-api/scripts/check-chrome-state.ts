/**
 * Vérifier l'état actuel de Chrome et ce qu'il voit
 */

import puppeteer from 'puppeteer-core';

async function main() {
  console.log('🔍 VÉRIFICATION ÉTAT CHROME');
  console.log('='.repeat(60));

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome non connecté sur le port 9222');
    console.error('   Lance Chrome avec: scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  console.log(`\n📑 Onglets ouverts: ${pages.length}`);

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📄 Onglet #${i + 1}`);

    const info = await p.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body?.innerText?.substring(0, 500) || 'VIDE',
        isLoginPage: document.body?.innerText?.toLowerCase().includes('connexion') ||
                     document.body?.innerText?.toLowerCase().includes('identifiant') ||
                     document.querySelector('input[type="password"]') !== null,
        hasCookieBanner: document.body?.innerText?.toLowerCase().includes('cookie') ||
                         document.querySelector('[class*="cookie"]') !== null,
      };
    });

    console.log(`   URL: ${info.url}`);
    console.log(`   Titre: ${info.title}`);
    console.log(`   Page de connexion: ${info.isLoginPage ? 'OUI ⚠️' : 'Non'}`);
    console.log(`   Bannière cookies: ${info.hasCookieBanner ? 'OUI ⚠️' : 'Non'}`);
    console.log(`   Contenu (500 premiers chars):`);
    console.log(`   ${info.bodyText.substring(0, 300)}...`);
  }

  console.log('\n' + '='.repeat(60));
  await browser.disconnect();
}

main();
