import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== ANALYSE DES PANNEAUX MAL CLASSÉS DANS "PANNEAUX BRUTS" ===\n');

  // 1. Purenit/polyuréthane dans agglo
  console.log('--- 1. PURENIT/POLYURÉTHANE DANS AGGLO (devrait être Isolants) ---');
  const purenit = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'purenit', mode: 'insensitive' } },
        { name: { contains: 'polyuréthane', mode: 'insensitive' } },
        { name: { contains: 'polyurethane', mode: 'insensitive' } }
      ]
    },
    include: { category: { select: { name: true, slug: true, parent: { select: { slug: true } } } } }
  });

  for (const p of purenit) {
    console.log(`  ${p.reference} | ${p.name?.substring(0, 50)} | cat=${p.category?.slug}`);
  }
  console.log(`  TOTAL: ${purenit.length} panneaux\n`);

  // 2. Panneaux LATTE - où sont-ils?
  console.log('--- 2. PANNEAUX LATTÉ (catégories vides - cherchons les panneaux) ---');
  const latte = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'LATTE' },
        { name: { contains: 'latté', mode: 'insensitive' } },
        { name: { contains: 'latte', mode: 'insensitive' } },
        { name: { contains: 'lattée', mode: 'insensitive' } }
      ]
    },
    include: { category: { select: { name: true, slug: true } } }
  });

  for (const p of latte) {
    console.log(`  ${p.reference} | ${p.name?.substring(0, 50)} | type=${p.productType} | cat=${p.category?.slug}`);
  }
  console.log(`  TOTAL: ${latte.length} panneaux\n`);

  // 3. CP qui pourraient être mal classés dans CP Divers
  console.log('--- 3. CP DIVERS - VÉRIFICATION (peut-être classables ailleurs) ---');
  const cpDivers = await prisma.panel.findMany({
    where: { category: { slug: 'cp-divers' } },
    select: {
      reference: true,
      name: true,
      supplierRefs: true
    },
    take: 30
  });

  // Grouper par type apparent
  const cpDiversByType: Record<string, typeof cpDivers> = {};
  for (const p of cpDivers) {
    let type = 'Autre';
    const nameLower = (p.name || '').toLowerCase();

    if (nameLower.includes('bouleau')) type = 'Bouleau';
    else if (nameLower.includes('okoumé') || nameLower.includes('okoume')) type = 'Okoumé';
    else if (nameLower.includes('peuplier')) type = 'Peuplier';
    else if (nameLower.includes('pin')) type = 'Pin';
    else if (nameLower.includes('épicéa') || nameLower.includes('epicea')) type = 'Épicéa';
    else if (nameLower.includes('hêtre') || nameLower.includes('hetre')) type = 'Hêtre';
    else if (nameLower.includes('ctbx') || nameLower.includes('marine')) type = 'Marine';

    if (!cpDiversByType[type]) cpDiversByType[type] = [];
    cpDiversByType[type].push(p);
  }

  for (const [type, panels] of Object.entries(cpDiversByType)) {
    console.log(`\n  ${type} (${panels.length}):`);
    for (const p of panels.slice(0, 3)) {
      console.log(`    ${p.reference} | ${p.name?.substring(0, 45)}`);
    }
    if (panels.length > 3) console.log(`    ... et ${panels.length - 3} autres`);
  }

  // 4. Panneaux dans catégories parentes au lieu de sous-catégories
  console.log('\n--- 4. PANNEAUX DIRECTEMENT DANS CATÉGORIES PARENTES ---');
  const parentCats = ['mdf', 'osb', 'agglomere', 'contreplaques', 'latte', 'panneaux-bruts'];

  for (const slug of parentCats) {
    const cat = await prisma.category.findFirst({ where: { slug } });
    if (cat) {
      const count = await prisma.panel.count({ where: { categoryId: cat.id } });
      if (count > 0) {
        console.log(`  ${slug}: ${count} panneaux (devraient être dans sous-catégories)`);
      }
    }
  }

  // 5. Vérifier les MDF qui ne sont pas dans les bonnes sous-catégories
  console.log('\n--- 5. MDF DANS "MDF STANDARD" - VÉRIFICATION ---');
  const mdfStandard = await prisma.panel.findMany({
    where: { category: { slug: 'mdf-standard' } },
    select: { reference: true, name: true },
    take: 20
  });

  const mdfMisclassified: typeof mdfStandard = [];
  for (const p of mdfStandard) {
    const nameLower = (p.name || '').toLowerCase();
    if (nameLower.includes('hydrofuge') || nameLower.includes('hydro') ||
        nameLower.includes('ignifuge') || nameLower.includes('teinté') ||
        nameLower.includes('teinte') || nameLower.includes('couleur') ||
        nameLower.includes('laquer') || nameLower.includes('léger') ||
        nameLower.includes('cintrable')) {
      mdfMisclassified.push(p);
    }
  }

  if (mdfMisclassified.length > 0) {
    console.log(`  Potentiellement mal classés: ${mdfMisclassified.length}`);
    for (const p of mdfMisclassified) {
      console.log(`    ${p.reference} | ${p.name?.substring(0, 50)}`);
    }
  } else {
    console.log('  Tous les MDF Standard semblent corrects');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
