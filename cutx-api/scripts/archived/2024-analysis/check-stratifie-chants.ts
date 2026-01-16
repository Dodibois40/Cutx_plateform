import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Point 4: Vérifier les 'chants' classés STRATIFIE
  const suspects = await prisma.panel.findMany({
    where: {
      panelType: 'STRATIFIE',
      name: { contains: 'chant', mode: 'insensitive' }
    },
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultWidth: true,
      defaultLength: true,
      pricePerM2: true,
      pricePerMl: true
    }
  });

  console.log('=== STRATIFIÉS avec "chant" dans le nom (' + suspects.length + ') ===\n');
  suspects.forEach(p => {
    const dims = p.defaultLength + 'x' + p.defaultWidth + 'mm';
    const ep = p.thickness?.join('/') || 'N/A';
    const prix = p.pricePerMl ? 'ml: ' + p.pricePerMl + '€' : (p.pricePerM2 ? 'm²: ' + p.pricePerM2 + '€' : 'N/A');
    console.log('[' + p.reference + ']');
    console.log('  Nom: ' + p.name);
    console.log('  Dims: ' + dims + ' | Ép: ' + ep + 'mm | Prix: ' + prix);
    console.log('');
  });

  // Vérifier aussi les CHANTS qui sont des stratifiés
  const chantsStrat = await prisma.panel.findMany({
    where: {
      panelType: 'CHANT',
      OR: [
        { name: { contains: 'stratifié', mode: 'insensitive' } },
        { name: { contains: 'HPL', mode: 'insensitive' } }
      ]
    },
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultWidth: true,
      defaultLength: true
    }
  });

  console.log('\n=== CHANTS avec "stratifié/HPL" dans le nom (' + chantsStrat.length + ') ===\n');
  chantsStrat.forEach(p => {
    const dims = p.defaultLength + 'x' + p.defaultWidth + 'mm';
    const ep = p.thickness?.join('/') || 'N/A';
    console.log('[' + p.reference + ']');
    console.log('  Nom: ' + p.name);
    console.log('  Dims: ' + dims + ' | Ép: ' + ep + 'mm');
    console.log('');
  });

  await prisma.$disconnect();
}

check();
