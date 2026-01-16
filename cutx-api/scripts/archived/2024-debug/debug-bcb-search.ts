import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== DEBUG: Chants BCB avec chêne ===\n');

  // Vérifier les chants BCB avec chêne
  const chants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB' },
      panelType: 'CHANT',
      OR: [
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'chene', mode: 'insensitive' } },
      ]
    },
    select: {
      reference: true,
      name: true,
      panelType: true,
      catalogueId: true,
      stockStatus: true,
      catalogue: { select: { slug: true, isActive: true } }
    },
    take: 10
  });

  console.log(`Trouvé: ${chants.length} chants`);
  chants.forEach(c => {
    console.log(`\n[${c.reference}]`);
    console.log(`  Nom: ${c.name.substring(0, 50)}`);
    console.log(`  panelType: ${c.panelType}`);
    console.log(`  catalogueId: ${c.catalogueId}`);
    console.log(`  catalogue: ${c.catalogue?.slug} (isActive: ${c.catalogue?.isActive})`);
    console.log(`  stockStatus: ${c.stockStatus}`);
  });

  // Vérifier le catalogueId des chants BCB
  console.log('\n=== Vérification catalogueId ===\n');
  const byCatalogue = await prisma.panel.groupBy({
    by: ['catalogueId'],
    where: {
      reference: { startsWith: 'BCB' },
      panelType: 'CHANT'
    },
    _count: true
  });

  console.log('Chants BCB par catalogueId:');
  for (const g of byCatalogue) {
    const cat = await prisma.catalogue.findUnique({
      where: { id: g.catalogueId },
      select: { slug: true, isActive: true }
    });
    console.log(`  ${cat?.slug || 'UNKNOWN'} (${g.catalogueId}): ${g._count} chants, isActive: ${cat?.isActive}`);
  }

  // Test direct SQL comme dans smart-search
  console.log('\n=== Test SQL direct (comme smart-search) ===\n');

  const sql = `
    SELECT p.reference, p.name, p."panelType", c.slug, c."isActive"
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE p.reference LIKE 'BCB%'
      AND p."panelType" = 'CHANT'
      AND (p.name ILIKE '%chêne%' OR p.name ILIKE '%chene%')
    LIMIT 10
  `;

  const results = await prisma.$queryRawUnsafe(sql);
  console.log('Résultats SQL:', JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
