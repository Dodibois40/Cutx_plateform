/**
 * Fix les 2 dernières catégories problématiques
 * 1. chants-plaques-bois (8 panneaux) -> chant-divers
 * 2. panneaux-muraux sous "Panneaux" (78 panneaux) -> muraux-accessoires
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== CORRECTION DES 2 DERNIÈRES CATÉGORIES ===\n');

  // 1. Fix chants-plaques-bois -> move to chant-divers
  const chantsPlaqBois = await p.category.findFirst({ where: { slug: 'chants-plaques-bois' } });
  const chantDivers = await p.category.findFirst({ where: { slug: 'chant-divers' } });

  if (chantsPlaqBois && chantDivers) {
    const r1 = await p.panel.updateMany({
      where: { categoryId: chantsPlaqBois.id },
      data: { categoryId: chantDivers.id }
    });
    console.log('✓ chants-plaques-bois -> chant-divers: ' + r1.count + ' panneaux');
  } else {
    console.log('⚠️ chants-plaques-bois ou chant-divers non trouvé');
  }

  // 2. Fix panneaux-muraux (le parent avec 78 panneaux)
  // Il y a DEUX catégories panneaux-muraux
  const allMuraux = await p.category.findMany({
    where: { slug: 'panneaux-muraux' },
    include: {
      parent: { select: { slug: true } },
      _count: { select: { panels: true } },
      children: { select: { slug: true, id: true } }
    }
  });

  console.log('\nCatégories panneaux-muraux trouvées:');
  for (const m of allMuraux) {
    console.log('  - id=' + m.id + ' parent=' + (m.parent?.slug || 'RACINE') + ' panels=' + m._count.panels);
  }

  // Celui sous 'panneaux' avec 78 panneaux
  const murauxSousPanneaux = allMuraux.find(m => m.parent && m.parent.slug === 'panneaux');

  if (murauxSousPanneaux && murauxSousPanneaux._count.panels > 0) {
    // Trouver ou créer muraux-accessoires
    let acc = murauxSousPanneaux.children.find(c => c.slug === 'muraux-accessoires');

    if (!acc) {
      acc = await p.category.create({
        data: {
          slug: 'muraux-accessoires',
          name: 'Accessoires Muraux',
          parentId: murauxSousPanneaux.id,
          catalogueId: murauxSousPanneaux.catalogueId
        }
      });
      console.log('\n+ Créé muraux-accessoires sous panneaux-muraux');
    }

    const r2 = await p.panel.updateMany({
      where: { categoryId: murauxSousPanneaux.id },
      data: { categoryId: acc.id }
    });
    console.log('✓ panneaux-muraux -> muraux-accessoires: ' + r2.count + ' panneaux');
  } else {
    console.log('⚠️ panneaux-muraux sous Panneaux non trouvé ou déjà vide');
  }

  // Vérification finale
  console.log('\n=== VÉRIFICATION FINALE ===');

  const remaining1 = chantsPlaqBois ?
    await p.panel.count({ where: { categoryId: chantsPlaqBois.id } }) : 0;
  const remaining2 = murauxSousPanneaux ?
    await p.panel.count({ where: { categoryId: murauxSousPanneaux.id } }) : 0;

  console.log('Restant dans chants-plaques-bois: ' + remaining1);
  console.log('Restant dans panneaux-muraux: ' + remaining2);

  if (remaining1 === 0 && remaining2 === 0) {
    console.log('\n✅ TOUT CORRIGÉ !');
  }

  await p.$disconnect();
}

main().catch(console.error);
