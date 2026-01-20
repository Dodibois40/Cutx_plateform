import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Trouver tous les placages avec épaisseur fine qui ne sont PAS dans une catégorie Placage
  const placages = await prisma.panel.findMany({
    where: {
      AND: [
        { productType: 'PLACAGE' },
        { thickness: { hasSome: [0.6, 0.8, 1, 1.0, 2, 2.0] } },
        {
          category: {
            name: { not: { startsWith: 'Placage' } }
          }
        }
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      category: { select: { name: true } }
    }
  });

  console.log(`=== PLACAGES FINS NON ASSIGNÉS (${placages.length}) ===\n`);

  for (const p of placages) {
    console.log(`${p.reference}: ${p.name}`);
    console.log(`  Épaisseur: ${p.thickness.join(', ')}mm`);
    console.log(`  Catégorie actuelle: ${p.category?.name || 'SANS'}`);
    console.log('');
  }

  // Aussi chercher les Décoflex/Décolam qui pourraient rester
  const decoflex = await prisma.panel.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: 'décoflex', mode: 'insensitive' } },
            { name: { contains: 'decoflex', mode: 'insensitive' } },
            { name: { contains: 'décolam', mode: 'insensitive' } },
            { name: { contains: 'decolam', mode: 'insensitive' } },
            { name: { contains: 'masterflex', mode: 'insensitive' } },
            { name: { contains: 'finflex', mode: 'insensitive' } },
            { name: { contains: 'placage', mode: 'insensitive' } },
          ]
        },
        {
          category: {
            name: { not: { startsWith: 'Placage' } }
          }
        }
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      productType: true,
      category: { select: { name: true } }
    }
  });

  console.log(`\n=== DÉCOFLEX/PLACAGE NON ASSIGNÉS (${decoflex.length}) ===\n`);

  for (const p of decoflex) {
    console.log(`${p.reference}: ${p.name}`);
    console.log(`  Type: ${p.productType}, Épaisseur: ${p.thickness.join(', ')}mm`);
    console.log(`  Catégorie actuelle: ${p.category?.name || 'SANS'}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
