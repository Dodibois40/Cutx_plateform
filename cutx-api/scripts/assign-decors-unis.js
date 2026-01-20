/**
 * ASSIGNATION DECORS-UNIS - Fenix vers fenix, reste dans parent
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== ASSIGNATION DECORS-UNIS ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'decors-unis' } });
  const fenixCat = await p.category.findFirst({ where: { slug: 'fenix' } });

  console.log('Seule sous-catégorie: fenix');

  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { id: true, name: true }
  });

  console.log('Total: ' + panels.length + '\n');

  const fenixIds = [];
  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    if (text.includes('fenix')) {
      fenixIds.push(panel.id);
    }
  }

  console.log('Fenix identifiés: ' + fenixIds.length);
  console.log('Restent dans parent: ' + (panels.length - fenixIds.length));

  // Assigner Fenix
  if (fenixIds.length > 0 && fenixCat) {
    await p.panel.updateMany({
      where: { id: { in: fenixIds } },
      data: { categoryId: fenixCat.id }
    });
    console.log('\nOK fenix: ' + fenixIds.length);
  }

  const remaining = await p.panel.count({ where: { categoryId: cat.id } });
  console.log('Restant dans decors-unis: ' + remaining);

  await p.$disconnect();
}

main().catch(console.error);
