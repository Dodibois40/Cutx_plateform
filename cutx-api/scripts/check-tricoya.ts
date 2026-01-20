import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher tous les Tricoya
  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'tricoya', mode: 'insensitive' } },
        { name: { contains: 'infinite', mode: 'insensitive' } },
        { name: { contains: 'extérieur', mode: 'insensitive' } },
        { name: { contains: 'exterior', mode: 'insensitive' } },
      ]
    },
    include: { category: { select: { slug: true, name: true } } }
  });

  console.log('=== Panneaux Tricoya/Extérieur trouvés ===');
  console.log(`Total: ${panels.length}\n`);

  for (const p of panels) {
    console.log(`${p.reference}`);
    console.log(`   Nom: ${(p.name || '').substring(0, 60)}`);
    console.log(`   Catégorie: ${p.category?.slug || 'AUCUNE'} (${p.category?.name || ''})`);
    console.log(`   ProductType: ${p.productType}`);
    console.log('');
  }

  // Chercher les catégories spéciales/extérieur
  const specialCats = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'special' } },
        { slug: { contains: 'exterieur' } },
        { slug: { contains: 'exterior' } },
      ]
    },
    select: { id: true, slug: true, name: true }
  });

  console.log('=== Catégories spéciales disponibles ===');
  for (const c of specialCats) {
    console.log(`   ${c.slug}: ${c.name} [${c.id}]`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
