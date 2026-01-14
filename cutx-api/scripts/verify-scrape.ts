import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const bouney = await prisma.catalogue.findFirst({ where: { slug: 'bouney' } });
  if (!bouney) {
    console.log('Catalogue not found');
    return;
  }

  // Total count
  const total = await prisma.panel.count({ where: { catalogueId: bouney.id } });
  console.log('Total Bouney panels:', total);

  // Recently updated (last 5 minutes)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      updatedAt: { gte: fiveMinAgo }
    }
  });
  console.log('Updated in last 5 min:', recent);

  // Sample some products
  console.log('\nSample updated products:');
  const samples = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      updatedAt: { gte: fiveMinAgo }
    },
    take: 5,
    orderBy: { updatedAt: 'desc' },
    select: {
      reference: true,
      name: true,
      productType: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      pricePerM2: true,
      stockStatus: true,
    }
  });

  samples.forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.reference}`);
    console.log(`    Name: ${p.name?.substring(0, 50)}`);
    console.log(`    Type: ${p.productType}`);
    console.log(`    Dimensions: ${p.defaultLength}x${p.defaultWidth}x${p.defaultThickness}mm`);
    console.log(`    Price: ${p.pricePerM2}€/m² | Stock: ${p.stockStatus}`);
  });

  // Check 79155 is still there
  console.log('\n\nVerifying BCB-79155...');
  const p79155 = await prisma.panel.findFirst({
    where: { reference: 'BCB-79155' },
    select: { reference: true, name: true, pricePerM2: true }
  });
  console.log(p79155 ? '✅ BCB-79155 still exists' : '❌ BCB-79155 NOT FOUND');

  await prisma.$disconnect();
}
main().catch(console.error);
