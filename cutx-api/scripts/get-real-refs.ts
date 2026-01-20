import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: {
      isActive: true,
      name: {
        not: {
          startsWith: 'Panneau'
        }
      }
    },
    include: {
      category: { select: { name: true, slug: true } },
    },
    take: 200
  });

  const shuffled = panels.sort(() => Math.random() - 0.5).slice(0, 10);

  console.log('=== 10 VRAIES RÉFÉRENCES ===\n');

  for (let i = 0; i < shuffled.length; i++) {
    const p = shuffled[i];
    console.log(`#${i+1} | ${p.name}`);
    console.log(`    Réf: ${p.reference}`);
    console.log(`    Catégorie actuelle: ${p.category?.slug}`);
    console.log(`    productType: ${p.productType} | decorCategory: ${p.decorCategory || '-'}`);
    console.log(`    Hydrofuge: ${p.isHydrofuge ? 'OUI' : 'non'} | Ignifuge: ${p.isIgnifuge ? 'OUI' : 'non'}`);
    console.log('');
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
