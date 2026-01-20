import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-ESS-82945' },
    include: { catalogue: true }
  });

  if (panel) {
    console.log('=== DÉTAILS QUERKUS ===');
    console.log('Nom:', panel.name);
    console.log('Référence:', panel.reference);
    console.log('Catalogue:', panel.catalogue?.name);
    console.log('Description:', panel.description);
    console.log('Épaisseurs:', panel.thickness);
    console.log('productType:', panel.productType);
    console.log('decorCategory:', panel.decorCategory);
    // Afficher tous les champs pour voir ce qu'on a
    console.log('\n=== TOUS LES CHAMPS ===');
    Object.keys(panel).forEach(key => {
      const val = (panel as Record<string, unknown>)[key];
      if (val && key !== 'catalogue') {
        console.log(`${key}: ${JSON.stringify(val).substring(0, 100)}`);
      }
    });
  } else {
    console.log('Panel non trouvé');
  }

  await prisma.$disconnect();
}

main();
