/**
 * Vérifier si le produit F244 ST76 a été mis à jour avec les dimensions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkF244() {
  console.log('🔍 Vérification du produit F244 ST76 après rescraping\n');

  // Chercher le produit F244
  const f244 = await prisma.panel.findFirst({
    where: {
      OR: [
        { name: { contains: 'F244', mode: 'insensitive' } },
        { manufacturerRef: 'F244' },
        { reference: { contains: '93226' } },
      ],
      productType: { in: ['PLAN_DE_TRAVAIL', 'COMPACT'] }
    },
    select: {
      reference: true,
      name: true,
      supplierCode: true,
      manufacturerRef: true,
      productType: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      thickness: true,
      pricePerM2: true,
      pricePerUnit: true,
      imageUrl: true,
      stockStatus: true,
      decorCode: true,
      finishCode: true,
    }
  });

  if (!f244) {
    console.log('❌ Produit F244 ST76 NON TROUVÉ dans la base');
    console.log('\n💡 Possibilités:');
    console.log('   1. Le scraping n\'a pas encore traité ce produit');
    console.log('   2. Le produit n\'apparaît pas sur les pages catégories');
    console.log('   3. Le nom/référence ne correspond pas');
    return;
  }

  console.log('✅ Produit trouvé:\n');
  console.log(`   Référence: ${f244.reference}`);
  console.log(`   Nom: ${f244.name}`);
  console.log(`   SupplierCode: ${f244.supplierCode || 'NULL'}`);
  console.log(`   ManufacturerRef: ${f244.manufacturerRef || 'NULL'}`);
  console.log(`   ProductType: ${f244.productType || 'NULL'}`);
  console.log('');
  console.log('📏 DIMENSIONS:');
  console.log(`   Longueur: ${f244.defaultLength || 'NULL'} mm`);
  console.log(`   Largeur: ${f244.defaultWidth || 'NULL'} mm`);
  console.log(`   Épaisseur défaut: ${f244.defaultThickness || 'NULL'} mm`);
  console.log(`   Épaisseurs disponibles: ${f244.thickness?.length ? f244.thickness.join(', ') + ' mm' : 'NULL'}`);
  console.log('');
  console.log('💰 PRIX:');
  console.log(`   Prix/m²: ${f244.pricePerM2 ? f244.pricePerM2 + ' €' : 'NULL'}`);
  console.log(`   Prix/unité: ${f244.pricePerUnit ? f244.pricePerUnit + ' €' : 'NULL'}`);
  console.log('');
  console.log('🎨 DÉCOR & FINITION:');
  console.log(`   Décor: ${f244.decorCode || 'NULL'}`);
  console.log(`   Finition: ${f244.finishCode || 'NULL'}`);
  console.log('');
  console.log('📦 AUTRES:');
  console.log(`   Image: ${f244.imageUrl ? 'PRÉSENTE' : 'NULL'}`);
  console.log(`   Stock: ${f244.stockStatus || 'NULL'}`);

  // Vérifier si complet
  const isComplete =
    f244.defaultLength &&
    f244.defaultWidth &&
    f244.defaultThickness &&
    (f244.pricePerM2 || f244.pricePerUnit);

  console.log('');
  console.log(isComplete ? '✅ PRODUIT COMPLET' : '⚠️  DONNÉES INCOMPLÈTES');

  if (!isComplete) {
    const missing: string[] = [];
    if (!f244.defaultLength) missing.push('Longueur');
    if (!f244.defaultWidth) missing.push('Largeur');
    if (!f244.defaultThickness) missing.push('Épaisseur');
    if (!f244.pricePerM2 && !f244.pricePerUnit) missing.push('Prix');
    console.log(`   Manque: ${missing.join(', ')}`);
  }

  // Calculer le poids estimé
  if (f244.defaultLength && f244.defaultWidth && f244.defaultThickness) {
    const density = 1350; // HPL Compact
    const volume = (f244.defaultLength / 1000) * (f244.defaultWidth / 1000) * (f244.defaultThickness / 1000);
    const weight = volume * density;
    console.log('');
    console.log(`⚖️  Poids estimé: ${weight.toFixed(1)} kg (densité: ${density} kg/m³)`);
  }
}

checkF244()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
