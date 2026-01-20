import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== NETTOYAGE DES CHANTS BCB-QUERKUS CORROMPUS ===\n');

  // 1. Supprimer les chants "blanc lisse" avec références longues (corrompus)
  const blancLisseToDelete = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-QUERKUS-17686' }, // Refs longues = données corrompues
      name: { contains: 'blanc lisse', mode: 'insensitive' }
    },
    select: { id: true, name: true, reference: true }
  });

  console.log('Chants "blanc lisse" à supprimer:', blancLisseToDelete.length);
  blancLisseToDelete.forEach(p => {
    console.log('  -', p.reference, ':', p.name.substring(0, 50));
  });

  if (blancLisseToDelete.length > 0) {
    const deleteResult = await prisma.panel.deleteMany({
      where: {
        id: { in: blancLisseToDelete.map(p => p.id) }
      }
    });
    console.log('\n✓', deleteResult.count, 'chants "blanc lisse" corrompus supprimés');
  }

  // 2. Corriger les chants Querkus avec ép.XXXXX dans le nom
  console.log('\n=== CORRECTION DES ÉPAISSEURS ABERRANTES ===');
  
  const aberrantEp = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-QUERKUS' },
      name: { contains: 'ép.', mode: 'insensitive' }
    },
    select: { id: true, name: true, reference: true, thickness: true }
  });

  console.log('Chants avec ép. aberrant:', aberrantEp.length);

  for (const p of aberrantEp) {
    // Extraire la vraie épaisseur du nom (ex: "1mm" ou "0.8mm")
    const realEpMatch = p.name.match(/(\d+(?:\.\d+)?)\s*mm\s+ép\./i);
    if (realEpMatch) {
      const realThickness = parseFloat(realEpMatch[1]);
      
      // Extraire la largeur (chiffre avant "mm ép.")
      const widthMatch = p.name.match(/(\d+)\s*mm\s+ép\./i);
      const width = widthMatch ? parseInt(widthMatch[1]) : null;

      // Nettoyer le nom - enlever le "ép.XXXXX" aberrant
      const cleanName = p.name.replace(/\s*ép\.\d+mm$/i, '');
      
      console.log('  Réf:', p.reference);
      console.log('    Ancien nom:', p.name);
      console.log('    Nouveau nom:', cleanName);
      console.log('    Épaisseur:', realThickness, 'mm');
      console.log('');
      
      await prisma.panel.update({
        where: { id: p.id },
        data: {
          name: cleanName,
          thickness: [realThickness],
          decorName: 'Chêne Querkus'
        }
      });
    }
  }

  console.log('\n✓ Épaisseurs corrigées');

  // 3. Vérification finale
  console.log('\n=== VÉRIFICATION FINALE ===');
  const remaining = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: { name: true, reference: true, thickness: true, decorName: true },
    take: 10
  });

  console.log('Chants BCB-QUERKUS restants:', remaining.length);
  remaining.forEach(p => {
    console.log('  -', p.name?.substring(0, 50));
    console.log('    Épaisseur:', p.thickness, 'DecorName:', p.decorName);
  });

  await prisma.$disconnect();
}
fix().catch(console.error);
