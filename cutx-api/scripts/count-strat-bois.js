const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const cat = await p.category.findFirst({ where: { slug: 'strat-bois' } });
  
  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { name: true }
  });
  
  const counts = {
    chene: 0, noyer: 0, hetre: 0, frene: 0, pin: 0, chataigner: 0,
    bouleau: 0, erable: 0, teck: 0, acacia: 0, olivier: 0, autres: 0
  };
  const autres = [];
  
  for (const pn of panels) {
    const text = pn.name.toLowerCase();
    if (text.includes('chêne') || text.includes('chene')) counts.chene++;
    else if (text.includes('noyer') || text.includes('walnut')) counts.noyer++;
    else if (text.includes('hêtre') || text.includes('hetre')) counts.hetre++;
    else if (text.includes('frêne') || text.includes('frene') || text.includes('ash')) counts.frene++;
    else if (text.includes('pin') || text.includes('sapin')) counts.pin++;
    else if (text.includes('châtaign') || text.includes('chataign')) counts.chataigner++;
    else if (text.includes('bouleau') || text.includes('birch')) counts.bouleau++;
    else if (text.includes('érable') || text.includes('erable') || text.includes('maple')) counts.erable++;
    else if (text.includes('teck') || text.includes('teak')) counts.teck++;
    else if (text.includes('acacia')) counts.acacia++;
    else if (text.includes('olivier') || text.includes('olive')) counts.olivier++;
    else {
      counts.autres++;
      if (autres.length < 20) autres.push(pn.name);
    }
  }
  
  console.log('=== DISTRIBUTION PAR ESSENCE (' + panels.length + ' total) ===\n');
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) console.log(k.padEnd(12) + ': ' + v);
  }
  
  if (autres.length > 0) {
    console.log('\n=== EXEMPLES AUTRES ===');
    for (const a of autres) {
      console.log('- ' + a.substring(0, 60));
    }
  }
  
  await p.$disconnect();
}
main();
