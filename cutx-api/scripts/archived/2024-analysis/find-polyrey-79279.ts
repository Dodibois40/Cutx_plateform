import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findProduct() {
  console.log('🔍 Recherche du produit Compact Polyrey 79279\n');

  // Chercher par référence fournisseur
  const bySupplierCode = await prisma.panel.findMany({
    where: {
      OR: [
        { supplierCode: { contains: '79279' } },
        { reference: { contains: '79279' } },
        { manufacturerRef: { contains: 'N105' } },
        {
          AND: [
            { name: { contains: 'Compact', mode: 'insensitive' } },
            { name: { contains: 'Monochrom', mode: 'insensitive' } },
            { name: { contains: '12', mode: 'insensitive' } },
          ]
        }
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
  });

  if (bySupplierCode.length === 0) {
    console.log('❌ Aucun produit trouvé avec les critères de recherche\n');
    return;
  }

  console.log(`✅ ${bySupplierCode.length} produit(s) trouvé(s):\n`);

  const densities: Record<string, number> = {
    COMPACT: 1400,
    STRATIFIE: 1400,
    MDF: 750,
    MELAMINE: 650,
    AGGLO_BRUT: 650,
    CONTREPLAQUE: 550,
    OSB: 600,
    MASSIF: 700,
    PLACAGE: 600,
    PLAN_DE_TRAVAIL: 650, // Densité par défaut si non défini
  };

  bySupplierCode.forEach((panel, idx) => {
    const shortName = panel.name.substring(0, 70);
    console.log(`${idx + 1}. ${panel.reference}`);
    console.log(`   ${shortName}`);
    console.log(`   📂 Catégorie: ${panel.category?.parent?.name ? panel.category.parent.name + ' > ' : ''}${panel.category?.name || 'N/A'}`);
    console.log(`   🏭 Catalogue: ${panel.catalogue.name}`);
    console.log(`   🔖 SupplierCode: ${panel.supplierCode || 'N/A'}`);
    console.log(`   🏷️  ManufacturerRef: ${panel.manufacturerRef || 'N/A'}`);
    console.log(`   📦 ProductType: ${panel.productType || 'NULL'}`);
    console.log(`   🔧 Material: ${panel.material || 'N/A'}`);

    if (panel.defaultLength && panel.defaultWidth && panel.defaultThickness) {
      const density = densities[panel.productType || ''] || 650;
      const weightActual = (panel.defaultLength / 1000) * (panel.defaultWidth / 1000) * (panel.defaultThickness / 1000) * density;
      const weightCorrect = (panel.defaultLength / 1000) * (panel.defaultWidth / 1000) * (panel.defaultThickness / 1000) * 1350;

      console.log(`   📏 Dimensions: ${panel.defaultLength} × ${panel.defaultWidth} × ${panel.defaultThickness} mm`);
      console.log(`   ⚖️  Poids actuel: ${weightActual.toFixed(1)} kg (densité ${density} kg/m³)`);
      console.log(`   ✅ Poids si COMPACT: ${weightCorrect.toFixed(1)} kg (densité 1350 kg/m³)`);

      if (panel.productType !== 'COMPACT') {
        const diff = weightCorrect - weightActual;
        const diffPercent = ((diff / weightActual) * 100).toFixed(0);
        console.log(`   🚨 ERREUR: productType devrait être COMPACT, pas ${panel.productType || 'NULL'}`);
        console.log(`   📊 Différence: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg (${diff > 0 ? '+' : ''}${diffPercent}%)`);
      }
    }

    console.log('');
  });
}

findProduct()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
