const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
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
  
  console.log('=== INVESTIGATION CHANTS ABS V2 ===');
  console.log('Total:', chants.length);
  
  // ORDRE IMPORTANT : D'abord les plus spécifiques
  
  // 1. Essences de bois (prioritaire)
  const ESSENCES = {
    'chene': ['chene', 'chêne', 'oak', 'eiche'],
    'noyer': ['noyer', 'walnut', 'nuss'],
    'hetre': ['hetre', 'hêtre', 'beech', 'buche'],
    'frene': ['frene', 'frêne', 'ash', 'esche'],
    'erable': ['erable', 'érable', 'maple', 'ahorn'],
    'merisier': ['merisier', 'cherry', 'kirsch']
  };
  
  // 2. Pierre/Béton (mots complets, pas de substring courte)
  const PIERRE_KEYWORDS = ['marble', 'marbre', 'beton', 'béton', 'pietra', 'ardoise', 'slate', 'granit', 'terrazzo', 'carrara', 'calacatta', 'travertin', 'limestone', 'calcaire', 'onyx'];
  
  // 3. Métal (mots précis, éviter les faux positifs)
  const METAL_KEYWORDS = ['bronze', 'inox', 'aluminium', 'chrome', 'chromé', 'acier', 'steel', 'copper', 'cuivre', 'laiton', 'brass', 'zinc', 'titane', 'titanium', 'nickel', 'cobalt', 'oxyde'];
  // PAS: 'or', 'gold', 'silver', 'argent', 'metal', 'métal', 'alu', 'fer', 'iron' (trop de faux positifs)
  
  // 4. Bois générique (si decorCategory = BOIS mais pas d'essence)
  const BOIS_GENERIC = ['bois', 'wood', 'holz', 'orme', 'elm', 'aulne', 'alder', 'tilleul', 'linden', 'peuplier', 'poplar', 'pin', 'sapin', 'epicea', 'cedre', 'cèdre', 'acacia', 'teck', 'teak', 'wenge', 'zebrano', 'bambou', 'bamboo', 'bouleau', 'birch', 'orme'];
  
  const analysis = {
    chene: [],
    noyer: [],
    hetre: [],
    frene: [],
    erable: [],
    merisier: [],
    bois_autre: [],
    pierre: [],
    metal: [],
    unis: [],
    fantaisie: [],
    unknown: []
  };
  
  for (const chant of chants) {
    const text = (chant.name + ' ' + (chant.material || '') + ' ' + (chant.finish || '') + ' ' + (chant.description || '')).toLowerCase();
    let assigned = false;
    
    // 1. Essences de bois (prioritaire)
    for (const [essence, keywords] of Object.entries(ESSENCES)) {
      if (keywords.some(kw => text.includes(kw))) {
        analysis[essence].push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
        assigned = true;
        break;
      }
    }
    if (assigned) continue;
    
    // 2. Pierre/Béton
    const pierreMatch = PIERRE_KEYWORDS.find(kw => text.includes(kw));
    if (pierreMatch) {
      analysis.pierre.push({ ref: chant.reference, name: chant.name.substring(0, 60), keyword: pierreMatch, decorCategory: chant.decorCategory });
      continue;
    }
    
    // 3. Métal
    const metalMatch = METAL_KEYWORDS.find(kw => text.includes(kw));
    if (metalMatch) {
      analysis.metal.push({ ref: chant.reference, name: chant.name.substring(0, 60), keyword: metalMatch, decorCategory: chant.decorCategory });
      continue;
    }
    
    // 4. Bois générique (decorCategory BOIS ou keywords)
    const boisMatch = BOIS_GENERIC.find(kw => text.includes(kw));
    if (boisMatch || chant.decorCategory === 'BOIS') {
      analysis.bois_autre.push({ ref: chant.reference, name: chant.name.substring(0, 60), keyword: boisMatch, decorCategory: chant.decorCategory });
      continue;
    }
    
    // 5. Unis
    if (chant.decorCategory === 'UNIS') {
      analysis.unis.push({ ref: chant.reference, name: chant.name.substring(0, 60) });
      continue;
    }
    
    // 6. Fantaisie (textile, lin, canevas...)
    if (chant.decorCategory === 'FANTAISIE') {
      analysis.fantaisie.push({ ref: chant.reference, name: chant.name.substring(0, 60) });
      continue;
    }
    
    // 7. Unknown
    analysis.unknown.push({ ref: chant.reference, name: chant.name.substring(0, 60), decorCategory: chant.decorCategory });
  }
  
  // Print results
  console.log('\n=== RÉSULTATS AFFINÉS ===\n');
  
  console.log('🌳 CHÊNE:', analysis.chene.length);
  analysis.chene.slice(0, 5).forEach(c => console.log('  ' + c.ref + ' | ' + c.name));
  
  console.log('\n🌳 NOYER:', analysis.noyer.length);
  analysis.noyer.slice(0, 3).forEach(c => console.log('  ' + c.ref + ' | ' + c.name));
  
  console.log('\n🌳 HÊTRE:', analysis.hetre.length);
  console.log('🌳 FRÊNE:', analysis.frene.length);
  console.log('🌳 ÉRABLE:', analysis.erable.length);
  console.log('🌳 MERISIER:', analysis.merisier.length);
  
  console.log('\n🌳 BOIS AUTRE:', analysis.bois_autre.length);
  analysis.bois_autre.slice(0, 5).forEach(c => console.log('  ' + c.ref + ' | kw:' + c.keyword + ' | ' + c.name));
  
  console.log('\n🪨 PIERRE/BÉTON:', analysis.pierre.length);
  analysis.pierre.slice(0, 10).forEach(c => console.log('  ' + c.ref + ' | ' + c.keyword + ' | ' + c.name));
  
  console.log('\n🔧 MÉTAL:', analysis.metal.length);
  analysis.metal.forEach(c => console.log('  ' + c.ref + ' | ' + c.keyword + ' | ' + c.name));
  
  console.log('\n⬜ UNIS:', analysis.unis.length);
  console.log('🎨 FANTAISIE:', analysis.fantaisie.length);
  
  console.log('\n❓ UNKNOWN:', analysis.unknown.length);
  analysis.unknown.slice(0, 15).forEach(c => console.log('  ' + c.ref + ' | decor:' + c.decorCategory + ' | ' + c.name));
  
  // Summary
  console.log('\n=== ASSIGNATION FINALE PROPOSÉE ===');
  console.log('abs-chene:', analysis.chene.length);
  console.log('abs-noyer:', analysis.noyer.length);
  console.log('abs-hetre:', analysis.hetre.length);
  console.log('abs-frene:', analysis.frene.length);
  console.log('abs-erable:', analysis.erable.length, '(vérifier si existe)');
  console.log('abs-merisier:', analysis.merisier.length, '(vérifier si existe)');
  console.log('abs-bois:', analysis.bois_autre.length);
  console.log('abs-pierre:', analysis.pierre.length);
  console.log('abs-metal:', analysis.metal.length, '(vérifier si existe)');
  console.log('abs-unis:', analysis.unis.length);
  console.log('abs-fantaisie:', analysis.fantaisie.length);
  console.log('chants-abs (fallback):', analysis.unknown.length);
  console.log('TOTAL:', Object.values(analysis).reduce((a, b) => a + b.length, 0));
  
  await prisma.$disconnect();
}

investigate().catch(console.error);
