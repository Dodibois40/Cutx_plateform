import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== DÉPLACER LES LATTÉS LÉGERS VERS LEUR CATÉGORIE ===\n');

  const latteLeger = await prisma.category.findFirst({ where: { slug: 'latte-leger' } });

  if (!latteLeger) {
    console.log('Catégorie latte-leger non trouvée');
    return;
  }

  // Trouver les lattés légers
  const lattesLegers = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'latté léger', mode: 'insensitive' } },
        { name: { contains: 'latte leger', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Lattés légers trouvés: ${lattesLegers.length}`);

  // Déplacer
  const result = await prisma.panel.updateMany({
    where: {
      id: { in: lattesLegers.map(p => p.id) }
    },
    data: { categoryId: latteLeger.id }
  });

  console.log(`✓ ${result.count} panneaux déplacés vers "Latté Léger"`);

  // Vérification finale des catégories Latté
  const latteStandard = await prisma.category.findFirst({ where: { slug: 'latte-standard' } });
  const verifyStandard = await prisma.panel.count({ where: { categoryId: latteStandard?.id } });
  const verifyLeger = await prisma.panel.count({ where: { categoryId: latteLeger.id } });

  console.log(`\nCatégories Latté:`);
  console.log(`  Latté Standard: ${verifyStandard} panneaux`);
  console.log(`  Latté Léger: ${verifyLeger} panneaux`);

  await prisma.$disconnect();
}

main().catch(console.error);
