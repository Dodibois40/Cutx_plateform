import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get one panel of each productType for diversity
  const types = [
    'MELAMINE',
    'BANDE_DE_CHANT',
    'STRATIFIE',
    'CONTREPLAQUE',
    'MDF',
    'PANNEAU_MASSIF',
    'SOLID_SURFACE',
    'PLACAGE',
    'COMPACT',
    'OSB',
  ];

  const panels = [];

  for (const type of types) {
    const panel = await prisma.panel.findFirst({
      where: {
        productType: type,
        reviewStatus: 'NON_VERIFIE',
      },
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
          select: { name: true }
        }
      }
    });

    if (panel) {
      panels.push(panel);
    }
  }

  console.log(JSON.stringify(panels, null, 2));
}

main().then(() => prisma.$disconnect());
