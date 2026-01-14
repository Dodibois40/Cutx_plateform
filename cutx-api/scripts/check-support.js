const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const supports = await prisma.panel.findMany({
    where: { supportQuality: { not: null } },
    select: { supportQuality: true },
    distinct: ['supportQuality'],
    orderBy: { supportQuality: 'asc' }
  });

  console.log('=== SUPPORT QUALITY ===');
  supports.forEach(s => console.log(`  '${s.supportQuality}',`));
  console.log('\nTotal:', supports.length);
}

main().finally(() => prisma.$disconnect());
