/**
 * Re-scraping COMPLET des chants BCB Libre-service
 *
 * Objectif: Récupérer TOUS les champs correctement:
 * - Prix (pricePerMl ou pricePerUnit)
 * - Dimensions (width, thickness)
 * - supplierCode
 * - Image
 * - Stock
 *
 * Les anciennes données corrompues seront mises à jour.
 */

import puppeteer from 'puppeteer-core';
import { PrismaClient, ProductType, ProductSubType } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// URLs des pages produits à scraper
const PRODUCT_PAGES = [
  // Chants bois
  { url: 'https://www.bcommebois.fr/chant-bois-acajou.html', essence: 'Acajou', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-chataignier.html', essence: 'Châtaignier', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-chene.html', essence: 'Chêne', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-erable.html', essence: 'Érable', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-frene.html', essence: 'Frêne', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-hetre.html', essence: 'Hêtre', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-merisier.html', essence: 'Merisier', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-noyer.html', essence: 'Noyer', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-pin.html', essence: 'Pin', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-teck.html', essence: 'Teck', subType: ProductSubType.CHANT_BOIS },
  { url: 'https://www.bcommebois.fr/chant-bois-wenge.html', essence: 'Wengé', subType: ProductSubType.CHANT_BOIS },
  // Chants mélaminés
  { url: 'https://www.bcommebois.fr/chant-melamine-blanc-givre.html', essence: 'Blanc Givré', subType: ProductSubType.CHANT_MELAMINE },
  // Chants ABS
  { url: 'https://www.bcommebois.fr/chant-abs-blanc-givre.html', essence: 'Blanc Givré', subType: ProductSubType.CHANT_ABS },
];

interface Variant {
  supplierCode: string;
  width: number;       // en mm
  thickness: number;   // en mm
  length: number;      // en mm (0 = variable)
  isVariableLength: boolean;
  stockStatus: string;
  price: number | null;
  priceType: 'ML' | 'UN' | null;
  supportQuality: string;
  isPreglued: boolean;
}

async function scrapeProductPage(page: puppeteer.Page, url: string): Promise<{ imageUrl: string | null; variants: Variant[] }> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  return page.evaluate(() => {
    // Image produit
    let imageUrl: string | null = null;
    document.querySelectorAll('img').forEach((img) => {
      if (img.src && img.src.includes('media/catalog/product') && !imageUrl) {
        imageUrl = img.src;
      }
    });

    // Parser le tableau des variantes
    // Format: Long(m) | Larg(m) | Haut(mm) | Qualité | Code | Stock | Prix | Qté
    const variants: Variant[] = [];
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 7) return;

      // Colonne 0: Longueur (m) - "Variable" ou nombre
      const lengthText = cells[0]?.textContent?.trim() || '';
      const isVariableLength = lengthText.toLowerCase() === 'variable';
      let length = 0;
      if (!isVariableLength) {
        const lengthMatch = lengthText.match(/([\d.,]+)/);
        if (lengthMatch) {
          length = Math.round(parseFloat(lengthMatch[1].replace(',', '.')) * 1000); // m → mm
        }
      }

      // Colonne 1: Largeur (m) - ex: "0.024" = 24mm
      const widthText = cells[1]?.textContent?.trim() || '';
      const widthMatch = widthText.match(/([\d.,]+)/);
      let width = 0;
      if (widthMatch) {
        const val = parseFloat(widthMatch[1].replace(',', '.'));
        width = val < 1 ? Math.round(val * 1000) : Math.round(val); // Si < 1, c'est en m
      }

      // Colonne 2: Hauteur/Épaisseur (mm) - ex: "0.600" ou "1.000"
      const thicknessText = cells[2]?.textContent?.trim() || '';
      const thicknessMatch = thicknessText.match(/([\d.,]+)/);
      let thickness = 0;
      if (thicknessMatch) {
        thickness = parseFloat(thicknessMatch[1].replace(',', '.'));
      }

      // Colonne 3: Qualité/Support - ex: "bois non encollé", "bois préencollé"
      const supportQuality = cells[3]?.textContent?.trim() || '';
      const isPreglued = supportQuality.toLowerCase().includes('préencollé') ||
                         supportQuality.toLowerCase().includes('preencollé');

      // Colonne 4: Code fournisseur - ex: "83814"
      const codeText = cells[4]?.textContent?.trim() || '';
      // Valider que c'est bien un code numérique
      if (!/^\d{4,6}$/.test(codeText)) return;
      const supplierCode = codeText;

      // Colonne 5: Stock - peut contenir des indicateurs visuels
      const stockCell = cells[5];
      let stockStatus = 'EN STOCK';
      const stockText = stockCell?.textContent?.trim()?.toLowerCase() || '';
      if (stockText.includes('commande') || stockText.includes('indisponible')) {
        stockStatus = 'Sur commande';
      }

      // Colonne 6: Prix - ex: "0,85 €/ml" ou "27,40 €/lk"
      const priceText = cells[6]?.textContent?.trim() || '';
      let price: number | null = null;
      let priceType: 'ML' | 'UN' | null = null;

      const priceMatch = priceText.match(/([\d,]+)\s*€/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(',', '.'));

        if (priceText.toLowerCase().includes('/ml')) {
          priceType = 'ML';
        } else if (priceText.toLowerCase().includes('/lk') ||
                   priceText.toLowerCase().includes('/un') ||
                   priceText.toLowerCase().includes('/rlx')) {
          priceType = 'UN';
        } else {
          // Par défaut pour les chants, c'est souvent au ML
          priceType = 'ML';
        }
      }

      variants.push({
        supplierCode,
        width,
        thickness,
        length,
        isVariableLength,
        stockStatus,
        price,
        priceType,
        supportQuality,
        isPreglued,
      });
    });

    return { imageUrl, variants };
  });
}

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Catalogue BCB
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' },
  });

  if (!catalogue) {
    console.log('❌ Catalogue Bouney non trouvé');
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalPricesFixed = 0;

  for (const productPage of PRODUCT_PAGES) {
    console.log(`\n📦 ${productPage.essence} (${productPage.subType})`);
    console.log(`   URL: ${productPage.url}`);

    try {
      const { imageUrl, variants } = await scrapeProductPage(page, productPage.url);

      console.log(`   Image: ${imageUrl ? '✅' : '❌'}`);
      console.log(`   Variantes: ${variants.length}`);

      for (const variant of variants) {
        // Générer une référence unique
        const typePrefix = productPage.subType === ProductSubType.CHANT_BOIS ? 'BOI' :
                           productPage.subType === ProductSubType.CHANT_MELAMINE ? 'MEL' : 'ABS';
        const pregluedSuffix = variant.isPreglued ? '-PRE' : '';
        const reference = `BCB-${typePrefix}-CHANT-W${variant.width}-T${variant.thickness}${pregluedSuffix}-${variant.supplierCode}`;

        // Chercher si le produit existe déjà (par supplierCode)
        let existing = await prisma.panel.findFirst({
          where: {
            catalogueId: catalogue.id,
            supplierCode: variant.supplierCode,
          },
        });

        // Ou par référence similaire
        if (!existing) {
          existing = await prisma.panel.findFirst({
            where: {
              catalogueId: catalogue.id,
              reference: { contains: variant.supplierCode },
            },
          });
        }

        const name = `Chant ${productPage.subType === ProductSubType.CHANT_BOIS ? 'bois' :
                            productPage.subType === ProductSubType.CHANT_MELAMINE ? 'mélaminé' : 'ABS'} ` +
                     `${productPage.essence} ${variant.width}mm ép.${variant.thickness}mm` +
                     `${variant.isPreglued ? ' (préencollé)' : ''}`;

        const panelData = {
          name,
          reference,
          catalogueId: catalogue.id,
          panelType: ProductType.CHANT,
          panelSubType: productPage.subType,
          productType: 'BANDE_DE_CHANT',
          defaultWidth: variant.width,
          defaultThickness: variant.thickness,
          defaultLength: variant.length,
          isVariableLength: variant.isVariableLength,
          supplierCode: variant.supplierCode,
          decorName: productPage.essence,
          supportQuality: variant.supportQuality,
          isPreglued: variant.isPreglued,
          stockStatus: variant.stockStatus,
          imageUrl: imageUrl,
          pricePerMl: variant.priceType === 'ML' ? variant.price : null,
          pricePerUnit: variant.priceType === 'UN' ? variant.price : null,
          isActive: true,
        };

        if (existing) {
          // Mettre à jour
          const hadPrice = existing.pricePerMl !== null || existing.pricePerUnit !== null;
          const nowHasPrice = variant.price !== null;

          if (!DRY_RUN) {
            await prisma.panel.update({
              where: { id: existing.id },
              data: panelData,
            });
          }

          if (!hadPrice && nowHasPrice) {
            totalPricesFixed++;
            console.log(`   ✅ ${variant.supplierCode} prix ajouté: ${variant.price}€/${variant.priceType}`);
          }
          totalUpdated++;
        } else {
          // Créer
          if (!DRY_RUN) {
            await prisma.panel.create({
              data: panelData,
            });
          }
          totalCreated++;
          console.log(`   ➕ ${variant.supplierCode} créé: ${variant.price}€/${variant.priceType}`);
        }
      }

    } catch (error: any) {
      console.log(`   ⚠️ Erreur: ${error.message?.substring(0, 60)}`);
    }

    // Délai entre les pages
    await new Promise(r => setTimeout(r, 2000));
  }

  await page.close();

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log(`   Créés: ${totalCreated}`);
  console.log(`   Mis à jour: ${totalUpdated}`);
  console.log(`   Prix corrigés: ${totalPricesFixed}`);

  await prisma.$disconnect();
}

main().catch(console.error);
