/**
 * Enrichir les données des panneaux Querkus
 * Querkus est une marque de placage chêne, donc tous les panneaux
 * devraient avoir material/decorName indiquant "chêne"
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== ENRICHISSEMENT DES DONNÉES QUERKUS ===\n');

  // Trouver tous les panneaux Querkus (pas les chants) sans decorName
  const querkusPanels = await prisma.panel.findMany({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' },
      productType: 'PLACAGE',
      OR: [
        { decorName: null },
        { decorName: '' }
      ]
    },
    select: { id: true, name: true, material: true, decorName: true }
  });

  console.log(`Trouvé ${querkusPanels.length} panneaux Querkus sans decorName\n`);

  // Mettre à jour avec decorName = "Chêne Querkus" et material = "Placage Chêne"
  const result = await prisma.panel.updateMany({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' },
      productType: 'PLACAGE',
      OR: [
        { decorName: null },
        { decorName: '' }
      ]
    },
    data: {
      decorName: 'Chêne Querkus',
      material: 'Placage Chêne'
    }
  });

  console.log(`✓ ${result.count} panneaux mis à jour avec decorName="Chêne Querkus"\n`);

  // Vérifier
  const after = await prisma.panel.findFirst({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' },
      productType: 'PLACAGE'
    },
    select: { name: true, decorName: true, material: true }
  });

  console.log('Exemple après mise à jour:');
  console.log('  name:', after?.name?.substring(0, 50));
  console.log('  decorName:', after?.decorName);
  console.log('  material:', after?.material);

  await prisma.$disconnect();
}

fix().catch(console.error);
