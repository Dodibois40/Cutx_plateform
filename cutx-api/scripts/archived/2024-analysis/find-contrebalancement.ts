import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  console.log('URL:', page.url());
  console.log('\n🔍 Recherche des produits "contrebalancement"...\n');

  // Find products with "contrebalancement"
  const products = await page.evaluate(() => {
    const results: any[] = [];
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');

    wrappers.forEach(wrapper => {
      const text = wrapper.textContent?.toLowerCase() || '';
      if (text.includes('contrebalancement')) {
        const refEl = wrapper.querySelector('p.text-primary');
        const nameEl = wrapper.querySelector('.product-info p:not(.text-primary)');

        // Get table data
        const tables = wrapper.querySelectorAll('table');
        const variants: any[] = [];

        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
              const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
              variants.push(cellTexts);
            }
          });
        });

        results.push({
          wrapperId: wrapper.id,
          manufacturerRef: refEl?.textContent?.trim(),
          name: nameEl?.textContent?.trim(),
          variantsCount: variants.length,
          firstVariants: variants.slice(0, 5),
        });
      }
    });

    return results;
  });

  products.forEach((p, i) => {
    console.log(`[${i + 1}] ${p.wrapperId}`);
    console.log(`    Ref fab: ${p.manufacturerRef}`);
    console.log(`    Nom: ${p.name}`);
    console.log(`    Variantes: ${p.variantsCount}`);
    if (p.firstVariants.length > 0) {
      console.log('    Premières variantes:');
      p.firstVariants.forEach((v: string[], j: number) => {
        console.log(`      [${j}] ${v.join(' | ')}`);
      });
    }
    console.log('');
  });

  await browser.disconnect();
}
main().catch(console.error);
