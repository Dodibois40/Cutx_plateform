/**
 * CORRECTION GLOBALE - Toutes les catégories parentes avec panneaux mal assignés
 *
 * 7 catégories à corriger:
 * 1. abs-bois (260) - créer abs-autres-bois
 * 2. panneaux-muraux (78) - redistribuer dans sous-cats ou créer muraux-divers
 * 3. compacts-hpl (64) - créer compacts-standard
 * 4. panneaux-plaques-bois (39) - redistribuer (châtaignier, pin, etc.)
 * 5. 3-plis (27) - redistribuer (chêne, épicéa, etc.)
 * 6. chants (19) - ces panneaux sont mal catégorisés, vérifier
 * 7. strat-bois (5) - créer strat-meleze ou autre
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Configuration pour chaque catégorie
const FIXES = {
  'abs-bois': {
    newSubcategory: { slug: 'abs-autres-bois', name: 'ABS Autres Bois' },
    rules: [
      { slug: 'abs-chene', keywords: ['chêne', 'chene', 'oak', 'eiche'] },
      { slug: 'abs-noyer', keywords: ['noyer', 'walnut', 'nussbaum'] },
      { slug: 'abs-hetre', keywords: ['hêtre', 'hetre', 'beech', 'buche'] },
      { slug: 'abs-frene', keywords: ['frêne', 'frene', 'ash', 'esche'] },
    ],
    fallback: 'abs-autres-bois'
  },
  'compacts-hpl': {
    newSubcategory: { slug: 'compacts-standard', name: 'Compacts Standard' },
    rules: [
      { slug: 'fenix-compacts', keywords: ['fenix'] },
    ],
    fallback: 'compacts-standard'
  },
  'panneaux-plaques-bois': {
    rules: [
      { slug: 'plaque-chene', keywords: ['chêne', 'chene', 'oak'] },
      { slug: 'plaque-noyer', keywords: ['noyer', 'walnut'] },
      { slug: 'plaque-frene', keywords: ['frêne', 'frene', 'ash'] },
      { slug: 'plaque-hetre', keywords: ['hêtre', 'hetre', 'beech'] },
      { slug: 'plaque-erable', keywords: ['érable', 'erable', 'maple'] },
      { slug: 'plaque-merisier', keywords: ['merisier', 'cherry'] },
      { slug: 'plaque-teck', keywords: ['teck', 'teak'] },
      { slug: 'plaque-wenge', keywords: ['wengé', 'wenge'] },
      { slug: 'chataigner', keywords: ['châtaignier', 'chataignier'] },
      { slug: 'plaque-pin', keywords: ['pin', 'sapin', 'épicéa', 'epicea'] },
      { slug: 'plaque-autres-essences', keywords: ['sapelli', 'acajou', 'aulne', 'bouleau'] },
    ],
    fallback: 'plaque-autres-essences'
  },
  '3-plis': {
    rules: [
      { slug: '3-plis-chene', keywords: ['chêne', 'chene', 'oak'] },
      { slug: '3-plis-epicea', keywords: ['épicéa', 'epicea', 'spruce'] },
      { slug: '3-plis-douglas', keywords: ['douglas'] },
    ],
    fallback: '3-plis-divers'
  },
  'strat-bois': {
    newSubcategory: { slug: 'strat-autres-bois', name: 'Stratifié Autres Bois' },
    rules: [
      { slug: 'strat-chene', keywords: ['chêne', 'chene', 'oak', 'eiche'] },
      { slug: 'strat-noyer', keywords: ['noyer', 'walnut', 'nussbaum'] },
      { slug: 'strat-hetre', keywords: ['hêtre', 'hetre', 'beech', 'buche'] },
      { slug: 'strat-frene', keywords: ['frêne', 'frene', 'ash', 'esche'] },
      { slug: 'strat-pin', keywords: ['pin', 'sapin'] },
      { slug: 'strat-chataigner', keywords: ['châtaignier', 'chataignier'] },
    ],
    fallback: 'strat-autres-bois'
  },
  'panneaux-muraux': {
    newSubcategory: { slug: 'muraux-accessoires', name: 'Accessoires Muraux' },
    rules: [
      { slug: 'muraux-etanches', keywords: ['étanche', 'etanche', 'waterproof', 'hydro'] },
      { slug: 'muraux-decoratifs', keywords: ['décoratif', 'decoratif', 'decor'] },
      { slug: 'muraux-acoustiques', keywords: ['acoustique', 'phonique', 'sound'] },
    ],
    fallback: 'muraux-accessoires'
  },
  'chants': {
    // Ces panneaux semblent mal catégorisés - vérifier d'abord
    rules: [
      { slug: 'chants-melamines', keywords: ['mélaminé', 'melamine'] },
      { slug: 'chants-pvc', keywords: ['pvc', 'plastique'] },
      { slug: 'chants-abs', keywords: ['abs'] },
      { slug: 'chants-plaques-bois', keywords: ['plaqué', 'plaque', 'bois'] },
    ],
    fallback: null // Pas de fallback - on garde dans parent si pas reconnu
  }
};

async function fixCategory(slug, config) {
  console.log('\n=== CORRECTION: ' + slug.toUpperCase() + ' ===');

  const parent = await p.category.findFirst({
    where: { slug },
    include: { children: { select: { id: true, slug: true } } }
  });

  if (!parent) {
    console.log('❌ Catégorie non trouvée');
    return { slug, fixed: 0, remaining: 0 };
  }

  // Créer la nouvelle sous-catégorie si nécessaire
  if (config.newSubcategory) {
    const exists = parent.children.some(c => c.slug === config.newSubcategory.slug);
    if (!exists) {
      await p.category.create({
        data: {
          slug: config.newSubcategory.slug,
          name: config.newSubcategory.name,
          parentId: parent.id,
          catalogueId: parent.catalogueId
        }
      });
      console.log('+ Créé: ' + config.newSubcategory.slug);
    }
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

  // Récupérer les panneaux mal assignés
  const panels = await p.panel.findMany({
    where: { categoryId: parent.id },
    select: { id: true, name: true }
  });

  console.log('Panneaux à redistribuer: ' + panels.length);

  if (panels.length === 0) {
    return { slug, fixed: 0, remaining: 0 };
  }

  // Classifier
  const assignments = {};
  for (const child of children) {
    assignments[child.slug] = [];
  }

  let unassigned = [];

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    for (const rule of config.rules) {
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

    if (!assigned) {
      if (config.fallback && catMap[config.fallback]) {
        assignments[config.fallback].push(panel.id);
      } else {
        unassigned.push(panel.id);
      }
    }
  }

  // Afficher distribution
  let total = 0;
  for (const [s, ids] of Object.entries(assignments)) {
    if (ids.length > 0) {
      console.log('  → ' + s + ': ' + ids.length);
      total += ids.length;
    }
  }
  if (unassigned.length > 0) {
    console.log('  → (non classé): ' + unassigned.length);
  }

  // Assigner
  for (const [s, ids] of Object.entries(assignments)) {
    if (ids.length === 0 || !catMap[s]) continue;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await p.panel.updateMany({
        where: { id: { in: batch } },
        data: { categoryId: catMap[s] }
      });
    }
  }

  const remaining = await p.panel.count({ where: { categoryId: parent.id } });
  console.log('✓ Restant dans parent: ' + remaining);

  return { slug, fixed: total, remaining };
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  CORRECTION GLOBALE DES CATÉGORIES PARENTES  ║');
  console.log('╚════════════════════════════════════════════╝');

  const results = [];

  for (const [slug, config] of Object.entries(FIXES)) {
    const result = await fixCategory(slug, config);
    results.push(result);
  }

  // Résumé final
  console.log('\n═══════════════════════════════════════════');
  console.log('                   RÉSUMÉ');
  console.log('═══════════════════════════════════════════\n');

  let totalFixed = 0;
  let totalRemaining = 0;

  for (const r of results) {
    const status = r.remaining === 0 ? '✅' : '⚠️';
    console.log(status + ' ' + r.slug.padEnd(25) + ': ' + r.fixed + ' corrigés, ' + r.remaining + ' restants');
    totalFixed += r.fixed;
    totalRemaining += r.remaining;
  }

  console.log('\nTotal corrigés: ' + totalFixed);
  console.log('Total restants: ' + totalRemaining);

  if (totalRemaining === 0) {
    console.log('\n✅ TOUT EST CORRIGÉ !');
  } else {
    console.log('\n⚠️ Certains panneaux n\'ont pas pu être classifiés');
  }

  await p.$disconnect();
}

main().catch(console.error);
