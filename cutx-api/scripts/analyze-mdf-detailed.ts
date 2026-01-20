import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PanelGroup = 'VRAI_MDF_STANDARD' | 'MDF_REPLAQUE' | 'AGGLOMERE_REPLAQUE' | 'MELAMINE' | 'SPECIAL' | 'INCONNU';

interface AnalyzedPanel {
  reference: string;
  name: string;
  group: PanelGroup;
  targetCategory?: string;
  targetProductType?: string;
  essence?: string;
}

async function main() {
  const mdfStandardCat = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });

  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandardCat?.id },
    select: { reference: true, name: true, productType: true }
  });

  console.log(`Total panneaux dans mdf-standard: ${panels.length}\n`);

  const analyzed: AnalyzedPanel[] = [];

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();
    let result: AnalyzedPanel = {
      reference: p.reference,
      name: p.name || '',
      group: 'INCONNU'
    };

    // 1. MDF mélaminé → MELAMINE
    if (name.includes('mélamine') || name.includes('melamine')) {
      result.group = 'MELAMINE';
      if (name.includes('blanc')) {
        result.targetCategory = 'unis-blanc';
      } else {
        result.targetCategory = 'decors-unis';
      }
      result.targetProductType = 'MELAMINE';
    }
    // 2. Aggloméré replaqué → Panneaux plaqués (productType: PARTICULE)
    else if (name.includes('aggloméré') || name.includes('agglomere')) {
      result.group = 'AGGLOMERE_REPLAQUE';
      result.targetProductType = 'PARTICULE';
      result.essence = detectEssence(name);
      result.targetCategory = `plaque-${result.essence}`;
    }
    // 3. MDF replaqué → Panneaux plaqués (productType: MDF)
    else if (name.includes('replaqué') || name.includes('replaque')) {
      result.group = 'MDF_REPLAQUE';
      result.essence = detectEssence(name);
      result.targetCategory = `plaque-${result.essence}`;
    }
    // 4. Fibraform Natur (MDF avec placage naturel) → Panneaux plaqués
    else if (name.includes('fibraform') && name.includes('natur')) {
      result.group = 'MDF_REPLAQUE';
      result.essence = detectEssence(name);
      result.targetCategory = `plaque-${result.essence}`;
    }
    // 5. Vrais MDF standard (Mediland, MDF NEXT, Medium, etc.)
    else if (
      name.includes('mediland') ||
      name.includes('mdf next') ||
      name.includes('medium') ||
      name.includes('mdf brut') ||
      name.includes('panneau de mdf') ||
      name.includes('fibrabel') ||
      name.includes('fibralux') === false && name.includes('fibra') ||
      /^mdf\s+\d+/.test(name) // "MDF 19 mm..."
    ) {
      result.group = 'VRAI_MDF_STANDARD';
      // Vérifier s'il devrait être dans une autre catégorie MDF
      if (name.includes('hydrofuge') || name.includes(' mh ') || name.includes('ctbh')) {
        result.targetCategory = 'mdf-hydrofuge';
      } else if (name.includes('ignifuge') || name.includes(' m1 ')) {
        result.targetCategory = 'mdf-ignifuge';
      } else if (name.includes('bouche pores') || name.includes(' bp ') || name.includes('lac')) {
        result.targetCategory = 'mdf-a-laquer';
      }
    }
    // 6. Cas spéciaux (fibre, etc.)
    else {
      result.group = 'INCONNU';
    }

    analyzed.push(result);
  }

  // Grouper par catégorie
  const groups: Record<PanelGroup, AnalyzedPanel[]> = {
    'VRAI_MDF_STANDARD': [],
    'MDF_REPLAQUE': [],
    'AGGLOMERE_REPLAQUE': [],
    'MELAMINE': [],
    'SPECIAL': [],
    'INCONNU': []
  };

  for (const a of analyzed) {
    groups[a.group].push(a);
  }

  // Afficher le résumé
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                     ANALYSE DÉTAILLÉE                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const [group, items] of Object.entries(groups)) {
    if (items.length === 0) continue;

    console.log(`\n📁 ${group}: ${items.length} panneaux`);
    console.log('─'.repeat(60));

    for (const item of items.slice(0, 8)) {
      const target = item.targetCategory ? ` → ${item.targetCategory}` : '';
      const type = item.targetProductType ? ` (${item.targetProductType})` : '';
      console.log(`   ${item.reference}`);
      console.log(`      ${item.name.substring(0, 55)}`);
      if (target) console.log(`      🎯 ${target}${type}`);
    }
    if (items.length > 8) {
      console.log(`   ... et ${items.length - 8} autres`);
    }
  }

  // Résumé des actions à faire
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                     ACTIONS À EFFECTUER                        ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const actionsNeeded = analyzed.filter(a => a.targetCategory);
  console.log(`Total à déplacer: ${actionsNeeded.length} panneaux\n`);

  // Par catégorie cible
  const byTarget: Record<string, number> = {};
  for (const a of actionsNeeded) {
    if (a.targetCategory) {
      byTarget[a.targetCategory] = (byTarget[a.targetCategory] || 0) + 1;
    }
  }

  for (const [cat, count] of Object.entries(byTarget).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count} panneaux`);
  }

  console.log(`\nVrais MDF standard à garder: ${groups['VRAI_MDF_STANDARD'].filter(a => !a.targetCategory).length}`);
  console.log(`Inconnus à vérifier manuellement: ${groups['INCONNU'].length}`);

  await prisma.$disconnect();
}

function detectEssence(name: string): string {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chêne') || nameLower.includes('chene') || nameLower.includes('oak')) return 'chene';
  if (nameLower.includes('noyer') || nameLower.includes('walnut')) return 'noyer';
  if (nameLower.includes('frêne') || nameLower.includes('frene') || nameLower.includes('ash')) return 'frene';
  if (nameLower.includes('hêtre') || nameLower.includes('hetre') || nameLower.includes('beech')) return 'hetre';
  if (nameLower.includes('érable') || nameLower.includes('erable') || nameLower.includes('maple')) return 'erable';
  if (nameLower.includes('merisier') || nameLower.includes('cherry')) return 'merisier';
  if (nameLower.includes('teck') || nameLower.includes('teak')) return 'teck';
  if (nameLower.includes('wengé') || nameLower.includes('wenge')) return 'wenge';
  if (nameLower.includes('pin')) return 'pin';

  return 'autres-essences';
}

main().catch(console.error);
