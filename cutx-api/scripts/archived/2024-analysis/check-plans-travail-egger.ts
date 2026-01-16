import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlansTravail() {
  console.log('🔍 Vérification des plans de travail Egger\n');

  // Chercher les produits visibles dans la capture
  const products = await prisma.panel.findMany({
    where: {
      OR: [
        { manufacturerRef: { in: ['F244', 'U7081', 'U999', '0720'] } },
        { name: { contains: 'F244 ST76', mode: 'insensitive' } },
        { name: { contains: 'U999 ST76', mode: 'insensitive' } },
        { name: { contains: 'U7081 ST76', mode: 'insensitive' } },
        { name: { contains: 'FENIX 0720', mode: 'insensitive' } },
        { reference: { startsWith: 'BCB-PDT-84' } },
      ],
    },
    select: {
      reference: true,
      name: true,
      supplierCode: true,
      manufacturerRef: true,
      productType: true,
      material: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      thickness: true,
      pricePerM2: true,
      category: {
        select: {
          name: true,
          parent: {
            select: {
              name: true,
            },
          },
        },
      },
      catalogue: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (products.length === 0) {
    console.log('❌ Aucun produit trouvé\n');
    return;
  }

  console.log(`✅ ${products.length} produit(s) trouvé(s):\n`);

  products.forEach((panel, idx) => {
    const shortName = panel.name.substring(0, 70);
    console.log(`${idx + 1}. ${panel.reference}`);
    console.log(`   ${shortName}`);
    console.log(`   📂 Catégorie: ${panel.category?.parent?.name ? panel.category.parent.name + ' > ' : ''}${panel.category?.name || 'N/A'}`);
    console.log(`   🏭 Catalogue: ${panel.catalogue.name}`);
    console.log(`   🏷️  ManufacturerRef: ${panel.manufacturerRef || 'NULL'}`);
    console.log(`   🔖 SupplierCode: ${panel.supplierCode || 'NULL'}`);
    console.log(`   📦 ProductType: ${panel.productType || 'NULL'}`);
    console.log(`   🔧 Material: ${panel.material || 'NULL'}`);

    // Vérifier les dimensions
    const hasLength = panel.defaultLength !== null && panel.defaultLength > 0;
    const hasWidth = panel.defaultWidth !== null && panel.defaultWidth > 0;
    const hasThickness = panel.defaultThickness !== null && panel.defaultThickness > 0;
    const hasThicknessArray = panel.thickness && panel.thickness.length > 0;

    if (hasLength && hasWidth && hasThickness) {
      console.log(`   ✅ Dimensions: ${panel.defaultLength} × ${panel.defaultWidth} × ${panel.defaultThickness} mm`);
    } else {
      console.log(`   ❌ DONNÉES MANQUANTES:`);
      console.log(`      defaultLength: ${panel.defaultLength || 'NULL'}`);
      console.log(`      defaultWidth: ${panel.defaultWidth || 'NULL'}`);
      console.log(`      defaultThickness: ${panel.defaultThickness || 'NULL'}`);
      console.log(`      thickness[]: ${hasThicknessArray ? panel.thickness.join(', ') : 'NULL'}`);
    }

    if (panel.pricePerM2) {
      console.log(`   💰 Prix: ${panel.pricePerM2.toFixed(2)} €/m²`);
    }

    console.log('');
  });

  // Statistiques
  const withDimensions = products.filter(p =>
    p.defaultLength && p.defaultWidth && p.defaultThickness
  ).length;

  console.log('\n📊 RÉSUMÉ:');
  console.log(`   Total produits: ${products.length}`);
  console.log(`   ✅ Avec dimensions complètes: ${withDimensions}`);
  console.log(`   ❌ Sans dimensions: ${products.length - withDimensions}`);
  console.log(`   📈 Taux de complétude: ${((withDimensions / products.length) * 100).toFixed(1)}%`);
}

checkPlansTravail()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
