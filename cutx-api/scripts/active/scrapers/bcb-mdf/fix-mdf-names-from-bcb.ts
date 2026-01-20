/**
 * Corrige les noms des panneaux MDF BCB avec noms génériques
 * en allant chercher le vrai nom sur le site BCB
 *
 * Usage:
 *   npx tsx scripts/active/scrapers/bcb-mdf/fix-mdf-names-from-bcb.ts --dry-run
 *   npx tsx scripts/active/scrapers/bcb-mdf/fix-mdf-names-from-bcb.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

// Port Chrome en debug mode
const CHROME_DEBUG_PORT = 9222;

async function connectToChrome(): Promise<Browser> {
  console.log('🔌 Connexion à Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: `http://localhost:${CHROME_DEBUG_PORT}`,
    });
    console.log('✅ Connecté à Chrome!');
    return browser;
  } catch (error) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez Chrome avec: chrome --remote-debugging-port=9222');
    process.exit(1);
  }
}

/**
 * Cherche un produit sur BCB par sa référence et retourne le vrai nom
 */
async function findProductNameByRef(page: Page, ref: string): Promise<string | null> {
  // Extraire le numéro de la référence (BCB-72943 → 72943)
  const refNum = ref.replace('BCB-', '');

  // Essayer plusieurs stratégies pour trouver le produit

  // 1. Recherche directe sur BCB
  const searchUrl = `https://www.bcommebois.fr/catalogsearch/result/?q=${refNum}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    // Chercher le lien vers le produit avec cette référence
    const productLink = await page.evaluate((refNum) => {
      // Chercher un lien qui contient la référence
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (href.includes(`-${refNum}.html`)) {
          return href;
        }
      }
      return null;
    }, refNum);

    if (!productLink) {
      console.log(`   ⚠️ Produit non trouvé dans la recherche`);
      return null;
    }

    // Aller sur la page produit
    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 500));

    // Extraire le nom du produit
    const productName = await page.evaluate(() => {
      // Essayer plusieurs sélecteurs pour le titre
      const selectors = [
        'h1.page-title span',
        'h1.page-title',
        '.product-info-main h1',
        'h1[itemprop="name"]',
        '.product-name h1'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          return el.textContent.trim();
        }
      }

      // Fallback: titre de la page
      const title = document.title;
      if (title) {
        // Enlever " | B comme Bois" ou similaire
        return title.split('|')[0].trim();
      }

      return null;
    });

    return productName;
  } catch (error) {
    console.log(`   ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CORRECTION DES NOMS MDF BCB (depuis site BCB)              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Trouver les panneaux BCB avec noms génériques
  const genericPanels = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'MDF',
      OR: [
        { name: { startsWith: 'MDF Standard' } },
        { name: { startsWith: 'MDF Hydrofuge' } },
        { name: { startsWith: 'MDF Léger' } },
        { name: { startsWith: 'MDF Ignifugé' } },
        { name: { startsWith: 'MDF Cintrable' } },
        { name: { startsWith: 'MDF Teinté' } },
        { name: { startsWith: 'MDF à Laquer' } },
        { name: { startsWith: 'MDF Premium' } },
        { name: { startsWith: 'Panneau Standard' } },
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      defaultLength: true,
      defaultWidth: true
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`📦 Panneaux BCB avec noms génériques: ${genericPanels.length}`);

  if (genericPanels.length === 0) {
    console.log('✅ Aucun panneau à corriger!');
    await prisma.$disconnect();
    return;
  }

  const toProcess = LIMIT > 0 ? genericPanels.slice(0, LIMIT) : genericPanels;
  console.log(`   À traiter: ${toProcess.length}${LIMIT > 0 ? ` (limite: ${LIMIT})` : ''}\n`);

  const browser = await connectToChrome();
  const page = await browser.newPage();

  // Configuration
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const panel = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}] ${panel.reference}: "${panel.name}"`);

    const newName = await findProductNameByRef(page, panel.reference);

    if (newName && newName !== panel.name) {
      console.log(`   ✅ Nouveau nom: "${newName}"`);

      if (!DRY_RUN) {
        try {
          await prisma.panel.update({
            where: { id: panel.id },
            data: { name: newName }
          });
          updated++;
        } catch (error) {
          console.log(`   ❌ Erreur update: ${(error as Error).message}`);
          errors++;
        }
      } else {
        updated++;
      }
    } else if (!newName) {
      console.log(`   ⚠️ Nom non trouvé sur BCB`);
      notFound++;
    } else {
      console.log(`   - Nom identique, pas de changement`);
    }

    // Pause pour éviter le rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  await page.close();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total analysés: ${toProcess.length}`);
  console.log(`  Mis à jour: ${updated}`);
  console.log(`  Non trouvés: ${notFound}`);
  console.log(`  Erreurs: ${errors}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
