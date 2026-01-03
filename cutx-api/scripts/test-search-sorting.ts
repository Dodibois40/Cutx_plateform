/**
 * Test search + sorting via API
 * Run with: npx tsx scripts/test-search-sorting.ts
 */

const API_URL = 'http://localhost:3001';

interface Panel {
  reference: string;
  name: string;
  pricePerM2: number | null;
  pricePerMl: number | null;
  defaultThickness: number | null;
  productType: string | null;
}

interface ApiResponse {
  panels: Panel[];
  total: number;
}

async function fetchSearch(query: string, sortBy: string, sortDirection: string): Promise<Panel[]> {
  const url = `${API_URL}/api/catalogues/panels?page=1&limit=8&search=${encodeURIComponent(query)}&sortBy=${sortBy}&sortDirection=${sortDirection}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json() as ApiResponse;
    return json.panels;
  } catch (error) {
    console.error(`   Erreur: ${error}`);
    return [];
  }
}

async function main() {
  console.log('🔍 TEST RECHERCHE + TRI VIA API\n');
  console.log('='.repeat(60) + '\n');

  // Test 1: Search "chene" + Prix ASC
  console.log('📋 1. RECHERCHE "chene" + TRI PAR PRIX (ASC)\n');
  const cheneAsc = await fetchSearch('chene', 'pricePerM2', 'asc');
  cheneAsc.forEach((p, i) => {
    const price = p.pricePerM2 ?? p.pricePerMl;
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${price?.toFixed(2) ?? 'NULL'}€`);
  });

  // Test 2: Search "chene" + Prix DESC
  console.log('\n📋 2. RECHERCHE "chene" + TRI PAR PRIX (DESC)\n');
  const cheneDesc = await fetchSearch('chene', 'pricePerM2', 'desc');
  cheneDesc.forEach((p, i) => {
    const price = p.pricePerM2 ?? p.pricePerMl;
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${price?.toFixed(2) ?? 'NULL'}€`);
  });

  // Test 3: Search "melamine" + Épaisseur ASC
  console.log('\n📋 3. RECHERCHE "melamine" + TRI PAR ÉPAISSEUR (ASC)\n');
  const melAsc = await fetchSearch('melamine', 'defaultThickness', 'asc');
  melAsc.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${p.defaultThickness ?? 'NULL'}mm`);
  });

  // Test 4: Search "melamine" + Épaisseur DESC
  console.log('\n📋 4. RECHERCHE "melamine" + TRI PAR ÉPAISSEUR (DESC)\n');
  const melDesc = await fetchSearch('melamine', 'defaultThickness', 'desc');
  melDesc.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${p.defaultThickness ?? 'NULL'}mm`);
  });

  // Test 5: Search "bande chant" + Prix ASC
  console.log('\n📋 5. RECHERCHE "bande chant" + TRI PAR PRIX (ASC)\n');
  const bandeAsc = await fetchSearch('bande chant', 'pricePerM2', 'asc');
  bandeAsc.forEach((p, i) => {
    const price = p.pricePerM2 ?? p.pricePerMl;
    const unit = p.pricePerM2 ? '/m²' : '/ml';
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${price?.toFixed(2) ?? 'NULL'}€${price ? unit : ''}`);
  });

  // Validation
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 VALIDATION\n');

  // Check price sorting for "chene"
  const priceAscValid = cheneAsc.every((p, i) => {
    if (i === 0) return true;
    const prev = cheneAsc[i - 1].pricePerM2 ?? cheneAsc[i - 1].pricePerMl ?? Infinity;
    const curr = p.pricePerM2 ?? p.pricePerMl ?? Infinity;
    return curr >= prev;
  });
  console.log(`   "chene" + Prix ASC: ${priceAscValid ? '✅ OK' : '❌ ERREUR'}`);

  const priceDescValid = cheneDesc.every((p, i) => {
    if (i === 0) return true;
    const prev = cheneDesc[i - 1].pricePerM2 ?? cheneDesc[i - 1].pricePerMl ?? -Infinity;
    const curr = p.pricePerM2 ?? p.pricePerMl ?? -Infinity;
    return curr <= prev;
  });
  console.log(`   "chene" + Prix DESC: ${priceDescValid ? '✅ OK' : '❌ ERREUR'}`);

  // Check thickness for "melamine"
  const thickAscValid = melAsc.every((p, i) => {
    if (i === 0) return true;
    const prev = melAsc[i - 1].defaultThickness ?? Infinity;
    const curr = p.defaultThickness ?? Infinity;
    return curr >= prev;
  });
  console.log(`   "melamine" + Épaisseur ASC: ${thickAscValid ? '✅ OK' : '❌ ERREUR'}`);

  const thickDescValid = melDesc.every((p, i) => {
    if (i === 0) return true;
    const prev = melDesc[i - 1].defaultThickness ?? -Infinity;
    const curr = p.defaultThickness ?? -Infinity;
    return curr <= prev;
  });
  console.log(`   "melamine" + Épaisseur DESC: ${thickDescValid ? '✅ OK' : '❌ ERREUR'}`);

  // Check edge band prices
  const bandeAscValid = bandeAsc.every((p, i) => {
    if (i === 0) return true;
    const prev = bandeAsc[i - 1].pricePerM2 ?? bandeAsc[i - 1].pricePerMl ?? Infinity;
    const curr = p.pricePerM2 ?? p.pricePerMl ?? Infinity;
    return curr >= prev;
  });
  console.log(`   "bande chant" + Prix ASC: ${bandeAscValid ? '✅ OK' : '❌ ERREUR'}`);

  console.log('\n✅ Tests terminés!');
}

main().catch(console.error);
