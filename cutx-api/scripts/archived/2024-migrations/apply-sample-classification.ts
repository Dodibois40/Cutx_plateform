import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Classification data for 10 sample products
// Using valid Prisma enum values
const classifications = [
  {
    reference: 'BCB-BAS-82012',
    data: {
      panelType: 'MELAMINE',
      // panelSubType not applicable for melamine
      decorCategory: 'UNIS',
      decorCode: 'W1000',
      decorName: 'Blanc',
      coreType: 'P3', // Hydrofuge = P3
      isHydrofuge: true,
    },
  },
  {
    reference: 'BCB-BAS-82011',
    data: {
      panelType: 'MELAMINE',
      decorCategory: 'UNIS',
      decorCode: 'W1000',
      decorName: 'Blanc',
      coreType: 'P3',
      isHydrofuge: true,
    },
  },
  {
    reference: 'DISP-ABS-4797902',
    data: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_ABS',
      decorCategory: 'BOIS',
      decorCode: 'H1180',
      decorName: 'Chêne Halifax naturel',
      finishCode: 'ST37',
      finishName: 'Feelwood',
      manufacturer: 'Egger',
    },
  },
  {
    reference: 'DISP-ABS-4797919',
    data: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_ABS',
      decorCategory: 'BOIS',
      decorCode: 'H1180',
      decorName: 'Chêne Halifax naturel',
      finishCode: 'ST37',
      finishName: 'Feelwood',
      manufacturer: 'Egger',
    },
  },
  {
    reference: 'BCB-81899',
    data: {
      panelType: 'STRATIFIE',
      panelSubType: 'HPL',
      decorCategory: 'UNIS',
      decorCode: 'W10400',
      decorName: 'Blanc basic',
      finishCode: 'VV',
      manufacturer: 'Pfleiderer',
    },
  },
  {
    reference: 'BCB-93322',
    data: {
      panelType: 'STRATIFIE',
      panelSubType: 'HPL',
      decorCategory: 'UNIS',
      decorCode: 'F685',
      decorName: 'Acapulco',
      finishCode: 'ST10',
      finishName: 'Acryl',
      manufacturer: 'Egger',
    },
  },
  {
    reference: 'BCB-BAS-94496',
    data: {
      panelType: 'MDF',
      panelSubType: 'MDF_BRUT',
      decorCategory: 'BOIS',
      decorName: 'Chêne rustique',
      coreType: 'MDF_STD',
      coreColor: 'BLACK',
    },
  },
  {
    reference: 'BCB-DEC-94496',
    data: {
      panelType: 'MDF',
      panelSubType: 'MDF_BRUT',
      decorCategory: 'BOIS',
      decorName: 'Chêne rustique',
      coreType: 'MDF_STD',
      coreColor: 'BLACK',
    },
  },
  {
    reference: 'BCB-89935',
    data: {
      panelType: 'COMPACT',
      panelSubType: 'HPL',
      decorCategory: 'UNIS',
      decorCode: 'F2253',
      decorName: 'Diamond Black',
      finishCode: '58',
      finishName: 'Matte',
    },
  },
  {
    reference: 'BCB-PDT-93670',
    data: {
      panelType: 'COMPACT',
      panelSubType: 'HPL',
      decorCategory: 'UNIS',
      decorCode: 'A120',
      decorName: 'Aracena',
      finishCode: 'EXM',
      coreColor: 'GRAY',
      manufacturer: 'Polyrey',
    },
  },
];

async function main() {
  console.log('Applying classification to 10 sample products...\n');

  let updated = 0;
  let notFound = 0;

  for (const item of classifications) {
    const panel = await prisma.panel.findFirst({
      where: { reference: item.reference },
      select: { id: true, reference: true, name: true },
    });

    if (!panel) {
      console.log(`❌ Not found: ${item.reference}`);
      notFound++;
      continue;
    }

    await prisma.panel.update({
      where: { id: panel.id },
      data: item.data as any,
    });

    console.log(`✅ Updated: ${item.reference}`);
    console.log(`   → ${Object.entries(item.data).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
