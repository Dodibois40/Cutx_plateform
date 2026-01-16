import { parseSmartQuery } from '../src/catalogues/utils/smart-search-parser.js';

const tests = [
  'mdf 19',
  'mdf 19 standard',
  'mdf hydrofuge 19',
  'mdf ignifugé',
  'mdf teinté 19',
  'agglo hydrofuge',
  'contreplaqué okoumé 15',
  'contreplaqué bouleau filmé',
  'méla gris foncé',
  'agglo chêne 19',
  'strat blanc 0.8',
  'chant chêne',
  'melamine blanc',
  'contreplaqué bouleau 15',
  'compact noir',
  'hpl gris anthracite 0.8',
];

console.log('=== TESTS SMART QUERY PARSER ===\n');

for (const test of tests) {
  const result = parseSmartQuery(test);
  console.log('Query: "' + test + '"');
  console.log('  productTypes: ' + (result.productTypes.join(', ') || '(none)'));
  console.log('  subcategories: ' + (result.subcategories.slice(0, 2).join(', ') || '(none)'));
  console.log('  thickness: ' + (result.thickness ? result.thickness + 'mm' : '(none)'));
  console.log('  colors: ' + (result.colors.slice(0, 2).join(', ') || '(none)'));
  console.log('  woods: ' + (result.woods.slice(0, 2).join(', ') || '(none)'));
  console.log('  decors: ' + (result.decors.slice(0, 2).join(', ') || '(none)'));
  console.log('  qualifiers: ' + (result.colorQualifiers.slice(0, 2).join(', ') || '(none)'));
  console.log('  searchText: "' + result.searchText + '"');
  console.log('');
}
