import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher tous les GreenPanel
  const greenPanels = await prisma.panel.findMany({
    where: {
      name: { contains: 'green', mode: 'insensitive' }
    },
    include: { category: { select: { slug: true, name: true } } }
  });

  console.log('=== Panneaux GreenPanel trouvés ===');
  console.log(`Total: ${greenPanels.length}`);

  for (const p of greenPanels) {
    console.log('');
    console.log(p.reference);
    console.log(`  Nom: ${(p.name || '').substring(0, 60)}`);
    console.log(`  Catégorie: ${p.category?.slug || 'AUCUNE'} (${p.category?.name || ''})`);
    console.log(`  ProductType: ${p.productType}`);
  }

  // Vérifier la catégorie panneaux-alveolaires
  const alveolaire = await prisma.category.findFirst({
    where: { slug: 'panneaux-alveolaires' },
    include: { children: { select: { slug: true, name: true } } }
  });

  console.log('');
  console.log('=== Catégorie panneaux-alveolaires ===');
  if (alveolaire) {
    console.log(`${alveolaire.slug}: ${alveolaire.name} [${alveolaire.id}]`);
    if (alveolaire.children.length > 0) {
      for (const c of alveolaire.children) {
        console.log(`  └─ ${c.slug}: ${c.name}`);
      }
    } else {
      console.log('  (pas de sous-catégories)');
    }
  } else {
    console.log('NON TROUVÉE');
  }

  await prisma.$disconnect();
}
main().catch(console.error);
