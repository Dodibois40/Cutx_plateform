import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mdfStandardCat = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });

  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandardCat?.id },
    select: { reference: true, name: true }
  });

  console.log('=== Recherche de MDF laqué/blanc/noir dans mdf-standard ===\n');

  const suspicious: { ref: string; name: string; issue: string }[] = [];

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();

    if (name.includes('laqué') || name.includes('laque')) {
      suspicious.push({ ref: p.reference, name: p.name || '', issue: 'Contient "laqué"' });
    } else if (name.includes('blanc') && !name.includes('chêne blanc')) {
      suspicious.push({ ref: p.reference, name: p.name || '', issue: 'Contient "blanc"' });
    } else if (name.includes('noir') && !name.includes('noyer noir')) {
      suspicious.push({ ref: p.reference, name: p.name || '', issue: 'Contient "noir"' });
    }
  }

  console.log(`Trouvés: ${suspicious.length}\n`);

  for (const s of suspicious) {
    console.log(`${s.ref}`);
    console.log(`   ${s.name.substring(0, 60)}`);
    console.log(`   ⚠️ ${s.issue}`);
    console.log('');
  }

  await prisma.$disconnect();
}
main().catch(console.error);
