import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeUnclassified() {
  const unclassified = await prisma.cataloguePanel.findMany({
    where: { panelType: null },
    select: { id: true, name: true, manufacturerRef: true, catalogueId: true }
  });

  console.log('=== ' + unclassified.length + ' PANNEAUX NON CLASSIFIES ===\n');

  // Group by patterns
  const patterns: Record<string, Array<{ name: string; ref: string }>> = {};

  for (const p of unclassified) {
    const name = (p.name || '').toLowerCase();
    const ref = (p.manufacturerRef || '').toLowerCase();

    let category = 'AUTRE';

    if (name.includes('plan de travail') || name.includes('pdt') || ref.includes('pdt')) {
      category = 'PLAN_TRAVAIL';
    } else if (name.includes('acoustic') || name.includes('acoustique')) {
      category = 'ACOUSTIQUE';
    } else if (name.includes('tasseau')) {
      category = 'TASSEAU';
    } else if (name.includes('latte') || name.includes('slat') || name.includes('lamelle')) {
      category = 'LATTE';
    } else if (name.includes('astrata')) {
      category = 'ASTRATA';
    } else if (name.includes('tocca')) {
      category = 'TOCCA';
    } else if (name.includes('viroc')) {
      category = 'VIROC';
    } else if (name.includes('tricoya')) {
      category = 'TRICOYA';
    } else if (name.includes('purenit')) {
      category = 'PURENIT';
    } else if (name.includes('kronoart')) {
      category = 'KRONOART';
    } else if (name.includes('kronodesign')) {
      category = 'KRONODESIGN';
    } else if (name.includes('compact') || name.includes('fundermax') || name.includes('polyrey')) {
      category = 'COMPACT';
    } else if (name.includes('chant') || ref.includes('chant')) {
      category = 'CHANT';
    } else if (name.includes('stratifi') || name.includes('hpl')) {
      category = 'STRATIFIE';
    } else if (name.includes('melamin') || name.includes('mélamin')) {
      category = 'MELAMINE';
    } else if (name.includes('mdf')) {
      category = 'MDF';
    } else if (name.includes('contreplaq') || name.includes('ctbx')) {
      category = 'CONTREPLAQUE';
    }

    if (!patterns[category]) patterns[category] = [];
    patterns[category].push({ name: p.name || 'N/A', ref: p.manufacturerRef || 'N/A' });
  }

  // Sort categories by count
  const sortedCategories = Object.entries(patterns).sort((a, b) => b[1].length - a[1].length);

  for (const [cat, items] of sortedCategories) {
    console.log('\n### ' + cat + ' (' + items.length + ' panneaux) ###');
    items.slice(0, 8).forEach(i => {
      console.log('  - ' + i.name.substring(0, 70) + ' [REF: ' + i.ref + ']');
    });
    if (items.length > 8) {
      console.log('  ... et ' + (items.length - 8) + ' autres');
    }
  }

  await prisma.$disconnect();
}

analyzeUnclassified();
