import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CORRECTION DU CLASSEMENT LATTÉ ===\n');

  // Les panneaux "5 plis" avec âme bois (Épicéa, Peuplier) sont des lattés STANDARD
  // Les lattés "léger" sont ceux avec âme alvéolaire ou HDF

  const latteStandard = await prisma.category.findFirst({ where: { slug: 'latte-standard' } });
  const latteLeger = await prisma.category.findFirst({ where: { slug: 'latte-leger' } });

  if (!latteStandard || !latteLeger) {
    console.log('Catégories non trouvées');
    return;
  }

  // Tous les 6 panneaux LATTE actuels sont des lattés STANDARD (âme bois massif)
  const lattePanels = await prisma.panel.findMany({
    where: { productType: 'LATTE' }
  });

  console.log(`Panneaux LATTE trouvés: ${lattePanels.length}`);

  // Déplacer tous vers Latté Standard
  const result = await prisma.panel.updateMany({
    where: { productType: 'LATTE' },
    data: { categoryId: latteStandard.id }
  });

  console.log(`✓ ${result.count} panneaux déplacés vers "Latté Standard"`);

  // Vérification
  const verifyStandard = await prisma.panel.count({ where: { categoryId: latteStandard.id } });
  const verifyLeger = await prisma.panel.count({ where: { categoryId: latteLeger.id } });

  console.log(`\nVérification:`);
  console.log(`  Latté Standard: ${verifyStandard} panneaux`);
  console.log(`  Latté Léger: ${verifyLeger} panneaux`);

  // Chercher les vrais lattés légers (ceux avec âme HDF ou alvéolaire)
  console.log('\n--- RECHERCHE DES VRAIS LATTÉS LÉGERS ---');
  const lattesLegers = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'latté léger', mode: 'insensitive' } },
        { name: { contains: 'latte leger', mode: 'insensitive' } }
      ]
    },
    include: { category: { select: { name: true, slug: true } } }
  });

  if (lattesLegers.length > 0) {
    console.log(`\nVrais lattés légers trouvés: ${lattesLegers.length}`);
    for (const p of lattesLegers) {
      console.log(`  ${p.reference} | ${p.name?.substring(0, 50)} | cat=${p.category?.slug}`);
    }
  } else {
    console.log('Aucun vrai latté léger trouvé (peut-être classés comme alvéolaires)');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
