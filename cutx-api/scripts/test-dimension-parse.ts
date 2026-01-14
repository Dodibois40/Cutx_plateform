import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser.js';

const tests = [
  'mdf 19',
  'mdf 19 2800x2070',
  'mdf hydrofuge 2500x1250',
  'contreplaqué 2500*1250',
  'méla 2800X2070 19',
];

console.log('=== TEST DIMENSION PARSING ===\n');

for (const query of tests) {
  const parsed = parseSmartQuery(query);
  console.log('Query:', JSON.stringify(query));
  console.log('  productTypes:', parsed.productTypes.join(', ') || '(none)');
  console.log('  thickness:', parsed.thickness ? parsed.thickness + 'mm' : '(none)');
  console.log('  dimension:', parsed.dimension ? `${parsed.dimension.length}×${parsed.dimension.width}` : '(none)');
  console.log('  subcategories:', parsed.subcategories.join(', ') || '(none)');
  console.log('  recognized:', parsed.recognizedTokens.join(', '));

  const { whereClause, params } = buildSmartSearchSQL(parsed);
  console.log('  SQL params:', JSON.stringify(params));
  console.log('');
}
