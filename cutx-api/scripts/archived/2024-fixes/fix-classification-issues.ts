import { PrismaClient, ProductType, ProductSubType, DecorCategory } from '@prisma/client';

const prisma = new PrismaClient();

// MODE DRY_RUN par défaut - passer --apply pour appliquer les changements
const DRY_RUN = !process.argv.includes('--apply');

interface Fix {
  id: string;
  reference: string;
  name: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  reason: string;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         CORRECTION DE LA CLASSIFICATION DU CATALOGUE          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY_RUN: Les changements ne seront PAS appliqués');
    console.log('   Utilisez --apply pour appliquer les modifications\n');
  } else {
    console.log('⚠️  MODE APPLY: Les changements SERONT appliqués à la base!\n');
  }

  const allFixes: Fix[] = [];

  // =================================================================
  // FIX 1: "Panneau Chant" classés MELAMINE → CHANT
  // =================================================================
  console.log('═══ FIX 1: Chants mal classés comme MELAMINE ═══\n');

  const chantsAsMelamine = await prisma.panel.findMany({
    where: {
      panelType: 'MELAMINE',
      name: { contains: 'Chant', mode: 'insensitive' }
    },
    select: { id: true, reference: true, name: true, panelType: true }
  });

  for (const p of chantsAsMelamine) {
    // Vérifier que c'est bien un chant (pas "avec chant droit" qui serait un PDT)
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('panneau chant') ||
        (nameLower.startsWith('chant ') && !nameLower.includes('plan de travail'))) {
      allFixes.push({
        id: p.id,
        reference: p.reference,
        name: p.name,
        field: 'panelType',
        oldValue: p.panelType,
        newValue: 'CHANT',
        reason: 'Nom contient "Chant" mais classé MELAMINE'
      });
    }
  }

  console.log(`  Trouvé: ${allFixes.filter(f => f.reason.includes('MELAMINE')).length} chants à reclassifier\n`);

  // =================================================================
  // FIX 2: "Panneau Stratifié" classés MELAMINE → STRATIFIE
  // =================================================================
  console.log('═══ FIX 2: Stratifiés mal classés comme MELAMINE ═══\n');

  const stratiAsMelamine = await prisma.panel.findMany({
    where: {
      panelType: 'MELAMINE',
      OR: [
        { name: { contains: 'Stratifié', mode: 'insensitive' } },
        { name: { contains: 'HPL', mode: 'insensitive' } }
      ]
    },
    select: { id: true, reference: true, name: true, panelType: true }
  });

  for (const p of stratiAsMelamine) {
    const nameLower = p.name.toLowerCase();
    // Exclure les mélaminés qui mentionnent juste "stratifié" dans la description
    if (nameLower.includes('panneau stratifié') || nameLower.startsWith('stratifié ') ||
        nameLower.includes('feuille de stratifié') || nameLower.includes('hpl')) {
      allFixes.push({
        id: p.id,
        reference: p.reference,
        name: p.name,
        field: 'panelType',
        oldValue: p.panelType,
        newValue: 'STRATIFIE',
        reason: 'Nom indique stratifié/HPL mais classé MELAMINE'
      });
    }
  }

  console.log(`  Trouvé: ${stratiAsMelamine.length} stratifiés à reclassifier\n`);

  // =================================================================
  // FIX 3: Compacts mal classés comme MELAMINE → COMPACT
  // =================================================================
  console.log('═══ FIX 3: Compacts mal classés comme MELAMINE ═══\n');

  const compactAsMelamine = await prisma.panel.findMany({
    where: {
      panelType: 'MELAMINE',
      OR: [
        { name: { contains: 'Compact', mode: 'insensitive' } },
        { name: { contains: 'Reysitop', mode: 'insensitive' } },
        { name: { contains: 'Fundermax', mode: 'insensitive' } },
        { name: { contains: 'Trespa', mode: 'insensitive' } }
      ]
    },
    select: { id: true, reference: true, name: true, panelType: true }
  });

  for (const p of compactAsMelamine) {
    allFixes.push({
      id: p.id,
      reference: p.reference,
      name: p.name,
      field: 'panelType',
      oldValue: p.panelType,
      newValue: 'COMPACT',
      reason: 'Nom indique Compact mais classé MELAMINE'
    });
  }

  console.log(`  Trouvé: ${compactAsMelamine.length} compacts à reclassifier\n`);

  // =================================================================
  // FIX 4: AGGLO_BRUT avec décor (Mélaminé Décor) → MELAMINE
  // =================================================================
  console.log('═══ FIX 4: Mélaminés classés AGGLO_BRUT ═══\n');

  const melAsAgglo = await prisma.panel.findMany({
    where: {
      panelType: 'AGGLO_BRUT',
      OR: [
        { name: { contains: 'Mélaminé', mode: 'insensitive' } },
        { name: { contains: 'Melamine', mode: 'insensitive' } },
        { decorCategory: { not: null } }
      ]
    },
    select: { id: true, reference: true, name: true, panelType: true, decorCategory: true }
  });

  for (const p of melAsAgglo) {
    const nameLower = p.name.toLowerCase();
    // Si le nom contient "mélaminé" OU a une catégorie de décor (sauf si c'est vraiment un agglo plaqué)
    if (nameLower.includes('mélaminé') || nameLower.includes('melamine') || nameLower.includes('décor')) {
      allFixes.push({
        id: p.id,
        reference: p.reference,
        name: p.name,
        field: 'panelType',
        oldValue: p.panelType,
        newValue: 'MELAMINE',
        reason: `Mélaminé avec décor (${p.decorCategory}) classé AGGLO_BRUT`
      });
    }
  }

  console.log(`  Trouvé: ${melAsAgglo.length} mélaminés mal classés en AGGLO_BRUT\n`);

  // =================================================================
  // FIX 5: Mélaminés sans decorCategory - déduction par le nom
  // =================================================================
  console.log('═══ FIX 5: Mélaminés sans catégorie de décor ═══\n');

  const melNoDecor = await prisma.panel.findMany({
    where: {
      panelType: 'MELAMINE',
      decorCategory: null
    },
    select: { id: true, reference: true, name: true, decorCategory: true, decorCode: true }
  });

  for (const p of melNoDecor) {
    const nameLower = p.name.toLowerCase();
    let suggestedDecor: DecorCategory | null = null;

    // Déduction par le nom
    if (nameLower.includes('chêne') || nameLower.includes('chene') ||
        nameLower.includes('noyer') || nameLower.includes('frêne') ||
        nameLower.includes('bouleau') || nameLower.includes('hêtre') ||
        nameLower.includes('orme') || nameLower.includes('acacia') ||
        nameLower.includes('teck') || nameLower.includes('wenge') ||
        nameLower.includes('erable') || nameLower.includes('érable') ||
        nameLower.includes('pin ') || nameLower.includes('sapin') ||
        nameLower.includes('bois')) {
      suggestedDecor = 'BOIS';
    } else if (nameLower.includes('blanc') || nameLower.includes('noir') ||
               nameLower.includes('gris') || nameLower.includes('beige') ||
               nameLower.includes('anthracite') || nameLower.includes('crème') ||
               nameLower.includes('taupe') || nameLower.includes('ecru') ||
               nameLower.includes('ivoire')) {
      suggestedDecor = 'UNIS';
    } else if (nameLower.includes('marbre') || nameLower.includes('pierre') ||
               nameLower.includes('granit') || nameLower.includes('ardoise') ||
               nameLower.includes('travertin')) {
      suggestedDecor = 'PIERRE';
    } else if (nameLower.includes('béton') || nameLower.includes('beton') ||
               nameLower.includes('ciment')) {
      suggestedDecor = 'BETON';
    } else if (nameLower.includes('métal') || nameLower.includes('metal') ||
               nameLower.includes('inox') || nameLower.includes('aluminium') ||
               nameLower.includes('cuivre') || nameLower.includes('bronze')) {
      suggestedDecor = 'METAL';
    } else if (nameLower.includes('textile') || nameLower.includes('tissu') ||
               nameLower.includes('lin ') || nameLower.includes('cuir')) {
      suggestedDecor = 'TEXTILE';
    }

    if (suggestedDecor) {
      allFixes.push({
        id: p.id,
        reference: p.reference,
        name: p.name,
        field: 'decorCategory',
        oldValue: null,
        newValue: suggestedDecor,
        reason: `Mélaminé sans décor - déduit par le nom`
      });
    }
  }

  const decorFixes = allFixes.filter(f => f.field === 'decorCategory');
  console.log(`  Trouvé: ${decorFixes.length} mélaminés avec décor détectable\n`);
  console.log(`  Restant sans décor: ${melNoDecor.length - decorFixes.length}\n`);

  // =================================================================
  // RÉSUMÉ
  // =================================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('RÉSUMÉ DES CORRECTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const byField: Record<string, number> = {};
  allFixes.forEach(f => {
    const key = `${f.field}: ${f.oldValue || 'NULL'} → ${f.newValue}`;
    byField[key] = (byField[key] || 0) + 1;
  });

  Object.entries(byField)
    .sort((a, b) => b[1] - a[1])
    .forEach(([change, count]) => {
      console.log(`  ${change}: ${count} produits`);
    });

  console.log(`\n📊 Total corrections: ${allFixes.length}`);

  // Afficher quelques exemples
  console.log('\n📋 Exemples de corrections:');
  allFixes.slice(0, 10).forEach(f => {
    console.log(`  [${f.reference}] ${f.name.substring(0, 40)}`);
    console.log(`    ${f.field}: ${f.oldValue || 'NULL'} → ${f.newValue}`);
    console.log(`    Raison: ${f.reason}\n`);
  });

  if (allFixes.length > 10) {
    console.log(`  ... et ${allFixes.length - 10} autres\n`);
  }

  // =================================================================
  // APPLICATION DES CORRECTIONS
  // =================================================================
  if (!DRY_RUN && allFixes.length > 0) {
    console.log('\n🔄 Application des corrections...\n');

    let applied = 0;
    let errors = 0;

    for (const fix of allFixes) {
      try {
        await prisma.panel.update({
          where: { id: fix.id },
          data: { [fix.field]: fix.newValue }
        });
        applied++;
        if (applied % 100 === 0) {
          console.log(`  ${applied}/${allFixes.length} appliqués...`);
        }
      } catch (e) {
        errors++;
        console.error(`  ❌ Erreur [${fix.reference}]:`, (e as Error).message);
      }
    }

    console.log(`\n✅ Corrections appliquées!`);
    console.log(`   - Appliqués: ${applied}`);
    console.log(`   - Erreurs: ${errors}`);
  } else if (DRY_RUN) {
    console.log('\n💡 Pour appliquer ces corrections, exécutez:');
    console.log('   npx tsx scripts/fix-classification-issues.ts --apply\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
