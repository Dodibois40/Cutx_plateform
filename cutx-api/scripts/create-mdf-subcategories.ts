/**
 * Crée les sous-catégories MDF manquantes :
 * - mdf-exterieur (pour Infinite Tricoya)
 * - mdf-special (pour MDF spéciaux sans catégorie)
 *
 * Usage:
 *   npx tsx scripts/create-mdf-subcategories.ts --dry-run
 *   npx tsx scripts/create-mdf-subcategories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CRÉATION DES SOUS-CATÉGORIES MDF                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Trouver la catégorie parent MDF
  const mdfParent = await prisma.category.findFirst({
    where: { slug: 'mdf' },
    include: { children: { select: { slug: true, name: true } } }
  });

  if (!mdfParent) {
    // Chercher panneaux-bruts qui contient probablement les MDF
    const panneauxBruts = await prisma.category.findFirst({
      where: { slug: 'panneaux-bruts' },
      include: { children: { select: { slug: true, name: true, id: true } } }
    });

    if (panneauxBruts) {
      console.log('📂 Parent trouvé: panneaux-bruts');
      console.log('   Enfants actuels:');
      for (const c of panneauxBruts.children) {
        console.log(`      - ${c.slug}: ${c.name}`);
      }

      // Trouver le parent MDF dans panneaux-bruts
      const mdfCategory = panneauxBruts.children.find(c => c.slug === 'mdf' || c.slug.startsWith('mdf-'));
      if (mdfCategory) {
        console.log(`\n🎯 Catégorie MDF trouvée: ${mdfCategory.slug}`);
      }
    }
  }

  // Chercher toutes les catégories MDF existantes
  const mdfCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'mdf-' } },
    select: { id: true, slug: true, name: true, parentId: true }
  });

  console.log('\n📂 Catégories MDF existantes:');
  for (const c of mdfCategories) {
    console.log(`   ${c.slug}: ${c.name}`);
  }

  // Trouver le parent des catégories MDF et le catalogueId
  const mdfStandard = await prisma.category.findFirst({
    where: { slug: 'mdf-standard' },
    select: { parentId: true, catalogueId: true }
  });

  const parentId = mdfStandard?.parentId;
  const catalogueId = mdfStandard?.catalogueId;

  if (!parentId || !catalogueId) {
    console.error('❌ Impossible de trouver le parent ou catalogue des catégories MDF!');
    return;
  }

  console.log(`\n🎯 Parent ID: ${parentId}`);
  console.log(`🎯 Catalogue ID: ${catalogueId}`);

  // Vérifier si les catégories existent déjà
  const existingExterieur = mdfCategories.find(c => c.slug === 'mdf-exterieur');
  const existingSpecial = mdfCategories.find(c => c.slug === 'mdf-special');

  const toCreate: { slug: string; name: string }[] = [];

  if (!existingExterieur) {
    toCreate.push({
      slug: 'mdf-exterieur',
      name: 'MDF Extérieur'
    });
  } else {
    console.log('\n✅ mdf-exterieur existe déjà');
  }

  if (!existingSpecial) {
    toCreate.push({
      slug: 'mdf-special',
      name: 'MDF Spécial'
    });
  } else {
    console.log('✅ mdf-special existe déjà');
  }

  if (toCreate.length === 0) {
    console.log('\n✅ Toutes les catégories existent déjà!');
    await prisma.$disconnect();
    return;
  }

  console.log('\n═══ CATÉGORIES À CRÉER ═══\n');
  for (const cat of toCreate) {
    console.log(`   📁 ${cat.slug}: ${cat.name}`);
  }

  if (!DRY_RUN) {
    console.log('═══ CRÉATION ═══\n');

    for (const cat of toCreate) {
      try {
        const created = await prisma.category.create({
          data: {
            slug: cat.slug,
            name: cat.name,
            parentId: parentId,
            catalogueId: catalogueId,
            sortOrder: cat.slug === 'mdf-exterieur' ? 90 : 99 // À la fin
          }
        });
        console.log(`✅ ${cat.slug} créé [${created.id}]`);
      } catch (error) {
        console.log(`❌ ${cat.slug}: ${(error as Error).message}`);
      }
    }
  }

  // Maintenant déplacer les Tricoya vers mdf-exterieur
  if (!DRY_RUN) {
    console.log('\n═══ DÉPLACEMENT DES TRICOYA ═══\n');

    const mdfExterieur = await prisma.category.findFirst({ where: { slug: 'mdf-exterieur' } });

    if (mdfExterieur) {
      // Récupérer les Tricoya de panneaux-speciaux
      const panneauxSpeciaux = await prisma.category.findFirst({ where: { slug: 'panneaux-speciaux' } });

      const tricoyaPanels = await prisma.panel.findMany({
        where: {
          name: { contains: 'tricoya', mode: 'insensitive' }
        },
        select: { id: true, reference: true, name: true, categoryId: true }
      });

      let moved = 0;
      for (const p of tricoyaPanels) {
        try {
          await prisma.panel.update({
            where: { id: p.id },
            data: {
              categoryId: mdfExterieur.id,
              productType: 'MDF'
            }
          });
          console.log(`✅ ${p.reference} → mdf-exterieur`);
          moved++;
        } catch (error) {
          console.log(`❌ ${p.reference}: ${(error as Error).message}`);
        }
      }

      console.log(`\n✅ ${moved} Tricoya déplacés vers mdf-exterieur`);
    }
  }

  console.log('\n═══ RÉSUMÉ ═══');
  console.log(`   Catégories créées: ${toCreate.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
