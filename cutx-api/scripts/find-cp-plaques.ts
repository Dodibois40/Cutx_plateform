/**
 * Trouver les contreplaqués qui sont en réalité des placages
 * (contreplaqués avec essence de bois noble = plaqués bois)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Essences nobles qui indiquent un placage
const ESSENCES_NOBLES = [
  'chêne', 'chene', 'oak',
  'noyer', 'walnut',
  'hêtre', 'hetre',
  'frêne', 'frene',
  'érable', 'erable',
  'merisier', 'cerisier',
  'teck', 'wengé', 'wenge',
  'acajou', 'palissandre',
];

// Essences de CP bruts (pas des placages nobles)
const ESSENCES_BRUTES = [
  'okoumé', 'okoume',
  'peuplier',
  'bouleau',
  'pin',
  'sapin',
  'épicéa', 'epicea',
];

async function find() {
  console.log('=== CONTREPLAQUÉS MAL CATÉGORISÉS ===\n');

  // Trouver les CP avec essence noble dans le nom
  const cpWithNobleWood = await prisma.panel.findMany({
    where: {
      productType: 'CONTREPLAQUE',
      isActive: true,
      OR: ESSENCES_NOBLES.map(e => ({
        name: { contains: e, mode: 'insensitive' as const }
      }))
    },
    select: {
      id: true,
      name: true,
      material: true,
      category: { select: { slug: true, name: true } },
      catalogue: { select: { name: true } }
    }
  });

  console.log(`Trouvé ${cpWithNobleWood.length} contreplaqués avec essence noble:\n`);

  for (const p of cpWithNobleWood) {
    console.log(`- ${p.name?.substring(0, 70)}`);
    console.log(`  Catégorie: ${p.category?.name || 'N/A'} (${p.category?.slug})`);
    console.log(`  Catalogue: ${p.catalogue?.name}`);
    console.log('');
  }

  // Vérifier aussi les panneaux de type CONTREPLAQUE dans les catégories de CP brut
  // qui ont "chêne", "noyer" etc. dans le nom
  console.log('\n=== VÉRIFICATION PAR CATÉGORIE ===\n');

  const cpCategories = ['contreplaque', 'cp-okoume', 'cp-peuplier', 'cp-bouleau', 'cp-marine', 'cp-filme'];

  for (const catSlug of cpCategories) {
    const cat = await prisma.category.findFirst({
      where: { slug: catSlug },
      select: { id: true, name: true }
    });

    if (!cat) continue;

    const wrongPanels = await prisma.panel.findMany({
      where: {
        categoryId: cat.id,
        isActive: true,
        OR: ESSENCES_NOBLES.map(e => ({
          name: { contains: e, mode: 'insensitive' as const }
        }))
      },
      select: { name: true }
    });

    if (wrongPanels.length > 0) {
      console.log(`${cat.name} (${catSlug}): ${wrongPanels.length} panneaux avec essence noble`);
      wrongPanels.slice(0, 3).forEach(p => {
        console.log(`  - ${p.name?.substring(0, 60)}`);
      });
      if (wrongPanels.length > 3) {
        console.log(`  ... et ${wrongPanels.length - 3} autres`);
      }
    }
  }

  await prisma.$disconnect();
}

find().catch(console.error);
