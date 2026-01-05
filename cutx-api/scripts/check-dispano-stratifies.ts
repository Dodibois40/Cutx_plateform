import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dispano = await prisma.catalogue.findFirst({ where: { slug: 'dispano' } });

  if (!dispano) {
    console.log('Catalogue Dispano non trouvé');
    return;
  }

  // Tous les stratifiés
  const stratifies = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      productType: 'STRATIFIE'
    },
    select: { reference: true, name: true, pricePerM2: true }
  });

  console.log('═'.repeat(60));
  console.log('📊 STRATIFIÉS DISPANO EN BASE');
  console.log('═'.repeat(60));
  console.log(`\nTotal: ${stratifies.length}\n`);

  stratifies.forEach(s => {
    const price = s.pricePerM2 ? `${s.pricePerM2}€` : 'N/A';
    console.log(`  [${s.reference}]`);
    console.log(`     ${(s.name || '').substring(0, 55)}`);
    console.log(`     Prix: ${price}/m²`);
  });

  // Aussi chercher par nom
  const byName = await prisma.panel.count({
    where: {
      catalogueId: dispano.id,
      OR: [
        { name: { contains: 'stratifi', mode: 'insensitive' } },
        { name: { contains: 'HPL', mode: 'insensitive' } },
      ]
    }
  });

  console.log(`\n📌 Produits contenant "stratifi" ou "HPL" dans le nom: ${byName}`);

  await prisma.$disconnect();
}

main().catch(console.error);
