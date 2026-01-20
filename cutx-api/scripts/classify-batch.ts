/**
 * Script de classification par lots de 10
 * Usage: npx ts-node scripts/classify-batch.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('LOT DE 10 PANNEAUX À CLASSIFIER');
  console.log('='.repeat(80));

  // Récupérer des panneaux variés (pas tous du même type)
  const panels = await prisma.panel.findMany({
    where: { isActive: true },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
          parent: { select: { name: true, slug: true } },
        },
      },
    },
    take: 200,
  });

  // Mélanger aléatoirement et prendre 10
  const shuffled = panels.sort(() => Math.random() - 0.5).slice(0, 10);

  for (let i = 0; i < shuffled.length; i++) {
    const p = shuffled[i];
    const parentSlug = p.category?.parent?.slug || '';
    const catPath = parentSlug ? `${parentSlug} > ${p.category?.slug}` : p.category?.slug || '(aucune)';

    console.log('');
    console.log('─'.repeat(80));
    console.log(`#${i + 1} | ID: ${p.id.substring(0, 12)}...`);
    console.log('─'.repeat(80));
    console.log(`NOM:        ${p.name || '(vide)'}`);
    console.log(`RÉFÉRENCE:  ${p.reference || '(vide)'}`);
    console.log(`CATÉGORIE:  ${catPath}`);
    console.log(`TYPE PROD:  ${p.productType || '(vide)'}`);
    console.log(`DÉCOR:      ${p.decorCategory || '(vide)'}`);
    console.log(`HYDROFUGE:  ${p.isHydrofuge ? '✅ OUI' : '❌ non'}`);
    console.log(`IGNIFUGE:   ${p.isIgnifuge ? '✅ OUI' : '❌ non'}`);
    if (p.thickness && p.thickness.length > 0) {
      console.log(`ÉPAISSEURS: ${p.thickness.slice(0, 5).join(', ')}${p.thickness.length > 5 ? '...' : ''} mm`);
    }
    if (p.description) {
      console.log(`DESC:       ${p.description.substring(0, 80)}...`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('PROPOSITIONS DE CLASSIFICATION:');
  console.log('');

  // Maintenant proposer des classifications
  for (let i = 0; i < shuffled.length; i++) {
    const p = shuffled[i];
    const currentSlug = p.category?.slug || '';
    const proposal = proposeCategory(p);

    if (proposal === currentSlug) {
      console.log(`#${i + 1}: ✅ DÉJÀ BIEN CLASSÉ → ${currentSlug}`);
    } else {
      console.log(`#${i + 1}: ${currentSlug} → ${proposal} ?`);
    }
  }

  console.log('');
  console.log('Réponds avec les numéros à corriger, ex: "1:cp-marine, 5:mela-unis"');
  console.log('Ou "OK" si tout est bon.');

  await prisma.$disconnect();
}

function proposeCategory(p: {
  name: string | null;
  productType: string | null;
  decorCategory: string | null;
  isHydrofuge: boolean;
  isIgnifuge: boolean;
  category: { slug: string; parent: { slug: string } | null } | null;
}): string {
  const name = (p.name || '').toLowerCase();
  const productType = p.productType || '';
  const decorCategory = p.decorCategory || '';
  const currentSlug = p.category?.slug || '';

  // Contreplaqués
  if (productType === 'CONTREPLAQUE' || /contreplaqué|cp\s/i.test(name)) {
    if (p.isHydrofuge || /marine|ctbx/i.test(name)) return 'cp-marine';
    if (/film[ée]/i.test(name)) return 'cp-filme';
    if (/cintr/i.test(name)) return 'cp-cintrable';
    if (/bouleau/i.test(name)) return 'cp-bouleau';
    if (/okoum[ée]/i.test(name)) return 'cp-okoume';
    if (/peuplier/i.test(name)) return 'cp-peuplier';
    if (/pin\b/i.test(name)) return 'cp-pin';
    return currentSlug.startsWith('cp-') ? currentSlug : 'contreplaque';
  }

  // MDF
  if (productType === 'MDF' || /\bmdf\b/i.test(name)) {
    if (p.isIgnifuge) return 'mdf-ignifuge';
    if (p.isHydrofuge) return 'mdf-hydrofuge';
    if (/laquer|laqué/i.test(name)) return 'mdf-laquer';
    if (/teint[ée]/i.test(name)) return 'mdf-teinte';
    if (/léger|light/i.test(name)) return 'mdf-leger';
    return currentSlug.startsWith('mdf-') ? currentSlug : 'mdf-standard';
  }

  // Mélaminés
  if (productType === 'MELAMINE' || /mélamin[ée]/i.test(name)) {
    if (decorCategory === 'UNIS') return 'mela-unis';
    if (decorCategory === 'BOIS') return 'mela-bois';
    if (decorCategory === 'PIERRE' || decorCategory === 'BETON') return 'mela-pierre';
    if (decorCategory === 'FANTAISIE') return 'mela-fantaisie';
    return currentSlug.startsWith('mela-') ? currentSlug : 'melamines';
  }

  // Stratifiés
  if (productType === 'STRATIFIE' || /stratifi[ée]|hpl/i.test(name)) {
    if (/fenix/i.test(name)) return 'fenix';
    if (decorCategory === 'UNIS') return 'strat-unis';
    if (decorCategory === 'BOIS') return 'strat-bois';
    if (decorCategory === 'PIERRE' || decorCategory === 'BETON') return 'strat-pierre';
    if (decorCategory === 'FANTAISIE') return 'strat-fantaisie';
    return currentSlug.startsWith('strat-') ? currentSlug : 'stratifies-hpl';
  }

  // Chants / ABS
  if (productType === 'BANDE_DE_CHANT' || /chant|abs\b/i.test(name)) {
    if (/chêne/i.test(name)) return 'chant-chene';
    if (/noyer/i.test(name)) return 'chant-noyer';
    if (/hêtre/i.test(name)) return 'chant-hetre';
    if (/mélamin[ée]/i.test(name)) return 'chants-melamines';
    if (/abs/i.test(name)) {
      if (decorCategory === 'UNIS') return 'abs-unis';
      if (decorCategory === 'BOIS') return 'abs-bois';
      return 'chants-abs';
    }
    return currentSlug.startsWith('chant') || currentSlug.startsWith('abs-') ? currentSlug : 'chants';
  }

  // Aggloméré
  if (productType === 'AGGLOMERE' || /agglo/i.test(name)) {
    if (p.isIgnifuge) return 'agglo-ignifuge';
    if (p.isHydrofuge) return 'agglo-hydrofuge';
    return currentSlug.startsWith('agglo-') ? currentSlug : 'agglo-standard';
  }

  // 3 Plis
  if (/3\s*plis|trois\s*plis/i.test(name)) {
    if (/épicéa|epicea/i.test(name)) return '3-plis-epicea';
    if (/chêne/i.test(name)) return '3-plis-chene';
    return 'panneaux-3-plis';
  }

  // OSB
  if (/\bosb\b/i.test(name)) {
    return 'osb';
  }

  // Pas de proposition claire
  return currentSlug || '???';
}

main().catch(console.error);
