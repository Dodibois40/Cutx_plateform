import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPanneauxDeco() {
  // Trouver les panneaux Latho et fraisés qui sont marqués MELAMINE à tort
  const panneauxDeco = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'Latho', mode: 'insensitive' } },
        { name: { contains: 'panneau fraisé', mode: 'insensitive' } },
        { name: { contains: 'fraisé flex', mode: 'insensitive' } },
        { name: { contains: 'panneau flex', mode: 'insensitive' } },
      ],
      panelType: 'MELAMINE', // Ceux qui sont mal classifiés
    },
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
    }
  });

  console.log(`Panneaux déco à corriger: ${panneauxDeco.length}`);

  if (panneauxDeco.length === 0) {
    console.log('Aucun panneau à corriger');
    await prisma.$disconnect();
    return;
  }

  // Afficher les 5 premiers
  console.log('\nExemples:');
  panneauxDeco.slice(0, 5).forEach(p => {
    console.log(`  - ${p.reference}: ${p.name.substring(0, 50)}`);
  });

  // Mettre à jour tous ces panneaux
  const ids = panneauxDeco.map(p => p.id);
  const result = await prisma.panel.updateMany({
    where: { id: { in: ids } },
    data: { panelType: 'PANNEAU_DECO' }
  });

  console.log(`\n✅ ${result.count} panneaux mis à jour avec type PANNEAU_DECO`);

  await prisma.$disconnect();
}

fixPanneauxDeco();
