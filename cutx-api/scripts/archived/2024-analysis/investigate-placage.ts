/**
 * Investigate placage thickness issues and panels without productType
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check placage with huge thickness (> 50mm) - likely width stored as thickness
  console.log('=== PLACAGES avec épaisseur > 50mm ===\n');
  const placages = await prisma.panel.findMany({
    where: {
      productType: 'PLACAGE',
      defaultThickness: { gt: 50 }
    },
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultThickness: true,
      defaultWidth: true,
      defaultLength: true,
    },
    take: 10
  });

  console.log(`Found ${placages.length} placages with thickness > 50mm\n`);

  placages.forEach(p => {
    console.log('Ref:', p.reference);
    console.log('  Name:', p.name.substring(0, 100));
    console.log('  Thickness:', JSON.stringify(p.thickness), 'Default:', p.defaultThickness);
    console.log('  Width:', p.defaultWidth, 'Length:', p.defaultLength);
    console.log('');
  });

  // Check total count
  const count = await prisma.panel.count({
    where: {
      productType: 'PLACAGE',
      defaultThickness: { gt: 50 }
    }
  });
  console.log('Total placages with thickness > 50mm:', count);

  // Check panels without productType
  console.log('\n\n=== PANNEAUX SANS PRODUCTTYPE ===\n');
  const noProductType = await prisma.panel.findMany({
    where: { productType: null, isActive: true },
    select: {
      reference: true,
      name: true,
      catalogue: { select: { name: true } },
    },
    take: 20
  });

  console.log(`Found ${noProductType.length}+ panels without productType:\n`);
  noProductType.forEach(p => {
    console.log(`[${p.catalogue.name}] ${p.reference}: ${p.name.substring(0, 60)}...`);
  });

  // Group by catalogue
  const bycat = await prisma.panel.groupBy({
    by: ['catalogueId'],
    where: { productType: null },
    _count: { id: true }
  });
  console.log('\n\nBy catalogue:');
  const cats = await prisma.catalogue.findMany({ select: { id: true, name: true } });
  const catMap = new Map(cats.map(c => [c.id, c.name]));
  bycat.forEach(b => {
    console.log(`  ${catMap.get(b.catalogueId)}: ${b._count.id}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
