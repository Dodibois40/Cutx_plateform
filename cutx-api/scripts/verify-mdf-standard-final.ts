import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mdfStandardCat = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });

  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandardCat?.id },
    select: { reference: true, name: true, productType: true }
  });

  console.log(`Total panneaux dans mdf-standard: ${panels.length}\n`);

  // Vérification plus complète
  const standard: string[] = [];
  const special: { ref: string; name: string; issue: string }[] = [];

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();

    // Patterns qui indiquent un MDF NON-STANDARD
    const nonStandardPatterns = [
      { pattern: 'hydrofuge', target: 'mdf-hydrofuge' },
      { pattern: ' mh ', target: 'mdf-hydrofuge' },
      { pattern: 'ctbh', target: 'mdf-hydrofuge' },
      { pattern: 'ignifuge', target: 'mdf-ignifuge' },
      { pattern: ' m1 ', target: 'mdf-ignifuge' },
      { pattern: 'bouche pores', target: 'mdf-a-laquer' },
      { pattern: ' bp ', target: 'mdf-a-laquer' },
      { pattern: 'fibralac', target: 'mdf-a-laquer' },
      { pattern: 'laquer', target: 'mdf-a-laquer' },
      { pattern: 'teinté', target: 'mdf-teinte-couleurs' },
      { pattern: 'colour', target: 'mdf-teinte-couleurs' },
      { pattern: 'color', target: 'mdf-teinte-couleurs' },
      { pattern: 'valchromat', target: 'mdf-teinte-couleurs' },
      { pattern: 'léger', target: 'mdf-leger' },
      { pattern: 'light', target: 'mdf-leger' },
      { pattern: 'ultralight', target: 'mdf-leger' },
      { pattern: 'cintrable', target: 'mdf-cintrable' },
      { pattern: 'flexible', target: 'mdf-cintrable' },
      { pattern: 'mélamine', target: 'MELAMINE' },
      { pattern: 'melamine', target: 'MELAMINE' },
      { pattern: 'replaqué', target: 'PLAQUE' },
      { pattern: 'compacmel', target: 'MELAMINE' },
      { pattern: 'fibralux', target: 'MELAMINE' },
    ];

    let found = false;
    for (const np of nonStandardPatterns) {
      if (name.includes(np.pattern)) {
        special.push({ ref: p.reference, name: p.name || '', issue: `Contains "${np.pattern}" → ${np.target}` });
        found = true;
        break;
      }
    }

    if (!found) {
      standard.push(`${p.reference}: ${(p.name || '').substring(0, 55)}`);
    }
  }

  // Afficher les résultats
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                     VÉRIFICATION FINALE                        ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ MDF STANDARD CONFIRMÉS: ${standard.length}`);
  console.log(`⚠️ À DÉPLACER: ${special.length}`);

  if (special.length > 0) {
    console.log('\n═══ PANNEAUX À DÉPLACER ═══\n');
    for (const s of special) {
      console.log(`   ${s.ref}`);
      console.log(`      ${s.name.substring(0, 50)}`);
      console.log(`      ⚠️ ${s.issue}`);
    }
  }

  console.log('\n═══ PREMIERS 20 MDF STANDARD CONFIRMÉS ═══\n');
  for (const s of standard.slice(0, 20)) {
    console.log(`   ${s}`);
  }
  if (standard.length > 20) {
    console.log(`   ... et ${standard.length - 20} autres`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
