const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const unclassified = await prisma.panel.findMany({
    where: { panelType: null },
    select: { name: true, manufacturerRef: true }
  });

  const cats = {};
  for (const p of unclassified) {
    const n = (p.name || '').toLowerCase();
    let cat = 'AUTRE';
    if (n.includes('plan de travail') || n.includes('pdt ')) cat = 'PLAN_TRAVAIL';
    else if (n.includes('acoustic') || n.includes('acoustique')) cat = 'ACOUSTIQUE';
    else if (n.includes('tasseau')) cat = 'TASSEAU';
    else if (n.includes('latte') || n.includes('slat') || n.includes('lamelle')) cat = 'LATTE';
    else if (n.includes('astrata')) cat = 'ASTRATA';
    else if (n.includes('tocca')) cat = 'TOCCA';
    else if (n.includes('viroc')) cat = 'VIROC';
    else if (n.includes('tricoya')) cat = 'TRICOYA';
    else if (n.includes('purenit')) cat = 'PURENIT';
    else if (n.includes('kronoart')) cat = 'KRONOART';
    else if (n.includes('compact')) cat = 'COMPACT';
    else if (n.includes('chant')) cat = 'CHANT';

    if (!cats[cat]) cats[cat] = [];
    cats[cat].push({ name: p.name, ref: p.manufacturerRef });
  }

  console.log('=== ANALYSE DES ' + unclassified.length + ' PANNEAUX NON CLASSIFIES ===');
  Object.entries(cats).sort((a,b) => b[1].length - a[1].length).forEach(([c, items]) => {
    console.log('\n' + c + ' (' + items.length + '):');
    items.slice(0,8).forEach(i => console.log('  - ' + (i.name || 'N/A').substring(0, 70) + ' [' + (i.ref || '') + ']'));
    if (items.length > 8) console.log('  ... +' + (items.length - 8) + ' autres');
  });

  prisma.$disconnect();
}
run();
