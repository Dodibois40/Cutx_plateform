/**
 * Script pour re-scraper les produits avec épaisseur manquante
 * et corriger le bug de mapping des colonnes
 */

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHROME_DEBUG_URL = 'http://localhost:9222';

interface ScrapedVariant {
  supplierCode: string;
  thickness: number;
  length: number;
  width: number;
}

async function main() {
  console.log('🔍 Recherche des panneaux sans épaisseur...\n');

  // Trouver les panneaux sans épaisseur (ceux qu'on vient de corriger)
  const panelsToFix = await prisma.panel.findMany({
    where: {
      OR: [
        { thickness: { equals: [] } },
        { defaultThickness: null }
      ],
      supplierCode: { not: null }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      supplierCode: true,
      category: {
        select: {
          name: true,
          slug: true,
          parent: { select: { name: true, slug: true } }
        }
      }
    }
  });

  console.log(`📊 Trouvé ${panelsToFix.length} panneaux à corriger\n`);

  if (panelsToFix.length === 0) {
    console.log('✅ Aucun panneau à corriger!');
    return;
  }

  // Grouper par catégorie pour optimiser le scraping
  const byCategory = new Map<string, typeof panelsToFix>();
  for (const panel of panelsToFix) {
    const catSlug = panel.category?.parent?.slug || panel.category?.slug || 'unknown';
    if (!byCategory.has(catSlug)) {
      byCategory.set(catSlug, []);
    }
    byCategory.get(catSlug)!.push(panel);
  }

  console.log('📂 Par catégorie:');
  for (const [cat, panels] of byCategory) {
    console.log(`   - ${cat}: ${panels.length} panneaux`);
  }
  console.log('');

  // Connecter au Chrome debug
  console.log('🌐 Connexion à Chrome...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: CHROME_DEBUG_URL,
      defaultViewport: null,
    });
    console.log('✅ Connecté à Chrome\n');
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome. Lancez Chrome avec --remote-debugging-port=9222');
    return;
  }

  const page = (await browser.pages())[0] || await browser.newPage();

  // La page est déjà ouverte dans Chrome
  const currentUrl = page.url();
  console.log(`📄 Page actuelle: ${currentUrl}`);

  // Si pas sur la bonne page, y aller
  if (!currentUrl.includes('bcommebois.fr/agencement/stratifies')) {
    console.log('📄 Navigation vers la page...');
    await page.goto('https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants.html', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
  }

  // Attendre que les tableaux soient chargés
  await page.waitForSelector('table', { timeout: 30000 });

  // Extraire les supplierCodes qu'on cherche
  const targetCodes = new Set(panelsToFix.map(p => p.supplierCode).filter(Boolean) as string[]);
  console.log(`🎯 Recherche de ${targetCodes.size} codes fournisseur...\n`);

  // Scraper tous les tableaux de la page
  const foundVariants = await page.evaluate((codes: string[]) => {
    const results: { supplierCode: string; thickness: number; length: number; width: number }[] = [];
    const codeSet = new Set(codes);

    // Structure de la page:
    // Headers: ["Long. (m)","Larg. (m)","Haut. (mm)","Qualité/Support","Code","Stock","Prix (HT)",""]
    // Colonne 0: Longueur (m)
    // Colonne 1: Largeur (m)
    // Colonne 2: Épaisseur (mm) - HAUT = épaisseur dans le jargon B comme Bois
    // Colonne 3: Qualité/Support
    // Colonne 4: Code fournisseur

    // Parcourir tous les tableaux de la page
    document.querySelectorAll('table').forEach(table => {
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 5) return;

        // Extraire le texte de chaque cellule
        const cellTexts = cells.map(c => c.textContent?.trim() || '');

        // Chercher le code fournisseur (5 chiffres)
        let supplierCode = '';
        let codeIdx = -1;

        for (let i = 0; i < cellTexts.length; i++) {
          if (/^\d{5}$/.test(cellTexts[i])) {
            supplierCode = cellTexts[i];
            codeIdx = i;
            break;
          }
        }

        // Vérifier si c'est un code qu'on cherche
        if (!supplierCode || !codeSet.has(supplierCode)) return;

        // Extraire les valeurs numériques des premières colonnes
        const numValues: number[] = [];
        for (let i = 0; i < Math.min(4, cellTexts.length); i++) {
          const text = cellTexts[i];
          const val = parseFloat(text.replace(',', '.'));
          if (!isNaN(val) && val > 0) {
            numValues.push(val);
          }
        }

        // On s'attend à: [longueur, largeur, épaisseur]
        // Longueur en mètres (ex: 2.800) -> convertir en mm
        // Largeur en mètres (ex: 2.070) -> convertir en mm
        // Épaisseur en mm (ex: 19.000 ou 0.800)

        if (numValues.length >= 3) {
          let length = numValues[0];
          let width = numValues[1];
          let thickness = numValues[2];

          // Convertir longueur et largeur de mètres en mm si nécessaire
          if (length < 10) length = Math.round(length * 1000);
          if (width < 10) width = Math.round(width * 1000);

          // L'épaisseur est déjà en mm (ou proche)
          // Valider que c'est une épaisseur réaliste
          if (thickness > 0 && thickness < 100) {
            results.push({ supplierCode, thickness, length, width });
          }
        }
      });
    });

    return results;
  }, Array.from(targetCodes));

  console.log(`📦 Trouvé ${foundVariants.length} variantes sur la page\n`);

  // Afficher ce qu'on a trouvé
  if (foundVariants.length > 0) {
    console.log('📋 Variantes trouvées:');
    for (const v of foundVariants.slice(0, 20)) {
      console.log(`   ${v.supplierCode}: ép=${v.thickness}mm, ${v.length}x${v.width}`);
    }
    if (foundVariants.length > 20) {
      console.log(`   ... et ${foundVariants.length - 20} autres`);
    }
    console.log('');
  }

  // Mettre à jour la base de données
  if (foundVariants.length > 0) {
    console.log('💾 Mise à jour de la base de données...');
    let updated = 0;

    for (const variant of foundVariants) {
      const panel = panelsToFix.find(p => p.supplierCode === variant.supplierCode);
      if (panel && variant.thickness > 0) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: {
            thickness: [variant.thickness],
            defaultThickness: variant.thickness,
          }
        });
        updated++;
      }
    }

    console.log(`\n✅ ${updated} panneaux mis à jour avec les bonnes épaisseurs!`);
  }

  // Vérifier combien restent sans épaisseur
  const stillMissing = await prisma.panel.count({
    where: {
      OR: [
        { thickness: { equals: [] } },
        { defaultThickness: null }
      ],
      supplierCode: { not: null }
    }
  });

  if (stillMissing > 0) {
    console.log(`\n⚠️  ${stillMissing} panneaux n'ont toujours pas d'épaisseur.`);
    console.log('   Ces produits ne sont peut-être plus sur le site ou nécessitent un scraping manuel.');
  }

  await browser.disconnect();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
