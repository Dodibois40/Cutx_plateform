import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const placages = await prisma.panel.findMany({
    where: { category: { name: { startsWith: 'Placage' } } },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      productType: true,
      category: { select: { name: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== CONTENU ACTUEL DES CATÉGORIES PLACAGE ===');
  console.log(`Total: ${placages.length}\n`);

  const chants = placages.filter(p =>
    p.name.toLowerCase().includes('chant') ||
    p.name.toLowerCase().includes('bande')
  );
  const vraisPlacages = placages.filter(p =>
    !p.name.toLowerCase().includes('chant') &&
    !p.name.toLowerCase().includes('bande')
  );

  console.log(`Vrais placages: ${vraisPlacages.length}`);
  console.log(`Chants/Bandes (à retirer): ${chants.length}\n`);

  if (chants.length > 0) {
    console.log('=== CHANTS À RETIRER ===');
    for (const c of chants) {
      console.log(`- ${c.reference}: ${c.name.substring(0, 60)}`);
      console.log(`  ID: ${c.id}`);
    }
  }

  console.log('\n=== VRAIS PLACAGES (par catégorie) ===');
  const byCategory = new Map<string, typeof vraisPlacages>();
  for (const p of vraisPlacages) {
    const cat = p.category?.name || 'SANS';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  for (const [cat, panels] of byCategory) {
    console.log(`\n${cat}: ${panels.length}`);
    for (const p of panels.slice(0, 5)) {
      console.log(`  - ${p.reference}: ${p.name.substring(0, 50)} (${p.thickness.join(',')}mm)`);
    }
    if (panels.length > 5) console.log(`  ... et ${panels.length - 5} autres`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
