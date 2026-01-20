import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== CORRECTION FINALE BCB-QUERKUS ===\n');

  // Largeurs standards de chants en mm
  const STANDARD_WIDTHS = [23, 24, 26, 28, 33, 42, 43, 46, 54];

  const allQuerkus = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: { id: true, name: true, reference: true, thickness: true, defaultWidth: true }
  });

  console.log('Total BCB-QUERKUS:', allQuerkus.length);

  for (const p of allQuerkus) {
    let width: number | null = null;
    let thickness: number | null = null;

    // 1. Pattern "10/10iéme" ou "8/10iéme" = épaisseur en dixièmes de mm
    const fractionMatch = p.name.match(/(\d+)\/10i[èe]me/i);
    if (fractionMatch) {
      thickness = parseInt(fractionMatch[1]) / 10;
    }

    // 2. Pattern "ép.X.Xmm" = épaisseur explicite
    const epMatch = p.name.match(/ép\.(\d+(?:\.\d+)?)mm/i);
    if (epMatch) {
      thickness = parseFloat(epMatch[1]);
    }

    // 3. Pattern "XXmm" = peut être largeur ou épaisseur
    const mmMatches = p.name.match(/(\d+(?:\.\d+)?)mm/g);
    if (mmMatches) {
      for (const mm of mmMatches) {
        const val = parseFloat(mm.replace('mm', ''));
        
        // Si c'est une largeur standard, c'est la largeur
        if (STANDARD_WIDTHS.includes(val)) {
          width = val;
        }
        // Si c'est petit (< 5mm), c'est probablement l'épaisseur
        else if (val < 5 && !thickness) {
          thickness = val;
        }
      }
    }

    // Valeurs par défaut si non trouvées
    if (!thickness && fractionMatch) {
      // Déjà calculé ci-dessus
    }
    
    // Si pas d'épaisseur trouvée mais "non encollé" dans le nom, typiquement 1mm
    if (!thickness && p.name.toLowerCase().includes('non encollé')) {
      thickness = 1;
    }

    console.log('---');
    console.log('Réf:', p.reference);
    console.log('Nom:', p.name);
    console.log('  -> Largeur:', width, 'mm');
    console.log('  -> Épaisseur:', thickness, 'mm');

    // Mettre à jour
    await prisma.panel.update({
      where: { id: p.id },
      data: {
        thickness: thickness ? [thickness] : [],
        defaultWidth: width || p.defaultWidth || 0,
        decorName: p.name.toLowerCase().includes('hêtre') ? 'Hêtre' : 'Chêne Querkus'
      }
    });
  }

  console.log('\n✓ Corrections appliquées');

  // Vérification finale
  console.log('\n=== RÉSULTAT FINAL ===');
  const final = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: { name: true, thickness: true, defaultWidth: true, decorName: true }
  });

  for (const p of final) {
    console.log('-', p.name.substring(0, 55));
    console.log('  Largeur:', p.defaultWidth, 'mm | Épaisseur:', p.thickness, 'mm | Décor:', p.decorName);
  }

  await prisma.$disconnect();
}
fix().catch(console.error);
