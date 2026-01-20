import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== ANALYSE ET ORGANISATION DES PANNEAUX LATTÉ ===\n');

  // 1. Trouver tous les panneaux avec productType LATTE
  const lattePanels = await prisma.panel.findMany({
    where: { productType: 'LATTE' },
    include: { category: { select: { name: true, slug: true } } }
  });

  console.log(`Panneaux productType=LATTE: ${lattePanels.length}`);
  for (const p of lattePanels) {
    console.log(`  ${p.reference} | ${p.name?.substring(0, 60)}`);
    console.log(`    Catégorie actuelle: ${p.category?.name} (${p.category?.slug})`);
  }

  // 2. Analyser où ils devraient aller
  console.log('\n--- ANALYSE DU CLASSEMENT ---');

  // Trouver les catégories Latté
  const latteStandard = await prisma.category.findFirst({ where: { slug: 'latte-standard' } });
  const latteLeger = await prisma.category.findFirst({ where: { slug: 'latte-leger' } });

  if (!latteStandard || !latteLeger) {
    console.log('Catégories latte-standard ou latte-leger non trouvées');
    return;
  }

  // Classifier les panneaux
  const toLatteStandard: typeof lattePanels = [];
  const toLatteLeger: typeof lattePanels = [];

  for (const p of lattePanels) {
    const nameLower = (p.name || '').toLowerCase();

    // Latté léger = avec âme légère ou faces HDF
    if (nameLower.includes('léger') || nameLower.includes('leger') ||
        nameLower.includes('hdf') || nameLower.includes('alvéolaire')) {
      toLatteLeger.push(p);
    } else {
      // Par défaut = standard
      toLatteStandard.push(p);
    }
  }

  console.log(`\nClassification proposée:`);
  console.log(`  Latté Standard: ${toLatteStandard.length}`);
  for (const p of toLatteStandard) {
    console.log(`    ${p.reference} | ${p.name?.substring(0, 50)}`);
  }

  console.log(`  Latté Léger: ${toLatteLeger.length}`);
  for (const p of toLatteLeger) {
    console.log(`    ${p.reference} | ${p.name?.substring(0, 50)}`);
  }

  // 3. Appliquer la classification
  console.log('\n--- APPLICATION DES CORRECTIONS ---');

  if (toLatteStandard.length > 0) {
    await prisma.panel.updateMany({
      where: { id: { in: toLatteStandard.map(p => p.id) } },
      data: { categoryId: latteStandard.id }
    });
    console.log(`✓ ${toLatteStandard.length} panneaux → Latté Standard`);
  }

  if (toLatteLeger.length > 0) {
    await prisma.panel.updateMany({
      where: { id: { in: toLatteLeger.map(p => p.id) } },
      data: { categoryId: latteLeger.id }
    });
    console.log(`✓ ${toLatteLeger.length} panneaux → Latté Léger`);
  }

  // 4. Vérification
  console.log('\n--- VÉRIFICATION ---');
  const verifyStandard = await prisma.panel.count({ where: { categoryId: latteStandard.id } });
  const verifyLeger = await prisma.panel.count({ where: { categoryId: latteLeger.id } });
  console.log(`Latté Standard: ${verifyStandard} panneaux`);
  console.log(`Latté Léger: ${verifyLeger} panneaux`);

  await prisma.$disconnect();
}

main().catch(console.error);
