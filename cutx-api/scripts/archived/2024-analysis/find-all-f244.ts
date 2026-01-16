/**
 * Trouver TOUS les produits F244 dans la base
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllF244() {
  console.log('🔍 Recherche de TOUS les produits F244\n');

  const products = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'F244', mode: 'insensitive' } },
        { manufacturerRef: 'F244' },
        { decorCode: 'F244' },
        { reference: { contains: '93226' } },
      ]
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
      pricePerM2: true,
      pricePerUnit: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' }
  });

  console.log(`📊 ${products.length} produit(s) F244 trouvé(s)\n`);

  if (products.length === 0) {
    console.log('❌ Aucun produit F244 trouvé');
    return;
  }

  products.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.reference}`);
    console.log(`   Nom: ${p.name}`);
    console.log(`   Type: ${p.productType || 'NULL'}`);
    console.log(`   ManufacturerRef: ${p.manufacturerRef || 'NULL'}`);
    console.log(`   Dimensions: ${p.defaultLength || 'NULL'} x ${p.defaultWidth || 'NULL'} x ${p.defaultThickness || 'NULL'} mm`);
    console.log(`   Prix/m²: ${p.pricePerM2 ? p.pricePerM2 + ' €' : 'NULL'}`);
    console.log(`   Prix/unité: ${p.pricePerUnit ? p.pricePerUnit + ' €' : 'NULL'}`);
    console.log(`   Créé: ${p.createdAt.toISOString().split('T')[0]}`);
    console.log(`   Mis à jour: ${p.updatedAt.toISOString().split('T')[0]}`);

    const hasCompleteDims = p.defaultLength && p.defaultWidth && p.defaultThickness;
    console.log(`   Status: ${hasCompleteDims ? '✅ COMPLET' : '❌ INCOMPLET'}`);
    console.log('');
  });

  // Chercher aussi avec ST76
  console.log('🔍 Recherche avec "ST76":\n');
  const st76Products = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'ST76', mode: 'insensitive' } },
        { finishCode: 'ST76' },
      ]
    },
    select: {
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  console.log(`📊 ${st76Products.length} produit(s) avec ST76 trouvé(s) (top 10 récents)\n`);
  st76Products.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.reference.substring(0, 30)}... - ${p.name.substring(0, 50)}...`);
    console.log(`   Dims: ${p.defaultLength || 'NULL'} x ${p.defaultWidth || 'NULL'} x ${p.defaultThickness || 'NULL'}`);
    console.log(`   MAJ: ${p.updatedAt.toISOString().split('T')[0]}`);
    console.log('');
  });
}

findAllF244()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
