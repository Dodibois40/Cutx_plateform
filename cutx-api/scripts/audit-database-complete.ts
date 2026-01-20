import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface AuditResult {
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
  description: string;
  examples: string[];
  action: string;
}

const results: AuditResult[] = [];

async function auditProductTypeVsCategory() {
  console.log('\n========================================');
  console.log('1. AUDIT PRODUCTTYPE VS CATEGORIES');
  console.log('========================================');

  // Mapping attendu productType -> categorie parent
  const EXPECTED_MAPPING: Record<string, string[]> = {
    'MELAMINE': ['melamines', 'panneaux-decores'],
    'STRATIFIE': ['stratifies-hpl', 'panneaux-decores'],
    'COMPACT': ['compacts-hpl', 'panneaux-decores'],
    'MDF': ['mdf', 'panneaux-bruts'],
    'PARTICULE': ['agglomere', 'panneaux-bruts'],
    'CONTREPLAQUE': ['contreplaque', 'panneaux-bruts'],
    'OSB': ['osb', 'panneaux-bruts'],
    'PLACAGE': ['plaques-bois', 'placage-chene', 'placage-noyer', 'placage-hetre', 'placage-frene', 'placages-divers'],
    'BANDE_DE_CHANT': ['chants', 'chants-abs', 'abs-unis', 'abs-bois', 'abs-fantaisie', 'chants-bois', 'chants-pvc'],
    'PANNEAU_MASSIF': ['bois-massifs'],
    'SOLID_SURFACE': ['solid-surface'],
    'PLAN_DE_TRAVAIL': ['plans-de-travail'],
  };

  // Verifier chaque type
  for (const [productType, expectedCategories] of Object.entries(EXPECTED_MAPPING)) {
    const mismatched = await prisma.panel.findMany({
      where: {
        productType,
        isActive: true,
        category: {
          NOT: {
            slug: { in: expectedCategories }
          }
        }
      },
      select: {
        name: true,
        reference: true,
        productType: true,
        category: { select: { name: true, slug: true } }
      },
      take: 10
    });

    if (mismatched.length > 0) {
      const total = await prisma.panel.count({
        where: {
          productType,
          isActive: true,
          category: { NOT: { slug: { in: expectedCategories } } }
        }
      });

      const catList = expectedCategories.slice(0, 2).join('/');
      results.push({
        category: 'CLASSIFICATION',
        severity: total > 50 ? 'HIGH' : 'MEDIUM',
        count: total,
        description: productType + ' mal classes (pas dans ' + catList + ')',
        examples: mismatched.slice(0, 5).map(p =>
          p.reference + ': "' + (p.name?.substring(0, 40) || '') + '" -> ' + (p.category?.slug || 'AUCUNE')
        ),
        action: 'Reclasser vers ' + expectedCategories[0]
      });
    }
  }

  // Panneaux sans productType
  const noProductType = await prisma.panel.count({
    where: { productType: null, isActive: true }
  });
  if (noProductType > 0) {
    const examples = await prisma.panel.findMany({
      where: { productType: null, isActive: true },
      select: { reference: true, name: true },
      take: 5
    });
    results.push({
      category: 'CLASSIFICATION',
      severity: 'CRITICAL',
      count: noProductType,
      description: 'Panneaux SANS productType',
      examples: examples.map(p => p.reference + ': ' + (p.name?.substring(0, 50) || '')),
      action: 'Classifier manuellement ou par script'
    });
  }

  // Panneaux sans categorie
  const noCategory = await prisma.panel.count({
    where: { categoryId: null, isActive: true }
  });
  if (noCategory > 0) {
    const examples = await prisma.panel.findMany({
      where: { categoryId: null, isActive: true },
      select: { reference: true, name: true, productType: true },
      take: 5
    });
    results.push({
      category: 'CLASSIFICATION',
      severity: 'CRITICAL',
      count: noCategory,
      description: 'Panneaux SANS categorie',
      examples: examples.map(p => '[' + p.productType + '] ' + p.reference + ': ' + (p.name?.substring(0, 40) || '')),
      action: 'Assigner categorie basee sur productType'
    });
  }
}

async function auditMissingData() {
  console.log('\n========================================');
  console.log('2. AUDIT DONNEES MANQUANTES');
  console.log('========================================');

  const totalActive = await prisma.panel.count({ where: { isActive: true } });
  console.log('Total panneaux actifs:', totalActive);

  // Sans image
  const noImage = await prisma.panel.count({
    where: { imageUrl: null, isActive: true }
  });
  if (noImage > 0) {
    const byType = await prisma.panel.groupBy({
      by: ['productType'],
      where: { imageUrl: null, isActive: true },
      _count: true
    });
    results.push({
      category: 'DONNEES_MANQUANTES',
      severity: noImage > totalActive * 0.3 ? 'HIGH' : 'MEDIUM',
      count: noImage,
      description: 'Panneaux sans image (' + Math.round(noImage/totalActive*100) + '%)',
      examples: byType.slice(0, 5).map(b => b.productType + ': ' + b._count),
      action: 'Rescraper les images ou les recuperer manuellement'
    });
  }

  // Sans prix (ni pricePerM2, ni pricePerPanel, ni pricePerMl)
  const noPrice = await prisma.panel.count({
    where: {
      isActive: true,
      pricePerM2: null,
      pricePerPanel: null,
      pricePerMl: null,
      pricePerUnit: null
    }
  });
  if (noPrice > 0) {
    const byType = await prisma.panel.groupBy({
      by: ['productType'],
      where: {
        isActive: true,
        pricePerM2: null,
        pricePerPanel: null,
        pricePerMl: null,
        pricePerUnit: null
      },
      _count: true
    });
    results.push({
      category: 'DONNEES_MANQUANTES',
      severity: 'CRITICAL',
      count: noPrice,
      description: 'Panneaux sans AUCUN prix (' + Math.round(noPrice/totalActive*100) + '%)',
      examples: byType.slice(0, 5).map(b => b.productType + ': ' + b._count),
      action: 'Rescraper les prix depuis les fournisseurs'
    });
  }

  // Sans epaisseur
  const noThickness = await prisma.panel.count({
    where: {
      isActive: true,
      thickness: { equals: [] }
    }
  });
  if (noThickness > 0) {
    const byType = await prisma.panel.groupBy({
      by: ['productType'],
      where: { isActive: true, thickness: { equals: [] } },
      _count: true
    });
    results.push({
      category: 'DONNEES_MANQUANTES',
      severity: 'HIGH',
      count: noThickness,
      description: 'Panneaux sans epaisseur (' + Math.round(noThickness/totalActive*100) + '%)',
      examples: byType.slice(0, 5).map(b => b.productType + ': ' + b._count),
      action: 'Extraire epaisseur du nom ou rescraper'
    });
  }

  // Chants sans decorName
  const chantsNoDecor = await prisma.panel.count({
    where: {
      productType: 'BANDE_DE_CHANT',
      isActive: true,
      decorName: null
    }
  });
  if (chantsNoDecor > 0) {
    results.push({
      category: 'DONNEES_MANQUANTES',
      severity: 'MEDIUM',
      count: chantsNoDecor,
      description: 'Chants sans decorName',
      examples: [],
      action: 'Enrichir decorName depuis le nom ou description'
    });
  }

  // Placages sans decorName
  const placagesNoDecor = await prisma.panel.count({
    where: {
      productType: 'PLACAGE',
      isActive: true,
      decorName: null
    }
  });
  if (placagesNoDecor > 0) {
    const examples = await prisma.panel.findMany({
      where: { productType: 'PLACAGE', isActive: true, decorName: null },
      select: { reference: true, name: true },
      take: 5
    });
    results.push({
      category: 'DONNEES_MANQUANTES',
      severity: 'HIGH',
      count: placagesNoDecor,
      description: 'Placages sans decorName (essence de bois)',
      examples: examples.map(p => p.reference + ': ' + (p.name?.substring(0, 50) || '')),
      action: 'Extraire essence du nom (chene, noyer, etc.)'
    });
  }
}

async function auditAberrantData() {
  console.log('\n========================================');
  console.log('3. AUDIT DONNEES ABERRANTES');
  console.log('========================================');

  // Epaisseurs aberrantes (> 200mm pour panneaux)
  const allPanels = await prisma.panel.findMany({
    where: { isActive: true, productType: { not: 'BANDE_DE_CHANT' } },
    select: { id: true, reference: true, name: true, thickness: true, productType: true }
  });

  const aberrantThickness = allPanels.filter(p =>
    p.thickness.some(t => t > 200 || t < 0.1)
  );
  if (aberrantThickness.length > 0) {
    results.push({
      category: 'DONNEES_ABERRANTES',
      severity: 'HIGH',
      count: aberrantThickness.length,
      description: 'Panneaux avec epaisseur aberrante (>200mm ou <0.1mm)',
      examples: aberrantThickness.slice(0, 5).map(p =>
        p.reference + ': ' + p.thickness.join(',') + 'mm - ' + (p.name?.substring(0, 30) || '')
      ),
      action: 'Corriger manuellement ou supprimer'
    });
  }

  // Dimensions aberrantes (longueur ou largeur > 10000mm ou = 0)
  const aberrantDimensions = await prisma.panel.findMany({
    where: {
      isActive: true,
      OR: [
        { defaultLength: { gt: 10000 } },
        { defaultWidth: { gt: 5000 } },
        { AND: [{ defaultLength: 0 }, { defaultWidth: 0 }] }
      ]
    },
    select: { reference: true, name: true, defaultLength: true, defaultWidth: true },
    take: 20
  });
  if (aberrantDimensions.length > 0) {
    const total = await prisma.panel.count({
      where: {
        isActive: true,
        OR: [
          { defaultLength: { gt: 10000 } },
          { defaultWidth: { gt: 5000 } },
          { AND: [{ defaultLength: 0 }, { defaultWidth: 0 }] }
        ]
      }
    });
    results.push({
      category: 'DONNEES_ABERRANTES',
      severity: 'MEDIUM',
      count: total,
      description: 'Dimensions aberrantes (>10m ou 0x0)',
      examples: aberrantDimensions.slice(0, 5).map(p =>
        p.reference + ': ' + p.defaultLength + 'x' + p.defaultWidth + 'mm'
      ),
      action: 'Verifier et corriger les dimensions'
    });
  }

  // Prix aberrants (> 1000E/m2 ou < 1E/m2)
  const aberrantPrices = await prisma.panel.findMany({
    where: {
      isActive: true,
      OR: [
        { pricePerM2: { gt: 1000 } },
        { AND: [{ pricePerM2: { lt: 1 } }, { pricePerM2: { gt: 0 } }] }
      ]
    },
    select: { reference: true, name: true, pricePerM2: true },
    take: 10
  });
  if (aberrantPrices.length > 0) {
    results.push({
      category: 'DONNEES_ABERRANTES',
      severity: 'MEDIUM',
      count: aberrantPrices.length,
      description: 'Prix aberrants (>1000E/m2 ou <1E/m2)',
      examples: aberrantPrices.slice(0, 5).map(p =>
        p.reference + ': ' + p.pricePerM2 + 'E/m2'
      ),
      action: 'Verifier les prix sur le site fournisseur'
    });
  }
}

async function auditDuplicates() {
  console.log('\n========================================');
  console.log('4. AUDIT DOUBLONS');
  console.log('========================================');

  // Doublons de reference
  const refDuplicates = await prisma.$queryRaw<{reference: string, count: bigint}[]>`
    SELECT reference, COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true
    GROUP BY reference
    HAVING COUNT(*) > 1
    LIMIT 20
  `;

  if (refDuplicates.length > 0) {
    const totalDuplicates = refDuplicates.reduce((acc, r) => acc + Number(r.count), 0);
    results.push({
      category: 'DOUBLONS',
      severity: 'CRITICAL',
      count: totalDuplicates,
      description: 'References en doublon (' + refDuplicates.length + ' refs differentes)',
      examples: refDuplicates.slice(0, 5).map(r => r.reference + ': ' + r.count + 'x'),
      action: 'Dedupliquer en gardant le plus recent/complet'
    });
  }

  // Doublons de nom (meme nom exact)
  const nameDuplicates = await prisma.$queryRaw<{name: string, count: bigint}[]>`
    SELECT name, COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true
    GROUP BY name
    HAVING COUNT(*) > 1
    LIMIT 20
  `;

  if (nameDuplicates.length > 0) {
    results.push({
      category: 'DOUBLONS',
      severity: 'MEDIUM',
      count: nameDuplicates.length,
      description: 'Noms identiques (potentiels doublons)',
      examples: nameDuplicates.slice(0, 5).map(r => '"' + (r.name?.substring(0, 40) || '') + '": ' + r.count + 'x'),
      action: 'Verifier si vraiment doublons ou variantes'
    });
  }
}

async function auditNamingQuality() {
  console.log('\n========================================');
  console.log('5. AUDIT QUALITE DES NOMS');
  console.log('========================================');

  // Noms avec caracteres bizarres
  const allNames = await prisma.panel.findMany({
    where: { isActive: true },
    select: { reference: true, name: true }
  });

  const badCharNames = allNames.filter(p =>
    /[<>{}[\]|\\]/.test(p.name || '') ||
    (p.name || '').includes('undefined') ||
    (p.name || '').includes('null') ||
    (p.name || '').includes('NaN')
  );
  if (badCharNames.length > 0) {
    results.push({
      category: 'QUALITE_NOMS',
      severity: 'MEDIUM',
      count: badCharNames.length,
      description: 'Noms avec caracteres invalides ou undefined/null',
      examples: badCharNames.slice(0, 5).map(p => p.reference + ': ' + (p.name?.substring(0, 50) || '')),
      action: 'Nettoyer les noms'
    });
  }
}

async function auditCatalogueDistribution() {
  console.log('\n========================================');
  console.log('6. DISTRIBUTION PAR CATALOGUE');
  console.log('========================================');

  const byCatalogue = await prisma.panel.groupBy({
    by: ['catalogueId'],
    where: { isActive: true },
    _count: true
  });

  const catalogues = await prisma.catalogue.findMany({
    select: { id: true, name: true, slug: true }
  });

  const catalogueMap = new Map(catalogues.map(c => [c.id, c]));

  console.log('\nDistribution par catalogue:');
  for (const stat of byCatalogue.sort((a, b) => b._count - a._count)) {
    const cat = catalogueMap.get(stat.catalogueId);
    console.log('  ' + (cat?.name || 'INCONNU') + ': ' + stat._count + ' panneaux');
  }
}

async function auditCategoryDistribution() {
  console.log('\n========================================');
  console.log('7. DISTRIBUTION PAR CATEGORIE');
  console.log('========================================');

  const byCategory = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { isActive: true },
    _count: true
  });

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parent: { select: { name: true } } }
  });

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  console.log('\nTop 20 categories par nombre de panneaux:');
  const sorted = byCategory
    .map(stat => ({
      category: categoryMap.get(stat.categoryId || ''),
      count: stat._count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  for (const stat of sorted) {
    const parent = stat.category?.parent?.name ? stat.category.parent.name + ' > ' : '';
    console.log('  ' + parent + (stat.category?.name || 'SANS CATEGORIE') + ': ' + stat.count);
  }

  // Categories vides
  const emptyCategories = categories.filter(c =>
    !byCategory.find(b => b.categoryId === c.id)
  );
  if (emptyCategories.length > 0) {
    results.push({
      category: 'STRUCTURE',
      severity: 'LOW',
      count: emptyCategories.length,
      description: 'Categories vides (0 panneau)',
      examples: emptyCategories.slice(0, 5).map(c => c.slug),
      action: 'Supprimer ou peupler ces categories'
    });
  }
}

async function auditProductTypeDistribution() {
  console.log('\n========================================');
  console.log('8. DISTRIBUTION PAR PRODUCTTYPE');
  console.log('========================================');

  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true
  });

  console.log('\nDistribution par productType:');
  for (const stat of byType.sort((a, b) => b._count - a._count)) {
    console.log('  ' + (stat.productType || 'NULL') + ': ' + stat._count);
  }
}

async function auditSpecificProblems() {
  console.log('\n========================================');
  console.log('9. AUDIT PROBLEMES SPECIFIQUES');
  console.log('========================================');

  // 1. Panneaux Querkus pas en PLACAGE (sauf chants)
  const querkusWrong = await prisma.panel.count({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' },
      productType: { notIn: ['PLACAGE', 'BANDE_DE_CHANT'] },
      isActive: true
    }
  });
  if (querkusWrong > 0) {
    const examples = await prisma.panel.findMany({
      where: {
        name: { contains: 'querkus', mode: 'insensitive' },
        productType: { notIn: ['PLACAGE', 'BANDE_DE_CHANT'] },
        isActive: true
      },
      select: { reference: true, name: true, productType: true },
      take: 5
    });
    results.push({
      category: 'CLASSIFICATION',
      severity: 'HIGH',
      count: querkusWrong,
      description: 'Produits Querkus non classes en PLACAGE',
      examples: examples.map(p => '[' + p.productType + '] ' + (p.name?.substring(0, 40) || '')),
      action: 'Reclasser en PLACAGE'
    });
  }

  // 2. Panneaux "plaque chene" pas en PLACAGE
  const cheneWrong = await prisma.panel.count({
    where: {
      OR: [
        { name: { contains: 'plaque chene', mode: 'insensitive' } },
        { name: { contains: 'plaqué chêne', mode: 'insensitive' } },
        { name: { contains: 'placage chene', mode: 'insensitive' } }
      ],
      productType: { notIn: ['PLACAGE', 'BANDE_DE_CHANT'] },
      isActive: true
    }
  });
  if (cheneWrong > 0) {
    const examples = await prisma.panel.findMany({
      where: {
        OR: [
          { name: { contains: 'plaque chene', mode: 'insensitive' } },
          { name: { contains: 'plaqué chêne', mode: 'insensitive' } }
        ],
        productType: { notIn: ['PLACAGE', 'BANDE_DE_CHANT'] },
        isActive: true
      },
      select: { reference: true, name: true, productType: true, category: { select: { slug: true } } },
      take: 5
    });
    results.push({
      category: 'CLASSIFICATION',
      severity: 'HIGH',
      count: cheneWrong,
      description: 'Panneaux plaques chene pas en PLACAGE',
      examples: examples.map(p => '[' + p.productType + '] ' + p.reference),
      action: 'Migrer vers Plaques Bois'
    });
  }

  // 3. ProductTypes non standards (a unifier)
  const nonStandardTypes = await prisma.panel.groupBy({
    by: ['productType'],
    where: {
      isActive: true,
      productType: {
        in: ['AGGLOMERE', 'MASSIF', 'PANNEAU_DECORATIF', 'PANNEAU_CONSTRUCTION',
             'PANNEAU_SPECIAL', 'BOIS_CIMENT', 'PANNEAU_3_PLIS', 'CIMENT_BOIS',
             'PANNEAU_ISOLANT', 'PANNEAU_ALVEOLAIRE', 'ALVEOLAIRE', 'COLLE', 'PORTE', 'PVC']
      }
    },
    _count: true
  });
  if (nonStandardTypes.length > 0) {
    const total = nonStandardTypes.reduce((acc, t) => acc + t._count, 0);
    results.push({
      category: 'CLASSIFICATION',
      severity: 'MEDIUM',
      count: total,
      description: 'ProductTypes non standardises a unifier',
      examples: nonStandardTypes.map(t => t.productType + ': ' + t._count),
      action: 'AGGLOMERE->PARTICULE, MASSIF->PANNEAU_MASSIF, etc.'
    });
  }

  // 4. Chants avec epaisseur dans defaultWidth au lieu de thickness
  const chantsWrongThickness = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      isActive: true,
      thickness: { equals: [] },
      defaultWidth: { gt: 0, lt: 100 }
    },
    select: { reference: true, name: true, defaultWidth: true, thickness: true },
    take: 10
  });
  if (chantsWrongThickness.length > 0) {
    const total = await prisma.panel.count({
      where: {
        productType: 'BANDE_DE_CHANT',
        isActive: true,
        thickness: { equals: [] },
        defaultWidth: { gt: 0, lt: 100 }
      }
    });
    results.push({
      category: 'DONNEES_ABERRANTES',
      severity: 'MEDIUM',
      count: total,
      description: 'Chants sans thickness mais avec defaultWidth (inversion possible)',
      examples: chantsWrongThickness.slice(0, 3).map(c => c.reference + ': width=' + c.defaultWidth + 'mm, thick=[]'),
      action: 'Verifier si largeur ou epaisseur'
    });
  }

  // 5. Panneaux decores sans decorCategory
  const decoresNoDecorCat = await prisma.panel.count({
    where: {
      productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
      isActive: true,
      decorCategory: null
    }
  });
  if (decoresNoDecorCat > 0) {
    results.push({
      category: 'DONNEES_MANQUANTES',
      severity: 'MEDIUM',
      count: decoresNoDecorCat,
      description: 'Panneaux decores sans decorCategory (Uni/Bois/Fantaisie)',
      examples: [],
      action: 'Classifier selon decorName (blanc=UNI, chene=BOIS, etc.)'
    });
  }
}

async function main() {
  console.log('====================================================================');
  console.log('         AUDIT COMPLET DE LA BASE DE DONNEES CUTX');
  console.log('====================================================================');

  const startTime = Date.now();

  await auditProductTypeVsCategory();
  await auditMissingData();
  await auditAberrantData();
  await auditDuplicates();
  await auditNamingQuality();
  await auditCatalogueDistribution();
  await auditCategoryDistribution();
  await auditProductTypeDistribution();
  await auditSpecificProblems();

  console.log('\n\n');
  console.log('====================================================================');
  console.log('                    RAPPORT DE SYNTHESE');
  console.log('====================================================================');

  // Trier par severite
  const severityOrder: Record<string, number> = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Afficher par severite
  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const items = results.filter(r => r.severity === severity);
    if (items.length === 0) continue;

    const emoji = severity === 'CRITICAL' ? '[CRITICAL]' :
                  severity === 'HIGH' ? '[HIGH]' :
                  severity === 'MEDIUM' ? '[MEDIUM]' : '[LOW]';

    console.log('\n' + emoji + ' (' + items.length + ' problemes)');
    console.log('--------------------------------------------------');

    for (const item of items) {
      console.log('\n  [' + item.category + '] ' + item.description);
      console.log('  -> Nombre: ' + item.count);
      if (item.examples.length > 0) {
        console.log('  -> Exemples:');
        item.examples.forEach(e => console.log('      - ' + e));
      }
      console.log('  -> Action: ' + item.action);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n\n  Audit termine en ' + duration + 's');
  console.log('  Total problemes detectes: ' + results.length);
  console.log('   - CRITICAL: ' + results.filter(r => r.severity === 'CRITICAL').length);
  console.log('   - HIGH: ' + results.filter(r => r.severity === 'HIGH').length);
  console.log('   - MEDIUM: ' + results.filter(r => r.severity === 'MEDIUM').length);
  console.log('   - LOW: ' + results.filter(r => r.severity === 'LOW').length);

  await prisma.$disconnect();
}

main().catch(console.error);
