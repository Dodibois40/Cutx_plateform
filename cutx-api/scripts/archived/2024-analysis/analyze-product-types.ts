import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== ANALYSE DES TYPES DE PRODUITS ===\n');

  // Répartition par panelType
  const byType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    orderBy: { _count: { panelType: 'desc' } }
  });

  console.log('Répartition par panelType:');
  byType.forEach(t => {
    const type = t.panelType || 'NULL';
    console.log('  ' + type + ': ' + t._count);
  });

  // Chants spécifiquement
  const chants = await prisma.panel.count({
    where: { panelType: 'BANDE_DE_CHANT' }
  });
  console.log('\n--- Résumé ---');
  console.log('Chants (BANDE_DE_CHANT): ' + chants);

  // Panneaux (tout sauf chants)
  const panels = await prisma.panel.count({
    where: {
      AND: [
        { panelType: { not: 'BANDE_DE_CHANT' } },
        { panelType: { not: null } }
      ]
    }
  });
  console.log('Panneaux classifiés (non-chants): ' + panels);

  // Non classifiés
  const unclassified = await prisma.panel.count({
    where: { panelType: null }
  });
  console.log('Non classifiés (NULL): ' + unclassified);

  // Total
  const total = await prisma.panel.count();
  console.log('Total: ' + total);

  await prisma.$disconnect();
}

main().catch(console.error);
