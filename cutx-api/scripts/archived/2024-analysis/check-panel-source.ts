import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSource() {
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-PDT-86600' },
    include: {
      catalogue: true,
    }
  });

  if (!panel) {
    console.log('Panel not found!');
    return;
  }

  console.log('\n=== SOURCE INFO ===');
  console.log('Catalogue:', panel.catalogue.name);
  console.log('Catalogue slug:', panel.catalogue.slug);
  console.log('Created at:', panel.createdAt);
  console.log('Updated at:', panel.updatedAt);
  console.log('\n=== METADATA ===');
  if (panel.metadata) {
    try {
      const meta = JSON.parse(panel.metadata);
      console.log(JSON.stringify(meta, null, 2));
    } catch {
      console.log('Raw metadata:', panel.metadata);
    }
  } else {
    console.log('No metadata');
  }
  
  // Chercher d'autres panels Bouney pour comparer
  console.log('\n=== AUTRES PANELS BOUNEY (échantillon) ===');
  const otherPanels = await prisma.panel.findMany({
    where: {
      catalogueId: panel.catalogueId,
      manufacturerRef: { not: null }
    },
    take: 3,
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      supplierCode: true,
      decorCode: true,
    }
  });
  
  otherPanels.forEach(p => {
    console.log(`\n${p.reference}:`);
    console.log('  Manufacturer Ref:', p.manufacturerRef);
    console.log('  Supplier Code:', p.supplierCode);
    console.log('  Decor Code:', p.decorCode);
  });
}

checkSource()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
