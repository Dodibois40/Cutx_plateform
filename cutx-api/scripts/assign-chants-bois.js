/**
 * Script d'assignation des chants BOIS aux sous-catégories
 * CHANT_BOIS → chant-chene, chant-noyer, chant-divers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Essences pour les chants bois
const ESSENCES = {
  'chant-chene': ['chene', 'chêne', 'oak', 'eiche'],
  'chant-noyer': ['noyer', 'walnut', 'nuss'],
  // Pas de hêtre/frêne dans les sous-catégories chants plaqués bois → divers
};

async function main() {
  console.log('=== ASSIGNATION CHANTS BOIS ===\n');

  // Vérifier que les catégories existent
  const categories = await prisma.category.findMany({
    where: {
      slug: { in: ['chant-chene', 'chant-noyer', 'chant-divers', 'chants-plaques-bois'] }
    }
  });

  const catMap = {};
  for (const c of categories) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories trouvées:', Object.keys(catMap));

  if (!catMap['chant-chene'] || !catMap['chant-noyer'] || !catMap['chant-divers']) {
    console.error('ERREUR: Catégories manquantes!');
    await prisma.$disconnect();
    return;
  }

  // Récupérer tous les chants BOIS non assignés
  const chantsBois = await prisma.panel.findMany({
    where: {
      panelSubType: 'CHANT_BOIS',
      categoryId: null
    },
    select: { id: true, name: true, reference: true }
  });

  console.log(`\nChants BOIS à traiter: ${chantsBois.length}\n`);

  // Analyser et assigner
  const assignments = {
    'chant-chene': [],
    'chant-noyer': [],
    'chant-divers': []
  };

  for (const panel of chantsBois) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    // Vérifier chaque essence
    for (const [slug, keywords] of Object.entries(ESSENCES)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          assignments[slug].push(panel);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    // Si pas d'essence trouvée → divers
    if (!assigned) {
      assignments['chant-divers'].push(panel);
    }
  }

  // Afficher la distribution
  console.log('=== DISTRIBUTION ===');
  for (const [slug, panels] of Object.entries(assignments)) {
    console.log(`${slug}: ${panels.length} panneaux`);
    // Afficher quelques exemples
    for (const p of panels.slice(0, 3)) {
      console.log(`  - ${p.reference}: ${p.name.substring(0, 60)}...`);
    }
  }

  // Exécuter les assignations
  console.log('\n=== ASSIGNATION ===');
  let totalAssigned = 0;

  for (const [slug, panels] of Object.entries(assignments)) {
    if (panels.length === 0) continue;

    const ids = panels.map(p => p.id);
    await prisma.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });

    console.log(`✅ ${slug}: ${panels.length} panneaux assignés`);
    totalAssigned += panels.length;
  }

  console.log(`\n✅ TOTAL: ${totalAssigned} chants BOIS assignés`);

  await prisma.$disconnect();
}

main().catch(console.error);
