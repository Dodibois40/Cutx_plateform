/**
 * SCRIPT DE CORRECTION INTELLIGENT DES CATÉGORIES
 *
 * Utilise les champs structurés de la base de données plutôt que
 * des regex naïfs sur le nom.
 *
 * Règles métier :
 * - CP Marine = isHydrofuge + marine/ctbx dans nom → cp-marine
 * - Mélaminé : decorCategory (UNIS, BOIS, FANTAISIE, PIERRE)
 * - 3 Plis : essence extraite du nom
 *
 * Usage:
 *   npx ts-node scripts/fix-categories-smart.ts          # DRY RUN
 *   npx ts-node scripts/fix-categories-smart.ts --execute # EXÉCUTION
 */

import { PrismaClient, DecorCategory } from '@prisma/client';
const prisma = new PrismaClient();

// =============================================================================
// RÈGLES DE CLASSIFICATION INTELLIGENTES
// =============================================================================

interface ClassificationResult {
  targetSlug: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// Classification des Contreplaqués
function classifyContreplaque(panel: {
  name: string | null;
  isHydrofuge: boolean;
  material: string | null;
}): ClassificationResult | null {
  const name = (panel.name || '').toLowerCase();

  // Marine = collage hydrofuge (CTBX, marine)
  if (panel.isHydrofuge || /marine|ctbx/i.test(name)) {
    return { targetSlug: 'cp-marine', confidence: 'high', reason: 'isHydrofuge ou marine/ctbx' };
  }

  // Essences de bois (ordre de priorité)
  if (/bouleau/i.test(name)) {
    return { targetSlug: 'cp-bouleau', confidence: 'high', reason: 'nom contient bouleau' };
  }
  if (/okoum[ée]/i.test(name)) {
    return { targetSlug: 'cp-okoume', confidence: 'high', reason: 'nom contient okoumé' };
  }
  if (/peuplier/i.test(name)) {
    return { targetSlug: 'cp-peuplier', confidence: 'high', reason: 'nom contient peuplier' };
  }
  if (/film[ée]/i.test(name)) {
    return { targetSlug: 'cp-filme', confidence: 'high', reason: 'nom contient filmé' };
  }
  if (/cintr/i.test(name)) {
    return { targetSlug: 'cp-cintrable', confidence: 'high', reason: 'nom contient cintrable' };
  }
  if (/pin\b/i.test(name)) {
    return { targetSlug: 'cp-pin', confidence: 'medium', reason: 'nom contient pin' };
  }
  if (/sapelli/i.test(name)) {
    return { targetSlug: 'cp-okoume', confidence: 'medium', reason: 'sapelli → okoume (exotique)' };
  }

  // Pas assez d'info → reste dans contreplaque parent
  return null;
}

// Classification des Mélaminés (utilise decorCategory !)
function classifyMelamine(panel: {
  name: string | null;
  decorCategory: DecorCategory | null;
  decor: string | null;
}): ClassificationResult | null {
  // Utiliser decorCategory en priorité (donnée structurée)
  if (panel.decorCategory === 'UNIS') {
    return { targetSlug: 'mela-unis', confidence: 'high', reason: 'decorCategory=UNIS' };
  }
  if (panel.decorCategory === 'BOIS') {
    return { targetSlug: 'mela-bois', confidence: 'high', reason: 'decorCategory=BOIS' };
  }
  if (panel.decorCategory === 'PIERRE' || panel.decorCategory === 'BETON') {
    return { targetSlug: 'mela-pierre', confidence: 'high', reason: 'decorCategory=PIERRE/BETON' };
  }
  if (panel.decorCategory === 'FANTAISIE' || panel.decorCategory === 'TEXTILE' || panel.decorCategory === 'METAL') {
    return { targetSlug: 'mela-fantaisie', confidence: 'high', reason: 'decorCategory=FANTAISIE/TEXTILE/METAL' };
  }
  if (panel.decorCategory === 'SANS_DECOR') {
    // Support sans décor = généralement uni blanc/noir
    return { targetSlug: 'mela-unis', confidence: 'medium', reason: 'decorCategory=SANS_DECOR → unis' };
  }

  // Fallback sur le champ decor si decorCategory est null
  const decor = (panel.decor || '').toLowerCase();
  if (decor === 'unis' || /uni|blanc|noir|gris/i.test(decor)) {
    return { targetSlug: 'mela-unis', confidence: 'medium', reason: 'decor contient unis/couleur' };
  }
  if (/bois|ch[êe]ne|noyer|h[êe]tre/i.test(decor)) {
    return { targetSlug: 'mela-bois', confidence: 'medium', reason: 'decor contient bois/essence' };
  }

  // Pas assez d'info
  return null;
}

// Classification des Stratifiés (similaire aux mélaminés)
function classifyStratifie(panel: {
  name: string | null;
  decorCategory: DecorCategory | null;
  decor: string | null;
}): ClassificationResult | null {
  if (panel.decorCategory === 'UNIS') {
    return { targetSlug: 'strat-unis', confidence: 'high', reason: 'decorCategory=UNIS' };
  }
  if (panel.decorCategory === 'BOIS') {
    return { targetSlug: 'strat-bois', confidence: 'high', reason: 'decorCategory=BOIS' };
  }
  if (panel.decorCategory === 'PIERRE' || panel.decorCategory === 'BETON' || panel.decorCategory === 'METAL') {
    return { targetSlug: 'strat-pierre', confidence: 'high', reason: 'decorCategory=PIERRE/BETON/METAL' };
  }
  if (panel.decorCategory === 'FANTAISIE' || panel.decorCategory === 'TEXTILE') {
    return { targetSlug: 'strat-fantaisie', confidence: 'high', reason: 'decorCategory=FANTAISIE/TEXTILE' };
  }
  if (panel.decorCategory === 'SANS_DECOR') {
    return { targetSlug: 'strat-unis', confidence: 'medium', reason: 'decorCategory=SANS_DECOR → unis' };
  }

  return null;
}

// Classification des 3 Plis (par essence dans le nom)
function classify3Plis(panel: { name: string | null }): ClassificationResult | null {
  const name = (panel.name || '').toLowerCase();

  if (/ch[êe]ne/i.test(name)) {
    return { targetSlug: '3-plis-chene', confidence: 'high', reason: 'nom contient chêne' };
  }
  if (/[ée]pic[ée]a/i.test(name)) {
    return { targetSlug: '3-plis-epicea', confidence: 'high', reason: 'nom contient épicéa' };
  }
  if (/douglas/i.test(name)) {
    return { targetSlug: '3-plis-divers', confidence: 'medium', reason: 'douglas → divers (conifère)' };
  }
  if (/h[êe]tre/i.test(name)) {
    return { targetSlug: '3-plis-divers', confidence: 'medium', reason: 'hêtre → divers' };
  }
  if (/fr[êe]ne/i.test(name)) {
    return { targetSlug: '3-plis-divers', confidence: 'medium', reason: 'frêne → divers' };
  }

  return { targetSlug: '3-plis-divers', confidence: 'low', reason: 'fallback divers' };
}

// Classification des MDF
function classifyMDF(panel: {
  name: string | null;
  isHydrofuge: boolean;
  isIgnifuge: boolean;
}): ClassificationResult | null {
  if (panel.isHydrofuge) {
    return { targetSlug: 'mdf-hydrofuge', confidence: 'high', reason: 'isHydrofuge=true' };
  }
  if (panel.isIgnifuge) {
    return { targetSlug: 'mdf-ignifuge', confidence: 'high', reason: 'isIgnifuge=true' };
  }

  const name = (panel.name || '').toLowerCase();
  if (/hydro/i.test(name)) {
    return { targetSlug: 'mdf-hydrofuge', confidence: 'medium', reason: 'nom contient hydro' };
  }
  if (/ignif/i.test(name)) {
    return { targetSlug: 'mdf-ignifuge', confidence: 'medium', reason: 'nom contient ignif' };
  }
  if (/laqu/i.test(name)) {
    return { targetSlug: 'mdf-laquer', confidence: 'medium', reason: 'nom contient laquer' };
  }
  if (/l[ée]ger/i.test(name)) {
    return { targetSlug: 'mdf-leger', confidence: 'medium', reason: 'nom contient léger' };
  }
  if (/teint/i.test(name)) {
    return { targetSlug: 'mdf-teinte', confidence: 'medium', reason: 'nom contient teinte' };
  }

  return { targetSlug: 'mdf-standard', confidence: 'low', reason: 'fallback standard' };
}

// Classification des Agglomérés
function classifyAgglo(panel: {
  name: string | null;
  isHydrofuge: boolean;
  isIgnifuge: boolean;
}): ClassificationResult | null {
  if (panel.isHydrofuge) {
    return { targetSlug: 'agglo-hydrofuge', confidence: 'high', reason: 'isHydrofuge=true' };
  }
  if (panel.isIgnifuge) {
    return { targetSlug: 'agglo-ignifuge', confidence: 'high', reason: 'isIgnifuge=true' };
  }

  const name = (panel.name || '').toLowerCase();
  if (/hydro/i.test(name)) {
    return { targetSlug: 'agglo-hydrofuge', confidence: 'medium', reason: 'nom contient hydro' };
  }
  if (/ignif/i.test(name)) {
    return { targetSlug: 'agglo-ignifuge', confidence: 'medium', reason: 'nom contient ignif' };
  }

  return { targetSlug: 'agglo-standard', confidence: 'low', reason: 'fallback standard' };
}

// Classification des OSB
function classifyOSB(panel: {
  name: string | null;
  isHydrofuge: boolean;
}): ClassificationResult | null {
  const name = (panel.name || '').toLowerCase();

  if (panel.isHydrofuge || /hydro|osb.?3/i.test(name)) {
    return { targetSlug: 'osb-hydrofuge', confidence: 'high', reason: 'hydrofuge ou OSB3' };
  }

  return { targetSlug: 'osb-standard', confidence: 'low', reason: 'fallback standard' };
}

// Classification des Chants
function classifyChant(panel: {
  name: string | null;
  supportQuality: string | null;
}): ClassificationResult | null {
  const name = (panel.name || '').toLowerCase();
  const quality = (panel.supportQuality || '').toLowerCase();

  // Par type de matériau
  if (/abs/i.test(name) || /abs/i.test(quality)) {
    // Sous-classification ABS
    if (/uni|blanc|noir|gris/i.test(name)) {
      return { targetSlug: 'abs-unis', confidence: 'high', reason: 'ABS uni' };
    }
    if (/ch[êe]ne|noyer|bois|h[êe]tre/i.test(name)) {
      return { targetSlug: 'abs-bois', confidence: 'high', reason: 'ABS bois' };
    }
    return { targetSlug: 'abs-fantaisie', confidence: 'medium', reason: 'ABS → fantaisie' };
  }

  if (/pvc/i.test(name)) {
    return { targetSlug: 'chants-pvc', confidence: 'high', reason: 'PVC' };
  }

  if (/bois\b|massif/i.test(name) || quality.includes('bois')) {
    if (/ch[êe]ne/i.test(name)) {
      return { targetSlug: 'chant-chene', confidence: 'high', reason: 'chant bois chêne' };
    }
    if (/noyer/i.test(name)) {
      return { targetSlug: 'chant-noyer', confidence: 'high', reason: 'chant bois noyer' };
    }
    return { targetSlug: 'chants-bois-divers', confidence: 'medium', reason: 'chant bois divers' };
  }

  if (/m[ée]lamin/i.test(name) || quality.includes('mélamine')) {
    return { targetSlug: 'chants-melamines', confidence: 'high', reason: 'chant mélaminé' };
  }

  // Par défaut ABS (le plus courant)
  return { targetSlug: 'chants-abs', confidence: 'low', reason: 'fallback ABS' };
}

// Mapping productType → catégorie de base CutX
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
  const highConfidenceOnly = args.includes('--high-only');

  console.log('='.repeat(70));
  console.log('CORRECTION INTELLIGENTE DES CATÉGORIES');
  console.log('='.repeat(70));

  if (executeMode) {
    console.log('⚠️  MODE EXÉCUTION - Les changements seront appliqués!');
  } else {
    console.log('🔍 MODE DRY RUN - Aucun changement ne sera effectué');
  }

  if (highConfidenceOnly) {
    console.log('📊 Seulement les classifications HIGH CONFIDENCE');
  }

  try {
    // 1. Récupérer le catalogue CutX et ses catégories
    const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
    if (!cutx) {
      console.log('❌ Catalogue CutX non trouvé!');
      return;
    }

    const cutxCategories = await prisma.category.findMany({
      where: { catalogueId: cutx.id },
      select: { id: true, slug: true, name: true },
    });

    const cutxCategoryMap = new Map<string, { id: string; name: string }>();
    for (const cat of cutxCategories) {
      cutxCategoryMap.set(cat.slug, { id: cat.id, name: cat.name });
    }

    console.log(`\n📁 Catégories CutX disponibles: ${cutxCategories.length}`);

    // 2. Récupérer tous les panneaux actifs avec leurs infos
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
        material: true,
        supportQuality: true,
        categoryId: true,
        category: {
          select: {
            slug: true,
            name: true,
            catalogueId: true,
          },
        },
      },
    });

    console.log(`\n📋 Panneaux à analyser: ${panels.length}`);

    // 3. Classifier chaque panneau
    const corrections: Array<{
      panelId: string;
      panelName: string;
      currentCategorySlug: string | null;
      currentCategoryName: string | null;
      targetSlug: string;
      targetName: string;
      confidence: string;
      reason: string;
    }> = [];

    const skipped: Array<{ name: string; reason: string }> = [];

    for (const panel of panels) {
      const productType = panel.productType || '';
      let classification: ClassificationResult | null = null;

      // Appliquer la bonne fonction de classification
      switch (productType) {
        case 'CONTREPLAQUE':
          classification = classifyContreplaque(panel);
          break;
        case 'MELAMINE':
        case 'PANNEAU_DECORATIF':
          classification = classifyMelamine(panel);
          break;
        case 'STRATIFIE':
          classification = classifyStratifie(panel);
          break;
        case 'PANNEAU_3_PLIS':
          classification = classify3Plis(panel);
          break;
        case 'MDF':
          classification = classifyMDF(panel);
          break;
        case 'PARTICULE':
          classification = classifyAgglo(panel);
          break;
        case 'OSB':
          classification = classifyOSB(panel);
          break;
        case 'BANDE_DE_CHANT':
          classification = classifyChant(panel);
          break;
        default:
          // Utiliser la catégorie de base
          const baseSlug = PRODUCT_TYPE_BASE_CATEGORY[productType];
          if (baseSlug && cutxCategoryMap.has(baseSlug)) {
            classification = {
              targetSlug: baseSlug,
              confidence: 'low',
              reason: `productType → ${baseSlug}`,
            };
          }
      }

      // Filtrer par confiance si demandé
      if (highConfidenceOnly && classification?.confidence !== 'high') {
        skipped.push({
          name: panel.name || 'unknown',
          reason: `confiance ${classification?.confidence || 'null'}`,
        });
        continue;
      }

      if (!classification) {
        skipped.push({ name: panel.name || 'unknown', reason: 'pas de règle applicable' });
        continue;
      }

      const targetCategory = cutxCategoryMap.get(classification.targetSlug);
      if (!targetCategory) {
        // Essayer la catégorie de base
        const baseSlug = PRODUCT_TYPE_BASE_CATEGORY[productType];
        const baseCategory = baseSlug ? cutxCategoryMap.get(baseSlug) : null;
        if (!baseCategory) {
          skipped.push({ name: panel.name || 'unknown', reason: `catégorie ${classification.targetSlug} non trouvée` });
          continue;
        }
        classification.targetSlug = baseSlug!;
        classification.reason += ` (fallback ${baseSlug})`;
      }

      const finalTarget = cutxCategoryMap.get(classification.targetSlug)!;

      // Vérifier si c'est un changement réel
      if (panel.categoryId === finalTarget.id) {
        continue; // Déjà dans la bonne catégorie
      }

      // Vérifier si déjà dans une catégorie CutX
      const isAlreadyInCutx = panel.category?.catalogueId === cutx.id;
      const currentSlug = panel.category?.slug || null;

      // Skip si déjà dans la bonne sous-catégorie CutX
      if (isAlreadyInCutx && currentSlug === classification.targetSlug) {
        continue;
      }

      corrections.push({
        panelId: panel.id,
        panelName: panel.name || 'unknown',
        currentCategorySlug: currentSlug,
        currentCategoryName: panel.category?.name || null,
        targetSlug: classification.targetSlug,
        targetName: finalTarget.name,
        confidence: classification.confidence,
        reason: classification.reason,
      });
    }

    // 4. Afficher le résumé
    console.log('\n' + '='.repeat(70));
    console.log('RÉSUMÉ DES CORRECTIONS');
    console.log('='.repeat(70));

    // Grouper par confiance
    const byConfidence = {
      high: corrections.filter((c) => c.confidence === 'high'),
      medium: corrections.filter((c) => c.confidence === 'medium'),
      low: corrections.filter((c) => c.confidence === 'low'),
    };

    console.log(`\n📊 Par niveau de confiance:`);
    console.log(`  HIGH:   ${byConfidence.high.length} corrections`);
    console.log(`  MEDIUM: ${byConfidence.medium.length} corrections`);
    console.log(`  LOW:    ${byConfidence.low.length} corrections`);
    console.log(`  TOTAL:  ${corrections.length} corrections`);
    console.log(`  Skipped: ${skipped.length}`);

    // Grouper par transition
    console.log(`\n📋 Détail des transitions (HIGH confidence):`);
    const highTransitions: Record<string, Record<string, number>> = {};
    for (const c of byConfidence.high) {
      const from = c.currentCategorySlug || 'null';
      const to = c.targetSlug;
      if (!highTransitions[from]) highTransitions[from] = {};
      highTransitions[from][to] = (highTransitions[from][to] || 0) + 1;
    }

    for (const [from, targets] of Object.entries(highTransitions)) {
      console.log(`\n  ${from}:`);
      for (const [to, count] of Object.entries(targets).sort((a, b) => b[1] - a[1])) {
        console.log(`    → ${to}: ${count}`);
      }
    }

    // Exemples
    console.log(`\n📝 Exemples de corrections HIGH:`);
    for (const c of byConfidence.high.slice(0, 10)) {
      console.log(`  ${c.panelName.substring(0, 40).padEnd(42)}`);
      console.log(`    ${c.currentCategorySlug || 'null'} → ${c.targetSlug} (${c.reason})`);
    }

    // 5. Exécuter si demandé
    if (executeMode && corrections.length > 0) {
      console.log('\n⏳ Exécution dans 3 secondes...');
      await new Promise((r) => setTimeout(r, 3000));

      // Grouper par catégorie cible
      const byTarget = new Map<string, string[]>();
      for (const c of corrections) {
        const targetId = cutxCategoryMap.get(c.targetSlug)?.id;
        if (targetId) {
          const ids = byTarget.get(targetId) || [];
          ids.push(c.panelId);
          byTarget.set(targetId, ids);
        }
      }

      let totalUpdated = 0;
      for (const [categoryId, panelIds] of byTarget) {
        const result = await prisma.panel.updateMany({
          where: { id: { in: panelIds } },
          data: { categoryId },
        });
        totalUpdated += result.count;

        const catName = cutxCategories.find((c) => c.id === categoryId)?.name || categoryId;
        console.log(`  ✅ ${result.count} panneaux → ${catName}`);
      }

      console.log('\n' + '='.repeat(70));
      console.log('TERMINÉ');
      console.log('='.repeat(70));
      console.log(`Total mis à jour: ${totalUpdated}`);
    } else if (!executeMode) {
      console.log('\n💡 Options:');
      console.log('  npx ts-node scripts/fix-categories-smart.ts --execute        # Toutes les corrections');
      console.log('  npx ts-node scripts/fix-categories-smart.ts --execute --high-only  # Seulement HIGH');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
