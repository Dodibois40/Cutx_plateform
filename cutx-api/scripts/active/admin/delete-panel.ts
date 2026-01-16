import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ref = process.argv[2];

async function main() {
  if (!ref) {
    console.log('Usage: npx tsx scripts/delete-panel.ts <reference>');
    process.exit(1);
  }

  const panel = await prisma.panel.findFirst({
    where: { reference: ref },
    select: { id: true, reference: true, name: true }
  });

  if (panel) {
    console.log('Suppression de:', panel.reference);
    console.log('Nom:', panel.name.substring(0, 60));
    await prisma.panel.delete({ where: { id: panel.id } });
    console.log('✓ Produit supprimé');
  } else {
    console.log('❌ Produit non trouvé:', ref);
  }

  await prisma.$disconnect();
}

main();
