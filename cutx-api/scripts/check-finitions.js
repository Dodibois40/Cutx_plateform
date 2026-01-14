const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get distinct finitions
  const finitions = await prisma.panel.findMany({
    where: { finish: { not: null } },
    select: { finish: true },
    distinct: ['finish'],
    orderBy: { finish: 'asc' }
  });

  console.log('=== FINITIONS ===');
  finitions.forEach(f => console.log(`  '${f.finish}',`));

  // Get distinct decors
  const decors = await prisma.panel.findMany({
    where: { decor: { not: null } },
    select: { decor: true },
    distinct: ['decor'],
    orderBy: { decor: 'asc' }
  });

  console.log('\n=== DECORS ===');
  decors.slice(0, 50).forEach(d => console.log(`  '${d.decor}',`));
  if (decors.length > 50) console.log(`  ... and ${decors.length - 50} more`);
}

main().finally(() => prisma.$disconnect());
