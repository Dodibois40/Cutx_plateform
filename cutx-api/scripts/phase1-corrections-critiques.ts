/**
 * PHASE 1: CORRECTIONS CRITIQUES
 *
 * 1. Classifier 466 chants sans productType → BANDE_DE_CHANT
 * 2. Unifier doublons: AGGLOMERE→PARTICULE, MASSIF→PANNEAU_MASSIF, etc.
 * 3. Supprimer/reclasser: COLLE, PORTE, PVC
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function phase1() {
  console.log('='.repeat(70));
  console.log('PHASE 1: CORRECTIONS CRITIQUES');
  console.log('='.repeat(70));

  // ============================================
  // 1. CLASSIFIER LES 466 CHANTS SANS PRODUCTTYPE
  // ============================================
  console.log('\n--- 1. Chants sans productType ---');

  // Vérifier avant
  const chantsWithoutType = await prisma.panel.findMany({
    where: {
      productType: null,
      isActive: true,
    },
    select: {
      id: true,
      reference: true,
      name: true,
      category: { select: { slug: true, name: true } },
    },
    take: 5,
  });

  const totalWithoutType = await prisma.panel.count({
    where: { productType: null, isActive: true },
  });

  console.log(`Total sans productType: ${totalWithoutType}`);
  console.log('Exemples:');
  for (const p of chantsWithoutType) {
    console.log(`  ${p.reference} | ${p.name?.substring(0, 40)} | cat: ${p.category?.slug}`);
  }

  // Tous sont dans "chants-melamines" → ce sont des BANDE_DE_CHANT
  const result1 = await prisma.panel.updateMany({
    where: {
      productType: null,
      isActive: true,
    },
    data: {
      productType: 'BANDE_DE_CHANT',
    },
  });

  console.log(`\n✅ ${result1.count} panneaux classifiés en BANDE_DE_CHANT`);

  // ============================================
  // 2. UNIFIER LES DOUBLONS DE PRODUCTTYPE
  // ============================================
  console.log('\n--- 2. Unification des doublons ---');

  // 2a. AGGLOMERE → PARTICULE
  const countAgglo = await prisma.panel.count({
    where: { productType: 'AGGLOMERE', isActive: true },
  });
  if (countAgglo > 0) {
    const result2a = await prisma.panel.updateMany({
      where: { productType: 'AGGLOMERE' },
      data: { productType: 'PARTICULE' },
    });
    console.log(`✅ AGGLOMERE → PARTICULE: ${result2a.count} panneaux`);
  } else {
    console.log('⏭️  AGGLOMERE: aucun à migrer');
  }

  // 2b. MASSIF → PANNEAU_MASSIF
  const countMassif = await prisma.panel.count({
    where: { productType: 'MASSIF', isActive: true },
  });
  if (countMassif > 0) {
    const result2b = await prisma.panel.updateMany({
      where: { productType: 'MASSIF' },
      data: { productType: 'PANNEAU_MASSIF' },
    });
    console.log(`✅ MASSIF → PANNEAU_MASSIF: ${result2b.count} panneaux`);
  } else {
    console.log('⏭️  MASSIF: aucun à migrer');
  }

  // 2c. ALVEOLAIRE → PANNEAU_ALVEOLAIRE
  const countAlv = await prisma.panel.count({
    where: { productType: 'ALVEOLAIRE', isActive: true },
  });
  if (countAlv > 0) {
    const result2c = await prisma.panel.updateMany({
      where: { productType: 'ALVEOLAIRE' },
      data: { productType: 'PANNEAU_ALVEOLAIRE' },
    });
    console.log(`✅ ALVEOLAIRE → PANNEAU_ALVEOLAIRE: ${result2c.count} panneaux`);
  } else {
    console.log('⏭️  ALVEOLAIRE: aucun à migrer');
  }

  // 2d. BOIS_CIMENT → CIMENT_BOIS
  const countBoisCiment = await prisma.panel.count({
    where: { productType: 'BOIS_CIMENT', isActive: true },
  });
  if (countBoisCiment > 0) {
    const result2d = await prisma.panel.updateMany({
      where: { productType: 'BOIS_CIMENT' },
      data: { productType: 'CIMENT_BOIS' },
    });
    console.log(`✅ BOIS_CIMENT → CIMENT_BOIS: ${result2d.count} panneaux`);
  } else {
    console.log('⏭️  BOIS_CIMENT: aucun à migrer');
  }

  // ============================================
  // 3. SUPPRIMER/RECLASSER PRODUCTTYPES INVALIDES
  // ============================================
  console.log('\n--- 3. Suppression/reclassement productTypes invalides ---');

  // 3a. COLLE → Désactiver (ce n'est pas un panneau)
  const countColle = await prisma.panel.count({
    where: { productType: 'COLLE', isActive: true },
  });
  if (countColle > 0) {
    const result3a = await prisma.panel.updateMany({
      where: { productType: 'COLLE' },
      data: { isActive: false },
    });
    console.log(`✅ COLLE: ${result3a.count} panneau(x) désactivé(s)`);
  } else {
    console.log('⏭️  COLLE: aucun à désactiver');
  }

  // 3b. PORTE → CONTREPLAQUE
  const countPorte = await prisma.panel.count({
    where: { productType: 'PORTE', isActive: true },
  });
  if (countPorte > 0) {
    const result3b = await prisma.panel.updateMany({
      where: { productType: 'PORTE' },
      data: { productType: 'CONTREPLAQUE' },
    });
    console.log(`✅ PORTE → CONTREPLAQUE: ${result3b.count} panneau(x)`);
  } else {
    console.log('⏭️  PORTE: aucun à reclasser');
  }

  // 3c. PVC → SOLID_SURFACE (ou désactiver si pas pertinent)
  const pvcPanels = await prisma.panel.findMany({
    where: { productType: 'PVC', isActive: true },
    select: { id: true, name: true },
  });
  if (pvcPanels.length > 0) {
    console.log('PVC trouvés:', pvcPanels.map(p => p.name?.substring(0, 50)));
    // PVC expansé → autre catégorie ou désactiver
    const result3c = await prisma.panel.updateMany({
      where: { productType: 'PVC' },
      data: { productType: 'PANNEAU_SPECIAL' }, // Les mettre en spécial plutôt que solid surface
    });
    console.log(`✅ PVC → PANNEAU_SPECIAL: ${result3c.count} panneau(x)`);
  } else {
    console.log('⏭️  PVC: aucun à reclasser');
  }

  // ============================================
  // VERIFICATION FINALE
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION FINALE');
  console.log('='.repeat(70));

  // Compter les productTypes restants
  const finalTypes = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('\nDistribution finale des productTypes:');
  for (const t of finalTypes) {
    console.log(`  ${(t.productType || 'NULL').padEnd(25)} : ${t._count}`);
  }

  // Vérifier qu'il n'y a plus de NULL
  const stillNull = finalTypes.find(t => t.productType === null);
  if (stillNull) {
    console.log(`\n⚠️  Il reste ${stillNull._count} panneaux sans productType!`);
  } else {
    console.log('\n✅ Plus aucun panneau sans productType!');
  }

  // Vérifier qu'il n'y a plus de doublons
  const doublons = ['AGGLOMERE', 'MASSIF', 'ALVEOLAIRE', 'BOIS_CIMENT', 'COLLE', 'PORTE', 'PVC'];
  const remainingDoublons = finalTypes.filter(t => doublons.includes(t.productType || ''));
  if (remainingDoublons.length > 0) {
    console.log('\n⚠️  Doublons restants:');
    remainingDoublons.forEach(d => console.log(`    ${d.productType}: ${d._count}`));
  } else {
    console.log('✅ Plus de doublons de productType!');
  }

  await prisma.$disconnect();
}

phase1().catch(console.error);
