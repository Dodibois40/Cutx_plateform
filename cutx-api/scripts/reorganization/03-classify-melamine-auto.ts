/**
 * 03-classify-melamine-auto.ts
 * Classification automatique des panneaux MELAMINE avec rapport détaillé
 *
 * Usage:
 *   npx tsx scripts/reorganization/03-classify-melamine-auto.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Règles de classification MELAMINE (par ordre de priorité)
const MELAMINE_RULES = [
  // Unis - couleurs spécifiques
  {
    priority: 1,
    name: 'unis-blanc',
    keywords: ['blanc', 'white', 'bianco'],
    excludeKeywords: ['chêne blanc', 'bouleau blanc'], // Exclure les bois avec "blanc"
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 2,
    name: 'unis-noir',
    keywords: ['noir', 'black', 'nero'],
    excludeKeywords: ['chêne noir'],
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 3,
    name: 'unis-gris',
    keywords: ['gris', 'grey', 'gray', 'anthracite', 'grigio'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Décors bois
  {
    priority: 4,
    name: 'decors-bois',
    keywords: ['chêne', 'noyer', 'hêtre', 'frêne', 'érable', 'merisier', 'orme', 'bouleau', 'acacia', 'teck', 'hickory', 'aulne', 'cerisier', 'pin', 'sapin', 'mélèze', 'châtaignier', 'bambou', 'zebrano', 'palissandre', 'wenge', 'oak', 'walnut', 'beech', 'ash', 'maple', 'elm', 'birch'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Décors pierre/béton
  {
    priority: 5,
    name: 'decors-pierre-beton',
    keywords: ['marbre', 'béton', 'beton', 'pierre', 'ardoise', 'granit', 'travertin', 'ciment', 'concrete', 'marble', 'stone', 'slate'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Décors métal
  {
    priority: 6,
    name: 'decors-metal',
    keywords: ['aluminium', 'inox', 'métal', 'metal', 'acier', 'cuivre', 'bronze', 'laiton', 'steel', 'copper'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Fenix
  {
    priority: 7,
    name: 'fenix',
    keywords: ['fenix', 'arpa'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Décors fantaisie (couleurs vives, motifs)
  {
    priority: 8,
    name: 'decors-fantaisie',
    keywords: ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet', 'rose', 'turquoise', 'bordeaux', 'taupe', 'crème', 'creme', 'beige', 'ivoire', 'cappuccino', 'magnolia', 'vanille', 'sable', 'caramel', 'noisette', 'chocolat', 'moka', 'curry', 'safran', 'aubergine', 'prune', 'lilas', 'lavande', 'menthe', 'pistache', 'olive', 'kaki', 'terracotta', 'corail', 'saumon', 'pêche'],
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

  // Vérifier si déjà dans une catégorie MELAMINE valide
  if (currentCategory?.startsWith('unis-') ||
      currentCategory?.startsWith('decors-') ||
      currentCategory === 'fenix') {
    return null; // Déjà dans une catégorie correcte
  }

  for (const rule of MELAMINE_RULES) {
    for (const keyword of rule.keywords) {
      if (nameLower.includes(keyword)) {
        // Vérifier les exclusions
        if (rule.excludeKeywords) {
          const isExcluded = rule.excludeKeywords.some(excl => nameLower.includes(excl));
          if (isExcluded) continue;
        }
        return {
          targetCategory: rule.name,
          reason: `contains "${keyword}"`,
          action: 'CHANGE_CATEGORY'
        };
      }
    }
  }

  // Par défaut, classer dans unis-blanc si pas de correspondance
  return {
    targetCategory: 'unis-blanc',
    reason: 'default classification',
    action: 'CHANGE_CATEGORY'
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CLASSIFICATION AUTOMATIQUE DES PANNEAUX MELAMINE          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Récupérer les catégories MELAMINE
  const melCategories = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'unis-' } },
        { slug: { startsWith: 'decors-' } },
        { slug: 'fenix' }
      ]
    }
  });
  const categoryMap = new Map(melCategories.map(c => [c.slug, c.id]));

  console.log('Catégories disponibles:');
  for (const cat of melCategories) {
    console.log(`  ✓ ${cat.slug} (${cat.id})`);
  }
  console.log('');

  // Récupérer les panneaux MELAMINE mal classés
  const panels = await prisma.panel.findMany({
    where: {
      productType: 'MELAMINE',
      NOT: {
        category: {
          OR: [
            { slug: { startsWith: 'unis-' } },
            { slug: { startsWith: 'decors-' } },
            { slug: 'fenix' }
          ]
        }
      }
    },
    include: { category: { select: { slug: true, name: true } } },
    orderBy: { reference: 'asc' }
  });

  console.log(`Panneaux MELAMINE mal classés: ${panels.length}\n`);

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
      console.log(`  → ${panel.reference}: ${panel.category?.slug || 'AUCUNE'} → ${result.targetCategory} (${result.reason})`);
      console.log(`      "${(panel.name || '').substring(0, 60)}"`);
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
      console.log(`  ✅ ${change.reference}: ${change.fromCategory} → ${change.toCategory}`);
    } catch (err) {
      console.log(`  ❌ ${change.reference}: Erreur - ${err}`);
      errors++;
    }
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
    where: { productType: 'MELAMINE' },
    _count: true
  });

  const catNames = await prisma.category.findMany({
    where: { id: { in: verification.map(v => v.categoryId).filter(Boolean) as string[] } },
    select: { id: true, slug: true }
  });
  const catNameMap = new Map(catNames.map(c => [c.id, c.slug]));

  console.log('\nDistribution finale des MELAMINE (top 10):');
  const sorted = verification.sort((a, b) => b._count - a._count).slice(0, 10);
  for (const v of sorted) {
    const catSlug = v.categoryId ? catNameMap.get(v.categoryId) || 'UNKNOWN' : 'AUCUNE';
    console.log(`  ${catSlug.padEnd(25)} ${v._count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
