const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping decorCategory → slug pour les chants ABS
const DECOR_TO_ABS_SLUG = {
  UNIS: 'abs-unis',
  BOIS: 'abs-bois',
  FANTAISIE: 'abs-fantaisie',
  PIERRE: 'abs-pierre',
  METAL: 'abs-fantaisie', // Pas de catégorie métal, fallback fantaisie
};

// Essences de bois pour affinage supplémentaire
const ESSENCE_TO_SLUG = {
  'chene': 'abs-chene',
  'chêne': 'abs-chene',
  'noyer': 'abs-noyer',
  'hetre': 'abs-hetre',
  'hêtre': 'abs-hetre',
  'frene': 'abs-frene',
  'frêne': 'abs-frene',
};

async function resetAndAssign() {
  console.log('🔄 Réinitialisation des chants mal assignés...');
  
  // Get all ABS subcategories
  const absCategories = await prisma.category.findMany({
    where: { 
      OR: [
        { slug: 'chants-abs' },
        { slug: { startsWith: 'abs-' } }
      ]
    },
    select: { id: true, slug: true, name: true }
  });
  
  const catMap = {};
  absCategories.forEach(c => catMap[c.slug] = { id: c.id, name: c.name });
  console.log('📁 Catégories trouvées:', Object.keys(catMap).join(', '));
  
  // Reset: remove categoryId from all CHANT_ABS panels
  const resetResult = await prisma.panel.updateMany({
    where: { 
      panelSubType: 'CHANT_ABS',
      categoryId: { not: null }
    },
    data: { categoryId: null }
  });
  console.log('🗑️ Réinitialisés:', resetResult.count, 'chants ABS');
  
  // Get all CHANT_ABS panels
  const panels = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_ABS' },
    select: { id: true, reference: true, name: true, decorCategory: true, material: true }
  });
  
  console.log('\n📦 Traitement de', panels.length, 'chants ABS...');
  
  const stats = {};
  const assignments = [];
  
  for (const panel of panels) {
    let targetSlug = 'chants-abs'; // Fallback
    let reason = 'default';
    
    const decor = panel.decorCategory;
    
    if (decor && DECOR_TO_ABS_SLUG[decor]) {
      targetSlug = DECOR_TO_ABS_SLUG[decor];
      reason = 'decorCategory=' + decor;
      
      // Pour les BOIS, essayer d'affiner par essence
      if (decor === 'BOIS') {
        const text = ((panel.name || '') + ' ' + (panel.material || '')).toLowerCase();
        for (const [essence, essenceSlug] of Object.entries(ESSENCE_TO_SLUG)) {
          if (text.includes(essence) && catMap[essenceSlug]) {
            targetSlug = essenceSlug;
            reason = 'essence=' + essence;
            break;
          }
        }
      }
    }
    
    // Verify category exists
    if (!catMap[targetSlug]) {
      targetSlug = 'chants-abs';
      reason = 'fallback (cat not found)';
    }
    
    assignments.push({
      panelId: panel.id,
      categoryId: catMap[targetSlug].id,
      slug: targetSlug
    });
    
    stats[targetSlug] = (stats[targetSlug] || 0) + 1;
  }
  
  console.log('\n📊 Distribution prévue:');
  for (const [slug, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + slug + ': ' + count);
  }
  
  // Group by category for batch updates
  const byCategory = {};
  for (const a of assignments) {
    if (!byCategory[a.categoryId]) byCategory[a.categoryId] = [];
    byCategory[a.categoryId].push(a.panelId);
  }
  
  console.log('\n⏳ Exécution des assignations...');
  let total = 0;
  for (const [categoryId, panelIds] of Object.entries(byCategory)) {
    await prisma.panel.updateMany({
      where: { id: { in: panelIds } },
      data: { categoryId }
    });
    total += panelIds.length;
  }
  
  console.log('✅ Assignés:', total, 'chants ABS');
  
  await prisma.$disconnect();
}

resetAndAssign().catch(console.error);
