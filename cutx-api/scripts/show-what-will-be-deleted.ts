/**
 * Script pour montrer exactement ce qui sera supprimé
 * avant la réinitialisation du catalogue
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(70));
  console.log('📊 ANALYSE COMPLÈTE DU CATALOGUE BOUNEY - CE QUI SERA SUPPRIMÉ');
  console.log('═'.repeat(70));

  // Récupérer le catalogue Bouney
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.log('❌ Catalogue Bouney non trouvé');
    await prisma.$disconnect();
    return;
  }

  // Stats globales
  const totalPanels = await prisma.panel.count({
    where: { catalogueId: catalogue.id }
  });

  const totalCategories = await prisma.category.count({
    where: { catalogueId: catalogue.id }
  });

  console.log('\n📋 RÉSUMÉ GLOBAL:');
  console.log(`   Catalogue: ${catalogue.name} (${catalogue.slug})`);
  console.log(`   Total panneaux: ${totalPanels}`);
  console.log(`   Total catégories: ${totalCategories}`);

  // Répartition par format de référence
  console.log('\n📊 RÉPARTITION PAR FORMAT DE RÉFÉRENCE:');

  const bcbPanels = await prisma.panel.count({
    where: { catalogueId: catalogue.id, reference: { startsWith: 'BCB-' } }
  });

  const eggerPanels = await prisma.panel.count({
    where: { catalogueId: catalogue.id, reference: { endsWith: '-egger' } }
  });

  const pfleidererPanels = await prisma.panel.count({
    where: { catalogueId: catalogue.id, reference: { endsWith: '-pfleiderer' } }
  });

  const unilinPanels = await prisma.panel.count({
    where: { catalogueId: catalogue.id, reference: { endsWith: '-unilin' } }
  });

  const fantoniPanels = await prisma.panel.count({
    where: { catalogueId: catalogue.id, reference: { endsWith: '-fantoni' } }
  });

  const autres = totalPanels - bcbPanels - eggerPanels - pfleidererPanels - unilinPanels - fantoniPanels;

  console.log(`   BCB-*:          ${bcbPanels} panneaux`);
  console.log(`   *-egger:        ${eggerPanels} panneaux`);
  console.log(`   *-pfleiderer:   ${pfleidererPanels} panneaux`);
  console.log(`   *-unilin:       ${unilinPanels} panneaux`);
  console.log(`   *-fantoni:      ${fantoniPanels} panneaux`);
  console.log(`   Autres:         ${autres} panneaux`);

  // État des données
  console.log('\n📊 QUALITÉ DES DONNÉES:');

  const withDimensions = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      defaultLength: { gt: 0 },
      defaultWidth: { gt: 0 }
    }
  });

  const withPrice = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      pricePerM2: { gt: 0 }
    }
  });

  const withImage = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      imageUrl: { not: null }
    }
  });

  const withFirebaseImage = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      imageUrl: { contains: 'firebasestorage' }
    }
  });

  const withStock = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      stockStatus: { not: null }
    }
  });

  const enStock = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      stockStatus: 'EN STOCK'
    }
  });

  const surCommande = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      stockStatus: 'Sur commande'
    }
  });

  console.log(`   Avec dimensions (L+W):    ${withDimensions} (${((withDimensions/totalPanels)*100).toFixed(1)}%)`);
  console.log(`   Avec prix:                ${withPrice} (${((withPrice/totalPanels)*100).toFixed(1)}%)`);
  console.log(`   Avec image:               ${withImage} (${((withImage/totalPanels)*100).toFixed(1)}%)`);
  console.log(`   Images Firebase:          ${withFirebaseImage} (${((withFirebaseImage/totalPanels)*100).toFixed(1)}%)`);
  console.log(`   Avec stock renseigné:     ${withStock} (${((withStock/totalPanels)*100).toFixed(1)}%)`);
  console.log(`      - EN STOCK:            ${enStock}`);
  console.log(`      - Sur commande:        ${surCommande}`);

  // Données complètes vs incomplètes
  const complete = await prisma.panel.count({
    where: {
      catalogueId: catalogue.id,
      defaultLength: { gt: 0 },
      defaultWidth: { gt: 0 },
      pricePerM2: { gt: 0 },
      imageUrl: { not: null }
    }
  });

  console.log(`\n   ✅ Panneaux COMPLETS:     ${complete} (${((complete/totalPanels)*100).toFixed(1)}%)`);
  console.log(`   ❌ Panneaux INCOMPLETS:   ${totalPanels - complete} (${(((totalPanels - complete)/totalPanels)*100).toFixed(1)}%)`);

  // Répartition par catégorie
  console.log('\n📁 RÉPARTITION PAR CATÉGORIE:');

  const categories = await prisma.category.findMany({
    where: { catalogueId: catalogue.id, parentId: null },
    include: {
      _count: { select: { panels: true } },
      children: {
        include: {
          _count: { select: { panels: true } }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  for (const cat of categories) {
    const childrenCount = cat.children.reduce((sum, c) => sum + c._count.panels, 0);
    const total = cat._count.panels + childrenCount;
    if (total > 0) {
      console.log(`\n   📂 ${cat.name}: ${total} panneaux`);
      for (const sub of cat.children) {
        if (sub._count.panels > 0) {
          console.log(`      └─ ${sub.name}: ${sub._count.panels}`);
        }
      }
    }
  }

  // Exemples de panneaux
  console.log('\n📋 EXEMPLES DE PANNEAUX:');

  console.log('\n   ✅ Exemples COMPLETS (dimensions + prix + image):');
  const sampleComplete = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      defaultLength: { gt: 0 },
      defaultWidth: { gt: 0 },
      pricePerM2: { gt: 0 },
      imageUrl: { not: null }
    },
    select: { reference: true, name: true, defaultLength: true, defaultWidth: true, pricePerM2: true },
    take: 5
  });
  sampleComplete.forEach(p => {
    console.log(`      - ${p.reference}: ${p.defaultLength}x${p.defaultWidth}mm @ ${p.pricePerM2}€/m²`);
  });

  console.log('\n   ❌ Exemples SANS DIMENSIONS:');
  const sampleNoDim = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      OR: [{ defaultLength: 0 }, { defaultWidth: 0 }]
    },
    select: { reference: true, name: true, pricePerM2: true },
    take: 5
  });
  sampleNoDim.forEach(p => {
    console.log(`      - ${p.reference}: ${p.name} (prix: ${p.pricePerM2 || 'N/A'}€/m²)`);
  });

  console.log('\n   ❌ Exemples SANS PRIX:');
  const sampleNoPrice = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      OR: [{ pricePerM2: null }, { pricePerM2: 0 }]
    },
    select: { reference: true, name: true, defaultLength: true, defaultWidth: true },
    take: 5
  });
  sampleNoPrice.forEach(p => {
    console.log(`      - ${p.reference}: ${p.defaultLength}x${p.defaultWidth}mm (sans prix)`);
  });

  // Résumé final
  console.log('\n' + '═'.repeat(70));
  console.log('⚠️  RÉSUMÉ - CE QUI SERA SUPPRIMÉ:');
  console.log('═'.repeat(70));
  console.log(`   🗑️  ${totalPanels} panneaux`);
  console.log(`   🗑️  ${totalCategories} catégories`);
  console.log('\n   Après suppression, on pourra re-scrapper proprement avec:');
  console.log('   - Un seul format de référence (BCB-XXXXX)');
  console.log('   - Dimensions systématiquement récupérées');
  console.log('   - Stock récupéré');
  console.log('   - Prix récupéré');
  console.log('   - Images migrées vers Firebase');
  console.log('═'.repeat(70));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
