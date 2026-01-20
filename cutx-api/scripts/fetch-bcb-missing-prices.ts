/**
 * Récupérer les prix manquants des chants BCB
 *
 * Utilise Puppeteer connecté à Chrome Debug pour scraper les prix
 */

import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('');

  // 1. Récupérer les chants BCB sans prix
  const chantsWithoutPrice = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
      pricePerMl: null,
      pricePerUnit: null,
    },
    select: {
      id: true,
      reference: true,
      name: true,
      supplierCode: true,
    },
  });

  console.log(`📦 Chants BCB sans prix: ${chantsWithoutPrice.length}`);
  console.log('');

  if (chantsWithoutPrice.length === 0) {
    console.log('✅ Tous les chants ont un prix !');
    await prisma.$disconnect();
    return;
  }

  // 2. Connexion à Chrome Debug
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();
  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  // 3. Pour chaque chant, essayer de trouver le prix
  for (const chant of chantsWithoutPrice) {
    try {
      // Extraire le code fournisseur de la référence si pas déjà présent
      let supplierCode = chant.supplierCode;
      if (!supplierCode) {
        // Essayer d'extraire de la référence (ex: BCB-87310 -> 87310)
        const match = chant.reference.match(/BCB-(\d+)$/);
        if (match) {
          supplierCode = match[1];
        } else {
          // Essayer d'extraire le dernier nombre de la référence
          const lastNumber = chant.reference.match(/(\d{5,})(?:[^\d]|$)/);
          if (lastNumber) {
            supplierCode = lastNumber[1];
          }
        }
      }

      if (!supplierCode) {
        console.log(`⏭️ ${chant.reference} - pas de code fournisseur`);
        notFoundCount++;
        continue;
      }

      // Construire l'URL de recherche BCB
      const searchUrl = `https://www.bcommebois.fr/catalogsearch/result/?q=${supplierCode}`;

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Vérifier si on est sur une page produit directe ou une liste de résultats
      const currentUrl = page.url();

      let price: number | null = null;
      let priceType: 'ML' | 'UN' | null = null;

      if (currentUrl.includes('.html')) {
        // On est sur une page produit
        const priceData = await page.evaluate(() => {
          const priceEl = document.querySelector('.price');
          if (!priceEl) return null;

          const priceText = priceEl.textContent?.trim() || '';
          const match = priceText.match(/([\d,]+)\s*€/);
          if (!match) return null;

          const price = parseFloat(match[1].replace(',', '.'));

          // Chercher le type de prix (ML, UN, etc)
          const unitEl = document.querySelector('.price-box');
          const unitText = unitEl?.textContent?.toLowerCase() || '';
          let priceType: string | null = null;

          if (unitText.includes('/ml') || unitText.includes('ml)')) priceType = 'ML';
          else if (unitText.includes('/un') || unitText.includes('un)')) priceType = 'UN';
          else if (unitText.includes('/rlx')) priceType = 'UN';

          return { price, priceType };
        });

        if (priceData) {
          price = priceData.price;
          priceType = priceData.priceType as 'ML' | 'UN' | null;
        }
      } else {
        // On est sur une liste de résultats, chercher le bon produit
        const productLink = await page.evaluate((code) => {
          const links = Array.from(document.querySelectorAll('a.product-item-link'));
          for (const link of links) {
            const href = (link as HTMLAnchorElement).href;
            if (href.includes(code)) {
              return href;
            }
          }
          return null;
        }, supplierCode);

        if (productLink) {
          await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(r => setTimeout(r, 2000));

          const priceData = await page.evaluate(() => {
            const priceEl = document.querySelector('.price');
            if (!priceEl) return null;

            const priceText = priceEl.textContent?.trim() || '';
            const match = priceText.match(/([\d,]+)\s*€/);
            if (!match) return null;

            const price = parseFloat(match[1].replace(',', '.'));

            const unitEl = document.querySelector('.price-box');
            const unitText = unitEl?.textContent?.toLowerCase() || '';
            let priceType: string | null = null;

            if (unitText.includes('/ml') || unitText.includes('ml)')) priceType = 'ML';
            else if (unitText.includes('/un') || unitText.includes('un)')) priceType = 'UN';
            else if (unitText.includes('/rlx')) priceType = 'UN';

            return { price, priceType };
          });

          if (priceData) {
            price = priceData.price;
            priceType = priceData.priceType as 'ML' | 'UN' | null;
          }
        }
      }

      if (price !== null && price > 0) {
        console.log(`✅ ${chant.reference} → ${price}€/${priceType || '?'}`);

        if (!DRY_RUN) {
          const updateData: Record<string, unknown> = {};

          if (priceType === 'ML') {
            updateData.pricePerMl = price;
          } else {
            updateData.pricePerUnit = price;
          }

          if (!chant.supplierCode && supplierCode) {
            updateData.supplierCode = supplierCode;
          }

          await prisma.panel.update({
            where: { id: chant.id },
            data: updateData,
          });
        }

        updatedCount++;
      } else {
        console.log(`❌ ${chant.reference} (${supplierCode}) - prix non trouvé`);
        notFoundCount++;
      }

    } catch (error: any) {
      console.log(`⚠️ ${chant.reference} - erreur: ${error.message?.substring(0, 50)}`);
      errorCount++;
    }

    // Petit délai entre les requêtes
    await new Promise(r => setTimeout(r, 1000));
  }

  await page.close();

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log(`   Prix mis à jour: ${updatedCount}`);
  console.log(`   Non trouvés: ${notFoundCount}`);
  console.log(`   Erreurs: ${errorCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
