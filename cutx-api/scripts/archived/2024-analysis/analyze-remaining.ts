import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: { isActive: true, panelType: null },
    select: {
      reference: true,
      name: true,
      productType: true,
      material: true,
      finish: true,
      defaultThickness: true,
      defaultWidth: true,
      defaultLength: true,
      categoryId: true,
      category: { select: { name: true, slug: true } },
      catalogueId: true,
      catalogue: { select: { name: true } },
      metadata: true,
    },
    take: 20,
  });

  console.log('=== DETAILS DES PANNEAUX NON CLASSIFIES ===');
  console.log('');

  panels.forEach((p, i) => {
    console.log(`${i+1}. ${p.reference} - ${p.name}`);
    console.log(`   Catalogue: ${p.catalogue?.name || 'N/A'}`);
    console.log(`   Category: ${p.category?.name || 'N/A'} (${p.category?.slug || ''})`);
    console.log(`   productType: ${p.productType || 'NULL'}`);
    console.log(`   material: ${p.material || 'NULL'}`);
    console.log(`   finish: ${p.finish || 'NULL'}`);
    console.log(`   Dims: ${p.defaultWidth}x${p.defaultLength} ep.${p.defaultThickness || '?'}mm`);
    if (p.metadata) {
      try {
        const meta = JSON.parse(p.metadata);
        console.log(`   Metadata keys: ${Object.keys(meta).join(', ')}`);
      } catch {}
    }
    console.log('');
  });

  await prisma.$disconnect();
}

main();
