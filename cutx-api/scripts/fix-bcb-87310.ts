/**
 * Corriger le chant BCB-87310 - Chêne de fil 24x1mm
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== CORRECTION CHANT BCB-87310 ===\n');

  // Trouver d'abord le panel par référence
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-87310' },
  });

  if (!panel) {
    console.log('❌ BCB-87310 non trouvé');
    return;
  }

  // Mettre à jour par ID
  const result = await prisma.panel.update({
    where: { id: panel.id },
    data: {
      pricePerMl: 0.81,
      supplierCode: '87310',
      decorName: 'Chêne',
      productType: 'BANDE_DE_CHANT',
    },
  });

  console.log('✅ BCB-87310 mis à jour:');
  console.log('   pricePerMl:', result.pricePerMl);
  console.log('   supplierCode:', result.supplierCode);
  console.log('   decorName:', result.decorName);

  // Vérifier s'il y a un doublon
  const duplicate = await prisma.panel.findFirst({
    where: { reference: 'BCB-CHANT-1768602114944' },
  });

  if (duplicate) {
    console.log('\n⚠️ Doublon trouvé: BCB-CHANT-1768602114944');
    console.log('   Suppression du doublon...');
    await prisma.panel.delete({
      where: { id: duplicate.id },
    });
    console.log('   ✅ Doublon supprimé');
  }

  await prisma.$disconnect();
}

fix().catch(console.error);
