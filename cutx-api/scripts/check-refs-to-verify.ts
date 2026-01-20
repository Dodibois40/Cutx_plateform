import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: { verificationNote: { not: null } },
    select: {
      id: true,
      reference: true,
      name: true,
      verificationNote: true,
      thickness: true,
      defaultLength: true,
      defaultWidth: true,
      pricePerM2: true,
      productType: true,
      material: true,
      imageUrl: true,
      catalogue: { select: { slug: true, name: true } },
      category: { select: { name: true, slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  console.log('=== PANELS TO VERIFY ===');
  console.log('Count:', panels.length);
  console.log('');

  for (const p of panels) {
    console.log('---');
    console.log('ID:', p.id);
    console.log('Ref:', p.reference);
    console.log('Name:', p.name);
    console.log('Note:', p.verificationNote);
    console.log('Type:', p.productType);
    console.log('Material:', p.material);
    console.log('Thickness:', p.thickness);
    console.log('Dimensions:', p.defaultLength, 'x', p.defaultWidth);
    console.log('Price/m2:', p.pricePerM2);
    console.log('Image:', p.imageUrl ? 'Yes' : 'No');
    console.log('Catalogue:', p.catalogue?.name);
    console.log('Category:', p.category?.name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
