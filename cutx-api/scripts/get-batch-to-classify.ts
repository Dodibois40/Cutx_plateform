import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getBatch(offset: number = 0, limit: number = 100) {
  const panels = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: null, // Not yet classified
    },
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      manufacturerRef: true,
      finish: true,
      material: true,
      defaultThickness: true,
      catalogue: { select: { name: true } },
    },
    orderBy: [
      { manufacturerRef: 'asc' }, // Prioritize those with manufacturer ref
      { name: 'asc' },
    ],
    skip: offset,
    take: limit,
  });

  console.log(`=== BATCH ${offset / limit + 1} (${offset + 1} - ${offset + panels.length}) ===\n`);

  panels.forEach((p, i) => {
    console.log(`${offset + i + 1}. [${p.reference}] ${p.name}`);
    console.log(`   Type: ${p.productType} | Ref: ${p.manufacturerRef || '-'} | Finish: ${p.finish || '-'} | Ép: ${p.defaultThickness}mm | ${p.catalogue.name}`);
    console.log('');
  });

  await prisma.$disconnect();
}

const offset = parseInt(process.argv[2] || '0');
getBatch(offset, 100).catch(console.error);
