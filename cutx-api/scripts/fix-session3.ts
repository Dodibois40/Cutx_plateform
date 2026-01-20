import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== SESSION 3 - CORRECTIONS ===\n');

  // Récupérer les catégories
  const cats = await prisma.category.findMany({
    where: {
      slug: { in: ['placage-chene', 'placage-pin', 'placages-divers'] }
    }
  });
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  // 1. Querkus avec décor Chêne → placage-chene
  if (catMap['placage-chene']) {
    const querkusChene = await prisma.panel.updateMany({
      where: {
        name: { contains: 'Querkus', mode: 'insensitive' },
        OR: [
          { decor: { contains: 'chêne', mode: 'insensitive' } },
          { decor: { contains: 'chene', mode: 'insensitive' } },
          { material: { contains: 'chêne', mode: 'insensitive' } }
        ],
        categoryId: { not: catMap['placage-chene'] }
      },
      data: { categoryId: catMap['placage-chene'] }
    });
    console.log(`✅ ${querkusChene.count} Querkus chêne → placage-chene`);
  }

  // 2. Latté Pin → placage-pin
  if (catMap['placage-pin']) {
    const lattePin = await prisma.panel.updateMany({
      where: {
        AND: [
          { name: { contains: 'Latté', mode: 'insensitive' } },
          { name: { contains: 'Pin', mode: 'insensitive' } }
        ],
        categoryId: { not: catMap['placage-pin'] }
      },
      data: { categoryId: catMap['placage-pin'] }
    });
    console.log(`✅ ${lattePin.count} Latté Pin → placage-pin`);
  }

  // 3. Vérifier s'il y a d'autres Querkus avec d'autres essences
  const otherQuerkus = await prisma.panel.findMany({
    where: {
      name: { contains: 'Querkus', mode: 'insensitive' },
      categoryId: catMap['placages-divers']
    },
    select: { name: true, decor: true, material: true }
  });

  if (otherQuerkus.length > 0) {
    console.log(`\n⚠️ Autres Querkus encore dans placages-divers: ${otherQuerkus.length}`);
    otherQuerkus.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name} | decor: ${p.decor} | mat: ${p.material}`);
    });
  }

  await prisma.$disconnect();
  console.log('\n✅ Session 3 terminée');
}

fix().catch(console.error);
