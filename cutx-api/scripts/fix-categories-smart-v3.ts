/**
 * SCRIPT DE CORRECTION INTELLIGENT DES CATÉGORIES - V3
 *
 * Corrections finales :
 * - Ne reclassifie PAS si la catégorie actuelle appartient à une famille différente
 * - Respect des priorités (Marine > Filmé > Essence)
 * - Protection des données existantes
 *
 * Usage:
 *   npx ts-node scripts/fix-categories-smart-v3.ts          # DRY RUN
 *   npx ts-node scripts/fix-categories-smart-v3.ts --execute # EXÉCUTION
 */

import { PrismaClient, DecorCategory } from '@prisma/client';
const prisma = new PrismaClient();

interface ClassificationResult {
  targetSlug: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// =============================================================================
// FAMILLES DE CATÉGORIES - pour éviter les migrations cross-famille
// =============================================================================
const CATEGORY_FAMILIES: Record<string, string[]> = {
  contreplaque: ['contreplaque', 'cp-marine', 'cp-bouleau', 'cp-okoume', 'cp-peuplier', 'cp-filme', 'cp-cintrable', 'cp-pin'],
  melamine: ['melamines', 'mela-unis', 'mela-bois', 'mela-pierre', 'mela-fantaisie'],
  stratifie: ['stratifies-hpl', 'strat-unis', 'strat-bois', 'strat-pierre', 'strat-fantaisie', 'fenix'],
  mdf: ['mdf', 'mdf-standard', 'mdf-hydrofuge', 'mdf-ignifuge', 'mdf-laquer', 'mdf-leger', 'mdf-teinte'],
  agglomere: ['agglomere', 'agglo-standard', 'agglo-hydrofuge', 'agglo-ignifuge'],
  osb: ['osb', 'osb-standard', 'osb-hydrofuge'],
  trois_plis: ['3-plis', 'panneaux-3-plis', '3-plis-chene', '3-plis-epicea', '3-plis-divers'],
  chants: ['chants', 'chants-abs', 'abs-unis', 'abs-bois', 'abs-fantaisie', 'chants-melamines', 'chants-pvc', 'chants-bois', 'chants-bois-divers', 'chant-chene', 'chant-noyer'],
};

function getCategoryFamily(slug: string | null): string | null {
  if (!slug) return null;
  for (const [family, slugs] of Object.entries(CATEGORY_FAMILIES)) {
    if (slugs.includes(slug)) return family;
  }
  return null;
}

function getProductTypeFamily(productType: string): string | null {
  const mapping: Record<string, string> = {
    CONTREPLAQUE: 'contreplaque',
    MELAMINE: 'melamine',
    PANNEAU_DECORATIF: 'melamine',
    STRATIFIE: 'stratifie',
    COMPACT: 'stratifie',
    MDF: 'mdf',
    PARTICULE: 'agglomere',
    OSB: 'osb',
    PANNEAU_3_PLIS: 'trois_plis',
    BANDE_DE_CHANT: 'chants',
  };
  return mapping[productType] || null;
}

// =============================================================================
// FONCTIONS DE CLASSIFICATION
// =============================================================================

function classifyContreplaque(
  name: string,
  isHydrofuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  const lowerName = name.toLowerCase();

  // PRIORITÉ 1: Marine
  if (isHydrofuge || /marine|ctbx/i.test(lowerName)) {
    if (currentSlug === 'cp-marine') return null;
    return { targetSlug: 'cp-marine', confidence: 'high', reason: 'isHydrofuge ou marine/ctbx' };
  }

  // PRIORITÉ 2: Filmé
  if (/film[ée]/i.test(lowerName)) {
    if (currentSlug === 'cp-filme') return null;
    return { targetSlug: 'cp-filme', confidence: 'high', reason: 'finition filmée' };
  }

  // PRIORITÉ 3: Cintrable
  if (/cintr/i.test(lowerName)) {
    if (currentSlug === 'cp-cintrable') return null;
    return { targetSlug: 'cp-cintrable', confidence: 'high', reason: 'cintrable' };
  }

  // Si déjà dans sous-catégorie CP → ne pas bouger
  if (currentSlug && currentSlug.startsWith('cp-') && currentSlug !== 'contreplaque') {
    return null;
  }

  // PRIORITÉ 4: Essence (seulement si générique)
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

  return null;
}

function classifyMelamine(
  decorCategory: DecorCategory | null,
  currentSlug: string | null
): ClassificationResult | null {
  if (currentSlug && currentSlug.startsWith('mela-')) return null; // Déjà classé

  if (decorCategory === 'UNIS') {
    return { targetSlug: 'mela-unis', confidence: 'high', reason: 'decorCategory=UNIS' };
  }
  if (decorCategory === 'BOIS') {
    return { targetSlug: 'mela-bois', confidence: 'high', reason: 'decorCategory=BOIS' };
  }
  if (decorCategory === 'PIERRE' || decorCategory === 'BETON') {
    return { targetSlug: 'mela-pierre', confidence: 'high', reason: 'decorCategory=PIERRE/BETON' };
  }
  if (decorCategory === 'FANTAISIE' || decorCategory === 'TEXTILE' || decorCategory === 'METAL') {
    return { targetSlug: 'mela-fantaisie', confidence: 'high', reason: 'decorCategory=FANTAISIE' };
  }
  if (decorCategory === 'SANS_DECOR') {
    return { targetSlug: 'mela-unis', confidence: 'medium', reason: 'SANS_DECOR → unis' };
  }

  return null;
}

function classifyStratifie(
  decorCategory: DecorCategory | null,
  currentSlug: string | null
): ClassificationResult | null {
  if (currentSlug && currentSlug.startsWith('strat-')) return null;

  if (decorCategory === 'UNIS') {
    return { targetSlug: 'strat-unis', confidence: 'high', reason: 'decorCategory=UNIS' };
  }
  if (decorCategory === 'BOIS') {
    return { targetSlug: 'strat-bois', confidence: 'high', reason: 'decorCategory=BOIS' };
  }
  if (decorCategory === 'PIERRE' || decorCategory === 'BETON' || decorCategory === 'METAL') {
    return { targetSlug: 'strat-pierre', confidence: 'high', reason: 'decorCategory=PIERRE' };
  }
  if (decorCategory === 'FANTAISIE' || decorCategory === 'TEXTILE') {
    return { targetSlug: 'strat-fantaisie', confidence: 'high', reason: 'decorCategory=FANTAISIE' };
  }
  if (decorCategory === 'SANS_DECOR') {
    return { targetSlug: 'strat-unis', confidence: 'medium', reason: 'SANS_DECOR → unis' };
  }

  return null;
}

function classify3Plis(
  name: string,
  currentSlug: string | null
): ClassificationResult | null {
  // Si déjà bien classé dans une sous-catégorie spécifique → ne pas toucher
  if (currentSlug && currentSlug.startsWith('3-plis-') && currentSlug !== '3-plis-divers') {
    return null;
  }

  const lowerName = name.toLowerCase();

  if (/ch[êe]ne/i.test(lowerName)) {
    return { targetSlug: '3-plis-chene', confidence: 'high', reason: 'nom contient chêne' };
  }
  if (/[ée]pic[ée]a/i.test(lowerName)) {
    return { targetSlug: '3-plis-epicea', confidence: 'high', reason: 'nom contient épicéa' };
  }

  // Autres essences → divers (seulement si dans catégorie parente)
  if (!currentSlug || currentSlug === 'panneaux-3-plis' || currentSlug === '3-plis') {
    return { targetSlug: '3-plis-divers', confidence: 'low', reason: 'fallback divers' };
  }

  return null;
}

function classifyMDF(
  name: string,
  isHydrofuge: boolean,
  isIgnifuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  // PRIORITÉ 1: Ignifuge (sécurité incendie > résistance à l'eau)
  if (isIgnifuge) {
    if (currentSlug === 'mdf-ignifuge') return null;
    return { targetSlug: 'mdf-ignifuge', confidence: 'high', reason: 'isIgnifuge=true' };
  }
  // PRIORITÉ 2: Hydrofuge
  if (isHydrofuge) {
    if (currentSlug === 'mdf-hydrofuge') return null;
    return { targetSlug: 'mdf-hydrofuge', confidence: 'high', reason: 'isHydrofuge=true' };
  }

  if (currentSlug && currentSlug.startsWith('mdf-')) return null;

  const lowerName = name.toLowerCase();
  if (/hydro/i.test(lowerName)) {
    return { targetSlug: 'mdf-hydrofuge', confidence: 'medium', reason: 'nom hydro' };
  }
  if (/ignif/i.test(lowerName)) {
    return { targetSlug: 'mdf-ignifuge', confidence: 'medium', reason: 'nom ignif' };
  }

  if (!currentSlug || currentSlug === 'mdf') {
    return { targetSlug: 'mdf-standard', confidence: 'low', reason: 'fallback standard' };
  }

  return null;
}

function classifyChant(
  name: string,
  supportQuality: string | null,
  currentSlug: string | null
): ClassificationResult | null {
  const lowerName = name.toLowerCase();
  const qualityLower = (supportQuality || '').toLowerCase();

  // Chant bois véritable (priorité haute)
  if (/bois\s*(v[ée]ritable|massif)?/i.test(lowerName) || qualityLower.includes('bois')) {
    if (/ch[êe]ne/i.test(lowerName)) {
      if (currentSlug === 'chant-chene') return null;
      return { targetSlug: 'chant-chene', confidence: 'high', reason: 'chant bois chêne' };
    }
    if (/noyer/i.test(lowerName)) {
      if (currentSlug === 'chant-noyer') return null;
      return { targetSlug: 'chant-noyer', confidence: 'high', reason: 'chant bois noyer' };
    }
    if (currentSlug && currentSlug.startsWith('chant')) return null;
    return { targetSlug: 'chants-bois-divers', confidence: 'medium', reason: 'chant bois divers' };
  }

  // Chant mélaminé
  if (/m[ée]lamin[ée]e?/i.test(lowerName) || qualityLower.includes('mélamine')) {
    if (currentSlug === 'chants-melamines') return null;
    return { targetSlug: 'chants-melamines', confidence: 'high', reason: 'chant mélaminé' };
  }

  // PVC
  if (/pvc/i.test(lowerName)) {
    if (currentSlug === 'chants-pvc') return null;
    return { targetSlug: 'chants-pvc', confidence: 'high', reason: 'chant PVC' };
  }

  // ABS
  if (/abs/i.test(lowerName) || qualityLower.includes('abs')) {
    if (/uni|blanc|noir|gris/i.test(lowerName)) {
      if (currentSlug === 'abs-unis') return null;
      return { targetSlug: 'abs-unis', confidence: 'high', reason: 'ABS uni' };
    }
    if (/ch[êe]ne|noyer|bois|h[êe]tre/i.test(lowerName)) {
      if (currentSlug === 'abs-bois') return null;
      return { targetSlug: 'abs-bois', confidence: 'high', reason: 'ABS bois' };
    }
    if (currentSlug && currentSlug.startsWith('abs-')) return null;
    return { targetSlug: 'abs-fantaisie', confidence: 'medium', reason: 'ABS → fantaisie' };
  }

  // Si déjà dans sous-catégorie chant → ne pas toucher
  if (currentSlug && (currentSlug.startsWith('chant') || currentSlug.startsWith('abs-'))) {
    return null;
  }

  return null;
}

function classifyAgglo(
  isHydrofuge: boolean,
  isIgnifuge: boolean,
  currentSlug: string | null
): ClassificationResult | null {
  // PRIORITÉ 1: Ignifuge (sécurité incendie > résistance à l'eau)
  if (isIgnifuge) {
    if (currentSlug === 'agglo-ignifuge') return null;
    return { targetSlug: 'agglo-ignifuge', confidence: 'high', reason: 'isIgnifuge=true' };
  }
  // PRIORITÉ 2: Hydrofuge
  if (isHydrofuge) {
    if (currentSlug === 'agglo-hydrofuge') return null;
    return { targetSlug: 'agglo-hydrofuge', confidence: 'high', reason: 'isHydrofuge=true' };
  }

  if (currentSlug && currentSlug.startsWith('agglo-')) return null;

  if (!currentSlug || currentSlug === 'agglomere') {
    return { targetSlug: 'agglo-standard', confidence: 'low', reason: 'fallback standard' };
  }

  return null;
}

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
  PANNEAU_3_PLIS: '3-plis',
  BANDE_DE_CHANT: 'chants',
  SOLID_SURFACE: 'solid-surface',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  PANNEAU_MURAL: 'panneaux-muraux',
};

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');
  const highOnly = args.includes('--high-only');

  console.log('='.repeat(70));
  console.log('CORRECTION INTELLIGENTE DES CATÉGORIES - V3 (SÉCURISÉ)');
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
    const blocked: { name: string; reason: string }[] = [];

    for (const panel of panels) {
      const productType = panel.productType || '';
      const currentSlug = panel.category?.slug || null;
      const name = panel.name || '';

      // RÈGLE DE SÉCURITÉ : Ne pas reclassifier cross-famille
      const currentFamily = getCategoryFamily(currentSlug);
      const productFamily = getProductTypeFamily(productType);

      if (currentFamily && productFamily && currentFamily !== productFamily) {
        // La catégorie actuelle est d'une famille différente du productType
        // C'est une incohérence dans les données → on ne touche pas
        blocked.push({
          name: name.substring(0, 40),
          reason: `cross-family: ${currentFamily} vs ${productFamily}`,
        });
        continue;
      }

      let result: ClassificationResult | null = null;

      switch (productType) {
        case 'CONTREPLAQUE':
          result = classifyContreplaque(name, panel.isHydrofuge, currentSlug);
          break;
        case 'MELAMINE':
        case 'PANNEAU_DECORATIF':
          result = classifyMelamine(panel.decorCategory, currentSlug);
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
          result = classifyAgglo(panel.isHydrofuge, panel.isIgnifuge, currentSlug);
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

      // Éviter les doublons
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
    console.log(`  Bloqués (cross-family): ${blocked.length}`);

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
    for (const c of byConf.high.slice(0, 10)) {
      console.log(`  ${c.panelName.substring(0, 45).padEnd(47)}`);
      console.log(`    ${c.currentSlug || 'null'} → ${c.targetSlug} (${c.reason})`);
    }

    if (blocked.length > 0) {
      console.log(`\n⚠️ Exemples bloqués (incohérence productType vs catégorie):`);
      for (const b of blocked.slice(0, 5)) {
        console.log(`  ${b.name.padEnd(42)} (${b.reason})`);
      }
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
