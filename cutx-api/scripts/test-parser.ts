import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser';

const parsed = parseSmartQuery('querkus chêne');
console.log('=== PARSED ===');
console.log('productTypes:', parsed.productTypes);
console.log('woods:', parsed.woods);
console.log('searchText:', parsed.searchText);
console.log('unrecognizedTokens:', parsed.unrecognizedTokens);

const { whereClause, params } = buildSmartSearchSQL(parsed);
console.log('\n=== SQL GENERATED ===');
console.log('WHERE:', whereClause);
console.log('\nparams:', params);
