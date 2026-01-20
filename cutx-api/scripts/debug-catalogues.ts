import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Voir tous les catalogues
  const catalogues = await prisma.catalogue.findMany();
  console.log(
    'Catalogues:',
    catalogues.map((c) => `${c.slug} (${c.id})`)
  );

  // Compter les catégories par catalogue
  for (const cat of catalogues) {
    const count = await prisma.category.count({ where: { catalogueId: cat.id } });
    console.log(`Catégories dans ${cat.slug}: ${count}`);
  }

  // Catégories sans catalogueId défini
  const total = await prisma.category.count();
  console.log('Total catégories:', total);
}

main().finally(() => prisma.$disconnect());
