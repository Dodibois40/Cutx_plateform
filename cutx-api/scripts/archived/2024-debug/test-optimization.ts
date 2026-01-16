/**
 * Script de test pour l'algorithme d'optimisation de decoupe CutX
 *
 * Usage: npx tsx scripts/test-optimization.ts
 */

import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../src/optimization/types/cutting.types';
import { optimizeWithIterations } from '../src/optimization/algorithms/multi-sheet-optimizer';

// =============================================================================
// DONNEES DE TEST
// =============================================================================

// Pieces pour un meuble de cuisine (caisson haut)
const testPieces: CuttingPiece[] = [
  {
    id: 'fond-1',
    name: 'Fond caisson 1',
    dimensions: { length: 568, width: 320 },
    quantity: 2,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'cote-1',
    name: 'Cote gauche',
    dimensions: { length: 320, width: 570 },
    quantity: 2,
    hasGrain: true,
    grainDirection: 'width',
    canRotate: false,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'cote-2',
    name: 'Cote droit',
    dimensions: { length: 320, width: 570 },
    quantity: 2,
    hasGrain: true,
    grainDirection: 'width',
    canRotate: false,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'dessus-1',
    name: 'Dessus',
    dimensions: { length: 600, width: 320 },
    quantity: 2,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'dessous-1',
    name: 'Dessous',
    dimensions: { length: 600, width: 320 },
    quantity: 2,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'etagere-1',
    name: 'Etagere',
    dimensions: { length: 564, width: 300 },
    quantity: 4,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'porte-1',
    name: 'Porte',
    dimensions: { length: 596, width: 396 },
    quantity: 4,
    hasGrain: true,
    grainDirection: 'length',
    canRotate: false,
    expansion: { length: 2, width: 2 }, // Surcote pour usinage
  },
  {
    id: 'tiroir-facade',
    name: 'Facade tiroir',
    dimensions: { length: 596, width: 140 },
    quantity: 6,
    hasGrain: true,
    grainDirection: 'length',
    canRotate: false,
    expansion: { length: 2, width: 2 },
  },
  {
    id: 'tiroir-fond',
    name: 'Fond tiroir',
    dimensions: { length: 450, width: 520 },
    quantity: 6,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
  },
  {
    id: 'tiroir-cote',
    name: 'Cote tiroir',
    dimensions: { length: 450, width: 120 },
    quantity: 12,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
  },
];

// Panneau melamine standard
const testSheets: SourceSheet[] = [
  {
    id: 'mel-blanc-18',
    materialRef: 'H1180-ST37',
    materialName: 'Melamine Blanc Natural Halifax 18mm',
    dimensions: { length: 2800, width: 2070 },
    thickness: 18,
    trim: { top: 5, left: 5, bottom: 5, right: 5 },
    hasGrain: false,
    pricePerM2: 28.5,
  },
];

// =============================================================================
// FONCTION DE TEST
// =============================================================================

async function runTest() {
  console.log('='.repeat(60));
  console.log('TEST ALGORITHME OPTIMISATION CUTX');
  console.log('='.repeat(60));
  console.log('');

  // Calculer le nombre total de pieces
  const totalPieces = testPieces.reduce((sum, p) => sum + p.quantity, 0);
  console.log(`Pieces a placer: ${totalPieces}`);

  // Calculer la surface totale des pieces
  const totalPieceArea = testPieces.reduce((sum, p) => {
    const finalLength = p.dimensions.length + (p.expansion?.length || 0);
    const finalWidth = p.dimensions.width + (p.expansion?.width || 0);
    return sum + finalLength * finalWidth * p.quantity;
  }, 0);
  console.log(`Surface totale pieces: ${(totalPieceArea / 1_000_000).toFixed(3)} m2`);

  // Surface d'un panneau
  const sheetArea = testSheets[0].dimensions.length * testSheets[0].dimensions.width;
  console.log(`Surface panneau: ${(sheetArea / 1_000_000).toFixed(3)} m2`);

  // Estimation theorique du nombre de panneaux
  const theoreticalSheets = Math.ceil(totalPieceArea / sheetArea);
  console.log(`Estimation theorique: ${theoreticalSheets} panneau(x)`);
  console.log('');

  console.log('Lancement de l\'optimisation...');
  console.log('-'.repeat(40));

  const startTime = Date.now();

  try {
    const result = await optimizeWithIterations(testPieces, testSheets, {
      bladeWidth: 4,
      forceGrainMatch: false, // Desactiver pour ce test
      minOffcutLength: 200,
      minOffcutWidth: 100,
    });

    const duration = Date.now() - startTime;

    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTAT');
    console.log('='.repeat(60));
    console.log('');

    console.log(`Succes: ${result.success ? 'OUI' : 'NON'}`);
    console.log(`Message: ${result.message}`);
    console.log(`Duree: ${duration}ms`);
    console.log('');

    console.log('STATISTIQUES:');
    console.log('-'.repeat(40));
    console.log(`Pieces placees: ${result.plan.stats.placedPieces}/${result.plan.stats.totalPieces}`);
    console.log(`Panneaux utilises: ${result.plan.stats.totalSheets}`);
    console.log(`Efficacite globale: ${result.plan.stats.globalEfficiency.toFixed(1)}%`);
    console.log(`Surface utilisee: ${(result.plan.stats.totalUsedArea / 1_000_000).toFixed(3)} m2`);
    console.log(`Surface perdue: ${(result.plan.stats.totalWasteArea / 1_000_000).toFixed(3)} m2`);
    console.log(`Nombre de coupes: ${result.plan.stats.totalCuts}`);
    console.log(`Longueur totale coupes: ${(result.plan.stats.totalCutLength / 1000).toFixed(1)} m`);

    if (result.plan.stats.totalSheetCost !== undefined) {
      console.log(`Cout total: ${result.plan.stats.totalSheetCost.toFixed(2)} EUR`);
    }

    console.log('');
    console.log('DETAIL PAR PANNEAU:');
    console.log('-'.repeat(40));

    for (const sheet of result.plan.sheets) {
      console.log(`\nPanneau ${sheet.index + 1}:`);
      console.log(`  Efficacite: ${sheet.efficiency.toFixed(1)}%`);
      console.log(`  Pieces: ${sheet.placements.length}`);
      console.log(`  Coupes: ${sheet.cuts.length}`);

      // Afficher les 5 premieres pieces
      const piecesToShow = sheet.placements.slice(0, 5);
      for (const p of piecesToShow) {
        const rotatedStr = p.rotated ? ' [ROTATE]' : '';
        console.log(
          `    - (${p.position.x}, ${p.position.y}): ${p.finalDimensions.length}x${p.finalDimensions.width}mm${rotatedStr}`,
        );
      }
      if (sheet.placements.length > 5) {
        console.log(`    ... et ${sheet.placements.length - 5} autres`);
      }

      // Chutes reutilisables
      const reusableOffcuts = sheet.freeSpaces.filter(
        (s) => s.dimensions.length >= 200 && s.dimensions.width >= 100,
      );
      if (reusableOffcuts.length > 0) {
        console.log(`  Chutes reutilisables: ${reusableOffcuts.length}`);
        for (const offcut of reusableOffcuts.slice(0, 3)) {
          console.log(
            `    - ${offcut.dimensions.length}x${offcut.dimensions.width}mm @ (${offcut.position.x}, ${offcut.position.y})`,
          );
        }
      }
    }

    // Pieces non placees
    if (result.plan.unplacedPieces.length > 0) {
      console.log('');
      console.log('PIECES NON PLACEES:');
      console.log('-'.repeat(40));
      for (const piece of result.plan.unplacedPieces) {
        console.log(`  - ${piece.name}: ${piece.dimensions.length}x${piece.dimensions.width}mm`);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('TEST TERMINE AVEC SUCCES');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERREUR:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

// Executer le test
runTest();
