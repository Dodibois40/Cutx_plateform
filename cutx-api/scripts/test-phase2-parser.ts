/**
 * Test du parser avec les nouveaux synonymes de Phase 2
 */

import { parseSmartQuery, PRODUCT_TYPE_SYNONYMS } from '../src/catalogues/utils/smart-search-parser';

const TEST_QUERIES = [
  'decoratif',
  'décoratif',
  'acoustique',
  '3plis',
  'trois-plis',
  'latté',
  'lamellé',
  'isolant',
  'thermique',
  'alvéolaire',
  'fermacell',
  'ciment',
  'mural',
  'design',
];

console.log('='.repeat(70));
console.log('TEST DU PARSER AVEC LES NOUVEAUX SYNONYMES');
console.log('='.repeat(70));

console.log('\nSynonymes disponibles:');
for (const [key, value] of Object.entries(PRODUCT_TYPE_SYNONYMS)) {
  if (value.includes('PANNEAU_') || value === 'LATTE' || value === 'CIMENT_BOIS') {
    console.log(`  ${key} → ${value}`);
  }
}

console.log('\n--- Tests de parsing ---\n');

for (const query of TEST_QUERIES) {
  const result = parseSmartQuery(query);
  const productType = result.productTypes[0] || 'NON RECONNU';
  const status = result.productTypes.length > 0 ? '✅' : '❌';
  console.log(`${status} "${query}" → ${productType}`);
}
