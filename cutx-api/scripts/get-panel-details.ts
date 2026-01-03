/**
 * Get panel details for product sheet
 * Run with: npx tsx scripts/get-panel-details.ts <reference>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ref = process.argv[2] || '81184';

  console.log(`🔍 Recherche du produit: ${ref}\n`);

  const panel = await prisma.panel.findFirst({
    where: {
      OR: [
        { reference: { contains: ref, mode: 'insensitive' } },
        { manufacturerRef: { contains: ref, mode: 'insensitive' } },
      ],
    },
    include: {
      catalogue: true,
      category: { include: { parent: true } },
    },
  });

  if (!panel) {
    console.log('❌ Produit non trouvé');
    await prisma.$disconnect();
    return;
  }

  console.log('='.repeat(60));
  console.log('📦 FICHE PRODUIT');
  console.log('='.repeat(60));

  // Basic info
  console.log('\n📋 INFORMATIONS GÉNÉRALES\n');
  console.log(`   Référence:      ${panel.reference}`);
  console.log(`   Nom:            ${panel.name}`);
  console.log(`   Type:           ${panel.productType || 'Non spécifié'}`);
  console.log(`   Catalogue:      ${panel.catalogue.name}`);

  if (panel.category) {
    const catPath = panel.category.parent
      ? `${panel.category.parent.name} > ${panel.category.name}`
      : panel.category.name;
    console.log(`   Catégorie:      ${catPath}`);
  }

  // Description
  console.log('\n📝 DESCRIPTION\n');
  if (panel.description) {
    console.log(`   ${panel.description}`);
  } else {
    console.log('   ⚠️ Pas de description disponible');
    console.log(`   (Générée depuis le nom: ${panel.name})`);
  }

  // Technical specs
  console.log('\n📐 CARACTÉRISTIQUES TECHNIQUES\n');

  if (panel.manufacturerRef) {
    console.log(`   Réf. fabricant: ${panel.manufacturerRef}`);
  }

  if (panel.decor) {
    console.log(`   Décor:          ${panel.decor}`);
  }

  if (panel.colorCode) {
    console.log(`   Code couleur:   ${panel.colorCode}`);
  }

  if (panel.material) {
    console.log(`   Matériau:       ${panel.material}`);
  }

  if (panel.finish) {
    console.log(`   Finition:       ${panel.finish}`);
  }

  // Dimensions
  console.log('\n📏 DIMENSIONS\n');

  if (panel.thickness && panel.thickness.length > 0) {
    const thicknesses = panel.thickness.map((t: number) => `${t}mm`).join(', ');
    console.log(`   Épaisseurs:     ${thicknesses}`);
    if (panel.defaultThickness) {
      console.log(`   Épaisseur std:  ${panel.defaultThickness}mm`);
    }
  } else if (panel.defaultThickness) {
    console.log(`   Épaisseur:      ${panel.defaultThickness}mm`);
  } else {
    console.log('   Épaisseur:      Non spécifiée');
  }

  if (panel.defaultWidth && panel.defaultLength) {
    console.log(`   Format:         ${panel.defaultWidth} x ${panel.defaultLength} mm`);
  } else if (panel.defaultWidth) {
    console.log(`   Largeur:        ${panel.defaultWidth} mm`);
  }

  if (panel.isVariableLength) {
    console.log(`   Longueur:       Variable (à la coupe)`);
  }

  // Pricing
  console.log('\n💰 TARIFICATION\n');

  if (panel.pricePerM2) {
    console.log(`   Prix/m²:        ${panel.pricePerM2.toFixed(2)} €`);
  }

  if (panel.pricePerMl) {
    console.log(`   Prix/ml:        ${panel.pricePerMl.toFixed(2)} €`);
  }

  if (panel.pricePerUnit) {
    console.log(`   Prix/unité:     ${panel.pricePerUnit.toFixed(2)} €`);
  }

  if (!panel.pricePerM2 && !panel.pricePerMl && !panel.pricePerUnit) {
    console.log('   ⚠️ Prix non disponible - Sur devis');
  }

  // Stock
  console.log('\n📦 DISPONIBILITÉ\n');
  console.log(`   Statut:         ${panel.stockStatus || 'Non spécifié'}`);

  // Image
  console.log('\n🖼️ MÉDIA\n');
  if (panel.imageUrl) {
    console.log(`   Image:          ✅ Disponible`);
    console.log(`   URL:            ${panel.imageUrl.substring(0, 60)}...`);
  } else {
    console.log('   Image:          ❌ Non disponible');
  }

  // Metadata
  if (panel.metadata) {
    console.log('\n📊 MÉTADONNÉES SUPPLÉMENTAIRES\n');
    try {
      const meta = JSON.parse(panel.metadata);
      for (const [key, value] of Object.entries(meta)) {
        if (value && value !== '' && value !== 0) {
          console.log(`   ${key}: ${value}`);
        }
      }
    } catch {
      console.log('   (Format invalide)');
    }
  }

  console.log('\n' + '='.repeat(60));

  // Raw data for debugging
  console.log('\n🔧 DONNÉES BRUTES (pour développement)\n');
  console.log(JSON.stringify({
    id: panel.id,
    reference: panel.reference,
    name: panel.name,
    description: panel.description,
    productType: panel.productType,
    material: panel.material,
    finish: panel.finish,
    decor: panel.decor,
    colorCode: panel.colorCode,
    manufacturerRef: panel.manufacturerRef,
    thickness: panel.thickness,
    defaultThickness: panel.defaultThickness,
    defaultWidth: panel.defaultWidth,
    defaultLength: panel.defaultLength,
    isVariableLength: panel.isVariableLength,
    pricePerM2: panel.pricePerM2,
    pricePerMl: panel.pricePerMl,
    pricePerUnit: panel.pricePerUnit,
    stockStatus: panel.stockStatus,
    imageUrl: panel.imageUrl,
    catalogue: panel.catalogue.name,
    category: panel.category?.name,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
