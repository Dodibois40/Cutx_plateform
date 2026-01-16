import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const chants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB' },
      panelType: 'CHANT',
      OR: [
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'chene', mode: 'insensitive' } },
        { name: { contains: 'oak', mode: 'insensitive' } },
      ]
    },
    select: { reference: true, stockStatus: true, name: true }
  });

  const enStock = chants.filter(c => c.stockStatus === 'EN STOCK');
  const surCommande = chants.filter(c => c.stockStatus === 'Sur commande');

  console.log('\n=== CHANTS BCB CHÊNE PAR STOCK ===\n');
  console.log(`Total: ${chants.length}`);
  console.log(`EN STOCK: ${enStock.length}`);
  console.log(`Sur commande: ${surCommande.length}`);

  console.log('\n--- EN STOCK ---');
  enStock.forEach(c => console.log(`  [${c.reference}] ${c.name.substring(0, 50)}`));

  console.log('\n--- Sur commande ---');
  surCommande.forEach(c => console.log(`  [${c.reference}] ${c.name.substring(0, 50)}`));

  await prisma.$disconnect();
}

main().catch(console.error);
