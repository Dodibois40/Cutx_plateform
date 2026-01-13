/**
 * Script pour rescraper les pages individuelles des produits sans dimensions
 *
 * Ce script :
 * 1. Trouve tous les produits Plans de travail / Compacts sans dimensions
 * 2. Construit l'URL de la page produit à partir de la référence
 * 3. Parse les données de la <dl> (definition list) sur la page produit
 * 4. Met à jour la base de données
 *
 * Usage:
 * 1. Lancer Chrome debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr
 * 3. npx tsx scripts/rescrape-missing-dimensions.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductData {
  longueur: number;
  largeur: number;
  epaisseur: number;
  qualite?: string;
  decor?: string;
  finition?: string;
  certification?: string;
  prix?: number;
  imageUrl?: string;
}

async function scrapeProductPage(page: Page, url: string): Promise<ProductData | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

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

          // Longueur (en mètres → convertir en mm)
          if (label.includes('longueur')) {
            if (numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              result.longueur = val < 10 ? Math.round(val * 1000) : Math.round(val);
            }
          }

          // Largeur (en mètres → convertir en mm)
          if (label.includes('largeur')) {
            if (numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              result.largeur = val < 10 ? Math.round(val * 1000) : Math.round(val);
            }
          }

          // Épaisseur / Hauteur (en mm)
          if (label.includes('épaisseur') || label.includes('epaisseur') || label.includes('hauteur') || label.includes('haut')) {
            if (numMatch) {
              result.epaisseur = parseFloat(numMatch[0].replace(',', '.'));
            }
          }

          // Qualité/Support
          if (label.includes('qualité') || label.includes('support')) {
            result.qualite = value;
          }

          // Décor/Essence
          if (label.includes('décor') || label.includes('decor') || label.includes('essence')) {
            result.decor = value;
          }

          // Coloris/Choix (souvent le code décor)
          if (label.includes('coloris') || label.includes('choix')) {
            if (!result.decor) result.decor = value;
          }

          // Finition
          if (label.includes('finition')) {
            result.finition = value;
          }

          // Certification
          if (label.includes('certification')) {
            result.certification = value;
          }
        }
      });

      // Récupérer le prix
      const priceEl = document.querySelector('[data-price-type="finalPrice"] .price, .price-box .price, .product-info-price .price');
      if (priceEl) {
        const priceText = priceEl.textContent?.trim() || '';
        const priceMatch = priceText.match(/[\d.,]+/);
        if (priceMatch) {
          result.prix = parseFloat(priceMatch[0].replace(',', '.'));
        }
      }

      // Récupérer l'image
      const imgEl = document.querySelector('.fotorama__stage__frame img, .product-image-container img, .product-media img') as HTMLImageElement;
      if (imgEl?.src && !imgEl.src.includes('placeholder')) {
        result.imageUrl = imgEl.src;
      }

      return result;
    });

    // Vérifier qu'on a au moins des dimensions
    if (data.longueur > 0 || data.largeur > 0 || data.epaisseur > 0) {
      return data;
    }

    return null;
  } catch (e: any) {
    console.log(`      ❌ Erreur: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('🔄 RESCRAPING DES PRODUITS SANS DIMENSIONS');
  console.log('============================================\n');

  // 1. Trouver tous les produits sans dimensions complètes
  console.log('🔍 Recherche des produits sans dimensions...\n');

  const productsWithoutDimensions = await prisma.panel.findMany({
    where: {
      productType: { in: ['PLAN_DE_TRAVAIL', 'COMPACT', 'SOLID_SURFACE'] },
      defaultLength: 0,  // Int obligatoire, 0 = pas de dimensions
      // Seulement les produits BCB avec ID numérique (URL constructible)
      reference: { startsWith: 'BCB-PDT-' },
      NOT: { reference: { contains: 'REF-' } },  // Exclure les REF-timestamp
    },
    select: {
      id: true,
      reference: true,
      name: true,
      supplierCode: true,
      productType: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 ${productsWithoutDimensions.length} produits sans dimensions trouvés\n`);

  if (productsWithoutDimensions.length === 0) {
    console.log('✅ Tous les produits ont des dimensions !');
    return;
  }

  // Afficher les premiers
  console.log('📋 Produits à traiter (premiers 10):');
  productsWithoutDimensions.slice(0, 10).forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.name.substring(0, 60)}...`);
  });
  if (productsWithoutDimensions.length > 10) {
    console.log(`   ... et ${productsWithoutDimensions.length - 10} autres`);
  }
  console.log('');

  // 2. Connexion à Chrome
  console.log('🔌 Connexion à Chrome...');
  let browser: Browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome debug non accessible');
    console.error('   Lance: scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté!\n');

  // 3. Scraper chaque produit
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < productsWithoutDimensions.length; i++) {
    const product = productsWithoutDimensions[i];
    const progress = `[${i + 1}/${productsWithoutDimensions.length}]`;

    console.log(`${progress} ${product.name.substring(0, 50)}...`);

    // Construire l'URL de la page produit
    // Format: BCB-PDT-93226 → https://www.bcommebois.fr/...-93226.html
    // ou BCB-PDT-REF-xxx → on doit chercher une autre source

    let productUrl: string | null = null;

    // Essayer d'extraire l'ID numérique de la référence
    const refMatch = product.reference.match(/BCB-PDT-(\d{4,6})$/);
    if (refMatch) {
      // On a un ID numérique, on peut construire une URL
      const productId = refMatch[1];

      // Construire une URL approximative avec le nom comme slug
      const slug = product.name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      productUrl = `https://www.bcommebois.fr/${slug}-${productId}.html`;
    } else if (product.reference.includes('REF-')) {
      // Référence générée (REF-timestamp), pas d'URL possible
      console.log(`   ⏭️  Référence générée, pas d'URL connue`);
      skipped++;
      continue;
    }

    if (!productUrl) {
      console.log(`   ⏭️  Impossible de construire l'URL`);
      skipped++;
      continue;
    }

    console.log(`   🌐 ${productUrl.substring(0, 70)}...`);

    // Scraper la page
    const data = await scrapeProductPage(page, productUrl);

    if (data && (data.longueur > 0 || data.largeur > 0 || data.epaisseur > 0)) {
      console.log(`   📏 Dimensions: ${data.longueur} x ${data.largeur} x ${data.epaisseur} mm`);

      // Mettre à jour la base de données
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
            decorCode: data.decor || undefined,
          },
        });
        console.log(`   ✅ Mis à jour!`);
        updated++;
      } catch (e: any) {
        console.log(`   ❌ Erreur DB: ${e.message}`);
        failed++;
      }
    } else {
      console.log(`   ❌ Aucune dimension trouvée sur la page`);
      failed++;
    }

    // Pause entre les requêtes pour ne pas surcharger le serveur
    await new Promise(r => setTimeout(r, 1500));
  }

  // 4. Résumé
  console.log('\n' + '═'.repeat(60));
  console.log('📋 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Total traités: ${productsWithoutDimensions.length}`);
  console.log(`   ✅ Mis à jour: ${updated}`);
  console.log(`   ❌ Échecs: ${failed}`);
  console.log(`   ⏭️  Ignorés: ${skipped}`);
  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

main().catch(console.error);
