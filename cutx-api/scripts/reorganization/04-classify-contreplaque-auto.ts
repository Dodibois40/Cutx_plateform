/**
 * 04-classify-contreplaque-auto.ts
 * Classification automatique des panneaux CONTREPLAQUE avec rapport détaillé
 *
 * Usage:
 *   npx tsx scripts/reorganization/04-classify-contreplaque-auto.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Règles de classification CONTREPLAQUE (par ordre de priorité)
const CP_RULES = [
  // Marine / CTBX
  {
    priority: 1,
    name: 'cp-marine-ctbx',
    keywords: ['marine', 'ctbx', 'bs1088', 'wbp'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Okoumé
  {
    priority: 2,
    name: 'cp-okoume',
    keywords: ['okoumé', 'okoume', 'okume'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Bouleau
  {
    priority: 3,
    name: 'cp-bouleau',
    keywords: ['bouleau', 'birch', 'baltique'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Peuplier
  {
    priority: 4,
    name: 'cp-peuplier',
    keywords: ['peuplier', 'poplar', 'pioppo'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Pin Maritime
  {
    priority: 5,
    name: 'cp-pin-maritime',
    keywords: ['pin maritime', 'pin sylvestre', 'pine', 'radiata'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Filmé / Coffrage
  {
    priority: 6,
    name: 'cp-filme',
    keywords: ['filmé', 'filme', 'coffrage', 'antidérapant', 'antiderapant', 'wiremesh'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Cintrable
  {
    priority: 7,
    name: 'cp-cintrable',
    keywords: ['cintrable', 'flexible', 'courbe', 'flex'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Exotique
  {
    priority: 8,
    name: 'cp-exotique',
    keywords: ['sipo', 'sapelli', 'sapele', 'ilomba', 'fromager', 'fuma', 'limba', 'ayous', 'iroko', 'exotique', 'tropical'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Épicéa
  {
    priority: 9,
    name: 'cp-divers',
    keywords: ['épicéa', 'epicea', 'spruce', 'sapin'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Chêne
  {
    priority: 10,
    name: 'cp-divers',
    keywords: ['chêne', 'chene', 'oak'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Hêtre
  {
    priority: 11,
    name: 'cp-divers',
    keywords: ['hêtre', 'hetre', 'beech'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Noyer
  {
    priority: 12,
    name: 'cp-divers',
    keywords: ['noyer', 'walnut'],
    action: 'CHANGE_CATEGORY' as const
  }
];

interface Change {
  id: string;
  reference: string;
  name: string;
  fromCategory: string;
  toCategory: string;
  reason: string;
  applied: boolean;
}

// Déterminer la catégorie cible pour un panneau
function determineTargetCategory(panel: { name: string | null; category?: { slug: string } | null }): {
  targetCategory: string;
  reason: string;
  action: 'CHANGE_CATEGORY' | 'NONE';
} | null {
  const nameLower = (panel.name || '').toLowerCase();
  const currentCategory = panel.category?.slug || null;

  // Vérifier si déjà dans une catégorie CP valide
  if (currentCategory?.startsWith('cp-')) {
    return null; // Déjà dans une catégorie correcte
  }

  for (const rule of CP_RULES) {
    for (const keyword of rule.keywords) {
      if (nameLower.includes(keyword)) {
        return {
          targetCategory: rule.name,
          reason: `contains "${keyword}"`,
          action: 'CHANGE_CATEGORY'
        };
      }
    }
  }

  // Par défaut, classer dans cp-divers
  return {
    targetCategory: 'cp-divers',
    reason: 'default classification',
    action: 'CHANGE_CATEGORY'
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     CLASSIFICATION AUTOMATIQUE DES PANNEAUX CONTREPLAQUE        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Récupérer les catégories CP
  const cpCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'cp-' } }
  });
  const categoryMap = new Map(cpCategories.map(c => [c.slug, c.id]));

  console.log('Catégories disponibles:');
  for (const cat of cpCategories) {
    console.log(`  ✓ ${cat.slug} (${cat.id})`);
  }
  console.log('');

  // Récupérer les panneaux CONTREPLAQUE mal classés
  const panels = await prisma.panel.findMany({
    where: {
      productType: 'CONTREPLAQUE',
      NOT: {
        category: { slug: { startsWith: 'cp-' } }
      }
    },
    include: { category: { select: { slug: true, name: true } } },
    orderBy: { reference: 'asc' }
  });

  console.log(`Panneaux CONTREPLAQUE mal classés: ${panels.length}\n`);

  const changes: Change[] = [];
  let skippedCount = 0;

  // Analyser chaque panneau
  console.log('═══ ANALYSE ═══\n');

  for (const panel of panels) {
    const result = determineTargetCategory(panel);

    if (result === null) {
      skippedCount++;
    } else {
      changes.push({
        id: panel.id,
        reference: panel.reference,
        name: panel.name || '',
        fromCategory: panel.category?.slug || 'AUCUNE',
        toCategory: result.targetCategory,
        reason: result.reason,
        applied: false
      });
    }
  }

  console.log(`\n═══ RÉSUMÉ AVANT APPLICATION ═══`);
  console.log(`  → Panneaux à reclasser: ${changes.length}`);
  console.log(`  ⏭️ Panneaux ignorés: ${skippedCount}`);

  // Grouper les changements par type
  const changesByTarget: Record<string, Change[]> = {};
  for (const change of changes) {
    if (!changesByTarget[change.toCategory]) {
      changesByTarget[change.toCategory] = [];
    }
    changesByTarget[change.toCategory].push(change);
  }

  console.log('\nChangements par catégorie cible:');
  for (const [target, list] of Object.entries(changesByTarget)) {
    console.log(`  ${target}: ${list.length} panneaux`);
    // Afficher quelques exemples
    for (const c of list.slice(0, 3)) {
      console.log(`      ${c.reference}: "${(c.name || '').substring(0, 40)}..."`);
    }
    if (list.length > 3) {
      console.log(`      ... et ${list.length - 3} autres`);
    }
  }

  if (changes.length === 0) {
    console.log('\n✅ Aucun changement nécessaire!');
    await prisma.$disconnect();
    return;
  }

  // Appliquer les changements
  console.log('\n═══ APPLICATION DES CHANGEMENTS ═══\n');

  let applied = 0;
  let errors = 0;

  for (const change of changes) {
    const targetCategoryId = categoryMap.get(change.toCategory);
    if (!targetCategoryId) {
      console.log(`  ❌ ${change.reference}: Catégorie ${change.toCategory} non trouvée!`);
      errors++;
      continue;
    }

    try {
      await prisma.panel.update({
        where: { id: change.id },
        data: { categoryId: targetCategoryId }
      });
      change.applied = true;
      applied++;
    } catch (err) {
      console.log(`  ❌ ${change.reference}: Erreur - ${err}`);
      errors++;
    }
  }

  console.log(`  ✅ ${applied} panneaux reclassés avec succès`);
  if (errors > 0) {
    console.log(`  ❌ ${errors} erreurs`);
  }

  // Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ FINAL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total panneaux analysés: ${panels.length}`);
  console.log(`  Changements appliqués: ${applied}`);
  console.log(`  Erreurs: ${errors}`);

  // Vérification finale
  console.log('\n═══ VÉRIFICATION ═══');
  const verification = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { productType: 'CONTREPLAQUE' },
    _count: true
  });

  const catNames = await prisma.category.findMany({
    where: { id: { in: verification.map(v => v.categoryId).filter(Boolean) as string[] } },
    select: { id: true, slug: true }
  });
  const catNameMap = new Map(catNames.map(c => [c.id, c.slug]));

  console.log('\nDistribution finale des CONTREPLAQUE:');
  const sorted = verification.sort((a, b) => b._count - a._count);
  for (const v of sorted) {
    const catSlug = v.categoryId ? catNameMap.get(v.categoryId) || 'UNKNOWN' : 'AUCUNE';
    console.log(`  ${catSlug.padEnd(25)} ${v._count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
