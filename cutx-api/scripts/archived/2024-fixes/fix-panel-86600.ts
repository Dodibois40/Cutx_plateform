import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPanel() {
  console.log('🔧 Correction du panel BCB-PDT-86600...\n');

  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-PDT-86600' }
  });

  if (!panel) {
    console.log('❌ Panel non trouvé!');
    return;
  }

  console.log('📋 Avant correction:');
  console.log('  manufacturerRef:', panel.manufacturerRef);
  console.log('  supplierCode:', panel.supplierCode);
  console.log('  decorCode:', panel.decorCode);
  console.log('  colorChoice:', panel.colorChoice);
  console.log('  certification:', panel.certification);

  // Mettre à jour avec les bonnes valeurs
  const updated = await prisma.panel.update({
    where: { id: panel.id },
    data: {
      manufacturerRef: '0720',      // Code coloris
      supplierCode: '80193',         // Code produit Bouney
      decorCode: '0720',             // Code coloris (même que manufacturerRef)
      colorChoice: '0720',           // Code coloris
      certification: 'FSC CWD',      // Certification
    },
  });

  console.log('\n✅ Après correction:');
  console.log('  manufacturerRef:', updated.manufacturerRef);
  console.log('  supplierCode:', updated.supplierCode);
  console.log('  decorCode:', updated.decorCode);
  console.log('  colorChoice:', updated.colorChoice);
  console.log('  certification:', updated.certification);

  console.log('\n✨ Panel corrigé avec succès!');
}

fixPanel()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
