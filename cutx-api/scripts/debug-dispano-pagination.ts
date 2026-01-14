/**
 * Debug Dispano pagination mechanism
 */
import puppeteer from 'puppeteer-core';

const URL = 'https://www.dispano.fr/c/stratifies-hpl/x2visu_dig_onv2_2027920R5';

async function main() {
  console.log('🔍 Debug Dispano Pagination Mechanism');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];

  console.log(`📍 Chargement page initiale...`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Get pagination links
  const paginationInfo = await page.evaluate(() => {
    const links: { text: string; href: string }[] = [];

    // Find pagination container
    document.querySelectorAll('a, button').forEach(el => {
      const text = el.textContent?.trim() || '';
      const href = (el as HTMLAnchorElement).href || '';

      // Look for page numbers or navigation
      if (/^(\d+|Suivant|Précédent|>|<|>>|<<)$/.test(text)) {
        links.push({ text, href });
      }
    });

    // Also look for pagination in URLs
    const urlsWithPage: string[] = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.href;
      if (href && (href.includes('page=') || href.includes('/page/') || href.includes('p='))) {
        urlsWithPage.push(href);
      }
    });

    return { links: links.slice(0, 20), urlsWithPage: urlsWithPage.slice(0, 10) };
  });

  console.log('\n📊 Pagination links found:');
  paginationInfo.links.forEach(l => {
    console.log(`   [${l.text}] -> ${l.href || '(no href)'}`);
  });

  if (paginationInfo.urlsWithPage.length > 0) {
    console.log('\n📊 URLs with page parameter:');
    paginationInfo.urlsWithPage.forEach(u => console.log(`   ${u}`));
  }

  // Try clicking on page 2
  console.log('\n🖱️ Trying to click on page 2...');
  const clicked = await page.evaluate(() => {
    const pageLinks = Array.from(document.querySelectorAll('a, button'));
    const page2 = pageLinks.find(el => el.textContent?.trim() === '2');
    if (page2) {
      (page2 as HTMLElement).click();
      return true;
    }
    return false;
  });

  if (clicked) {
    console.log('   Clicked! Waiting for navigation...');
    await new Promise(r => setTimeout(r, 5000));

    const newUrl = page.url();
    console.log(`   New URL: ${newUrl}`);

    const newLinks = await page.evaluate(() => {
      const links: string[] = [];
      document.querySelectorAll('a').forEach(el => {
        if (el.href && el.href.includes('/p/') && el.href.match(/-A\d{6,8}$/)) {
          if (!links.includes(el.href)) links.push(el.href);
        }
      });
      return links;
    });
    console.log(`   Products on page 2: ${newLinks.length}`);
    console.log(`   First product: ${newLinks[0]?.split('/').pop()}`);
  } else {
    console.log('   Could not find page 2 link');
  }

  await browser.disconnect();
}

main().catch(console.error);
