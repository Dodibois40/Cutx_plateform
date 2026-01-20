/**
 * ASSIGNATION CONTREPLAQUES PAR LOTS DE 100
 * Avec logs détaillés pour chaque panneau
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Règles de classification (ordre de priorité)
const RULES = [
  // 1. Spécialités fonctionnelles (priorité haute)
  { slug: 'cp-antiderapant', keywords: ['antidérapant', 'antiderapant', 'tex', 'wire'] },
  { slug: 'cp-cintrable', keywords: ['cintrable', 'superform', 'poflex', 'flex'] },
  { slug: 'cp-filme', keywords: ['filmé', 'filme', 'coffrage', 'form'] },
  { slug: 'cp-marine-ctbx', keywords: ['ctbx', 'marine', 'extérieur', 'exterieur', 'classe 3', 'wbp'] },

  // 2. Essences
  { slug: 'cp-bouleau', keywords: ['bouleau', 'birch', 'riga'] },
  { slug: 'cp-okoume', keywords: ['okoumé', 'okoume', 'okume'] },
  { slug: 'cp-peuplier', keywords: ['peuplier', 'poplar'] },
  { slug: 'cp-pin-maritime', keywords: ['pin', 'elliotis', 'radiata', 'sapin', 'résineux', 'resineux', 'epicéa', 'epicea', 'spruce'] },
  { slug: 'cp-exotique', keywords: ['sapelli', 'eucalyptus', 'ceiba', 'acajou', 'teck', 'exotique', 'import'] },
];

async function main() {
  console.log('=== ASSIGNATION CONTREPLAQUES ===\n');

  // Charger la catégorie parente
  const cpCat = await p.category.findFirst({ where: { slug: 'contreplaques' } });
  if (!cpCat) {
    console.log('❌ Catégorie "contreplaques" non trouvée');
    return;
  }

  // Charger les sous-catégories
  const children = await p.category.findMany({
    where: { parentId: cpCat.id },
    select: { id: true, slug: true, name: true }
  });

  const catMap = {};
  for (const c of children) {
    catMap[c.slug] = c.id;
  }

  console.log('Sous-catégories disponibles:');
  for (const c of children) {
    console.log('  ' + c.slug);
  }
  console.log('');

  // Récupérer tous les CP dans la catégorie parente
  const panels = await p.panel.findMany({
    where: { categoryId: cpCat.id },
    select: { id: true, name: true, reference: true },
    orderBy: { name: 'asc' }
  });

  console.log('Total panneaux à traiter: ' + panels.length + '\n');

  // Classification
  const assignments = {};
  for (const rule of RULES) {
    assignments[rule.slug] = [];
  }
  assignments['non-classe'] = [];

  let lotNum = 1;
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const text = panel.name.toLowerCase();
    let assigned = false;
    let assignedTo = null;

    for (const rule of RULES) {
      for (const kw of rule.keywords) {
        if (text.includes(kw)) {
          if (catMap[rule.slug]) {
            assignments[rule.slug].push(panel.id);
            assigned = true;
            assignedTo = rule.slug;
          }
          break;
        }
      }
      if (assigned) break;
    }

    if (!assigned) {
      assignments['non-classe'].push(panel.id);
      assignedTo = 'NON-CLASSE';
    }

    // Log tous les 100
    if ((i + 1) % 100 === 0 || i === panels.length - 1) {
      console.log('--- LOT ' + lotNum + ' (panneaux ' + (lotNum - 1) * 100 + 1 + '-' + (i + 1) + ') ---');
      console.log('  Dernier traité: ' + panel.name.substring(0, 50));
      console.log('  → ' + assignedTo);
      console.log('');
      lotNum++;
    }
  }

  // Résumé avant assignation
  console.log('=== RÉSUMÉ AVANT ASSIGNATION ===\n');
  let totalAssigne = 0;
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length > 0) {
      console.log(slug.padEnd(20) + ': ' + ids.length);
      if (slug !== 'non-classe') totalAssigne += ids.length;
    }
  }
  console.log('\nTotal à assigner: ' + totalAssigne);
  console.log('Non classés (restent dans parent): ' + assignments['non-classe'].length);

  // Assignation effective
  console.log('\n=== ASSIGNATION EN COURS ===\n');

  for (const [slug, ids] of Object.entries(assignments)) {
    if (slug === 'non-classe' || ids.length === 0 || !catMap[slug]) continue;

    // Assigner par lots de 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await p.panel.updateMany({
        where: { id: { in: batch } },
        data: { categoryId: catMap[slug] }
      });
      console.log('✅ ' + slug + ' lot ' + Math.ceil((i + 1) / 100) + ': ' + batch.length + ' panneaux');
    }
  }

  // Vérification finale
  console.log('\n=== VÉRIFICATION FINALE ===\n');

  const remaining = await p.panel.count({ where: { categoryId: cpCat.id } });
  console.log('Panneaux restant dans "contreplaques" (parent): ' + remaining);

  for (const c of children) {
    const count = await p.panel.count({ where: { categoryId: c.id } });
    if (count > 0) {
      console.log(c.slug.padEnd(20) + ': ' + count);
    }
  }

  console.log('\n✅ TERMINÉ');
  await p.$disconnect();
}

main().catch(console.error);
