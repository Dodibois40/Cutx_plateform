/**
 * SCRIPT DE CORRECTION INTELLIGENT DES CATÉGORIES - V2
 *
 * Version corrigée avec :
 * - Respect des priorités (Marine > Filmé > Essence)
 * - Protection des panneaux déjà bien classés
 * - Respect du productType (stratifié reste stratifié)
 *
 * Usage:
 *   npx ts-node scripts/fix-categories-smart-v2.ts          # DRY RUN
 *   npx ts-node scripts/fix-categories-smart-v2.ts --execute # EXÉCUTION
 */

import { PrismaClient, DecorCategory } from '@prisma/client';
const prisma = new PrismaClient();

interface ClassificationResult {
  targetSlug: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// =============================================================================
// CONTREPLAQUÉS - Ordre de priorité : Marine > Filmé > Cintrable > Essence
// =============================================================================
function classifyContreplaque(
  name: string,
  isHydrofuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  const lowerName = name.toLowerCase();

  // PRIORITÉ 1: Marine (usage > essence)
  if (isHydrofuge || /marine|ctbx/i.test(lowerName)) {
    if (currentSlug === 'cp-marine') return null;
    return { targetSlug: 'cp-marine', confidence: 'high', reason: 'isHydrofuge ou marine/ctbx' };
  }

  // PRIORITÉ 2: Filmé (finition spéciale)
  if (/film[ée]/i.test(lowerName)) {
    if (currentSlug === 'cp-filme') return null;
    return { targetSlug: 'cp-filme', confidence: 'high', reason: 'finition filmée' };
  }

  // PRIORITÉ 3: Cintrable (usage spécial)
  if (/cintr/i.test(lowerName)) {
    if (currentSlug === 'cp-cintrable') return null;
    return { targetSlug: 'cp-cintrable', confidence: 'high', reason: 'cintrable' };
  }

  // Si déjà dans une sous-catégorie CP spécifique → ne pas bouger
  if (currentSlug && currentSlug.startsWith('cp-') && currentSlug !== 'contreplaque') {
    return null;
  }

  // PRIORITÉ 4: Essence de bois (seulement si dans catégorie générique)
  if (/bouleau/i.test(lowerName)) {
    return { targetSlug: 'cp-bouleau', confidence: 'high', reason: 'essence bouleau' };
  }
  if (/okoum[ée]/i.test(lowerName)) {
    return { targetSlug: 'cp-okoume', confidence: 'high', reason: 'essence okoumé' };
  }
  if (/peuplier/i.test(lowerName)) {
    return { targetSlug: 'cp-peuplier', confidence: 'high', reason: 'essence peuplier' };
  }
  if (/pin\b/i.test(lowerName)) {
    return { targetSlug: 'cp-pin', confidence: 'medium', reason: 'essence pin' };
  }
  if (/sapelli/i.test(lowerName)) {
    return { targetSlug: 'cp-okoume', confidence: 'medium', reason: 'sapelli (exotique) → okoume' };
  }

  return null;
}

// =============================================================================
// MÉLAMINÉS - Utilise decorCategory (données structurées)
// =============================================================================
function classifyMelamine(
  decorCategory: DecorCategory | null,
  decor: string | null,
  currentSlug: string | null
): ClassificationResult | null {
  // Si déjà dans une sous-catégorie mela- spécifique → vérifier cohérence
  const isInMelaSubcat = currentSlug && currentSlug.startsWith('mela-');

  // decorCategory est la source de vérité
  if (decorCategory === 'UNIS') {
    if (currentSlug === 'mela-unis') return null;
    return { targetSlug: 'mela-unis', confidence: 'high', reason: 'decorCategory=UNIS' };
  }
  if (decorCategory === 'BOIS') {
    if (currentSlug === 'mela-bois') return null;
    return { targetSlug: 'mela-bois', confidence: 'high', reason: 'decorCategory=BOIS' };
  }
  if (decorCategory === 'PIERRE' || decorCategory === 'BETON') {
    if (currentSlug === 'mela-pierre') return null;
    return { targetSlug: 'mela-pierre', confidence: 'high', reason: 'decorCategory=PIERRE/BETON' };
  }
  if (decorCategory === 'FANTAISIE' || decorCategory === 'TEXTILE' || decorCategory === 'METAL') {
    if (currentSlug === 'mela-fantaisie') return null;
    return { targetSlug: 'mela-fantaisie', confidence: 'high', reason: 'decorCategory=FANTAISIE' };
  }
  if (decorCategory === 'SANS_DECOR') {
    if (currentSlug === 'mela-unis') return null;
    return { targetSlug: 'mela-unis', confidence: 'medium', reason: 'SANS_DECOR → unis' };
  }

  // Si déjà dans une sous-catégorie et pas de decorCategory → ne pas toucher
  if (isInMelaSubcat) return null;

  // Fallback sur decor si decorCategory null
  const decorLower = (decor || '').toLowerCase();
  if (decorLower === 'unis' || /uni|blanc|noir|gris/i.test(decorLower)) {
    return { targetSlug: 'mela-unis', confidence: 'medium', reason: 'decor contient unis/couleur' };
  }
  if (/bois|ch[êe]ne|noyer/i.test(decorLower)) {
    return { targetSlug: 'mela-bois', confidence: 'medium', reason: 'decor contient bois' };
  }

  return null;
}

// =============================================================================
// STRATIFIÉS - Similaire aux mélaminés mais catégories strat-
// =============================================================================
function classifyStratifie(
  decorCategory: DecorCategory | null,
  currentSlug: string | null
): ClassificationResult | null {
  const isInStratSubcat = currentSlug && currentSlug.startsWith('strat-');

  if (decorCategory === 'UNIS') {
    if (currentSlug === 'strat-unis') return null;
    return { targetSlug: 'strat-unis', confidence: 'high', reason: 'decorCategory=UNIS' };
  }
  if (decorCategory === 'BOIS') {
    if (currentSlug === 'strat-bois') return null;
    return { targetSlug: 'strat-bois', confidence: 'high', reason: 'decorCategory=BOIS' };
  }
  if (decorCategory === 'PIERRE' || decorCategory === 'BETON' || decorCategory === 'METAL') {
    if (currentSlug === 'strat-pierre') return null;
    return { targetSlug: 'strat-pierre', confidence: 'high', reason: 'decorCategory=PIERRE' };
  }
  if (decorCategory === 'FANTAISIE' || decorCategory === 'TEXTILE') {
    if (currentSlug === 'strat-fantaisie') return null;
    return { targetSlug: 'strat-fantaisie', confidence: 'high', reason: 'decorCategory=FANTAISIE' };
  }
  if (decorCategory === 'SANS_DECOR') {
    if (currentSlug === 'strat-unis') return null;
    return { targetSlug: 'strat-unis', confidence: 'medium', reason: 'SANS_DECOR → unis' };
  }

  // Si déjà dans sous-catégorie → ne pas toucher
  if (isInStratSubcat) return null;

  return null;
}

// =============================================================================
// 3 PLIS - Par essence dans le nom
// =============================================================================
function classify3Plis(
  name: string,
  currentSlug: string | null
): ClassificationResult | null {
  const lowerName = name.toLowerCase();

  // Si déjà dans 3-plis-chene ou 3-plis-epicea → ne pas toucher sauf erreur flagrante
  if (currentSlug === '3-plis-chene' && !/ch[êe]ne/i.test(lowerName)) {
    // Mal classé, on corrige
  } else if (currentSlug === '3-plis-epicea' && !/[ée]pic[ée]a/i.test(lowerName)) {
    // Mal classé, on corrige
  } else if (currentSlug && currentSlug.startsWith('3-plis-') && currentSlug !== '3-plis-divers') {
    return null; // Déjà bien classé
  }

  if (/ch[êe]ne/i.test(lowerName)) {
    if (currentSlug === '3-plis-chene') return null;
    return { targetSlug: '3-plis-chene', confidence: 'high', reason: 'nom contient chêne' };
  }
  if (/[ée]pic[ée]a/i.test(lowerName)) {
    if (currentSlug === '3-plis-epicea') return null;
    return { targetSlug: '3-plis-epicea', confidence: 'high', reason: 'nom contient épicéa' };
  }

  // Autres essences → divers
  if (/douglas|h[êe]tre|fr[êe]ne/i.test(lowerName)) {
    if (currentSlug === '3-plis-divers') return null;
    return { targetSlug: '3-plis-divers', confidence: 'medium', reason: 'essence → divers' };
  }

  // Fallback divers seulement si dans catégorie parente
  if (!currentSlug || currentSlug === 'panneaux-3-plis' || currentSlug === '3-plis') {
    return { targetSlug: '3-plis-divers', confidence: 'low', reason: 'fallback divers' };
  }

  return null;
}

// =============================================================================
// MDF - Utilise isHydrofuge/isIgnifuge
// =============================================================================
function classifyMDF(
  name: string,
  isHydrofuge: boolean,
  isIgnifuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  // Propriétés techniques ont priorité
  if (isHydrofuge) {
    if (currentSlug === 'mdf-hydrofuge') return null;
    return { targetSlug: 'mdf-hydrofuge', confidence: 'high', reason: 'isHydrofuge=true' };
  }
  if (isIgnifuge) {
    if (currentSlug === 'mdf-ignifuge') return null;
    return { targetSlug: 'mdf-ignifuge', confidence: 'high', reason: 'isIgnifuge=true' };
  }

  // Si déjà dans sous-catégorie MDF → ne pas toucher
  if (currentSlug && currentSlug.startsWith('mdf-') && currentSlug !== 'mdf') {
    return null;
  }

  const lowerName = name.toLowerCase();
  if (/hydro/i.test(lowerName)) {
    return { targetSlug: 'mdf-hydrofuge', confidence: 'medium', reason: 'nom hydro' };
  }
  if (/ignif/i.test(lowerName)) {
    return { targetSlug: 'mdf-ignifuge', confidence: 'medium', reason: 'nom ignif' };
  }
  if (/laqu/i.test(lowerName)) {
    return { targetSlug: 'mdf-laquer', confidence: 'medium', reason: 'nom laquer' };
  }
  if (/l[ée]ger/i.test(lowerName)) {
    return { targetSlug: 'mdf-leger', confidence: 'medium', reason: 'nom léger' };
  }
  if (/teint/i.test(lowerName)) {
    return { targetSlug: 'mdf-teinte', confidence: 'medium', reason: 'nom teinte' };
  }

  // Fallback standard seulement si dans catégorie parente
  if (!currentSlug || currentSlug === 'mdf') {
    return { targetSlug: 'mdf-standard', confidence: 'low', reason: 'fallback standard' };
  }

  return null;
}

// =============================================================================
// CHANTS - Par type de matériau, puis décor
// =============================================================================
function classifyChant(
  name: string,
  supportQuality: string | null,
  currentSlug: string | null
): ClassificationResult | null {
  const lowerName = name.toLowerCase();
  const qualityLower = (supportQuality || '').toLowerCase();

  // PRIORITÉ 1: Chant bois véritable
  if (/bois\s*(v[ée]ritable|massif)?/i.test(lowerName) || qualityLower.includes('bois')) {
    if (/ch[êe]ne/i.test(lowerName)) {
      if (currentSlug === 'chant-chene') return null;
      return { targetSlug: 'chant-chene', confidence: 'high', reason: 'chant bois chêne' };
    }
    if (/noyer/i.test(lowerName)) {
      if (currentSlug === 'chant-noyer') return null;
      return { targetSlug: 'chant-noyer', confidence: 'high', reason: 'chant bois noyer' };
    }
    if (currentSlug === 'chants-bois-divers') return null;
    return { targetSlug: 'chants-bois-divers', confidence: 'medium', reason: 'chant bois divers' };
  }

  // PRIORITÉ 2: Chant mélaminé
  if (/m[ée]lamin[ée]e?/i.test(lowerName) || qualityLower.includes('mélamine')) {
    if (currentSlug === 'chants-melamines') return null;
    return { targetSlug: 'chants-melamines', confidence: 'high', reason: 'chant mélaminé' };
  }

  // PRIORITÉ 3: PVC
  if (/pvc/i.test(lowerName)) {
    if (currentSlug === 'chants-pvc') return null;
    return { targetSlug: 'chants-pvc', confidence: 'high', reason: 'chant PVC' };
  }

  // PRIORITÉ 4: ABS (sous-catégories par décor)
  if (/abs/i.test(lowerName) || qualityLower.includes('abs')) {
    if (/uni|blanc|noir|gris/i.test(lowerName)) {
      if (currentSlug === 'abs-unis') return null;
      return { targetSlug: 'abs-unis', confidence: 'high', reason: 'ABS uni' };
    }
    if (/ch[êe]ne|noyer|bois|h[êe]tre/i.test(lowerName)) {
      if (currentSlug === 'abs-bois') return null;
      return { targetSlug: 'abs-bois', confidence: 'high', reason: 'ABS bois' };
    }
    // Si déjà dans abs- → ne pas toucher
    if (currentSlug && currentSlug.startsWith('abs-')) return null;
    return { targetSlug: 'abs-fantaisie', confidence: 'medium', reason: 'ABS → fantaisie' };
  }

  // Si déjà dans sous-catégorie chant → ne pas toucher
  if (currentSlug && (currentSlug.startsWith('chant') || currentSlug.startsWith('abs-'))) {
    return null;
  }

  // Fallback : essayer de deviner par le décor du nom
  if (/uni|blanc|noir|gris/i.test(lowerName)) {
    return { targetSlug: 'abs-unis', confidence: 'low', reason: 'nom uni → ABS unis' };
  }

  return null;
}

// =============================================================================
// AGGLOMÉRÉS
// =============================================================================
function classifyAgglo(
  name: string,
  isHydrofuge: boolean,
  isIgnifuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  if (isHydrofuge) {
    if (currentSlug === 'agglo-hydrofuge') return null;
    return { targetSlug: 'agglo-hydrofuge', confidence: 'high', reason: 'isHydrofuge=true' };
  }
  if (isIgnifuge) {
    if (currentSlug === 'agglo-ignifuge') return null;
    return { targetSlug: 'agglo-ignifuge', confidence: 'high', reason: 'isIgnifuge=true' };
  }

  if (currentSlug && currentSlug.startsWith('agglo-') && currentSlug !== 'agglomere') {
    return null;
  }

  const lowerName = name.toLowerCase();
  if (/hydro/i.test(lowerName)) {
    return { targetSlug: 'agglo-hydrofuge', confidence: 'medium', reason: 'nom hydro' };
  }
  if (/ignif/i.test(lowerName)) {
    return { targetSlug: 'agglo-ignifuge', confidence: 'medium', reason: 'nom ignif' };
  }

  if (!currentSlug || currentSlug === 'agglomere') {
    return { targetSlug: 'agglo-standard', confidence: 'low', reason: 'fallback standard' };
  }

  return null;
}

// =============================================================================
// OSB
// =============================================================================
function classifyOSB(
  name: string,
  isHydrofuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  if (isHydrofuge || /hydro|osb.?3/i.test(name)) {
    if (currentSlug === 'osb-hydrofuge') return null;
    return { targetSlug: 'osb-hydrofuge', confidence: 'high', reason: 'hydrofuge ou OSB3' };
  }

  if (currentSlug && currentSlug.startsWith('osb-')) return null;

  if (!currentSlug || currentSlug === 'osb') {
    return { targetSlug: 'osb-standard', confidence: 'low', reason: 'fallback standard' };
  }

  return null;
}

// Mapping productType → catégorie de base
const PRODUCT_TYPE_BASE_CATEGORY: Record<string, string> = {
  MELAMINE: 'melamines',
  STRATIFIE: 'stratifies-hpl',
  COMPACT: 'compacts-hpl',
  PANNEAU_DECORATIF: 'melamines',
  CONTREPLAQUE: 'contreplaque',
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  OSB: 'osb',
  LATTE: 'latte',
  PANNEAU_MASSIF: 'panneautes',
  PANNEAU_3_PLIS: '3-plis',
  PLACAGE: 'plaques-bois',
  SOLID_SURFACE: 'solid-surface',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  PANNEAU_MURAL: 'panneaux-muraux',
  PANNEAU_CONSTRUCTION: 'panneaux-speciaux',
  PANNEAU_ALVEOLAIRE: 'alveolaire',
  CIMENT_BOIS: 'bois-ciment',
  PANNEAU_ISOLANT: 'isolant',
  PANNEAU_SPECIAL: 'panneaux-speciaux',
  BANDE_DE_CHANT: 'chants',
};

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');
  const highOnly = args.includes('--high-only');

  console.log('='.repeat(70));
  console.log('CORRECTION INTELLIGENTE DES CATÉGORIES - V2');
  console.log('='.repeat(70));
  console.log(executeMode ? '⚠️  MODE EXÉCUTION' : '🔍 MODE DRY RUN');
  if (highOnly) console.log('📊 HIGH confidence seulement');

  try {
    const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
    if (!cutx) {
      console.log('❌ Catalogue CutX non trouvé!');
      return;
    }

    const cutxCategories = await prisma.category.findMany({
      where: { catalogueId: cutx.id },
      select: { id: true, slug: true, name: true },
    });

    const categoryMap = new Map(cutxCategories.map((c) => [c.slug, { id: c.id, name: c.name }]));
    console.log(`\n📁 Catégories CutX: ${cutxCategories.length}`);

    const panels = await prisma.panel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        productType: true,
        decorCategory: true,
        decor: true,
        isHydrofuge: true,
        isIgnifuge: true,
        supportQuality: true,
        categoryId: true,
        category: { select: { slug: true, name: true, catalogueId: true } },
      },
    });

    console.log(`📋 Panneaux à analyser: ${panels.length}`);

    interface Correction {
      panelId: string;
      panelName: string;
      currentSlug: string | null;
      targetSlug: string;
      targetName: string;
      confidence: string;
      reason: string;
    }

    const corrections: Correction[] = [];

    for (const panel of panels) {
      const productType = panel.productType || '';
      const currentSlug = panel.category?.slug || null;
      const name = panel.name || '';
      let result: ClassificationResult | null = null;

      switch (productType) {
        case 'CONTREPLAQUE':
          result = classifyContreplaque(name, panel.isHydrofuge, currentSlug);
          break;
        case 'MELAMINE':
        case 'PANNEAU_DECORATIF':
          result = classifyMelamine(panel.decorCategory, panel.decor, currentSlug);
          break;
        case 'STRATIFIE':
          result = classifyStratifie(panel.decorCategory, currentSlug);
          break;
        case 'PANNEAU_3_PLIS':
          result = classify3Plis(name, currentSlug);
          break;
        case 'MDF':
          result = classifyMDF(name, panel.isHydrofuge, panel.isIgnifuge, currentSlug);
          break;
        case 'PARTICULE':
          result = classifyAgglo(name, panel.isHydrofuge, panel.isIgnifuge, currentSlug);
          break;
        case 'OSB':
          result = classifyOSB(name, panel.isHydrofuge, currentSlug);
          break;
        case 'BANDE_DE_CHANT':
          result = classifyChant(name, panel.supportQuality, currentSlug);
          break;
        default:
          // Migration vers catégorie de base si pas dans CutX
          if (panel.category?.catalogueId !== cutx.id) {
            const baseSlug = PRODUCT_TYPE_BASE_CATEGORY[productType];
            if (baseSlug && categoryMap.has(baseSlug)) {
              result = {
                targetSlug: baseSlug,
                confidence: 'low',
                reason: `productType → ${baseSlug}`,
              };
            }
          }
      }

      if (!result) continue;
      if (highOnly && result.confidence !== 'high') continue;

      const target = categoryMap.get(result.targetSlug);
      if (!target) continue;

      // Éviter les doublons (même catégorie cible)
      if (panel.categoryId === target.id) continue;

      corrections.push({
        panelId: panel.id,
        panelName: name,
        currentSlug,
        targetSlug: result.targetSlug,
        targetName: target.name,
        confidence: result.confidence,
        reason: result.reason,
      });
    }

    // Résumé
    console.log('\n' + '='.repeat(70));
    console.log('RÉSUMÉ');
    console.log('='.repeat(70));

    const byConf = {
      high: corrections.filter((c) => c.confidence === 'high'),
      medium: corrections.filter((c) => c.confidence === 'medium'),
      low: corrections.filter((c) => c.confidence === 'low'),
    };

    console.log(`\n📊 Par confiance:`);
    console.log(`  HIGH:   ${byConf.high.length}`);
    console.log(`  MEDIUM: ${byConf.medium.length}`);
    console.log(`  LOW:    ${byConf.low.length}`);
    console.log(`  TOTAL:  ${corrections.length}`);

    // Transitions HIGH
    console.log(`\n📋 Transitions HIGH confidence:`);
    const trans: Record<string, Record<string, number>> = {};
    for (const c of byConf.high) {
      const from = c.currentSlug || 'null';
      trans[from] = trans[from] || {};
      trans[from][c.targetSlug] = (trans[from][c.targetSlug] || 0) + 1;
    }
    for (const [from, targets] of Object.entries(trans)) {
      console.log(`\n  ${from}:`);
      for (const [to, cnt] of Object.entries(targets).sort((a, b) => b[1] - a[1])) {
        console.log(`    → ${to}: ${cnt}`);
      }
    }

    // Exemples
    console.log(`\n📝 Exemples HIGH:`);
    for (const c of byConf.high.slice(0, 8)) {
      console.log(`  ${c.panelName.substring(0, 45).padEnd(47)}`);
      console.log(`    ${c.currentSlug || 'null'} → ${c.targetSlug} (${c.reason})`);
    }

    // Exécution
    if (executeMode && corrections.length > 0) {
      console.log('\n⏳ Exécution...');

      const byTarget = new Map<string, string[]>();
      for (const c of corrections) {
        const tid = categoryMap.get(c.targetSlug)?.id;
        if (tid) {
          const ids = byTarget.get(tid) || [];
          ids.push(c.panelId);
          byTarget.set(tid, ids);
        }
      }

      let total = 0;
      for (const [catId, ids] of byTarget) {
        const res = await prisma.panel.updateMany({
          where: { id: { in: ids } },
          data: { categoryId: catId },
        });
        total += res.count;
        const catName = cutxCategories.find((c) => c.id === catId)?.name || catId;
        console.log(`  ✅ ${res.count} → ${catName}`);
      }

      console.log(`\n✅ Total mis à jour: ${total}`);
    } else {
      console.log('\n💡 Options:');
      console.log('  --execute      # Appliquer les corrections');
      console.log('  --high-only    # Seulement HIGH confidence');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
