import { PrismaClient } from '@prisma/client';
import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser.js';
const prisma = new PrismaClient();

async function main() {
  const query = 'chêne';

  console.log('\n=== DEBUG SMART-SEARCH ===\n');
  console.log('Query:', query);

  // Parser la requête
  const parsed = parseSmartQuery(query);
  console.log('\nParsed:', JSON.stringify(parsed, null, 2));

  // Construire la requête SQL
  const { whereClause, params } = buildSmartSearchSQL(parsed);
  console.log('\nWhereClause:', whereClause);
  console.log('Params:', params);

  // Simuler les conditions supplémentaires
  const stockCondition = `AND p."stockStatus" = 'EN STOCK'`;
  const categoryCondition = `AND p."panelType" = 'CHANT'`;

  const sql = `
    SELECT p.reference, p.name, p."panelType", p."stockStatus", c.slug
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
      ${stockCondition}
      ${categoryCondition}
    LIMIT 30
  `;

  console.log('\n=== SQL FINAL ===');
  console.log(sql.replace(/\s+/g, ' '));

  console.log('\n=== EXÉCUTION ===\n');

  try {
    const results: any[] = await prisma.$queryRawUnsafe(sql, ...params);
    console.log(`Résultats: ${results.length}`);

    // Compter par catalogue
    const byCatalogue: Record<string, number> = {};
    results.forEach(r => {
      byCatalogue[r.slug] = (byCatalogue[r.slug] || 0) + 1;
    });
    console.log('\nPar catalogue:', byCatalogue);

    // Afficher les premiers résultats
    console.log('\nPremiers résultats:');
    results.slice(0, 15).forEach(r => {
      console.log(`  [${r.reference}] ${r.slug} | ${r.name.substring(0, 45)}`);
    });

    // Vérifier si BCB est dans les résultats
    const bcbResults = results.filter(r => r.reference.startsWith('BCB'));
    console.log(`\nRésultats BCB: ${bcbResults.length}`);
    bcbResults.slice(0, 10).forEach(r => {
      console.log(`  [${r.reference}] ${r.name.substring(0, 45)}`);
    });

  } catch (e) {
    console.error('Erreur SQL:', e);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
