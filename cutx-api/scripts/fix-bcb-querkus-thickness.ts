import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== CORRECTION DES ÉPAISSEURS BCB-QUERKUS ===\n');

  const allQuerkus = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: { id: true, name: true, reference: true, thickness: true, defaultWidth: true }
  });

  console.log('Total BCB-QUERKUS:', allQuerkus.length);

  for (const p of allQuerkus) {
    // Pattern: "XXmm ép.Ymm" où XX = largeur, Y = épaisseur
    // Ou: "XX/10iéme" = épaisseur en dixièmes de mm
    
    let width: number | null = null;
    let thickness: number | null = null;
    let cleanName = p.name;

    // Extraire largeur et épaisseur du pattern "XXmm ép.Ymm"
    const pattern1 = p.name.match(/(\d+)mm\s+ép\.(\d+(?:\.\d+)?)mm/i);
    if (pattern1) {
      width = parseInt(pattern1[1]);
      thickness = parseFloat(pattern1[2]);
      cleanName = p.name.replace(/\s*\d+mm\s+ép\.\d+(?:\.\d+)?mm$/i, '').trim();
    }

    // Pattern pour "10/10iéme" = 1mm, "8/10iéme" = 0.8mm
    const patternFraction = p.name.match(/(\d+)\/10i[èe]me/i);
    if (patternFraction && !thickness) {
      thickness = parseInt(patternFraction[1]) / 10;
    }

    // Extraire largeur seule "XXmm" en fin de nom
    if (!width) {
      const widthPattern = p.name.match(/(\d+)mm$/i);
      if (widthPattern) {
        width = parseInt(widthPattern[1]);
      }
    }

    // Si l'épaisseur actuelle est aberrante (>10mm), c'est la largeur
    if (p.thickness[0] && p.thickness[0] > 10) {
      width = p.thickness[0];
      thickness = null; // On ne connaît pas la vraie épaisseur
    }

    console.log('---');
    console.log('Réf:', p.reference);
    console.log('Nom:', p.name);
    console.log('  Épaisseur actuelle:', p.thickness);
    console.log('  Nouvelle épaisseur:', thickness || 'inconnue');
    console.log('  Largeur:', width || 'inconnue');
    console.log('  Nom nettoyé:', cleanName);

    // Mettre à jour
    await prisma.panel.update({
      where: { id: p.id },
      data: {
        name: cleanName,
        thickness: thickness ? [thickness] : [],
        defaultWidth: width || p.defaultWidth,
        decorName: p.name.toLowerCase().includes('hêtre') ? 'Hêtre' : 'Chêne Querkus'
      }
    });
  }

  console.log('\n✓ Corrections appliquées');

  // Vérification
  console.log('\n=== RÉSULTAT FINAL ===');
  const final = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: { name: true, thickness: true, defaultWidth: true, decorName: true }
  });

  for (const p of final) {
    console.log('-', p.name.substring(0, 50));
    console.log('  Épaisseur:', p.thickness, 'mm, Largeur:', p.defaultWidth, 'mm, Décor:', p.decorName);
  }

  await prisma.$disconnect();
}
fix().catch(console.error);
