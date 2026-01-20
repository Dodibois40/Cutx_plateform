/**
 * 02-classify-mdf.ts
 * Classification des panneaux MDF avec confirmation par lot de 100
 *
 * Usage:
 *   npx tsx scripts/reorganization/02-classify-mdf.ts
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Règles de classification MDF (par ordre de priorité)
const MDF_RULES = [
  {
    priority: 1,
    name: 'SHOULD_BE_MELAMINE',
    targetType: 'MELAMINE',
    targetCategory: null, // Sera déterminé plus tard
    keywords: ['mélamine', 'melamine'],
    action: 'CHANGE_TYPE'
  },
  {
    priority: 2,
    name: 'mdf-hydrofuge',
    keywords: ['hydrofuge', 'hydro', 'ctbh', 'p5', 'moisture'],
    action: 'CHANGE_CATEGORY'
  },
  {
    priority: 3,
    name: 'mdf-ignifuge',
    keywords: ['ignifuge', 'm1', 'b-s', 'fire', 'feu'],
    action: 'CHANGE_CATEGORY'
  },
  {
    priority: 4,
    name: 'mdf-a-laquer',
    keywords: ['lac', 'laquer', 'lacquer', 'e-z', 'ez', 'fibralac', 'fibraplast lac', 'bouche pores', 'bouche-pores', 'bouchepores'],
    action: 'CHANGE_CATEGORY'
  },
  {
    priority: 5,
    name: 'mdf-teinte-couleurs',
    keywords: ['teinté', 'teinte', 'colour', 'color', 'fibracolour', 'valchromat', 'noir', 'couleur', 'colored', 'coloured'],
    action: 'CHANGE_CATEGORY'
  },
  {
    priority: 6,
    name: 'mdf-cintrable',
    keywords: ['cintrable', 'flexible', 'flex', 'bendable'],
    action: 'CHANGE_CATEGORY'
  },
  {
    priority: 7,
    name: 'mdf-leger',
    keywords: ['léger', 'leger', 'light', 'ultralight', 'allégé'],
    action: 'CHANGE_CATEGORY'
  },
];

interface Change {
  panel: {
    id: string;
    reference: string;
    name: string | null;
  };
  fromCategory: string | null;
  toCategory: string;
  fromType?: string | null;
  toType?: string;
  reason: string;
}

// Fonction pour attendre la confirmation utilisateur
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'o' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'oui');
    });
  });
}

// Déterminer la catégorie cible pour un panneau
function determineTargetCategory(panel: { name: string | null; category?: { slug: string } | null }): {
  targetCategory: string;
  targetType?: string;
  reason: string;
  action: 'CHANGE_CATEGORY' | 'CHANGE_TYPE' | 'NONE';
} | null {
  const nameLower = (panel.name || '').toLowerCase();
  const currentCategory = panel.category?.slug || null;

  for (const rule of MDF_RULES) {
    for (const keyword of rule.keywords) {
      if (nameLower.includes(keyword)) {
        // Vérifier si c'est déjà dans la bonne catégorie
        if (rule.action === 'CHANGE_CATEGORY' && currentCategory === rule.name) {
          return null; // Déjà correct
        }
        if (rule.action === 'CHANGE_TYPE') {
          return {
            targetCategory: 'unis-blanc', // Par défaut pour MELAMINE
            targetType: rule.targetType,
            reason: `contains "${keyword}"`,
            action: 'CHANGE_TYPE'
          };
        }
        return {
          targetCategory: rule.name,
          reason: `contains "${keyword}"`,
          action: 'CHANGE_CATEGORY'
        };
      }
    }
  }

  // Par défaut: mdf-standard
  if (currentCategory !== 'mdf-standard') {
    return {
      targetCategory: 'mdf-standard',
      reason: 'default (no specific keyword)',
      action: 'CHANGE_CATEGORY'
    };
  }

  return null;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         CLASSIFICATION DES PANNEAUX MDF                          ║');
  console.log('║         Mode: CONFIRMATION PAR LOT                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Récupérer les catégories MDF
  const mdfCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'mdf-' } }
  });

  const categoryMap = new Map(mdfCategories.map(c => [c.slug, c.id]));
  console.log(`Catégories MDF disponibles: ${mdfCategories.map(c => c.slug).join(', ')}\n`);

  // Récupérer tous les panneaux MDF
  const panels = await prisma.panel.findMany({
    where: { productType: 'MDF' },
    include: { category: { select: { slug: true, name: true } } },
    orderBy: { reference: 'asc' }
  });

  console.log(`Total panneaux MDF: ${panels.length}\n`);

  // Traiter par lots de 100
  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(panels.length / BATCH_SIZE);
  let totalChanges = 0;
  let totalApplied = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, panels.length);
    const batch = panels.slice(start, end);
    const batchNum = batchIndex + 1;

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  LOT ${batchNum}/${totalBatches} (panneaux ${start + 1}-${end})`.padEnd(60) + '║');
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    const changes: Change[] = [];
    let correctCount = 0;

    for (const panel of batch) {
      const result = determineTargetCategory(panel);

      if (result === null) {
        // Déjà correct
        correctCount++;
        console.log(`  ✓ ${panel.reference.padEnd(20)} OK (${panel.category?.slug})`);
      } else if (result.action === 'CHANGE_TYPE') {
        // Doit changer de productType (MDF → MELAMINE)
        console.log(`  ⚠ ${panel.reference.padEnd(20)} ${panel.category?.slug || 'AUCUNE'} → MELAMINE (${result.reason})`);
        changes.push({
          panel: { id: panel.id, reference: panel.reference, name: panel.name },
          fromCategory: panel.category?.slug || null,
          toCategory: result.targetCategory,
          fromType: 'MDF',
          toType: result.targetType,
          reason: result.reason
        });
      } else {
        // Changement de catégorie
        console.log(`  → ${panel.reference.padEnd(20)} ${panel.category?.slug || 'AUCUNE'} → ${result.targetCategory} (${result.reason})`);
        changes.push({
          panel: { id: panel.id, reference: panel.reference, name: panel.name },
          fromCategory: panel.category?.slug || null,
          toCategory: result.targetCategory,
          reason: result.reason
        });
      }
    }

    totalChanges += changes.length;

    console.log(`\n┌─────────────────────────────────────────────────────────────┐`);
    console.log(`│ 📊 Résumé lot ${batchNum}: ${changes.length} changements / ${batch.length} panneaux`.padEnd(61) + '│');
    console.log(`│    ✓ Corrects: ${correctCount}`.padEnd(61) + '│');
    console.log(`│    → À modifier: ${changes.length}`.padEnd(61) + '│');
    console.log(`└─────────────────────────────────────────────────────────────┘`);

    // Attendre confirmation si changements
    if (changes.length > 0) {
      const confirm = await askConfirmation(`\nAppliquer ces ${changes.length} changements ? (o/n) `);

      if (confirm) {
        console.log('\n⏳ Application des changements...');

        for (const change of changes) {
          if (change.toType) {
            // Changement de type + catégorie
            // Pour l'instant, on ne change que la catégorie (le type sera traité séparément)
            console.log(`  ⚠ ${change.panel.reference}: Panneau marqué pour changement de type (MDF → ${change.toType})`);
          } else {
            // Changement de catégorie seulement
            const targetCategoryId = categoryMap.get(change.toCategory);
            if (targetCategoryId) {
              await prisma.panel.update({
                where: { id: change.panel.id },
                data: { categoryId: targetCategoryId }
              });
              console.log(`  ✅ ${change.panel.reference}: Déplacé vers ${change.toCategory}`);
              totalApplied++;
            } else {
              console.log(`  ❌ ${change.panel.reference}: Catégorie ${change.toCategory} non trouvée!`);
            }
          }
        }

        console.log(`\n✅ Lot ${batchNum} appliqué`);
      } else {
        console.log(`\n⏭️ Lot ${batchNum} ignoré`);
      }
    } else {
      console.log(`\n✅ Lot ${batchNum}: Aucun changement nécessaire`);
    }
  }

  // Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ FINAL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal panneaux analysés: ${panels.length}`);
  console.log(`Total changements détectés: ${totalChanges}`);
  console.log(`Total changements appliqués: ${totalApplied}`);

  await prisma.$disconnect();
}

main().catch(console.error);
