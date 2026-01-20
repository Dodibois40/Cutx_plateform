/**
 * CORRECTION ABS-BOIS
 * Les 260 panneaux sont des bandes de chant avec motifs bois exotiques
 * Créer une sous-catégorie abs-autres-bois pour ces essences
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== CORRECTION ABS-BOIS ===\n');

  const parent = await p.category.findFirst({ where: { slug: 'abs-bois' } });
  if (!parent) {
    console.log('❌ Catégorie non trouvée');
    return;
  }

  // Créer abs-autres-bois si n'existe pas
  let absDivers = await p.category.findFirst({ where: { slug: 'abs-autres-bois' } });
  if (!absDivers) {
    absDivers = await p.category.create({
      data: {
        slug: 'abs-autres-bois',
        name: 'ABS Autres Bois',
        parentId: parent.id,
        catalogueId: parent.catalogueId
      }
    });
    console.log('✓ Créé: abs-autres-bois');
  } else {
    console.log('✓ abs-autres-bois existe déjà');
  }

  // Recharger les sous-catégories
  const children = await p.category.findMany({
    where: { parentId: parent.id },
    select: { id: true, slug: true }
  });
  const catMap = {};
  for (const c of children) {
    catMap[c.slug] = c.id;
  }

  // Récupérer les panneaux
  const panels = await p.panel.findMany({
    where: { categoryId: parent.id },
    select: { id: true, name: true }
  });

  console.log('Panneaux à redistribuer: ' + panels.length);

  // Règles de classification
  const RULES = [
    { slug: 'abs-chene', keywords: ['chêne', 'chene', 'oak', 'eiche'] },
    { slug: 'abs-noyer', keywords: ['noyer', 'walnut', 'nussbaum'] },
    { slug: 'abs-hetre', keywords: ['hêtre', 'hetre', 'beech', 'buche'] },
    { slug: 'abs-frene', keywords: ['frêne', 'frene', 'ash', 'esche'] },
  ];

  const assignments = {};
  for (const slug of Object.keys(catMap)) {
    assignments[slug] = [];
  }

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    for (const rule of RULES) {
      if (!catMap[rule.slug]) continue;
      for (const kw of rule.keywords) {
        if (text.includes(kw)) {
          assignments[rule.slug].push(panel.id);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    // Fallback: abs-autres-bois
    if (!assigned) {
      assignments['abs-autres-bois'].push(panel.id);
    }
  }

  // Afficher distribution
  console.log('\n--- Distribution ---');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length > 0) {
      console.log('  ' + slug + ': ' + ids.length);
    }
  }

  // Assigner
  console.log('\n--- Assignation ---');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length === 0 || !catMap[slug]) continue;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await p.panel.updateMany({
        where: { id: { in: batch } },
        data: { categoryId: catMap[slug] }
      });
    }
    console.log('  ✓ ' + slug + ': ' + ids.length);
  }

  const remaining = await p.panel.count({ where: { categoryId: parent.id } });
  console.log('\n✓ Restant dans parent: ' + remaining);

  await p.$disconnect();
}

main().catch(console.error);
