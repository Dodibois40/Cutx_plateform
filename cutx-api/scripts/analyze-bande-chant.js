/**
 * Analyse des BANDE_DE_CHANT sans panelSubType
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ANALYSE BANDE_DE_CHANT SANS SUBTYPE ===\n');

  const bandesChant = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      categoryId: null,
      panelSubType: null
    },
    select: { id: true, name: true, reference: true, decorCategory: true, description: true }
  });

  console.log(`Total: ${bandesChant.length}\n`);

  // Analyser par mots-clés
  const categories = {
    'melamine': [], // Contient "mélaminé" ou "méla"
    'bois': [],     // Contient "bois véritable" ou essence
    'pvc': [],      // Contient "PVC"
    'abs': [],      // Contient "ABS"
    'contreplaque': [], // Mal catégorisé - "Panneau Contreplaqué" ?!
    'other': []
  };

  for (const panel of bandesChant) {
    const text = (panel.name + ' ' + (panel.description || '')).toLowerCase();

    if (text.includes('contreplaqué') || text.includes('contreplaque')) {
      categories.contreplaque.push(panel);
    } else if (text.includes('méla') || text.includes('mela') || text.includes('mélaminé')) {
      categories.melamine.push(panel);
    } else if (text.includes('bois véritable') || text.includes('bois veritable')) {
      categories.bois.push(panel);
    } else if (text.includes('pvc')) {
      categories.pvc.push(panel);
    } else if (text.includes('abs')) {
      categories.abs.push(panel);
    } else {
      categories.other.push(panel);
    }
  }

  // Afficher résultats
  for (const [cat, panels] of Object.entries(categories)) {
    console.log(`\n=== ${cat.toUpperCase()} (${panels.length}) ===`);
    for (const p of panels.slice(0, 5)) {
      console.log(`  ${p.reference}: ${p.name.substring(0, 70)}...`);
    }
    if (panels.length > 5) {
      console.log(`  ... et ${panels.length - 5} autres`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
