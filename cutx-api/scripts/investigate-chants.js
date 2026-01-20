const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  // Get ALL chants ABS with their full data
  const chants = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_ABS' },
    select: { 
      id: true,
      reference: true, 
      name: true, 
      decorCategory: true,
      material: true,
      finish: true,
      description: true
    }
  });
  
  console.log('=== INVESTIGATION CHANTS ABS ===');
  console.log('Total:', chants.length);
  
  // Keywords pour pierre/béton
  const PIERRE_KEYWORDS = ['marble', 'marbre', 'beton', 'béton', 'pietra', 'ardoise', 'slate', 'pierre', 'stone', 'granit', 'terrazzo', 'carrara', 'calacatta', 'travertin'];
  
  // Keywords pour métal
  const METAL_KEYWORDS = ['bronze', 'inox', 'metal', 'métal', 'alu', 'aluminium', 'chrome', 'acier', 'steel', 'copper', 'cuivre', 'gold', 'or', 'silver', 'argent', 'laiton', 'brass', 'zinc', 'fer', 'iron', 'titane', 'titanium'];
  
  // Keywords pour bois (essences)
  const BOIS_KEYWORDS = ['chene', 'chêne', 'oak', 'noyer', 'walnut', 'hetre', 'hêtre', 'beech', 'frene', 'frêne', 'ash', 'erable', 'érable', 'maple', 'teck', 'teak', 'wenge', 'zebrano', 'acacia', 'bambou', 'bamboo', 'bouleau', 'birch', 'pin', 'sapin', 'cedre', 'cèdre'];
  
  // Analyze each chant
  const analysis = {
    pierre: [],
    metal: [],
    bois_chene: [],
    bois_noyer: [],
    bois_hetre: [],
    bois_frene: [],
    bois_autre: [],
    unis: [],
    fantaisie: [],
    unknown: []
  };
  
  for (const chant of chants) {
    const text = (chant.name + ' ' + (chant.material || '') + ' ' + (chant.finish || '') + ' ' + (chant.description || '')).toLowerCase();
    
    // Check pierre
    const pierreMatch = PIERRE_KEYWORDS.find(kw => text.includes(kw));
    if (pierreMatch) {
      analysis.pierre.push({ ref: chant.reference, name: chant.name.substring(0, 60), keyword: pierreMatch, decorCategory: chant.decorCategory });
      continue;
    }
    
    // Check metal
    const metalMatch = METAL_KEYWORDS.find(kw => text.includes(kw));
    if (metalMatch) {
      analysis.metal.push({ ref: chant.reference, name: chant.name.substring(0, 60), keyword: metalMatch, decorCategory: chant.decorCategory });
      continue;
    }
    
    // Check bois essences
    if (text.includes('chene') || text.includes('chêne') || text.includes('oak')) {
      analysis.bois_chene.push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
      continue;
    }
    if (text.includes('noyer') || text.includes('walnut')) {
      analysis.bois_noyer.push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
      continue;
    }
    if (text.includes('hetre') || text.includes('hêtre') || text.includes('beech')) {
      analysis.bois_hetre.push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
      continue;
    }
    if (text.includes('frene') || text.includes('frêne') || text.includes('ash')) {
      analysis.bois_frene.push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
      continue;
    }
    
    // Other bois
    const boisMatch = BOIS_KEYWORDS.find(kw => text.includes(kw));
    if (boisMatch || chant.decorCategory === 'BOIS') {
      analysis.bois_autre.push({ ref: chant.reference, name: chant.name.substring(0, 60), keyword: boisMatch, decorCategory: chant.decorCategory });
      continue;
    }
    
    // Unis
    if (chant.decorCategory === 'UNIS') {
      analysis.unis.push({ ref: chant.reference, name: chant.name.substring(0, 60) });
      continue;
    }
    
    // Fantaisie
    if (chant.decorCategory === 'FANTAISIE') {
      analysis.fantaisie.push({ ref: chant.reference, name: chant.name.substring(0, 60) });
      continue;
    }
    
    // Unknown
    analysis.unknown.push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
  }
  
  // Print results
  console.log('\n=== RÉSULTATS ===\n');
  
  console.log('🪨 PIERRE/BÉTON:', analysis.pierre.length);
  analysis.pierre.slice(0, 10).forEach(c => console.log('  ' + c.ref + ' | ' + c.keyword + ' | ' + c.name));
  if (analysis.pierre.length > 10) console.log('  ... et ' + (analysis.pierre.length - 10) + ' autres');
  
  console.log('\n🔧 MÉTAL:', analysis.metal.length);
  analysis.metal.slice(0, 10).forEach(c => console.log('  ' + c.ref + ' | ' + c.keyword + ' | ' + c.name));
  if (analysis.metal.length > 10) console.log('  ... et ' + (analysis.metal.length - 10) + ' autres');
  
  console.log('\n🌳 BOIS CHÊNE:', analysis.bois_chene.length);
  analysis.bois_chene.slice(0, 5).forEach(c => console.log('  ' + c.ref + ' | ' + c.name));
  
  console.log('\n🌳 BOIS NOYER:', analysis.bois_noyer.length);
  analysis.bois_noyer.slice(0, 5).forEach(c => console.log('  ' + c.ref + ' | ' + c.name));
  
  console.log('\n🌳 BOIS HÊTRE:', analysis.bois_hetre.length);
  console.log('\n🌳 BOIS FRÊNE:', analysis.bois_frene.length);
  console.log('\n🌳 BOIS AUTRE:', analysis.bois_autre.length);
  
  console.log('\n⬜ UNIS:', analysis.unis.length);
  console.log('\n🎨 FANTAISIE:', analysis.fantaisie.length);
  analysis.fantaisie.slice(0, 10).forEach(c => console.log('  ' + c.ref + ' | ' + c.name));
  
  console.log('\n❓ UNKNOWN (sans decorCategory ni keywords):', analysis.unknown.length);
  analysis.unknown.slice(0, 10).forEach(c => console.log('  ' + c.ref + ' | decor:' + c.decorCategory + ' | ' + c.name));
  
  // Summary
  console.log('\n=== RÉSUMÉ ASSIGNATION PROPOSÉE ===');
  console.log('abs-pierre:', analysis.pierre.length);
  console.log('abs-metal:', analysis.metal.length, '(à créer si inexistant)');
  console.log('abs-chene:', analysis.bois_chene.length);
  console.log('abs-noyer:', analysis.bois_noyer.length);
  console.log('abs-hetre:', analysis.bois_hetre.length);
  console.log('abs-frene:', analysis.bois_frene.length);
  console.log('abs-bois:', analysis.bois_autre.length);
  console.log('abs-unis:', analysis.unis.length);
  console.log('abs-fantaisie:', analysis.fantaisie.length);
  console.log('chants-abs (fallback):', analysis.unknown.length);
  
  await prisma.$disconnect();
}

investigate().catch(console.error);
