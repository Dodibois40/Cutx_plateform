import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: {
      manufacturerRef: { contains: 'H1180' },
    },
    include: {
      category: {
        include: { parent: true },
      },
    },
  });

  console.log('🔍 Panels H1180 et leur catégorie:\n');
  panels.forEach(p => {
    const cat = p.category?.name || 'Sans catégorie';
    const parent = p.category?.parent?.name || '';
    console.log(`${p.reference}: ${cat} (${parent})`);
    console.log(`  → decor: ${p.decor}, colorChoice: ${p.colorChoice}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
