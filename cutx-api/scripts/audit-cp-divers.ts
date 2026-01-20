import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDIT CP DIVERS - 98 PANNEAUX ===\n');

  // Récupérer tous les CP Divers
  const cpDivers = await prisma.panel.findMany({
    where: { category: { slug: 'cp-divers' } },
    select: { id: true, reference: true, name: true }
  });

  console.log(`Total dans CP Divers: ${cpDivers.length}\n`);

  // Classifier par essence/type détecté
  const classification: Record<string, { panels: typeof cpDivers; targetSlug: string }> = {
    'Bouleau': { panels: [], targetSlug: 'cp-bouleau' },
    'Okoumé': { panels: [], targetSlug: 'cp-okoume' },
    'Peuplier': { panels: [], targetSlug: 'cp-peuplier' },
    'Pin': { panels: [], targetSlug: 'cp-pin-maritime' },
    'Épicéa': { panels: [], targetSlug: 'cp-divers' }, // Pas de cat spécifique
    'Marine/CTBX': { panels: [], targetSlug: 'cp-marine-ctbx' },
    'Filmé': { panels: [], targetSlug: 'cp-filme' },
    'Cintrable': { panels: [], targetSlug: 'cp-cintrable' },
    'Antidérapant': { panels: [], targetSlug: 'cp-antiderapant' },
    'Exotique': { panels: [], targetSlug: 'cp-exotique' },
    'Autre': { panels: [], targetSlug: 'cp-divers' }
  };

  for (const p of cpDivers) {
    const nameLower = (p.name || '').toLowerCase();
    let classified = false;

    if (nameLower.includes('bouleau') && !classified) {
      classification['Bouleau'].panels.push(p);
      classified = true;
    }
    if ((nameLower.includes('okoumé') || nameLower.includes('okoume')) && !classified) {
      classification['Okoumé'].panels.push(p);
      classified = true;
    }
    if (nameLower.includes('peuplier') && !classified) {
      classification['Peuplier'].panels.push(p);
      classified = true;
    }
    if ((nameLower.includes('pin ') || nameLower.includes('pin maritime')) && !classified) {
      classification['Pin'].panels.push(p);
      classified = true;
    }
    if ((nameLower.includes('épicéa') || nameLower.includes('epicea')) && !classified) {
      classification['Épicéa'].panels.push(p);
      classified = true;
    }
    if ((nameLower.includes('ctbx') || nameLower.includes('marine')) && !classified) {
      classification['Marine/CTBX'].panels.push(p);
      classified = true;
    }
    if (nameLower.includes('filmé') || nameLower.includes('filme') && !classified) {
      classification['Filmé'].panels.push(p);
      classified = true;
    }
    if (nameLower.includes('cintrable') && !classified) {
      classification['Cintrable'].panels.push(p);
      classified = true;
    }
    if ((nameLower.includes('antidérapant') || nameLower.includes('antiderapant')) && !classified) {
      classification['Antidérapant'].panels.push(p);
      classified = true;
    }
    if ((nameLower.includes('exotique') || nameLower.includes('sipo') ||
         nameLower.includes('sapelli') || nameLower.includes('ilomba')) && !classified) {
      classification['Exotique'].panels.push(p);
      classified = true;
    }

    if (!classified) {
      classification['Autre'].panels.push(p);
    }
  }

  // Afficher les résultats
  console.log('Classification détectée:');
  for (const [type, data] of Object.entries(classification)) {
    if (data.panels.length > 0) {
      console.log(`\n${type} (${data.panels.length}) → ${data.targetSlug}`);
      for (const p of data.panels.slice(0, 5)) {
        console.log(`  ${p.reference} | ${p.name?.substring(0, 50)}`);
      }
      if (data.panels.length > 5) {
        console.log(`  ... et ${data.panels.length - 5} autres`);
      }
    }
  }

  // Compter les déplacements à faire
  const toMove = Object.entries(classification)
    .filter(([type, data]) => data.targetSlug !== 'cp-divers' && data.panels.length > 0);

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`Panneaux à déplacer: ${toMove.reduce((sum, [, d]) => sum + d.panels.length, 0)}`);
  console.log(`Panneaux restant dans CP Divers: ${classification['Autre'].panels.length + classification['Épicéa'].panels.length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
