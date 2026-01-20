/**
 * Debug "3plis" parsing
 */

import { parseSmartQuery, PRODUCT_TYPE_SYNONYMS } from '../src/catalogues/utils/smart-search-parser';

console.log('=== Debug 3plis ===\n');

// Check if '3plis' is in the dictionary
console.log('Dictionary keys containing "3":');
for (const key of Object.keys(PRODUCT_TYPE_SYNONYMS)) {
  if (key.includes('3') || key.includes('plis')) {
    console.log(`  "${key}" → ${PRODUCT_TYPE_SYNONYMS[key]}`);
  }
}

// Parse and show internals
const query = '3plis';
const result = parseSmartQuery(query);

console.log('\nParsed result for "3plis":');
console.log('  productTypes:', result.productTypes);
console.log('  recognizedTokens:', result.recognizedTokens);
console.log('  unrecognizedTokens:', result.unrecognizedTokens);
console.log('  searchText:', result.searchText);

// Test direct lookup
const normalizedKey = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
console.log('\nNormalized key:', `"${normalizedKey}"`);
console.log('Direct dictionary lookup:', PRODUCT_TYPE_SYNONYMS[normalizedKey]);
console.log('Direct lookup "3plis":', PRODUCT_TYPE_SYNONYMS['3plis']);
