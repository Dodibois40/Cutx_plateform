import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get 10 diverse panels (different productTypes)
  const panels = await prisma.panel.findMany({
    where: {
      reviewStatus: 'NON_VERIFIE',
    },
    take: 20,
    select: {
      id: true,
      name: true,
      reference: true,
      manufacturerRef: true,
      productType: true,
      finish: true,
      material: true,
      decor: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      thickness: true,
      pricePerM2: true,
      pricePerMl: true,
      imageUrl: true,
      catalogue: {
        select: {
          name: true,
        }
      }
    }
  });

  // Get some variety - one of each type
  const seenTypes = new Set<string>();
  const diversePanels = [];

  for (const p of panels) {
    if (!seenTypes.has(p.productType || 'NULL') && diversePanels.length < 10) {
      seenTypes.add(p.productType || 'NULL');
      diversePanels.push(p);
    }
  }

  // If we don't have 10 yet, add more
  for (const p of panels) {
    if (diversePanels.length < 10 && !diversePanels.includes(p)) {
      diversePanels.push(p);
    }
  }

  console.log(JSON.stringify(diversePanels, null, 2));
}

main().then(() => prisma.$disconnect());
