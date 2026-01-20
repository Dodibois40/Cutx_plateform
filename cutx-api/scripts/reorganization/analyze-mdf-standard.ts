/**
 * Analyze MDF Standard panels for data quality issues
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═══ ANALYSE DES PANNEAUX MDF-STANDARD ═══\n');

  const panels = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      category: { slug: 'mdf-standard' }
    },
    include: {
      category: { select: { slug: true } },
      catalogue: { select: { name: true } }
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`Total panneaux mdf-standard: ${panels.length}\n`);

  // Analyser les problèmes
  let noImage = 0;
  let noDesc = 0;
  let genericName = 0;
  const byCatalogue: Record<string, number> = {};

  console.log('Échantillon (20 premiers):');
  console.log('-'.repeat(100));

  for (const p of panels.slice(0, 20)) {
    const hasImage = p.imageUrl ? '✓' : '✗';
    const hasDesc = p.description ? '✓' : '✗';
    const isGeneric = (p.name || '').includes('Panneau Standard') ? '⚠️' : '  ';
    console.log(`${isGeneric} ${p.reference.padEnd(18)} | Img:${hasImage} Desc:${hasDesc} | ${(p.name || 'NULL').substring(0, 50)}`);
  }

  console.log('-'.repeat(100));
  console.log('');

  // Compter les problèmes
  for (const p of panels) {
    if (!p.imageUrl) noImage++;
    if (!p.description) noDesc++;
    if ((p.name || '').includes('Panneau Standard')) genericName++;

    const catName = p.catalogue?.name || 'UNKNOWN';
    byCatalogue[catName] = (byCatalogue[catName] || 0) + 1;
  }

  console.log('═══ STATISTIQUES ═══\n');
  console.log(`  Total: ${panels.length}`);
  console.log(`  Sans image: ${noImage} (${((noImage/panels.length)*100).toFixed(1)}%)`);
  console.log(`  Sans description: ${noDesc} (${((noDesc/panels.length)*100).toFixed(1)}%)`);
  console.log(`  Nom générique "Panneau Standard": ${genericName} (${((genericName/panels.length)*100).toFixed(1)}%)`);

  console.log('\n═══ PAR CATALOGUE ═══\n');
  for (const [cat, count] of Object.entries(byCatalogue).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  // Lister les panneaux avec noms génériques
  const genericPanels = panels.filter(p => (p.name || '').includes('Panneau Standard'));

  if (genericPanels.length > 0) {
    console.log('\n═══ PANNEAUX AVEC NOM GÉNÉRIQUE ═══\n');
    for (const p of genericPanels) {
      console.log(`  ${p.reference}: ${p.name}`);
      console.log(`    Dimensions: ${p.width || '?'} x ${p.length || '?'} x ${p.thickness || '?'}mm`);
      console.log(`    Catalogue: ${p.catalogue?.name}`);
      console.log('');
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
