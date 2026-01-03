/**
 * Test sorting via API
 * Run with: npx tsx scripts/test-api-sorting.ts
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

async function fetchPanels(sortBy: string, sortDirection: string): Promise<Panel[]> {
  const url = `${API_URL}/api/catalogues/panels?page=1&limit=10&sortBy=${sortBy}&sortDirection=${sortDirection}`;

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
  console.log('🔍 TEST DU TRI VIA API\n');
  console.log('='.repeat(60) + '\n');

  // Test 1: Prix ASC
  console.log('📋 1. TRI PAR PRIX (ASC)\n');
  const priceAsc = await fetchPanels('pricePerM2', 'asc');
  priceAsc.forEach((p, i) => {
    const price = p.pricePerM2 ?? p.pricePerMl;
    const unit = p.pricePerM2 ? '/m²' : '/ml';
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${price?.toFixed(2) ?? 'NULL'}€${price ? unit : ''}`);
  });

  // Test 2: Prix DESC
  console.log('\n📋 2. TRI PAR PRIX (DESC)\n');
  const priceDesc = await fetchPanels('pricePerM2', 'desc');
  priceDesc.forEach((p, i) => {
    const price = p.pricePerM2 ?? p.pricePerMl;
    const unit = p.pricePerM2 ? '/m²' : '/ml';
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${price?.toFixed(2) ?? 'NULL'}€${price ? unit : ''}`);
  });

  // Test 3: Épaisseur ASC
  console.log('\n📋 3. TRI PAR ÉPAISSEUR (ASC)\n');
  const thickAsc = await fetchPanels('defaultThickness', 'asc');
  thickAsc.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${p.defaultThickness ?? 'NULL'}mm`);
  });

  // Test 4: Épaisseur DESC
  console.log('\n📋 4. TRI PAR ÉPAISSEUR (DESC)\n');
  const thickDesc = await fetchPanels('defaultThickness', 'desc');
  thickDesc.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.productType}] ${p.reference}: ${p.defaultThickness ?? 'NULL'}mm`);
  });

  // Test 5: Nom ASC
  console.log('\n📋 5. TRI PAR NOM (ASC)\n');
  const nameAsc = await fetchPanels('name', 'asc');
  nameAsc.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.reference}: ${p.name.substring(0, 50)}...`);
  });

  // Test 6: Référence ASC
  console.log('\n📋 6. TRI PAR RÉFÉRENCE (ASC)\n');
  const refAsc = await fetchPanels('reference', 'asc');
  refAsc.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.reference}: ${p.name.substring(0, 50)}...`);
  });

  // Validation
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 VALIDATION\n');

  // Check price sorting
  const priceAscValid = priceAsc.every((p, i) => {
    if (i === 0) return true;
    const prev = priceAsc[i - 1].pricePerM2 ?? priceAsc[i - 1].pricePerMl ?? Infinity;
    const curr = p.pricePerM2 ?? p.pricePerMl ?? Infinity;
    return curr >= prev;
  });
  console.log(`   Prix ASC: ${priceAscValid ? '✅ OK' : '❌ ERREUR'}`);

  const priceDescValid = priceDesc.every((p, i) => {
    if (i === 0) return true;
    const prev = priceDesc[i - 1].pricePerM2 ?? priceDesc[i - 1].pricePerMl ?? -Infinity;
    const curr = p.pricePerM2 ?? p.pricePerMl ?? -Infinity;
    return curr <= prev;
  });
  console.log(`   Prix DESC: ${priceDescValid ? '✅ OK' : '❌ ERREUR'}`);

  // Check thickness sorting
  const thickAscValid = thickAsc.every((p, i) => {
    if (i === 0) return true;
    const prev = thickAsc[i - 1].defaultThickness ?? Infinity;
    const curr = p.defaultThickness ?? Infinity;
    return curr >= prev;
  });
  console.log(`   Épaisseur ASC: ${thickAscValid ? '✅ OK' : '❌ ERREUR'}`);

  const thickDescValid = thickDesc.every((p, i) => {
    if (i === 0) return true;
    const prev = thickDesc[i - 1].defaultThickness ?? -Infinity;
    const curr = p.defaultThickness ?? -Infinity;
    return curr <= prev;
  });
  console.log(`   Épaisseur DESC: ${thickDescValid ? '✅ OK' : '❌ ERREUR'}`);

  // Check name sorting
  const nameAscValid = nameAsc.every((p, i) => {
    if (i === 0) return true;
    return p.name.localeCompare(nameAsc[i - 1].name) >= 0;
  });
  console.log(`   Nom ASC: ${nameAscValid ? '✅ OK' : '❌ ERREUR'}`);

  // Check ref sorting
  const refAscValid = refAsc.every((p, i) => {
    if (i === 0) return true;
    return p.reference.localeCompare(refAsc[i - 1].reference) >= 0;
  });
  console.log(`   Référence ASC: ${refAscValid ? '✅ OK' : '❌ ERREUR'}`);

  console.log('\n✅ Tests terminés!');
}

main().catch(console.error);
