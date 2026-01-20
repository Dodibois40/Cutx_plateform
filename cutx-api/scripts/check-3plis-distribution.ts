/**
 * Vérifier où sont les panneaux 3 plis de chaque fournisseur
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // 1. Bouney 3 plis - où sont-ils ?
  console.log('=== BOUNEY 3 PLIS - OÙ SONT-ILS ? ===\n');

  const bouney3plis = await prisma.panel.findMany({
    where: {
      isActive: true,
      catalogue: { slug: 'bouney' },
      OR: [
        { productType: 'PANNEAU_3_PLIS' },
        { name: { contains: '3 plis', mode: 'insensitive' } },
        { name: { contains: 'trois plis', mode: 'insensitive' } },
      ],
    },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
          catalogue: { select: { name: true } },
        },
      },
    },
    take: 20,
  });

  console.log('Panneaux 3 plis Bouney:', bouney3plis.length);
  for (const p of bouney3plis.slice(0, 10)) {
    const catInfo = p.category
      ? `[${p.category.catalogue?.name}] ${p.category.name}`
      : 'PAS DE CATÉGORIE';
    console.log(`  - ${p.name?.substring(0, 50)}`);
    console.log(`    → ${catInfo}`);
  }

  // 2. Distribution par catégorie pour 3 plis Bouney
  console.log('\n=== DISTRIBUTION PAR CATÉGORIE (BOUNEY 3 PLIS) ===\n');

  const distribution = await prisma.$queryRaw<
    Array<{ category_name: string | null; category_catalogue: string | null; count: bigint }>
  >`
    SELECT
      cat.name as category_name,
      cc.name as category_catalogue,
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    LEFT JOIN "Category" cat ON p."categoryId" = cat.id
    LEFT JOIN "Catalogue" cc ON cat."catalogueId" = cc.id
    WHERE p."isActive" = true
      AND c.slug = 'bouney'
      AND (
        p."productType" = 'PANNEAU_3_PLIS'
        OR p.name ILIKE '%3 plis%'
        OR p.name ILIKE '%trois plis%'
      )
    GROUP BY cat.name, cc.name
    ORDER BY count DESC
  `;

  for (const row of distribution) {
    console.log(`  ${(row.category_name || 'NULL').padEnd(30)} [${row.category_catalogue || '?'}]: ${row.count}`);
  }

  // 3. Dispano 3 plis
  console.log('\n=== DISPANO 3 PLIS ===\n');

  const dispano3plis = await prisma.panel.findMany({
    where: {
      isActive: true,
      catalogue: { slug: 'dispano' },
      OR: [
        { name: { contains: '3 plis', mode: 'insensitive' } },
        { name: { contains: 'trois plis', mode: 'insensitive' } },
      ],
    },
    include: {
      category: { select: { name: true, catalogue: { select: { name: true } } } },
    },
    take: 10,
  });

  console.log('Panneaux 3 plis Dispano:', dispano3plis.length);
  for (const p of dispano3plis) {
    const catInfo = p.category
      ? `[${p.category.catalogue?.name}] ${p.category.name}`
      : 'PAS DE CATÉGORIE';
    console.log(`  - ${p.name?.substring(0, 55)}`);
    console.log(`    → ${catInfo}`);
  }

  // 4. Comparaison : panneaux dans "3 Plis Chêne" vs ceux qui DEVRAIENT y être
  console.log('\n=== PANNEAUX CHÊNE MAL CLASSÉS ===\n');

  const cheneIn3PlisCategories = await prisma.panel.findMany({
    where: {
      isActive: true,
      name: { contains: 'chêne', mode: 'insensitive' },
      category: { slug: { startsWith: '3-plis' } },
    },
    include: {
      category: { select: { name: true, slug: true } },
      catalogue: { select: { name: true } },
    },
  });

  console.log(`Panneaux avec "chêne" dans nom ET catégorie 3-plis: ${cheneIn3PlisCategories.length}`);

  // Group by category
  const byCategory: Record<string, number> = {};
  for (const p of cheneIn3PlisCategories) {
    const cat = p.category?.name || 'null';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count}`);
  }

  // 5. Voir les panneaux chêne qui sont dans "Divers" au lieu de "Chêne"
  console.log('\n=== PANNEAUX CHÊNE DANS "DIVERS" (MAL CLASSÉS) ===\n');

  const cheneInDivers = await prisma.panel.findMany({
    where: {
      isActive: true,
      name: { contains: 'chêne', mode: 'insensitive' },
      category: { slug: { contains: 'divers' } },
    },
    include: {
      category: { select: { name: true } },
      catalogue: { select: { name: true } },
    },
    take: 10,
  });

  console.log(`Exemples de panneaux chêne dans catégories "Divers": ${cheneInDivers.length}`);
  for (const p of cheneInDivers) {
    console.log(`  [${p.catalogue?.name}] ${p.name?.substring(0, 45)}`);
    console.log(`    → ${p.category?.name}`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
