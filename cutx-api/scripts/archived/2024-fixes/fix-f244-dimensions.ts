/**
 * Script spécifique pour fixer le produit F244 ST76
 * URL connue: https://www.bcommebois.fr/plan-de-travail-f244-st76-egger-marbre-candela-anthracite-93226.html
 */

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const F244_URL = 'https://www.bcommebois.fr/plan-de-travail-f244-st76-egger-marbre-candela-anthracite-93226.html';

async function fixF244() {
  console.log('🔧 CORRECTION DU PRODUIT F244 ST76');
  console.log('===================================\n');

  // 1. Trouver les produits F244 dans la base
  const f244Products = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'F244', mode: 'insensitive' } },
        { manufacturerRef: 'F244' },
        { decorCode: 'F244' },
      ],
      productType: { in: ['PLAN_DE_TRAVAIL', 'COMPACT'] }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
    }
  });

  console.log(`📊 ${f244Products.length} produit(s) F244 trouvé(s)\n`);

  if (f244Products.length === 0) {
    console.log('❌ Aucun produit F244 trouvé');
    return;
  }

  f244Products.forEach(p => {
    const hasDims = p.defaultLength && p.defaultWidth && p.defaultThickness;
    console.log(`   ${hasDims ? '✅' : '❌'} ${p.reference}`);
    console.log(`      ${p.name.substring(0, 50)}...`);
    console.log(`      Dims: ${p.defaultLength || 'NULL'} x ${p.defaultWidth || 'NULL'} x ${p.defaultThickness || 'NULL'}`);
    console.log('');
  });

  // 2. Connexion à Chrome et scraping de la page
  console.log('🔌 Connexion à Chrome...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome debug non accessible');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté!\n');

  console.log(`🌐 Navigation vers: ${F244_URL}\n`);
  await page.goto(F244_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  // 3. Parser les données
  const data = await page.evaluate(() => {
    const result: any = {
      longueur: 0,
      largeur: 0,
      epaisseur: 0,
    };

    // Parser la Definition List (<dl>)
    const dls = document.querySelectorAll('dl');
    dls.forEach(dl => {
      const dts = dl.querySelectorAll('dt');
      const dds = dl.querySelectorAll('dd');

      for (let i = 0; i < dts.length; i++) {
        const label = dts[i]?.textContent?.trim().toLowerCase() || '';
        const value = dds[i]?.textContent?.trim() || '';
        const numMatch = value.match(/[\d.,]+/);

        if (label.includes('longueur') && numMatch) {
          const val = parseFloat(numMatch[0].replace(',', '.'));
          result.longueur = val < 10 ? Math.round(val * 1000) : Math.round(val);
        }

        if (label.includes('largeur') && numMatch) {
          const val = parseFloat(numMatch[0].replace(',', '.'));
          result.largeur = val < 10 ? Math.round(val * 1000) : Math.round(val);
        }

        if ((label.includes('hauteur') || label.includes('épaisseur')) && numMatch) {
          result.epaisseur = parseFloat(numMatch[0].replace(',', '.'));
        }

        if (label.includes('qualité') || label.includes('support')) {
          result.qualite = value;
        }

        if (label.includes('finition')) {
          result.finition = value;
        }

        if (label.includes('coloris') || label.includes('décor')) {
          result.decor = value;
        }
      }
    });

    // Prix
    const priceEl = document.querySelector('[data-price-type="finalPrice"] .price, .price-box .price, .product-info-price .price');
    if (priceEl) {
      const priceMatch = priceEl.textContent?.match(/[\d.,]+/);
      if (priceMatch) {
        result.prix = parseFloat(priceMatch[0].replace(',', '.'));
      }
    }

    // Image
    const imgEl = document.querySelector('.fotorama__stage__frame img, .product-image-container img') as HTMLImageElement;
    if (imgEl?.src) {
      result.imageUrl = imgEl.src;
    }

    return result;
  });

  console.log('📏 DONNÉES EXTRAITES:');
  console.log(`   Longueur: ${data.longueur} mm`);
  console.log(`   Largeur: ${data.largeur} mm`);
  console.log(`   Épaisseur: ${data.epaisseur} mm`);
  console.log(`   Qualité: ${data.qualite || 'N/A'}`);
  console.log(`   Finition: ${data.finition || 'N/A'}`);
  console.log(`   Décor: ${data.decor || 'N/A'}`);
  console.log(`   Prix: ${data.prix ? data.prix + ' €' : 'N/A'}`);
  console.log(`   Image: ${data.imageUrl ? 'OUI' : 'NON'}`);
  console.log('');

  if (data.longueur === 0 && data.largeur === 0 && data.epaisseur === 0) {
    console.log('❌ Aucune dimension extraite ! Abandon.');
    return;
  }

  // 4. Mettre à jour TOUS les produits F244 sans dimensions
  console.log('💾 Mise à jour des produits F244...\n');

  for (const product of f244Products) {
    // Ne mettre à jour que si les dimensions manquent
    if (!product.defaultLength || !product.defaultWidth || !product.defaultThickness) {
      try {
        await prisma.panel.update({
          where: { id: product.id },
          data: {
            defaultLength: data.longueur || undefined,
            defaultWidth: data.largeur || undefined,
            defaultThickness: data.epaisseur || undefined,
            thickness: data.epaisseur ? [data.epaisseur] : undefined,
            pricePerM2: data.prix || undefined,
            imageUrl: data.imageUrl || undefined,
            finishCode: data.finition || undefined,
          },
        });
        console.log(`   ✅ ${product.reference} mis à jour!`);
      } catch (e: any) {
        console.log(`   ❌ ${product.reference}: ${e.message}`);
      }
    } else {
      console.log(`   ⏭️  ${product.reference} a déjà des dimensions`);
    }
  }

  // 5. Vérification finale
  console.log('\n📋 VÉRIFICATION FINALE:');
  const updatedProducts = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'F244', mode: 'insensitive' } },
        { manufacturerRef: 'F244' },
      ],
      productType: { in: ['PLAN_DE_TRAVAIL', 'COMPACT'] }
    },
    select: {
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
    }
  });

  updatedProducts.forEach(p => {
    const hasDims = p.defaultLength && p.defaultWidth && p.defaultThickness;
    console.log(`   ${hasDims ? '✅' : '❌'} ${p.reference}: ${p.defaultLength} x ${p.defaultWidth} x ${p.defaultThickness}`);
  });

  // Calcul du poids
  if (data.longueur && data.largeur && data.epaisseur) {
    const density = 1350; // Compact HPL
    const volume = (data.longueur / 1000) * (data.largeur / 1000) * (data.epaisseur / 1000);
    const weight = volume * density;
    console.log(`\n⚖️  Poids estimé: ${weight.toFixed(1)} kg (densité: ${density} kg/m³)`);
  }

  console.log('\n✅ Terminé!');
}

fixF244()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
