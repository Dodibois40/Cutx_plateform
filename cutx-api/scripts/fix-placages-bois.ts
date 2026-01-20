import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Script pour réassigner les placages bois fins vers les bonnes catégories
 * Placages fins = Décoflex, Décolam, Flex avec épaisseur ≤ 1mm
 */

// Mapping essence → catégorie cible
const ESSENCE_TO_CATEGORY: Record<string, string> = {
  'chêne': 'Placage Chêne',
  'chene': 'Placage Chêne',
  'oak': 'Placage Chêne',
  'noyer': 'Placage Noyer',
  'walnut': 'Placage Noyer',
  'frêne': 'Placage Frêne',
  'frene': 'Placage Frêne',
  'ash': 'Placage Frêne',
  'hêtre': 'Placage Hêtre',
  'hetre': 'Placage Hêtre',
  'beech': 'Placage Hêtre',
  'pin': 'Placage Pin',
  'pine': 'Placage Pin',
  'châtaignier': 'Placage Châtaigner',
  'chataignier': 'Placage Châtaigner',
  'châtaigner': 'Placage Châtaigner',
  'chestnut': 'Placage Châtaigner',
  'merisier': 'Placage Autres essences',
  'cherry': 'Placage Autres essences',
  'érable': 'Placage Autres essences',
  'erable': 'Placage Autres essences',
  'maple': 'Placage Autres essences',
  'teck': 'Placage Autres essences',
  'teak': 'Placage Autres essences',
  'wengé': 'Placage Autres essences',
  'wenge': 'Placage Autres essences',
  'sapelli': 'Placage Autres essences',
  'sapele': 'Placage Autres essences',
  'eucalyptus': 'Placage Autres essences',
  'bambou': 'Placage Autres essences',
  'bamboo': 'Placage Autres essences',
};

function detectEssence(name: string): string | null {
  const nameLower = name.toLowerCase();

  for (const [keyword, category] of Object.entries(ESSENCE_TO_CATEGORY)) {
    if (nameLower.includes(keyword)) {
      return category;
    }
  }

  return null;
}

async function main() {
  console.log('=== RÉASSIGNATION DES PLACAGES BOIS ===\n');

  // 1. Récupérer les catégories cibles
  const targetCats = await prisma.category.findMany({
    where: { name: { startsWith: 'Placage' } },
    select: { id: true, name: true }
  });

  const catByName = new Map(targetCats.map(c => [c.name, c.id]));
  console.log('Catégories cibles:');
  for (const [name, id] of catByName) {
    console.log(`  - ${name}: ${id}`);
  }
  console.log('');

  // 2. Trouver tous les vrais placages fins (Décoflex, Décolam, Flex, épaisseur ≤ 1mm)
  const placagesFins = await prisma.panel.findMany({
    where: {
      OR: [
        // Décoflex, Décolam, Flex dans le nom
        { name: { contains: 'décoflex', mode: 'insensitive' } },
        { name: { contains: 'decoflex', mode: 'insensitive' } },
        { name: { contains: 'décolam', mode: 'insensitive' } },
        { name: { contains: 'decolam', mode: 'insensitive' } },
        { name: { contains: 'flex chêne', mode: 'insensitive' } },
        { name: { contains: 'flex chene', mode: 'insensitive' } },
        { name: { contains: 'flex noyer', mode: 'insensitive' } },
        { name: { contains: 'flex frêne', mode: 'insensitive' } },
        // Type PLACAGE avec épaisseur fine
        {
          AND: [
            { productType: 'PLACAGE' },
            { thickness: { hasSome: [0.6, 0.8, 1, 1.0] } }
          ]
        }
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      productType: true,
      categoryId: true,
      category: { select: { name: true } }
    }
  });

  console.log(`Placages fins trouvés: ${placagesFins.length}\n`);

  // 3. Analyser et préparer les réassignations
  const reassignments: Array<{
    id: string;
    reference: string;
    name: string;
    fromCategory: string;
    toCategory: string;
    toCategoryId: string;
  }> = [];

  const skipped: Array<{ reference: string; name: string; reason: string }> = [];

  for (const panel of placagesFins) {
    const currentCat = panel.category?.name || 'SANS CATEGORIE';

    // Déjà dans une bonne catégorie Placage?
    if (currentCat.startsWith('Placage')) {
      skipped.push({
        reference: panel.reference,
        name: panel.name,
        reason: `Déjà dans ${currentCat}`
      });
      continue;
    }

    // Détecter l'essence
    const targetCatName = detectEssence(panel.name);

    if (!targetCatName) {
      skipped.push({
        reference: panel.reference,
        name: panel.name,
        reason: 'Essence non détectée'
      });
      continue;
    }

    const targetCatId = catByName.get(targetCatName);
    if (!targetCatId) {
      skipped.push({
        reference: panel.reference,
        name: panel.name,
        reason: `Catégorie ${targetCatName} non trouvée`
      });
      continue;
    }

    reassignments.push({
      id: panel.id,
      reference: panel.reference,
      name: panel.name,
      fromCategory: currentCat,
      toCategory: targetCatName,
      toCategoryId: targetCatId
    });
  }

  // 4. Afficher le plan
  console.log('=== PLAN DE RÉASSIGNATION ===\n');

  // Grouper par catégorie cible
  const byTarget = new Map<string, typeof reassignments>();
  for (const r of reassignments) {
    if (!byTarget.has(r.toCategory)) {
      byTarget.set(r.toCategory, []);
    }
    byTarget.get(r.toCategory)!.push(r);
  }

  for (const [target, panels] of byTarget) {
    console.log(`\n→ ${target} (${panels.length} panneaux)`);
    for (const p of panels) {
      console.log(`  - ${p.reference}: ${p.name.substring(0, 50)}...`);
      console.log(`    FROM: ${p.fromCategory}`);
    }
  }

  console.log(`\n\n=== IGNORÉS (${skipped.length}) ===`);
  for (const s of skipped.slice(0, 10)) {
    console.log(`  - ${s.reference}: ${s.reason}`);
  }
  if (skipped.length > 10) {
    console.log(`  ... et ${skipped.length - 10} autres`);
  }

  // 5. Exécuter les réassignations
  if (reassignments.length === 0) {
    console.log('\n✅ Aucune réassignation nécessaire');
    return;
  }

  console.log(`\n\n=== EXÉCUTION DE ${reassignments.length} RÉASSIGNATIONS ===\n`);

  let success = 0;
  let failed = 0;

  for (const r of reassignments) {
    try {
      await prisma.panel.update({
        where: { id: r.id },
        data: { categoryId: r.toCategoryId }
      });
      console.log(`✅ ${r.reference} → ${r.toCategory}`);
      success++;
    } catch (err) {
      console.error(`❌ ${r.reference}: ${err}`);
      failed++;
    }
  }

  console.log(`\n=== RÉSULTAT ===`);
  console.log(`✅ Réussis: ${success}`);
  console.log(`❌ Échoués: ${failed}`);

  // 6. Vérifier l'état final
  console.log('\n=== ÉTAT FINAL DES CATÉGORIES PLACAGE ===\n');

  const finalCats = await prisma.category.findMany({
    where: { name: { startsWith: 'Placage' } },
    select: {
      name: true,
      _count: { select: { panels: true } }
    },
    orderBy: { name: 'asc' }
  });

  for (const c of finalCats) {
    console.log(`${c.name}: ${c._count.panels} panneaux`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
