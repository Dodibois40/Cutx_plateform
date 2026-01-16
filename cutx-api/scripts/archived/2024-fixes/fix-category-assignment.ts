import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// MODE DRY_RUN par défaut
const DRY_RUN = !process.argv.includes('--apply');

interface CategoryMapping {
  categoryId: string;
  categoryName: string;
  panelIds: string[];
  reason: string;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          ASSIGNATION DES CATÉGORIES MANQUANTES                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY_RUN: Les changements ne seront PAS appliqués');
    console.log('   Utilisez --apply pour appliquer les modifications\n');
  } else {
    console.log('⚠️  MODE APPLY: Les changements SERONT appliqués!\n');
  }

  // Charger toutes les catégories
  const allCategories = await prisma.category.findMany({
    include: { _count: { select: { panels: true } } }
  });

  // Fonction pour trouver la meilleure catégorie (celle qui a le plus de produits)
  const findBestCategory = (name: string): { id: string; name: string } | null => {
    const matches = allCategories.filter(c => c.name === name);
    if (matches.length === 0) return null;
    // Prendre celle avec le plus de produits (probablement la "principale")
    const best = matches.sort((a, b) => b._count.panels - a._count.panels)[0];
    return { id: best.id, name: best.name };
  };

  // Charger les produits sans catégorie
  const uncategorized = await prisma.panel.findMany({
    where: { categoryId: null },
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
      panelSubType: true,
      isHydrofuge: true,
      isIgnifuge: true
    }
  });

  console.log(`📊 ${uncategorized.length} produits sans catégorie\n`);

  const mappings: CategoryMapping[] = [];

  // =================================================================
  // CHANTS
  // =================================================================
  const chants = uncategorized.filter(p => p.panelType === 'CHANT');
  console.log(`\n═══ CHANTS (${chants.length}) ═══`);

  const catChantABS = findBestCategory('Bande de chant ABS');
  const catChantBois = findBestCategory('Bande de chant bois veritable');
  const catChantMela = findBestCategory('Bande de chant melamine');

  for (const p of chants) {
    let cat = catChantABS; // par défaut
    if (p.panelSubType === 'CHANT_BOIS' && catChantBois) {
      cat = catChantBois;
    } else if (p.panelSubType === 'CHANT_MELAMINE' && catChantMela) {
      cat = catChantMela;
    }
    if (cat) {
      const existing = mappings.find(m => m.categoryId === cat!.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: cat.id,
          categoryName: cat.name,
          panelIds: [p.id],
          reason: `Chant ${p.panelSubType || 'ABS'}`
        });
      }
    }
  }

  // =================================================================
  // CONTREPLAQUÉS
  // =================================================================
  const cps = uncategorized.filter(p => p.panelType === 'CONTREPLAQUE');
  console.log(`═══ CONTREPLAQUÉS (${cps.length}) ═══`);

  const catCPStd = findBestCategory('Contreplaqués');
  const catCPOko = findBestCategory('Contreplaque Okoume');
  const catCPPeup = findBestCategory('Contreplaque Peuplier');
  const catCPRes = findBestCategory('Contreplaque Resineux');
  const catCPBoul = findBestCategory('Contreplaque Bouleau');
  const catCPExo = findBestCategory('Contreplaque Exotique');
  const catCPCint = findBestCategory('Contreplaque a cintrer');

  for (const p of cps) {
    let cat = catCPStd;
    const nameLower = p.name.toLowerCase();

    if (nameLower.includes('okoum') || nameLower.includes('okoumé')) {
      cat = catCPOko || catCPStd;
    } else if (nameLower.includes('peuplier') || nameLower.includes('ctbh')) {
      cat = catCPPeup || catCPStd;
    } else if (nameLower.includes('épicéa') || nameLower.includes('epicea') || nameLower.includes('pin') || nameLower.includes('sapin')) {
      cat = catCPRes || catCPStd;
    } else if (nameLower.includes('bouleau')) {
      cat = catCPBoul || catCPStd;
    } else if (nameLower.includes('cintrer') || nameLower.includes('flexible')) {
      cat = catCPCint || catCPStd;
    } else if (nameLower.includes('exotique') || nameLower.includes('ilomba') || nameLower.includes('sapelli')) {
      cat = catCPExo || catCPStd;
    }

    if (cat) {
      const existing = mappings.find(m => m.categoryId === cat!.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: cat.id,
          categoryName: cat.name,
          panelIds: [p.id],
          reason: 'Contreplaqué'
        });
      }
    }
  }

  // =================================================================
  // MASSIF
  // =================================================================
  const massifs = uncategorized.filter(p => p.panelType === 'MASSIF');
  console.log(`═══ MASSIF (${massifs.length}) ═══`);

  const catMassifNA = findBestCategory('Panneaux non aboutés');
  const catMassifA = findBestCategory('Lamellés-collés aboutés');
  const catMassif3p = findBestCategory('Panneau 3/5 plis');

  for (const p of massifs) {
    let cat = catMassifNA; // par défaut
    const nameLower = p.name.toLowerCase();

    if (p.panelSubType === 'LAMELLE_COLLE' || nameLower.includes('abouté') || nameLower.includes('lamellé-collé')) {
      cat = catMassifA || catMassifNA;
    } else if (p.panelSubType === 'MASSIF_3_PLIS' || nameLower.includes('3 plis') || nameLower.includes('5 plis') || nameLower.includes('latté')) {
      cat = catMassif3p || catMassifNA;
    }

    if (cat) {
      const existing = mappings.find(m => m.categoryId === cat!.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: cat.id,
          categoryName: cat.name,
          panelIds: [p.id],
          reason: 'Massif'
        });
      }
    }
  }

  // =================================================================
  // MDF
  // =================================================================
  const mdfs = uncategorized.filter(p => p.panelType === 'MDF');
  console.log(`═══ MDF (${mdfs.length}) ═══`);

  const catMDFStd = findBestCategory('MDF standards');
  const catMDFH = findBestCategory('MDF hydrofuges');
  const catMDFI = findBestCategory('MDF ignifugés');

  for (const p of mdfs) {
    let cat = catMDFStd;

    if (p.isHydrofuge || p.name.toLowerCase().includes('hydro')) {
      cat = catMDFH || catMDFStd;
    } else if (p.isIgnifuge || p.name.toLowerCase().includes('ignifug')) {
      cat = catMDFI || catMDFStd;
    }

    if (cat) {
      const existing = mappings.find(m => m.categoryId === cat!.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: cat.id,
          categoryName: cat.name,
          panelIds: [p.id],
          reason: 'MDF'
        });
      }
    }
  }

  // =================================================================
  // AGGLO_BRUT
  // =================================================================
  const agglos = uncategorized.filter(p => p.panelType === 'AGGLO_BRUT');
  console.log(`═══ AGGLO_BRUT (${agglos.length}) ═══`);

  const catAggloStd = findBestCategory('Agglomérés standards');
  const catAggloH = findBestCategory('Agglomérés hydrofuges');
  const catAggloI = findBestCategory('Agglomérés ignifugés');

  for (const p of agglos) {
    let cat = catAggloStd;

    if (p.isHydrofuge || p.name.toLowerCase().includes('hydro') || p.name.toLowerCase().includes('p3')) {
      cat = catAggloH || catAggloStd;
    } else if (p.isIgnifuge || p.name.toLowerCase().includes('ignifug')) {
      cat = catAggloI || catAggloStd;
    }

    if (cat) {
      const existing = mappings.find(m => m.categoryId === cat!.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: cat.id,
          categoryName: cat.name,
          panelIds: [p.id],
          reason: 'Agglo'
        });
      }
    }
  }

  // =================================================================
  // STRATIFIÉ
  // =================================================================
  const stratis = uncategorized.filter(p => p.panelType === 'STRATIFIE');
  console.log(`═══ STRATIFIÉ (${stratis.length}) ═══`);

  const catStratiHPL = findBestCategory('Stratifiés HPL');

  for (const p of stratis) {
    if (catStratiHPL) {
      const existing = mappings.find(m => m.categoryId === catStratiHPL.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: catStratiHPL.id,
          categoryName: catStratiHPL.name,
          panelIds: [p.id],
          reason: 'Stratifié HPL'
        });
      }
    }
  }

  // =================================================================
  // OSB
  // =================================================================
  const osbs = uncategorized.filter(p => p.panelType === 'OSB');
  console.log(`═══ OSB (${osbs.length}) ═══`);

  const catOSB = findBestCategory('OSB');

  for (const p of osbs) {
    if (catOSB) {
      const existing = mappings.find(m => m.categoryId === catOSB.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: catOSB.id,
          categoryName: catOSB.name,
          panelIds: [p.id],
          reason: 'OSB'
        });
      }
    }
  }

  // =================================================================
  // MELAMINE
  // =================================================================
  const melas = uncategorized.filter(p => p.panelType === 'MELAMINE');
  console.log(`═══ MELAMINE (${melas.length}) ═══`);

  const catMelaDecor = findBestCategory('Panneau Mélaminé Décor');

  for (const p of melas) {
    if (catMelaDecor) {
      const existing = mappings.find(m => m.categoryId === catMelaDecor.id);
      if (existing) {
        existing.panelIds.push(p.id);
      } else {
        mappings.push({
          categoryId: catMelaDecor.id,
          categoryName: catMelaDecor.name,
          panelIds: [p.id],
          reason: 'Mélaminé'
        });
      }
    }
  }

  // =================================================================
  // RÉSUMÉ
  // =================================================================
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('RÉSUMÉ DES ASSIGNATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalAssigned = 0;
  mappings.sort((a, b) => b.panelIds.length - a.panelIds.length);

  for (const m of mappings) {
    console.log(`  ${m.categoryName}: ${m.panelIds.length} produits`);
    totalAssigned += m.panelIds.length;
  }

  console.log(`\n📊 Total à assigner: ${totalAssigned} / ${uncategorized.length}`);
  console.log(`   Restant sans catégorie: ${uncategorized.length - totalAssigned}`);

  // =================================================================
  // APPLICATION
  // =================================================================
  if (!DRY_RUN && mappings.length > 0) {
    console.log('\n🔄 Application des assignations...\n');

    let applied = 0;
    let errors = 0;

    for (const m of mappings) {
      try {
        const result = await prisma.panel.updateMany({
          where: { id: { in: m.panelIds } },
          data: { categoryId: m.categoryId }
        });
        applied += result.count;
        console.log(`  ✓ ${m.categoryName}: ${result.count} produits`);
      } catch (e) {
        errors++;
        console.error(`  ❌ Erreur ${m.categoryName}:`, (e as Error).message);
      }
    }

    console.log(`\n✅ Assignations terminées!`);
    console.log(`   - Assignés: ${applied}`);
    console.log(`   - Erreurs: ${errors}`);
  } else if (DRY_RUN) {
    console.log('\n💡 Pour appliquer ces assignations, exécutez:');
    console.log('   npx tsx scripts/fix-category-assignment.ts --apply\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
