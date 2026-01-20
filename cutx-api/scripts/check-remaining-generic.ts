import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Panneaux avec nom générique
  const generic = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      name: { contains: 'Panneau Standard' }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      defaultLength: true,
      defaultWidth: true,
      pricePerM2: true,
      stockStatus: true,
      imageUrl: true
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`═══ PANNEAUX MDF "PANNEAU STANDARD" (${generic.length}) ═══\n`);

  // Grouper par pattern de référence
  const byPattern: Record<string, typeof generic> = {};

  for (const p of generic) {
    // Extraire le code numérique
    const codeMatch = p.reference.match(/BCB-(\d+)/);
    const code = codeMatch ? codeMatch[1] : 'UNKNOWN';

    // Afficher les détails
    const dims = `${p.defaultLength || '?'}x${p.defaultWidth || '?'}x${p.thickness?.[0] || '?'}mm`;
    const price = p.pricePerM2 ? `${p.pricePerM2}€/m²` : 'Prix N/A';
    const hasImage = p.imageUrl ? '📷' : '  ';

    console.log(`${hasImage} ${p.reference.padEnd(15)} | ${dims.padEnd(18)} | ${price.padEnd(12)} | ${p.stockStatus}`);

    // URL potentielle sur BCB (à tester manuellement)
    // console.log(`   🔗 https://www.bcommebois.fr/mdf-standard-*-${code}.html`);
  }

  console.log(`\n═══ RÉSUMÉ ═══`);
  console.log(`Total panneaux "Panneau Standard": ${generic.length}`);

  // Compter ceux avec prix
  const withPrice = generic.filter(p => p.pricePerM2).length;
  console.log(`Avec prix: ${withPrice}`);

  // Compter ceux avec dimensions
  const withDims = generic.filter(p => p.defaultLength && p.defaultWidth).length;
  console.log(`Avec dimensions complètes: ${withDims}`);

  // Compter par épaisseur
  const byThickness: Record<number, number> = {};
  for (const p of generic) {
    const t = p.thickness?.[0] || 0;
    byThickness[t] = (byThickness[t] || 0) + 1;
  }
  console.log('\nPar épaisseur:');
  for (const [t, count] of Object.entries(byThickness).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    console.log(`  ${t}mm: ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
