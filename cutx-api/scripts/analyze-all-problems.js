/**
 * Analyse rapide de tous les panneaux mal assignés
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const PROBLEM_CATEGORIES = [
  'abs-bois',
  'panneaux-muraux',
  'compacts-hpl',
  'panneaux-plaques-bois',
  '3-plis',
  'chants',
  'strat-bois'
];

async function analyzeCategory(slug) {
  const cat = await p.category.findFirst({
    where: { slug },
    include: {
      children: { select: { slug: true, name: true } }
    }
  });

  if (!cat) {
    console.log('\n❌ ' + slug + ' non trouvé');
    return;
  }

  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { id: true, name: true, productType: true, material: true },
    orderBy: { name: 'asc' }
  });

  console.log('\n=== ' + cat.name.toUpperCase() + ' (' + slug + ') ===');
  console.log('Panneaux mal assignés: ' + panels.length);
  console.log('Sous-catégories disponibles: ' + cat.children.map(c => c.slug).join(', '));

  if (panels.length > 0) {
    console.log('\nExemples (10 premiers):');
    panels.slice(0, 10).forEach(p => {
      console.log('  - ' + p.name.substring(0, 80));
    });
  }
}

async function main() {
  for (const slug of PROBLEM_CATEGORIES) {
    await analyzeCategory(slug);
  }
  await p.$disconnect();
}

main().catch(console.error);
