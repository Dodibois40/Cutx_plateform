import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mdfStandardCat = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });
  console.log('Cat ID:', mdfStandardCat?.id);

  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandardCat?.id },
    select: { reference: true, name: true },
    orderBy: { reference: 'asc' }
  });

  console.log('Total:', panels.length);

  // Simple categorization
  let compacmel = 0, fibralux = 0, hydro = 0, ok = 0;
  const issues: { reference: string; name: string | null; issue: string }[] = [];
  const okPanels: { reference: string; name: string | null }[] = [];

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();
    if (name.includes('compacmel')) {
      compacmel++;
      issues.push({ ...p, issue: 'COMPACMEL -> MELAMINE' });
    }
    else if (name.includes('fibralux')) {
      fibralux++;
      issues.push({ ...p, issue: 'FIBRALUX -> MELAMINE deco' });
    }
    else if (name.includes('hydrofuge') || name.includes(' mh ')) {
      hydro++;
      issues.push({ ...p, issue: 'HYDROFUGE -> mdf-hydrofuge' });
    }
    else {
      ok++;
      okPanels.push(p);
    }
  }

  console.log('\n=== PROBLEMES DETECTES ===');
  console.log('CompacMel:', compacmel);
  console.log('Fibralux:', fibralux);
  console.log('Hydrofuge:', hydro);
  console.log('OK:', ok);

  console.log('\n=== PANNEAUX A DEPLACER ===');
  for (const p of issues) {
    console.log(`${p.reference}: ${(p.name || '').substring(0, 50)} [${p.issue}]`);
  }

  console.log('\n=== VRAIS MDF STANDARD (premiers 15) ===');
  for (const p of okPanels.slice(0, 15)) {
    console.log(`${p.reference}: ${(p.name || '').substring(0, 50)}`);
  }

  await prisma.$disconnect();
}
main().catch(e => console.error(e));
