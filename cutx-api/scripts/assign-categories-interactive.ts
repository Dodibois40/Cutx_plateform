/**
 * Script INTERACTIF d'assignation des panneaux aux catégories
 *
 * Permet de valider les assignations par petits paquets (10, puis 50)
 *
 * Usage:
 *   npx ts-node scripts/assign-categories-interactive.ts              # Batch de 10
 *   npx ts-node scripts/assign-categories-interactive.ts --batch=50   # Batch de 50
 *   npx ts-node scripts/assign-categories-interactive.ts --type=MDF   # Seulement les MDF
 *   npx ts-node scripts/assign-categories-interactive.ts --preview    # Voir sans exécuter
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// =============================================================================
// MAPPINGS (même que assign-categories.ts)
// =============================================================================

const PRODUCT_TYPE_TO_CATEGORY: Record<string, string> = {
  MELAMINE: 'panneaux-decors',
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  AGGLO_BRUT: 'agglomere',
  OSB: 'osb',
  CONTREPLAQUE: 'contreplaques',
  LATTE: 'latte',
  PANNEAU_CONSTRUCTION: 'agglomere',
  MASSIF: 'panneaux-bois-massif',
  PANNEAU_MASSIF: 'lamelle-colle',
  PANNEAU_3_PLIS: '3-plis',
  PLACAGE: 'panneaux-plaques-bois',
  PANNEAU_DECO: 'panneaux-plaques-bois',
  PANNEAU_MURAL: 'panneaux-muraux',
  COMPACT: 'compacts-hpl',
  PANNEAU_DECORATIF: 'decoratifs',
  PANNEAU_SPECIAL: 'alveolaires',
  PANNEAU_ALVEOLAIRE: 'alveolaires',
  CIMENT_BOIS: 'ciment-bois',
  PANNEAU_ISOLANT: 'isolants',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  SOLID_SURFACE: 'pdt-solid-surface',
  STRATIFIE: 'feuilles-stratifiees',
  CHANT: 'chants',
  BANDE_DE_CHANT: 'chants',
};

const MELAMINE_DECOR_TO_CATEGORY: Record<string, string> = {
  BOIS: 'decors-bois',
  UNIS: 'decors-unis',
  PIERRE: 'decors-pierres-marbres',
  BETON: 'decors-pierres-marbres',
  METAL: 'decors-metal-textile',
  TEXTILE: 'decors-metal-textile',
  FANTAISIE: 'decors-fantaisie',
  SANS_DECOR: 'panneaux-decors',
};

const CHANT_SUBTYPE_TO_CATEGORY: Record<string, string> = {
  CHANT_ABS: 'chants-abs',
  CHANT_PVC: 'chants-pvc',
  CHANT_MELAMINE: 'chants-melamines',
  CHANT_BOIS: 'chants-plaques-bois',
};

const STRATIFIE_KEYWORDS: Record<string, string> = {
  uni: 'strat-unis',
  unis: 'strat-unis',
  bois: 'strat-bois',
  fantaisie: 'strat-fantaisie',
  pierre: 'strat-pierre-metal',
  metal: 'strat-pierre-metal',
  marbre: 'strat-pierre-metal',
};

const ESSENCE_TO_CATEGORY: Record<string, string> = {
  chene: 'plaque-chene',
  chêne: 'plaque-chene',
  noyer: 'plaque-noyer',
  hetre: 'plaque-hetre',
  hêtre: 'plaque-hetre',
  frene: 'plaque-frene',
  frêne: 'plaque-frene',
  erable: 'plaque-erable',
  érable: 'plaque-erable',
  merisier: 'plaque-merisier',
};

// =============================================================================
// TYPES
// =============================================================================

interface PanelToAssign {
  id: string;
  reference: string;
  name: string;
  productType: string | null;
  panelSubType: string | null;
  decorCategory: string | null;
  material: string | null;
  finish: string | null;
  description: string | null;
  catalogueName?: string;
}

interface AssignmentProposal {
  panel: PanelToAssign;
  targetCategorySlug: string;
  targetCategoryName: string;
  targetCategoryId: string;
  reason: string;
}

interface CategoryInfo {
  id: string;
  slug: string;
  name: string;
  parentName: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Charge toutes les catégories avec leurs infos
 */
async function loadCategories(): Promise<Map<string, CategoryInfo>> {
  const categories = await prisma.category.findMany({
    include: { parent: { select: { name: true } } },
  });

  const map = new Map<string, CategoryInfo>();
  for (const cat of categories) {
    map.set(cat.slug, {
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      parentName: cat.parent?.name || null,
    });
  }
  return map;
}

/**
 * Détermine la catégorie cible pour un panneau
 */
function determineCategory(
  panel: PanelToAssign,
  categories: Map<string, CategoryInfo>
): { slug: string; reason: string } | null {
  const { productType, panelSubType, decorCategory, material, finish, name, description } = panel;

  if (!productType) return null;

  // Mélaminés → affinage par decorCategory
  if (productType === 'MELAMINE' && decorCategory) {
    const slug = MELAMINE_DECOR_TO_CATEGORY[decorCategory];
    if (slug && categories.has(slug)) {
      return { slug, reason: `decorCategory=${decorCategory}` };
    }
  }

  // Stratifiés → affinage par mots-clés
  if (productType === 'STRATIFIE') {
    const text = `${finish || ''} ${name || ''} ${description || ''}`.toLowerCase();
    for (const [kw, slug] of Object.entries(STRATIFIE_KEYWORDS)) {
      if (text.includes(kw) && categories.has(slug)) {
        return { slug, reason: `keyword="${kw}"` };
      }
    }
    return { slug: 'feuilles-stratifiees', reason: 'default' };
  }

  // Chants → affinage par panelSubType
  if (productType === 'CHANT' || productType === 'BANDE_DE_CHANT') {
    if (panelSubType && CHANT_SUBTYPE_TO_CATEGORY[panelSubType]) {
      const slug = CHANT_SUBTYPE_TO_CATEGORY[panelSubType];
      if (categories.has(slug)) {
        return { slug, reason: `subType=${panelSubType}` };
      }
    }
    return { slug: 'chants', reason: 'default' };
  }

  // Placages → affinage par essence
  if (productType === 'PLACAGE' || productType === 'PANNEAU_DECO') {
    const text = `${material || ''} ${name || ''}`.toLowerCase();
    for (const [essence, slug] of Object.entries(ESSENCE_TO_CATEGORY)) {
      if (text.includes(essence) && categories.has(slug)) {
        return { slug, reason: `essence="${essence}"` };
      }
    }
    return { slug: 'panneaux-plaques-bois', reason: 'default' };
  }

  // Mapping direct
  const directSlug = PRODUCT_TYPE_TO_CATEGORY[productType];
  if (directSlug && categories.has(directSlug)) {
    return { slug: directSlug, reason: `type=${productType}` };
  }

  return null;
}

/**
 * Prompt interactif
 */
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Affiche un tableau formaté des propositions
 */
function displayProposals(proposals: AssignmentProposal[], offset: number) {
  console.log('\n' + '='.repeat(100));
  console.log(`📋 PROPOSITIONS D'ASSIGNATION (${offset + 1} - ${offset + proposals.length})`);
  console.log('='.repeat(100));

  for (let i = 0; i < proposals.length; i++) {
    const p = proposals[i];
    const idx = offset + i + 1;
    const catPath = p.targetCategoryName;

    console.log(`\n${idx}. 📦 ${p.panel.reference || 'N/A'}`);
    console.log(`   Nom: ${p.panel.name.substring(0, 60)}${p.panel.name.length > 60 ? '...' : ''}`);
    console.log(`   Type: ${p.panel.productType || 'N/A'} | SubType: ${p.panel.panelSubType || 'N/A'} | Decor: ${p.panel.decorCategory || 'N/A'}`);
    console.log(`   ➜ Catégorie: 📁 ${catPath}`);
    console.log(`   ➜ Raison: ${p.reason}`);
  }

  console.log('\n' + '-'.repeat(100));
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '10');
  const filterType = args.find(a => a.startsWith('--type='))?.split('=')[1] || null;
  const previewOnly = args.includes('--preview');

  console.log('\n🚀 ASSIGNATION INTERACTIVE DES CATÉGORIES\n');
  console.log(`   Taille batch: ${batchSize}`);
  console.log(`   Filtre type: ${filterType || 'tous'}`);
  console.log(`   Mode: ${previewOnly ? 'PREVIEW (lecture seule)' : 'INTERACTIF'}`);

  // Charger les catégories
  const categories = await loadCategories();
  console.log(`\n📚 ${categories.size} catégories chargées`);

  // Stats initiales
  const totalPanels = await prisma.panel.count();
  const unassigned = await prisma.panel.count({ where: { categoryId: null } });
  console.log(`📊 ${unassigned}/${totalPanels} panneaux sans catégorie\n`);

  // Construire le filtre
  const whereClause: any = { categoryId: null };
  if (filterType) {
    whereClause.productType = filterType;
  }

  let offset = 0;
  let totalAssigned = 0;
  let continueLoop = true;

  while (continueLoop) {
    // Récupérer le batch
    const panels = await prisma.panel.findMany({
      where: whereClause,
      take: batchSize,
      skip: offset,
      select: {
        id: true,
        reference: true,
        name: true,
        productType: true,
        panelSubType: true,
        decorCategory: true,
        material: true,
        finish: true,
        description: true,
        catalogue: { select: { name: true } },
      },
      orderBy: [{ productType: 'asc' }, { name: 'asc' }],
    });

    if (panels.length === 0) {
      console.log('\n✅ Tous les panneaux ont été traités !');
      break;
    }

    // Générer les propositions
    const proposals: AssignmentProposal[] = [];
    const errors: { panel: PanelToAssign; reason: string }[] = [];

    for (const panel of panels) {
      const panelData: PanelToAssign = {
        ...panel,
        catalogueName: panel.catalogue?.name,
      };

      const result = determineCategory(panelData, categories);

      if (result) {
        const catInfo = categories.get(result.slug)!;
        const fullName = catInfo.parentName
          ? `${catInfo.parentName} > ${catInfo.name}`
          : catInfo.name;

        proposals.push({
          panel: panelData,
          targetCategorySlug: result.slug,
          targetCategoryName: fullName,
          targetCategoryId: catInfo.id,
          reason: result.reason,
        });
      } else {
        errors.push({
          panel: panelData,
          reason: `Type inconnu: ${panel.productType}`,
        });
      }
    }

    // Afficher les propositions
    displayProposals(proposals, offset);

    // Afficher les erreurs
    if (errors.length > 0) {
      console.log(`\n⚠️ ${errors.length} panneaux non assignables:`);
      for (const err of errors) {
        console.log(`   - ${err.panel.reference || err.panel.name}: ${err.reason}`);
      }
    }

    // Stats du batch
    console.log(`\n📊 Batch: ${proposals.length} assignations | ${errors.length} erreurs`);

    if (previewOnly) {
      console.log('\n[Mode PREVIEW - aucune modification]');
      offset += batchSize;

      const answer = await askQuestion('\nContinuer le preview ? (o/n/q pour quitter): ');
      if (answer === 'n' || answer === 'q') {
        continueLoop = false;
      }
      continue;
    }

    // Demander confirmation
    const answer = await askQuestion('\n➜ Valider ces assignations ? (o=oui, n=passer, q=quitter, e=éditer): ');

    if (answer === 'q') {
      console.log('\n👋 Arrêt demandé.');
      continueLoop = false;
    } else if (answer === 'o' || answer === 'y' || answer === 'oui' || answer === 'yes') {
      // Exécuter les assignations
      console.log('\n⏳ Exécution des assignations...');

      for (const proposal of proposals) {
        await prisma.panel.update({
          where: { id: proposal.panel.id },
          data: { categoryId: proposal.targetCategoryId },
        });
      }

      totalAssigned += proposals.length;
      console.log(`✅ ${proposals.length} panneaux assignés (total: ${totalAssigned})`);

      // Ne pas incrémenter offset car les panneaux assignés ne seront plus dans la requête
      // (ils ont maintenant un categoryId)
    } else if (answer === 'e') {
      // Mode édition - permet de modifier une assignation
      const editIdx = await askQuestion('Numéro de la ref à modifier (ou "cancel"): ');
      if (editIdx !== 'cancel') {
        const idx = parseInt(editIdx) - offset - 1;
        if (idx >= 0 && idx < proposals.length) {
          const p = proposals[idx];
          console.log(`\nModification de: ${p.panel.reference}`);
          console.log('Catégories disponibles:');

          const slugs = Array.from(categories.keys()).sort();
          for (let i = 0; i < slugs.length; i++) {
            const cat = categories.get(slugs[i])!;
            console.log(`  ${i + 1}. ${cat.name} (${cat.slug})`);
          }

          const newCatIdx = await askQuestion('\nNuméro de la nouvelle catégorie: ');
          const catIdx = parseInt(newCatIdx) - 1;
          if (catIdx >= 0 && catIdx < slugs.length) {
            const newCat = categories.get(slugs[catIdx])!;
            proposals[idx].targetCategorySlug = newCat.slug;
            proposals[idx].targetCategoryId = newCat.id;
            proposals[idx].targetCategoryName = newCat.parentName
              ? `${newCat.parentName} > ${newCat.name}`
              : newCat.name;
            proposals[idx].reason = 'manuel';
            console.log(`✅ Modifié vers: ${newCat.name}`);
          }
        }
      }
      // Ne pas avancer, re-afficher le même batch
      displayProposals(proposals, offset);
    } else {
      // Passer ce batch
      console.log('⏭️ Batch ignoré');
      offset += batchSize;
    }
  }

  // Stats finales
  const finalUnassigned = await prisma.panel.count({ where: { categoryId: null } });
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`   Panneaux assignés cette session: ${totalAssigned}`);
  console.log(`   Panneaux restants sans catégorie: ${finalUnassigned}`);
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

main().catch(console.error);
