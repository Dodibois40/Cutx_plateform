/**
 * Check if new product types have panels
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('='.repeat(60));
  console.log('VÉRIFICATION DES NOUVEAUX PRODUCT TYPES');
  console.log('='.repeat(60));

  const types = [
    'PANNEAU_MURAL',
    'PANNEAU_DECORATIF',
    'PANNEAU_3_PLIS',
    'LATTE',
    'PANNEAU_ISOLANT',
    'PANNEAU_ALVEOLAIRE',
    'CIMENT_BOIS',
  ];

  for (const type of types) {
    const count = await prisma.panel.count({
      where: { productType: type, isActive: true },
    });

    const examples = await prisma.panel.findMany({
      where: { productType: type, isActive: true },
      select: { name: true, catalogue: { select: { name: true } } },
      take: 2,
    });

    console.log(`\n${type}: ${count} panneaux`);
    for (const ex of examples) {
      console.log(`  - [${ex.catalogue?.name}] ${ex.name?.substring(0, 50)}`);
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
