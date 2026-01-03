/**
 * Final search quality test
 * Run with: npx tsx scripts/final-search-test.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 TEST FINAL DE LA RECHERCHE\n');
  console.log('='.repeat(60) + '\n');

  // Test searches
  const tests = [
    { query: 'chene', desc: 'Chêne (sans accent)' },
    { query: 'chêne', desc: 'Chêne (avec accent)' },
    { query: 'U963', desc: 'Code décor Egger U963' },
    { query: 'melamine blanc', desc: 'Mélaminé blanc' },
    { query: 'mdf 19mm', desc: 'MDF 19mm' },
    { query: 'contreplaqué okoumé', desc: 'Contreplaqué Okoumé' },
    { query: 'bande chant gris', desc: 'Bande de chant gris' },
    { query: 'plan travail', desc: 'Plan de travail' },
    { query: 'egger ST9', desc: 'Egger finition ST9' },
    { query: 'H3170', desc: 'Code décor Egger H3170' },
  ];

  console.log('📋 TESTS DE RECHERCHE\n');

  for (const { query, desc } of tests) {
    const normalized = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const terms = normalized
      .split(/\s+/)
      .filter(t => t.length > 1)
      .map(t => `${t}:*`)
      .join(' & ');

    try {
      const results = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM "Panel" p
        WHERE p."isActive" = true
          AND p."searchVector" @@ to_tsquery('french_unaccent', ${terms})
      `;

      const count = Number(results[0].count);
      const status = count > 0 ? '✅' : '❌';
      console.log(`   ${status} "${desc}": ${count} résultats`);

      // Show sample for U963 to verify multi-catalogue
      if (query === 'U963' && count > 0) {
        const samples = await prisma.$queryRaw<{ reference: string; catalogue: string }[]>`
          SELECT p.reference, c.name as catalogue
          FROM "Panel" p
          JOIN "Catalogue" c ON p."catalogueId" = c.id
          WHERE p."isActive" = true
            AND p."searchVector" @@ to_tsquery('french_unaccent', ${terms})
          ORDER BY c.name
        `;
        console.log('      Catalogues: ' + [...new Set(samples.map(s => s.catalogue))].join(', '));
      }
    } catch (error) {
      console.log(`   ❌ "${desc}": Erreur`);
    }
  }

  // Accent comparison
  console.log('\n📋 COMPARAISON ACCENTS\n');

  const accentTests = [
    ['chene', 'chêne'],
    ['melamine', 'mélaminé'],
    ['hetre', 'hêtre'],
    ['epicea', 'épicéa'],
  ];

  let allPassed = true;
  for (const [noAccent, withAccent] of accentTests) {
    const countNoAccent = await getSearchCount(noAccent);
    const countWithAccent = await getSearchCount(withAccent);

    const diff = Math.abs(countNoAccent - countWithAccent);
    const passed = diff === 0;
    allPassed = allPassed && passed;

    const status = passed ? '✅' : '⚠️';
    console.log(`   ${status} "${noAccent}" = "${withAccent}": ${countNoAccent} = ${countWithAccent}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RÉSUMÉ\n');

  const totalPanels = await prisma.panel.count({ where: { isActive: true } });
  const withSearchVector = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Panel"
    WHERE "isActive" = true AND "searchVector" IS NOT NULL
  `;

  console.log(`   Total panneaux actifs: ${totalPanels}`);
  console.log(`   Avec searchVector: ${withSearchVector[0].count}`);
  console.log(`   Recherche accents: ${allPassed ? '✅ PARFAIT' : '⚠️ Différences détectées'}`);

  // ProductType distribution
  console.log('\n   Distribution par productType:');
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  for (const t of byType.slice(0, 10)) {
    console.log(`   - ${t.productType || 'NULL'}: ${t._count.id}`);
  }

  console.log('\n✅ Tests terminés!');

  await prisma.$disconnect();
}

async function getSearchCount(term: string): Promise<number> {
  const normalized = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const tsquery = normalized
    .split(/\s+/)
    .filter(t => t.length > 1)
    .map(t => `${t}:*`)
    .join(' & ');

  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    WHERE p."isActive" = true
      AND p."searchVector" @@ to_tsquery('french_unaccent', ${tsquery})
  `;
  return Number(result[0].count);
}

main().catch(console.error);
