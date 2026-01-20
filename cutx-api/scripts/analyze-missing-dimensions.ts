/**
 * Analyse des dimensions manquantes - distingue chants vs panneaux
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const catalogue = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });

  if (!catalogue) {
    console.log('Catalogue Bouney non trouvé');
    return;
  }

  // Récupérer tous les produits avec dimensions manquantes
  const allMissing = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      defaultLength: 0
    },
    select: {
      reference: true,
      name: true,
      panelType: true,
      productType: true,
      defaultThickness: true,
      pricePerM2: true,
      pricePerMl: true
    }
  });

  // Séparer chants et panneaux
  const chants = allMissing.filter(p =>
    p.reference.includes('CHANT') ||
    p.panelType === 'CHANT' ||
    p.panelType === 'BANDE_DE_CHANT' ||
    p.name.toLowerCase().includes('chant ')
  );

  const panels = allMissing.filter(p =>
    !p.reference.includes('CHANT') &&
    p.panelType !== 'CHANT' &&
    p.panelType !== 'BANDE_DE_CHANT' &&
    !p.name.toLowerCase().includes('chant ')
  );

  console.log('📊 ANALYSE DES DIMENSIONS MANQUANTES:');
  console.log('='.repeat(60));
  console.log(`Total avec defaultLength=0: ${allMissing.length}`);
  console.log(`Chants (normal - vendus au ml): ${chants.length}`);
  console.log(`Panneaux (problème): ${panels.length}`);

  // Analyser les panneaux par type
  console.log('\n📂 PANNEAUX PAR TYPE:');
  const byType = new Map<string, number>();
  for (const p of panels) {
    const type = p.panelType || p.productType || 'UNKNOWN';
    byType.set(type, (byType.get(type) || 0) + 1);
  }
  for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }

  console.log('\n🔍 PANNEAUX SANS DIMENSIONS (premiers 40):');
  for (const p of panels.slice(0, 40)) {
    const type = p.panelType || p.productType || '?';
    const price = p.pricePerM2 ? `${p.pricePerM2}€/m²` : (p.pricePerMl ? `${p.pricePerMl}€/ml` : 'N/A');
    console.log(`   ${p.reference.padEnd(20)} | ${type.padEnd(15)} | ${price.padEnd(10)} | ${p.name.substring(0, 40)}`);
  }

  // Vérifier si certains ont des prix au m² (donc devraient avoir des dimensions)
  const panelsWithM2Price = panels.filter(p => p.pricePerM2 && p.pricePerM2 > 0);
  console.log(`\n⚠️  Panneaux avec prix/m² mais sans dimensions: ${panelsWithM2Price.length}`);

  if (panelsWithM2Price.length > 0) {
    console.log('\n🔴 CES PANNEAUX DEVRAIENT AVOIR DES DIMENSIONS:');
    for (const p of panelsWithM2Price.slice(0, 20)) {
      console.log(`   ${p.reference} | ${p.pricePerM2}€/m² | ${p.name.substring(0, 50)}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
