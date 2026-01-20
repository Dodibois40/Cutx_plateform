const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assign() {
  console.log('🔄 Réinitialisation et assignation correcte des chants ABS...\n');
  
  // Get all ABS categories
  const categories = await prisma.category.findMany({
    where: { 
      OR: [
        { slug: { startsWith: 'abs-' } },
        { slug: 'chants-abs' }
      ]
    },
    select: { id: true, slug: true, name: true }
  });
  
  const catMap = {};
  categories.forEach(c => catMap[c.slug] = { id: c.id, name: c.name });
  console.log('📁 Catégories:', Object.keys(catMap).join(', '));
  
  // Reset all CHANT_ABS
  await prisma.panel.updateMany({
    where: { panelSubType: 'CHANT_ABS' },
    data: { categoryId: null }
  });
  console.log('🗑️ Reset effectué');
  
  // Get all chants
  const chants = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_ABS' },
    select: { 
      id: true, reference: true, name: true, 
      decorCategory: true, material: true, finish: true, description: true
    }
  });
  
  console.log('📦 Traitement de', chants.length, 'chants...\n');
  
  // KEYWORDS - ORDRE IMPORTANT
  const ESSENCES = {
    'abs-chene': ['chene', 'chêne', 'oak', 'eiche'],
    'abs-noyer': ['noyer', 'walnut', 'nuss'],
    'abs-hetre': ['hetre', 'hêtre', 'beech', 'buche'],
    'abs-frene': ['frene', 'frêne', 'ash', 'esche']
  };
  
  const PIERRE_KW = ['marble', 'marbre', 'beton', 'béton', 'pietra', 'ardoise', 'slate', 'granit', 'terrazzo', 'carrara', 'calacatta', 'travertin', 'limestone', 'calcaire', 'onyx'];
  const METAL_KW = ['bronze', 'inox', 'aluminium', 'chrome', 'chromé', 'acier', 'steel', 'copper', 'cuivre', 'laiton', 'brass', 'zinc', 'titane', 'titanium', 'nickel', 'cobalt', 'oxyde'];
  const BOIS_KW = ['bois', 'wood', 'holz', 'orme', 'elm', 'aulne', 'alder', 'tilleul', 'linden', 'peuplier', 'poplar', 'pin', 'sapin', 'epicea', 'cedre', 'cèdre', 'acacia', 'teck', 'teak', 'wenge', 'zebrano', 'bambou', 'bamboo', 'bouleau', 'birch', 'erable', 'érable', 'maple', 'merisier', 'cherry'];
  
  const stats = {};
  const assignments = [];
  
  for (const chant of chants) {
    const text = (chant.name + ' ' + (chant.material || '') + ' ' + (chant.finish || '') + ' ' + (chant.description || '')).toLowerCase();
    let slug = 'chants-abs'; // fallback
    
    // 1. Essences (priorité)
    let found = false;
    for (const [essenceSlug, keywords] of Object.entries(ESSENCES)) {
      if (keywords.some(kw => text.includes(kw)) && catMap[essenceSlug]) {
        slug = essenceSlug;
        found = true;
        break;
      }
    }
    
    // 2. Pierre
    if (!found && PIERRE_KW.some(kw => text.includes(kw)) && catMap['abs-pierre']) {
      slug = 'abs-pierre';
      found = true;
    }
    
    // 3. Métal
    if (!found && METAL_KW.some(kw => text.includes(kw)) && catMap['abs-metal']) {
      slug = 'abs-metal';
      found = true;
    }
    
    // 4. Bois générique (keywords ou decorCategory)
    if (!found && (BOIS_KW.some(kw => text.includes(kw)) || chant.decorCategory === 'BOIS') && catMap['abs-bois']) {
      slug = 'abs-bois';
      found = true;
    }
    
    // 5. Unis (decorCategory)
    if (!found && chant.decorCategory === 'UNIS' && catMap['abs-unis']) {
      slug = 'abs-unis';
      found = true;
    }
    
    // 6. Fantaisie (decorCategory ou textile/lin/canevas)
    if (!found) {
      const fantaisieKw = ['textile', 'lin ', 'canevas', 'tissu', 'fabric'];
      if ((chant.decorCategory === 'FANTAISIE' || fantaisieKw.some(kw => text.includes(kw))) && catMap['abs-fantaisie']) {
        slug = 'abs-fantaisie';
        found = true;
      }
    }
    
    // 7. Si decorCategory PIERRE ou METAL mais pas détecté par keywords
    if (!found && chant.decorCategory === 'PIERRE' && catMap['abs-pierre']) {
      slug = 'abs-pierre';
    }
    if (!found && chant.decorCategory === 'METAL' && catMap['abs-metal']) {
      slug = 'abs-metal';
    }
    
    assignments.push({ panelId: chant.id, categoryId: catMap[slug].id, slug });
    stats[slug] = (stats[slug] || 0) + 1;
  }
  
  // Group and update
  const byCategory = {};
  for (const a of assignments) {
    if (!byCategory[a.categoryId]) byCategory[a.categoryId] = [];
    byCategory[a.categoryId].push(a.panelId);
  }
  
  for (const [categoryId, panelIds] of Object.entries(byCategory)) {
    await prisma.panel.updateMany({
      where: { id: { in: panelIds } },
      data: { categoryId }
    });
  }
  
  // Print results
  console.log('=== RÉSULTAT FINAL ===\n');
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [slug, count] of sorted) {
    console.log(catMap[slug].name + ' (' + slug + '): ' + count);
  }
  console.log('\n✅ Total assigné:', assignments.length);
  
  await prisma.$disconnect();
}

assign().catch(console.error);
