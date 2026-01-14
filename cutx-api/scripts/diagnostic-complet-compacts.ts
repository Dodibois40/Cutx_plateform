import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DataQuality {
  reference: string;
  name: string;
  productType: string | null;
  missingFields: string[];
  completeness: number;
}

async function diagnosticComplet() {
  console.log('🔍 DIAGNOSTIC COMPLET - Compacts et Plans de travail\n');
  console.log('=' .repeat(80) + '\n');

  // Récupérer tous les compacts et plans de travail
  const products = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'COMPACT' },
        { productType: 'PLAN_DE_TRAVAIL' },
        { productType: 'SOLID_SURFACE' },
        { material: 'Plan de travail' },
        { material: 'Plan de travail compact' },
        { material: 'Compact' },
        { category: { name: { contains: 'Compact' } } },
        { category: { name: { contains: 'Plans de travail' } } },
      ],
    },
    select: {
      reference: true,
      name: true,
      supplierCode: true,
      manufacturerRef: true,
      productType: true,
      material: true,
      finish: true,
      finishCode: true,
      finishName: true,
      decor: true,
      decorCode: true,
      decorName: true,
      colorCode: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      thickness: true,
      pricePerM2: true,
      pricePerMl: true,
      pricePerUnit: true,
      imageUrl: true,
      stockStatus: true,
      manufacturer: true,
      coreType: true,
      coreColor: true,
      category: {
        select: {
          name: true,
        },
      },
      catalogue: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { reference: 'asc' },
  });

  console.log(`📊 Total produits analysés: ${products.length}\n`);

  // Analyser la qualité des données
  const dataQuality: DataQuality[] = products.map(p => {
    const missing: string[] = [];

    // Champs CRITIQUES (obligatoires pour un produit utilisable)
    if (!p.defaultLength) missing.push('defaultLength');
    if (!p.defaultWidth) missing.push('defaultWidth');
    if (!p.defaultThickness) missing.push('defaultThickness');
    if (!p.thickness || p.thickness.length === 0) missing.push('thickness[]');

    // Champs IMPORTANTS (impact sur l'expérience utilisateur)
    if (!p.pricePerM2 && !p.pricePerMl && !p.pricePerUnit) missing.push('prix');
    if (!p.imageUrl) missing.push('imageUrl');
    if (!p.manufacturerRef) missing.push('manufacturerRef');

    // Champs UTILES (pour la recherche et le filtrage)
    if (!p.finish && !p.finishCode && !p.finishName) missing.push('finish');
    if (!p.decor && !p.decorCode && !p.decorName) missing.push('decor');
    if (!p.colorCode) missing.push('colorCode');
    if (!p.stockStatus) missing.push('stockStatus');
    if (!p.manufacturer) missing.push('manufacturer');
    if (!p.coreType) missing.push('coreType');
    if (!p.coreColor) missing.push('coreColor');

    const totalFields = 14; // Nombre de champs/groupes vérifiés
    const completeness = ((totalFields - missing.length) / totalFields) * 100;

    return {
      reference: p.reference,
      name: p.name,
      productType: p.productType,
      missingFields: missing,
      completeness,
    };
  });

  // Statistiques globales
  const avgCompleteness = dataQuality.reduce((sum, p) => sum + p.completeness, 0) / dataQuality.length;
  const perfect = dataQuality.filter(p => p.completeness === 100).length;
  const critical = dataQuality.filter(p =>
    p.missingFields.includes('defaultLength') ||
    p.missingFields.includes('defaultWidth') ||
    p.missingFields.includes('defaultThickness')
  ).length;

  console.log('📈 STATISTIQUES GLOBALES\n');
  console.log(`   Complétude moyenne: ${avgCompleteness.toFixed(1)}%`);
  console.log(`   Produits parfaits (100%): ${perfect} (${(perfect / products.length * 100).toFixed(1)}%)`);
  console.log(`   Produits avec données critiques manquantes: ${critical} (${(critical / products.length * 100).toFixed(1)}%)`);
  console.log('');

  // Champs les plus souvent manquants
  const fieldCounts: Record<string, number> = {};
  dataQuality.forEach(p => {
    p.missingFields.forEach(field => {
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
  });

  console.log('❌ CHAMPS LES PLUS SOUVENT MANQUANTS\n');
  Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      const percent = (count / products.length * 100).toFixed(1);
      const severity =
        ['defaultLength', 'defaultWidth', 'defaultThickness'].includes(field) ? '🚨 CRITIQUE' :
        ['prix', 'imageUrl', 'manufacturerRef'].includes(field) ? '⚠️  IMPORTANT' :
        '💡 UTILE';
      console.log(`   ${severity} ${field}: ${count} produits (${percent}%)`);
    });

  console.log('\n' + '='.repeat(80) + '\n');

  // Top 20 produits les plus incomplets
  const mostIncomplete = dataQuality
    .filter(p => p.completeness < 100)
    .sort((a, b) => a.completeness - b.completeness)
    .slice(0, 20);

  console.log('🚨 TOP 20 PRODUITS LES PLUS INCOMPLETS\n');
  mostIncomplete.forEach((p, idx) => {
    const shortName = p.name.substring(0, 60);
    console.log(`${idx + 1}. ${p.reference} (${p.completeness.toFixed(0)}% complet)`);
    console.log(`   ${shortName}`);
    console.log(`   Type: ${p.productType || 'NULL'}`);
    console.log(`   Manque: ${p.missingFields.join(', ')}`);
    console.log('');
  });

  // Grouper par productType
  const byType: Record<string, DataQuality[]> = {};
  dataQuality.forEach(p => {
    const type = p.productType || 'NULL';
    if (!byType[type]) byType[type] = [];
    byType[type].push(p);
  });

  console.log('='.repeat(80) + '\n');
  console.log('📊 COMPLÉTUDE PAR TYPE DE PRODUIT\n');

  Object.entries(byType).forEach(([type, products]) => {
    const avgComp = products.reduce((sum, p) => sum + p.completeness, 0) / products.length;
    const withCriticalIssues = products.filter(p =>
      p.missingFields.includes('defaultLength') ||
      p.missingFields.includes('defaultWidth') ||
      p.missingFields.includes('defaultThickness')
    ).length;

    console.log(`   ${type}:`);
    console.log(`      Total: ${products.length} produits`);
    console.log(`      Complétude moyenne: ${avgComp.toFixed(1)}%`);
    console.log(`      Avec dimensions manquantes: ${withCriticalIssues} (${(withCriticalIssues / products.length * 100).toFixed(1)}%)`);
    console.log('');
  });

  console.log('='.repeat(80) + '\n');

  // Recommandations
  console.log('💡 RECOMMANDATIONS\n');

  if (critical > 0) {
    console.log(`🚨 URGENT: ${critical} produits sans dimensions → Inutilisables dans le configurateur`);
    console.log('   Action: Re-scraper ces produits en priorité\n');
  }

  const missingImages = dataQuality.filter(p => p.missingFields.includes('imageUrl')).length;
  if (missingImages > 0) {
    console.log(`⚠️  ${missingImages} produits sans image → Mauvaise expérience utilisateur`);
    console.log('   Action: Récupérer les images depuis le site fournisseur\n');
  }

  const missingPrices = dataQuality.filter(p => p.missingFields.includes('prix')).length;
  if (missingPrices > 0) {
    console.log(`⚠️  ${missingPrices} produits sans prix → Impossibilité de générer des devis`);
    console.log('   Action: Re-scraper les prix\n');
  }

  console.log('\n✅ Prochaine étape: Créer un script de re-scraping ciblé pour les champs manquants');
}

diagnosticComplet()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
