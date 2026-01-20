import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mdfStandardCat = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });

  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandardCat?.id },
    select: { reference: true, name: true, productType: true }
  });

  console.log(`Total panneaux dans mdf-standard: ${panels.length}\n`);

  // Analyser les essences présentes
  const essences: Record<string, { count: number; examples: string[] }> = {};

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();
    let essence = 'autres';

    if (name.includes('chêne') || name.includes('chene') || name.includes('oak')) {
      essence = 'chene';
    } else if (name.includes('noyer') || name.includes('walnut')) {
      essence = 'noyer';
    } else if (name.includes('frêne') || name.includes('frene') || name.includes('ash')) {
      essence = 'frene';
    } else if (name.includes('hêtre') || name.includes('hetre') || name.includes('beech')) {
      essence = 'hetre';
    } else if (name.includes('érable') || name.includes('erable') || name.includes('maple')) {
      essence = 'erable';
    } else if (name.includes('merisier') || name.includes('cherry')) {
      essence = 'merisier';
    } else if (name.includes('teck') || name.includes('teak')) {
      essence = 'teck';
    } else if (name.includes('wengé') || name.includes('wenge')) {
      essence = 'wenge';
    } else if (name.includes('pin')) {
      essence = 'pin';
    } else if (name.includes('peuplier') || name.includes('poplar')) {
      essence = 'peuplier';
    } else if (name.includes('orme') || name.includes('elm')) {
      essence = 'orme';
    } else if (name.includes('acacia')) {
      essence = 'acacia';
    } else if (name.includes('bambou') || name.includes('bamboo')) {
      essence = 'bambou';
    }

    if (!essences[essence]) {
      essences[essence] = { count: 0, examples: [] };
    }
    essences[essence].count++;
    if (essences[essence].examples.length < 3) {
      essences[essence].examples.push(`${p.reference}: ${p.name?.substring(0, 50)}`);
    }
  }

  // Trier par count
  const sorted = Object.entries(essences).sort((a, b) => b[1].count - a[1].count);

  console.log('=== DISTRIBUTION PAR ESSENCE ===\n');
  for (const [essence, data] of sorted) {
    console.log(`📁 ${essence}: ${data.count} panneaux`);
    for (const ex of data.examples) {
      console.log(`   └─ ${ex}`);
    }
    console.log('');
  }

  // Analyser aussi les types (MDF replaqué vs Aggloméré replaqué)
  const types: Record<string, number> = {};
  for (const p of panels) {
    const name = (p.name || '').toLowerCase();
    if (name.includes('aggloméré') || name.includes('agglomere')) {
      types['Aggloméré replaqué'] = (types['Aggloméré replaqué'] || 0) + 1;
    } else if (name.includes('mdf replaqué') || name.includes('mdf replaque')) {
      types['MDF replaqué'] = (types['MDF replaqué'] || 0) + 1;
    } else {
      types['Autre'] = (types['Autre'] || 0) + 1;
    }
  }

  console.log('=== TYPES DE SUPPORT ===\n');
  for (const [type, count] of Object.entries(types)) {
    console.log(`${type}: ${count}`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
