import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('=== ANALYSE COMPLÈTE BCB-QUERKUS ===\n');

  // Tous les BCB-QUERKUS
  const allQuerkus = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: {
      name: true,
      reference: true,
      thickness: true,
      decorName: true,
      defaultWidth: true,
      defaultLength: true,
      imageUrl: true
    }
  });

  console.log('Total BCB-QUERKUS:', allQuerkus.length);

  // Catégories de problèmes
  const problems = {
    noThickness: 0,
    wrongDecorName: 0,
    noImage: 0,
    badName: 0, // Nom contient "blanc lisse" mais c'est QUERKUS
    hasEpInName: 0, // Nom contient "ép.XXXXX"
  };

  const badNames: string[] = [];

  for (const p of allQuerkus) {
    if (p.thickness.length === 0) problems.noThickness++;
    if (!p.decorName || p.decorName === 'Blanc') problems.wrongDecorName++;
    if (!p.imageUrl) problems.noImage++;
    
    if (p.name.toLowerCase().includes('blanc lisse')) {
      problems.badName++;
      badNames.push(p.name);
    }
    
    // Détecte les noms avec "ép.XXXXX" où XXXXX > 100
    const epMatch = p.name.match(/ép\.(\d+)/i);
    if (epMatch && parseInt(epMatch[1]) > 100) {
      problems.hasEpInName++;
    }
  }

  console.log('\n=== PROBLÈMES DÉTECTÉS ===');
  console.log('- Sans épaisseur:', problems.noThickness);
  console.log('- DecorName incorrect/Blanc:', problems.wrongDecorName);
  console.log('- Sans image:', problems.noImage);
  console.log('- Nom "blanc lisse" incorrect:', problems.badName);
  console.log('- Nom avec ép.XXXXX aberrant:', problems.hasEpInName);

  console.log('\n=== ÉCHANTILLON NOMS INCORRECTS ===');
  badNames.slice(0, 10).forEach(n => console.log('-', n));

  // Chercher tous avec ép.XXXXX aberrant
  console.log('\n=== TOUS LES ép.XXXXX ABERRANTS ===');
  for (const p of allQuerkus) {
    const epMatch = p.name.match(/ép\.(\d+)/i);
    if (epMatch && parseInt(epMatch[1]) > 100) {
      console.log('Réf:', p.reference);
      console.log('Nom:', p.name);
      console.log('');
    }
  }

  await prisma.$disconnect();
}
check().catch(console.error);
