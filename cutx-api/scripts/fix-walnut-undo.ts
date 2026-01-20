import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== CORRECTION : Remettre les produits dans leurs bonnes catégories ===\n');

  // Récupérer les catégories
  const cats = await prisma.category.findMany({
    where: {
      slug: {
        in: [
          'placage-noyer', 'mela-bois', 'strat-bois', 'stratifies-hpl',
          'chants-abs', 'abs-bois', 'abs-unis', 'chant-noyer', 'mdf-laquer',
          'placages-divers'
        ]
      }
    }
  });

  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  // Panneaux dans placage-noyer qui ne devraient pas y être
  const wrongPanels = await prisma.panel.findMany({
    where: {
      categoryId: catMap['placage-noyer'],
      isActive: true
    },
    select: { id: true, name: true, productType: true }
  });

  console.log(`Panneaux actuellement dans placage-noyer: ${wrongPanels.length}\n`);

  let moved = 0;

  for (const p of wrongPanels) {
    const name = p.name || '';
    const type = p.productType || '';
    let targetSlug: string | null = null;

    // Mélaminés → mela-bois
    if (type === 'MELAMINE' || /mélaminé/i.test(name)) {
      targetSlug = 'mela-bois';
    }
    // Stratifiés → strat-bois ou stratifies-hpl
    else if (type === 'STRATIFIE' || /stratifié|hpl/i.test(name)) {
      if (/feuille/i.test(name)) {
        targetSlug = 'stratifies-hpl';
      } else {
        targetSlug = 'strat-bois';
      }
    }
    // Chants ABS → chants-abs ou abs-bois
    else if (type === 'BANDE_DE_CHANT' || /bande de chant|chant/i.test(name)) {
      if (/abs/i.test(name)) {
        targetSlug = 'chants-abs';
      } else if (/bois/i.test(name)) {
        targetSlug = 'chant-noyer'; // Chant bois noyer
      } else {
        targetSlug = 'chants-abs';
      }
    }
    // MDF → mdf-laquer
    else if (type === 'MDF' || /mdf/i.test(name)) {
      targetSlug = 'mdf-laquer';
    }
    // Shinnoki 19mm = vrais placages, rester
    else if (/shinnoki.*19\s*mm/i.test(name) && type === 'PLACAGE') {
      targetSlug = null; // Rester dans placage-noyer
    }
    // Autres placages = rester
    else if (type === 'PLACAGE') {
      targetSlug = null;
    }
    // Tocca Acoustic, Astrata, Splitt → produits spéciaux, probablement mela-bois
    else if (/tocca|astrata|splitt/i.test(name)) {
      targetSlug = 'mela-bois';
    }

    if (targetSlug && catMap[targetSlug]) {
      await prisma.panel.update({
        where: { id: p.id },
        data: { categoryId: catMap[targetSlug] }
      });
      console.log(`  ${name.substring(0, 50)}`);
      console.log(`    → ${targetSlug}`);
      moved++;
    } else {
      console.log(`  ✅ RESTE dans placage-noyer: ${name.substring(0, 50)}`);
    }
  }

  console.log(`\n✅ ${moved} panneaux remis dans leurs bonnes catégories`);

  await prisma.$disconnect();
}

fix().catch(console.error);
