/**
 * 10-validate-all.ts
 * Validation finale de la classification de tous les panneaux
 *
 * Usage:
 *   npx tsx scripts/reorganization/10-validate-all.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationIssue {
  reference: string;
  name: string;
  productType: string;
  category: string | null;
  issue: string;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              VALIDATION FINALE - TOUS LES PANNEAUX              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const issues: ValidationIssue[] = [];

  // 1. Vérifier les panneaux sans catégorie
  console.log('═══ VÉRIFICATION 1: Panneaux sans catégorie ═══\n');
  const noCategory = await prisma.panel.findMany({
    where: { categoryId: null },
    select: { reference: true, name: true, productType: true }
  });
  console.log(`  Panneaux sans catégorie: ${noCategory.length}`);
  if (noCategory.length > 0) {
    for (const p of noCategory.slice(0, 5)) {
      console.log(`    ❌ ${p.reference} (${p.productType}): ${p.name?.substring(0, 40)}`);
      issues.push({
        reference: p.reference,
        name: p.name || '',
        productType: p.productType || '',
        category: null,
        issue: 'NO_CATEGORY'
      });
    }
    if (noCategory.length > 5) console.log(`    ... et ${noCategory.length - 5} autres`);
  } else {
    console.log('  ✅ Tous les panneaux ont une catégorie');
  }

  // 2. Vérifier les MDF dans les bonnes catégories
  console.log('\n═══ VÉRIFICATION 2: MDF dans catégories mdf-* ═══\n');
  const mdfBadCategory = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      NOT: { category: { slug: { startsWith: 'mdf-' } } }
    },
    include: { category: { select: { slug: true } } }
  });
  console.log(`  MDF hors catégorie mdf-*: ${mdfBadCategory.length}`);
  if (mdfBadCategory.length > 0) {
    for (const p of mdfBadCategory.slice(0, 5)) {
      console.log(`    ⚠️ ${p.reference} → ${p.category?.slug || 'AUCUNE'}`);
      issues.push({
        reference: p.reference,
        name: p.name || '',
        productType: 'MDF',
        category: p.category?.slug || null,
        issue: 'MDF_WRONG_CATEGORY'
      });
    }
    if (mdfBadCategory.length > 5) console.log(`    ... et ${mdfBadCategory.length - 5} autres`);
  } else {
    console.log('  ✅ Tous les MDF sont dans des catégories mdf-*');
  }

  // 3. Vérifier les MELAMINE dans les bonnes catégories
  console.log('\n═══ VÉRIFICATION 3: MELAMINE dans catégories unis-*/decors-*/fenix ═══\n');
  const melBadCategory = await prisma.panel.findMany({
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
    include: { category: { select: { slug: true } } }
  });
  console.log(`  MELAMINE hors catégories correctes: ${melBadCategory.length}`);
  if (melBadCategory.length > 0) {
    for (const p of melBadCategory.slice(0, 5)) {
      console.log(`    ⚠️ ${p.reference} → ${p.category?.slug || 'AUCUNE'}`);
      issues.push({
        reference: p.reference,
        name: p.name || '',
        productType: 'MELAMINE',
        category: p.category?.slug || null,
        issue: 'MELAMINE_WRONG_CATEGORY'
      });
    }
    if (melBadCategory.length > 5) console.log(`    ... et ${melBadCategory.length - 5} autres`);
  } else {
    console.log('  ✅ Tous les MELAMINE sont correctement classés');
  }

  // 4. Vérifier les CONTREPLAQUE dans les bonnes catégories
  console.log('\n═══ VÉRIFICATION 4: CONTREPLAQUE dans catégories cp-* ═══\n');
  const cpBadCategory = await prisma.panel.findMany({
    where: {
      productType: 'CONTREPLAQUE',
      NOT: { category: { slug: { startsWith: 'cp-' } } }
    },
    include: { category: { select: { slug: true } } }
  });
  console.log(`  CONTREPLAQUE hors catégorie cp-*: ${cpBadCategory.length}`);
  if (cpBadCategory.length > 0) {
    for (const p of cpBadCategory.slice(0, 5)) {
      console.log(`    ⚠️ ${p.reference} → ${p.category?.slug || 'AUCUNE'}`);
      issues.push({
        reference: p.reference,
        name: p.name || '',
        productType: 'CONTREPLAQUE',
        category: p.category?.slug || null,
        issue: 'CP_WRONG_CATEGORY'
      });
    }
    if (cpBadCategory.length > 5) console.log(`    ... et ${cpBadCategory.length - 5} autres`);
  } else {
    console.log('  ✅ Tous les CONTREPLAQUE sont dans des catégories cp-*');
  }

  // 5. Vérifier les PARTICULE/AGGLOMERE dans les bonnes catégories
  console.log('\n═══ VÉRIFICATION 5: PARTICULE dans catégories agglo-* ═══\n');
  const aggloBadCategory = await prisma.panel.findMany({
    where: {
      productType: 'PARTICULE',
      NOT: { category: { slug: { startsWith: 'agglo-' } } }
    },
    include: { category: { select: { slug: true } } }
  });
  console.log(`  PARTICULE hors catégorie agglo-*: ${aggloBadCategory.length}`);
  if (aggloBadCategory.length > 0) {
    for (const p of aggloBadCategory.slice(0, 5)) {
      console.log(`    ⚠️ ${p.reference} → ${p.category?.slug || 'AUCUNE'}`);
      issues.push({
        reference: p.reference,
        name: p.name || '',
        productType: 'PARTICULE',
        category: p.category?.slug || null,
        issue: 'AGGLO_WRONG_CATEGORY'
      });
    }
    if (aggloBadCategory.length > 5) console.log(`    ... et ${aggloBadCategory.length - 5} autres`);
  } else {
    console.log('  ✅ Tous les PARTICULE sont dans des catégories agglo-*');
  }

  // 6. Statistiques globales
  console.log('\n═══ STATISTIQUES GLOBALES ═══\n');

  const totalPanels = await prisma.panel.count();
  console.log(`  Total panneaux: ${totalPanels}`);

  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  console.log('\n  Distribution par type:');
  for (const t of byType) {
    const pct = ((t._count / totalPanels) * 100).toFixed(1);
    console.log(`    ${(t.productType || 'AUCUN').padEnd(20)} ${t._count.toString().padStart(5)} (${pct}%)`);
  }

  // 7. Distribution par catégorie principale (slug prefix)
  console.log('\n  Distribution par famille de catégorie:');
  const allPanels = await prisma.panel.findMany({
    include: { category: { select: { slug: true } } }
  });

  const byFamily: Record<string, number> = {};
  for (const p of allPanels) {
    const slug = p.category?.slug || 'AUCUNE';
    const family = slug.split('-')[0] || 'AUTRE';
    byFamily[family] = (byFamily[family] || 0) + 1;
  }

  const sortedFamilies = Object.entries(byFamily).sort((a, b) => b[1] - a[1]);
  for (const [family, count] of sortedFamilies) {
    const pct = ((count / totalPanels) * 100).toFixed(1);
    console.log(`    ${family.padEnd(20)} ${count.toString().padStart(5)} (${pct}%)`);
  }

  // Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ FINAL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  if (issues.length === 0) {
    console.log('\n  ✅ VALIDATION RÉUSSIE!');
    console.log('  Tous les panneaux sont correctement classés.\n');
  } else {
    console.log(`\n  ⚠️ ${issues.length} problème(s) détecté(s)`);

    // Grouper par type de problème
    const byIssue: Record<string, number> = {};
    for (const issue of issues) {
      byIssue[issue.issue] = (byIssue[issue.issue] || 0) + 1;
    }

    console.log('\n  Problèmes par type:');
    for (const [type, count] of Object.entries(byIssue)) {
      console.log(`    ${type}: ${count}`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
