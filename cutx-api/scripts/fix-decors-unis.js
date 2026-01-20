/**
 * CORRECTION DECORS-UNIS
 * Crée les sous-catégories manquantes et redistribue les 1230 panneaux
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Sous-catégories à créer
const SUBCATEGORIES = [
  { slug: 'unis-blanc', name: 'Unis Blanc' },
  { slug: 'unis-noir', name: 'Unis Noir' },
  { slug: 'unis-gris', name: 'Unis Gris' },
  { slug: 'unis-couleurs', name: 'Unis Couleurs' },
];

// Règles de classification
const RULES = [
  { slug: 'fenix', keywords: ['fenix'] },
  { slug: 'unis-blanc', keywords: ['blanc', 'white', 'alpin'] },
  { slug: 'unis-noir', keywords: ['noir', 'black', 'anthracite'] },
  { slug: 'unis-gris', keywords: ['gris', 'grey', 'gray'] },
  // unis-couleurs = fallback pour le reste
];

async function main() {
  console.log('=== CORRECTION DECORS-UNIS ===\n');

  // 1. Récupérer la catégorie parent
  const parent = await p.category.findFirst({ where: { slug: 'decors-unis' } });
  if (!parent) {
    console.log('❌ Catégorie decors-unis non trouvée');
    return;
  }
  console.log('✓ Parent trouvé: ' + parent.name + ' (id: ' + parent.id + ')');

  // 2. Récupérer le catalogue
  const catalogueId = parent.catalogueId;

  // 3. Créer les sous-catégories manquantes
  console.log('\n--- Création des sous-catégories ---');
  const existingChildren = await p.category.findMany({
    where: { parentId: parent.id },
    select: { slug: true, id: true }
  });
  const existingSlugs = existingChildren.map(c => c.slug);

  for (const sub of SUBCATEGORIES) {
    if (existingSlugs.includes(sub.slug)) {
      console.log('  ✓ ' + sub.slug + ' existe déjà');
    } else {
      await p.category.create({
        data: {
          slug: sub.slug,
          name: sub.name,
          parentId: parent.id,
          catalogueId
        }
      });
      console.log('  + Créé: ' + sub.slug);
    }
  }

  // 4. Recharger les sous-catégories
  const children = await p.category.findMany({
    where: { parentId: parent.id },
    select: { id: true, slug: true, name: true }
  });
  const catMap = {};
  for (const c of children) {
    catMap[c.slug] = c.id;
  }
  console.log('\nSous-catégories disponibles:', Object.keys(catMap).join(', '));

  // 5. Récupérer les panneaux mal assignés
  const panels = await p.panel.findMany({
    where: { categoryId: parent.id },
    select: { id: true, name: true }
  });
  console.log('\nPanneaux à redistribuer: ' + panels.length);

  // 6. Classifier les panneaux
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

    // Fallback: unis-couleurs
    if (!assigned && catMap['unis-couleurs']) {
      assignments['unis-couleurs'].push(panel.id);
    }
  }

  // 7. Afficher le résumé
  console.log('\n--- Distribution prévue ---');
  let total = 0;
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length > 0) {
      console.log('  ' + slug.padEnd(20) + ': ' + ids.length);
      total += ids.length;
    }
  }
  console.log('  Total: ' + total);

  // 8. Effectuer l'assignation
  console.log('\n--- Assignation en cours ---');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length === 0 || !catMap[slug]) continue;

    // Assigner par lots de 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await p.panel.updateMany({
        where: { id: { in: batch } },
        data: { categoryId: catMap[slug] }
      });
    }
    console.log('  ✓ ' + slug + ': ' + ids.length + ' panneaux assignés');
  }

  // 9. Vérification
  const remaining = await p.panel.count({ where: { categoryId: parent.id } });
  console.log('\n--- Vérification ---');
  console.log('Panneaux restant dans parent: ' + remaining);

  if (remaining === 0) {
    console.log('✅ TERMINÉ - Tous les panneaux redistribués');
  } else {
    console.log('⚠️ ' + remaining + ' panneaux restent dans le parent');
  }

  await p.$disconnect();
}

main().catch(console.error);
