// ═══════════════════════════════════════════════════════════════
// CLIENT API OPTIMISATION DE DECOUPE
// Connecte le frontend au module d'optimisation backend
// ═══════════════════════════════════════════════════════════════

import { apiCall } from './core';
import type {
  DebitAOptimiser,
  DebitPlace,
  PanneauOptimise,
  ResultatOptimisation,
  OptionsOptimisation,
  ZoneChute,
} from '@/lib/configurateur/optimiseur/types';
import type { LignePrestationV3, Chants } from '@/lib/configurateur/types';

// ═══════════════════════════════════════════════════════════════
// TYPES API (Backend)
// ═══════════════════════════════════════════════════════════════

interface ApiCuttingPiece {
  id: string;
  name?: string;
  reference?: string;
  dimensions: { length: number; width: number };
  quantity: number;
  hasGrain: boolean;
  grainDirection?: 'length' | 'width';
  canRotate: boolean;
  expansion: { length: number; width: number };
  edging?: {
    top?: string | null;
    bottom?: string | null;
    left?: string | null;
    right?: string | null;
  };
  groupId?: string;
  priority?: number;
}

interface ApiSourceSheet {
  id: string;
  materialRef: string;
  materialName?: string;
  dimensions: { length: number; width: number };
  thickness: number;
  trim?: { top: number; left: number; bottom: number; right: number };
  hasGrain: boolean;
  grainDirection?: 'length' | 'width';
  pricePerSheet?: number;
  pricePerM2?: number;
  availableQuantity?: number;
  isOffcut?: boolean;
}

interface ApiOptimizationParams {
  bladeWidth?: number;
  defaultTrim?: { top: number; left: number; bottom: number; right: number };
  forceGrainMatch?: boolean;
  allowRotation?: boolean;
  splitStrategy?: string;
  optimizationType?: string;
  minOffcutLength?: number;
  minOffcutWidth?: number;
}

interface ApiPlacement {
  pieceId: string;           // ID de la pièce (correspond à l'ID envoyé)
  pieceIndex: number;        // Index de la pièce dans la liste
  position: { x: number; y: number };
  dimensions?: { length: number; width: number };
  finalDimensions: { length: number; width: number };
  rotated: boolean;
  edging?: {
    top?: string | null;
    bottom?: string | null;
    left?: string | null;
    right?: string | null;
  };
}

interface ApiFreeSpace {
  position: { x: number; y: number };
  dimensions: { length: number; width: number };
  area: number;
}

interface ApiUsedSheet {
  index: number;
  sheet: ApiSourceSheet;
  placements: ApiPlacement[];
  freeSpaces: ApiFreeSpace[];
  efficiency: number;
  usedArea: number;
  wasteArea: number;
  cuts: number;
  algorithmUsed?: string;
}

interface ApiCuttingPlan {
  sheets: ApiUsedSheet[];
  unplacedPieces: ApiCuttingPiece[];
  stats: {
    totalPieces: number;
    placedPieces: number;
    totalSheets: number;
    globalEfficiency: number;
    totalUsedArea: number;
    totalWasteArea: number;
    totalCuts: number;
    totalSheetCost?: number;
  };
}

interface ApiReusableOffcut {
  id: string;
  originalSheetId: string;
  materialRef: string;
  dimensions: { length: number; width: number };
  area: number;
  hasGrain: boolean;
  grainDirection?: 'length' | 'width';
  status: 'available' | 'reserved' | 'used' | 'discarded';
}

interface ApiOptimizationResponse {
  success: boolean;
  message: string;
  plan: ApiCuttingPlan;
  reusableOffcuts?: ApiReusableOffcut[];
}

interface ApiOptimizationRequest {
  pieces: ApiCuttingPiece[];
  sheets: ApiSourceSheet[];
  params?: ApiOptimizationParams;
  useIterations?: boolean;
  useSmartOptimize?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION FRONTEND → API
// ═══════════════════════════════════════════════════════════════

/**
 * Convertit un débit frontend en pièce API
 *
 * Logique du sens du fil :
 * - sensDuFil = 'longueur' → le fil du débit suit sa longueur → alignement naturel avec le panneau
 * - sensDuFil = 'largeur' → le fil du débit suit sa largeur → nécessite rotation de 90° pour aligner avec le panneau
 * - sensDuFil non défini → pas de contrainte de fil → rotation libre pour optimisation
 *
 * Le panneau brut a toujours son fil dans le sens de la longueur.
 * L'algorithme d'optimisation utilise grainDirection pour savoir quelle orientation est requise.
 */
function debitToApiPiece(debit: DebitAOptimiser): ApiCuttingPiece {
  const hasGrainConstraint = debit.sensDuFil !== undefined;

  // Build edging object with only non-null values
  // (NestJS @IsString() doesn't accept null, only undefined/omitted)
  const edging: ApiCuttingPiece['edging'] = {};
  if (debit.chants.A) edging.top = 'chant';
  if (debit.chants.B) edging.right = 'chant';
  if (debit.chants.C) edging.bottom = 'chant';
  if (debit.chants.D) edging.left = 'chant';

  return {
    id: debit.id,
    name: debit.reference || debit.id,
    reference: debit.reference,
    dimensions: {
      length: debit.longueur,
      width: debit.largeur,
    },
    quantity: 1,
    hasGrain: hasGrainConstraint,
    grainDirection: debit.sensDuFil === 'longueur' ? 'length' : 'width',
    // canRotate = true pour permettre à l'algorithme d'aligner le grain correctement
    // L'algorithme décidera de pivoter ou non selon grainDirection
    canRotate: true,
    expansion: { length: 0, width: 0 },
    edging: Object.keys(edging).length > 0 ? edging : undefined,
  };
}

/**
 * Convertit les dimensions d'un panneau en feuille API
 */
function panneauToApiSheet(
  panneauId: string,
  panneauNom: string,
  dimensions: { longueur: number; largeur: number; epaisseur: number },
  hasDecorBois: boolean = false
): ApiSourceSheet {
  return {
    id: panneauId,
    materialRef: panneauId,
    materialName: panneauNom,
    dimensions: {
      length: dimensions.longueur,
      width: dimensions.largeur,
    },
    thickness: dimensions.epaisseur,
    trim: { top: 0, left: 0, bottom: 0, right: 0 },
    hasGrain: hasDecorBois,
    grainDirection: hasDecorBois ? 'length' : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION API → FRONTEND
// ═══════════════════════════════════════════════════════════════

/**
 * Convertit un placement API en débit placé frontend
 */
function apiPlacementToDebitPlace(
  placement: ApiPlacement,
  originalDebit: DebitAOptimiser
): DebitPlace {
  return {
    id: placement.pieceId,
    reference: originalDebit.reference,
    x: placement.position.x,
    y: placement.position.y,
    longueur: originalDebit.longueur,
    largeur: originalDebit.largeur,
    rotation: placement.rotated,
    chants: originalDebit.chants,
  };
}

/**
 * Convertit une feuille utilisée API en panneau optimisé frontend
 */
function apiSheetToPanneauOptimise(
  usedSheet: ApiUsedSheet,
  debitsMap: Map<string, DebitAOptimiser>
): PanneauOptimise {
  const debitsPlaces: DebitPlace[] = usedSheet.placements.map((placement) => {
    const originalDebit = debitsMap.get(placement.pieceId);
    if (!originalDebit) {
      // Fallback si le débit original n'est pas trouvé
      return {
        id: placement.pieceId,
        reference: placement.pieceId,
        x: placement.position.x,
        y: placement.position.y,
        longueur: placement.finalDimensions.length,
        largeur: placement.finalDimensions.width,
        rotation: placement.rotated,
        chants: { A: false, B: false, C: false, D: false },
      };
    }
    return apiPlacementToDebitPlace(placement, originalDebit);
  });

  // Convertir les espaces libres en zones de chute
  const zonesChute: ZoneChute[] = (usedSheet.freeSpaces || []).map((fs, idx) => {
    const longueur = fs.dimensions.length;
    const largeur = fs.dimensions.width;
    // Calculer la surface: utiliser fs.area si disponible, sinon calculer depuis les dimensions
    const surfaceMm2 = fs.area ?? (longueur * largeur);
    return {
      id: `chute-${usedSheet.index}-${idx}`,
      x: fs.position.x,
      y: fs.position.y,
      longueur,
      largeur,
      surface: surfaceMm2 / 1_000_000, // mm² → m²
    };
  });

  const surfaceTotale =
    (usedSheet.sheet.dimensions.length * usedSheet.sheet.dimensions.width) / 1_000_000;
  const surfaceUtilisee = usedSheet.usedArea / 1_000_000;

  return {
    index: usedSheet.index + 1, // API commence à 0, frontend à 1
    panneauId: usedSheet.sheet.id,
    panneauNom: usedSheet.sheet.materialName || usedSheet.sheet.materialRef,
    dimensions: {
      longueur: usedSheet.sheet.dimensions.length,
      largeur: usedSheet.sheet.dimensions.width,
      epaisseur: usedSheet.sheet.thickness,
    },
    debitsPlaces,
    zonesChute,
    surfaceUtilisee,
    surfaceTotale,
    tauxRemplissage: usedSheet.efficiency,
    chute: surfaceTotale - surfaceUtilisee,
  };
}

/**
 * Convertit une réponse API complète en résultat d'optimisation frontend
 */
function apiResponseToResultat(
  response: ApiOptimizationResponse,
  debitsMap: Map<string, DebitAOptimiser>
): ResultatOptimisation {
  const panneaux = response.plan.sheets.map((sheet) =>
    apiSheetToPanneauOptimise(sheet, debitsMap)
  );

  // Trouver les débits non placés
  const debitsNonPlaces: DebitAOptimiser[] = response.plan.unplacedPieces
    .map((piece) => debitsMap.get(piece.id))
    .filter((d): d is DebitAOptimiser => d !== undefined);

  return {
    panneaux,
    debitsNonPlaces,
    nombrePanneaux: panneaux.length,
    surfaceTotaleDebits: response.plan.stats.totalUsedArea / 1_000_000,
    surfaceTotalePanneaux: panneaux.reduce((sum, p) => sum + p.surfaceTotale, 0),
    tauxRemplissageMoyen: response.plan.stats.globalEfficiency,
  };
}

// ═══════════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════════

/**
 * Optimise les débits via l'API backend
 */
export async function optimiserDebitsApi(
  panneauDimensions: { longueur: number; largeur: number; epaisseur: number },
  panneauId: string,
  panneauNom: string,
  debits: DebitAOptimiser[],
  options: OptionsOptimisation & { hasDecorBois?: boolean; signal?: AbortSignal } = {}
): Promise<ResultatOptimisation> {
  const {
    margeCoupe = 4,
    respecterSensFil = true,
    hasDecorBois = false,
    splitStrategy = 'shorter_leftover',
    optimizationType = 'minimize_waste',
    minOffcutLength = 300,
    minOffcutWidth = 100,
    signal,
  } = options;

  if (debits.length === 0) {
    return {
      panneaux: [],
      debitsNonPlaces: [],
      nombrePanneaux: 0,
      surfaceTotaleDebits: 0,
      surfaceTotalePanneaux: 0,
      tauxRemplissageMoyen: 0,
    };
  }

  // Créer le map pour la conversion inverse
  const debitsMap = new Map<string, DebitAOptimiser>();
  debits.forEach((d) => debitsMap.set(d.id, d));

  // Convertir les données
  const pieces: ApiCuttingPiece[] = debits.map(debitToApiPiece);
  const sheets: ApiSourceSheet[] = [
    panneauToApiSheet(panneauId, panneauNom, panneauDimensions, hasDecorBois),
  ];

  // Construire la requête
  const request: ApiOptimizationRequest = {
    pieces,
    sheets,
    params: {
      bladeWidth: margeCoupe,
      forceGrainMatch: respecterSensFil,
      allowRotation: !respecterSensFil,
      splitStrategy,
      optimizationType,
      minOffcutLength,
      minOffcutWidth,
    },
    useIterations: true,
    useSmartOptimize: true, // Utiliser le comparateur d'algorithmes
  };

  try {
    const response = await apiCall<ApiOptimizationResponse>(
      '/api/optimization/calculate',
      {
        method: 'POST',
        body: JSON.stringify(request),
        signal, // Passer le signal d'annulation
      }
    );

    return apiResponseToResultat(response, debitsMap);
  } catch (error) {
    // Re-throw AbortError sans log
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('[Optimization API] Error:', error);
    throw error;
  }
}

/**
 * Optimise les lignes groupées par panneau via l'API backend
 */
export async function optimiserParPanneauApi(
  lignes: Array<{
    id: string;
    reference: string;
    panneauId: string | null;
    panneauNom: string | null;
    dimensions: { longueur: number; largeur: number; epaisseur: number };
    chants: Chants;
    sensDuFil?: 'longueur' | 'largeur';
  }>,
  panneauxCatalogue: Array<{
    id: string;
    nom: string;
    longueur: number;
    largeur: number;
    epaisseurs: number[];
    categorie?: string;
    essence?: string | null;
  }>,
  options: OptionsOptimisation & { signal?: AbortSignal } = {}
): Promise<Map<string, ResultatOptimisation>> {
  const resultats = new Map<string, ResultatOptimisation>();

  // Filtrer les lignes valides
  const lignesValides = lignes.filter(
    (l) => l.panneauId && l.dimensions.longueur > 0 && l.dimensions.largeur > 0
  );

  // Grouper par panneauId
  const groupes = new Map<string, typeof lignesValides>();
  for (const ligne of lignesValides) {
    const panneauId = ligne.panneauId!;
    if (!groupes.has(panneauId)) {
      groupes.set(panneauId, []);
    }
    groupes.get(panneauId)!.push(ligne);
  }

  // Optimiser chaque groupe
  for (const [panneauId, lignesGroupe] of Array.from(groupes.entries())) {
    // Vérifier si la requête a été annulée
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const panneau = panneauxCatalogue.find((p) => p.id === panneauId);
    if (!panneau) {
      console.warn(`Panneau ${panneauId} non trouvé dans le catalogue`);
      continue;
    }

    // Convertir les lignes en débits
    const debits: DebitAOptimiser[] = lignesGroupe.map((l) => ({
      id: l.id,
      reference: l.reference || 'Sans ref',
      longueur: l.dimensions.longueur,
      largeur: l.dimensions.largeur,
      chants: l.chants,
      sensDuFil: l.sensDuFil || 'longueur',
    }));

    const epaisseur = lignesGroupe[0]?.dimensions.epaisseur || panneau.epaisseurs[0] || 19;

    // Détecter si le panneau a un décor bois
    const hasDecorBois = detecterDecorBois(panneau.essence, panneau.nom);

    // Vérifier si au moins une pièce a un sensDuFil explicite défini par l'utilisateur
    const hasUserDefinedGrain = lignesGroupe.some(l => l.sensDuFil !== undefined);

    // Respecter le sens du fil si:
    // 1. Le panneau a un décor bois naturel, OU
    // 2. L'utilisateur a explicitement défini un sensDuFil sur au moins une pièce
    const shouldRespectGrain = hasDecorBois || hasUserDefinedGrain;

    try {
      const resultat = await optimiserDebitsApi(
        {
          longueur: panneau.longueur,
          largeur: panneau.largeur,
          epaisseur,
        },
        panneauId,
        panneau.nom,
        debits,
        {
          ...options,
          respecterSensFil: shouldRespectGrain,
          hasDecorBois: shouldRespectGrain, // Traiter le panneau comme ayant un grain si l'utilisateur l'a défini
          signal: options.signal, // Passer le signal d'annulation
        }
      );

      resultats.set(panneauId, resultat);
    } catch (error) {
      // Re-throw AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error(`Erreur optimisation panneau ${panneauId}:`, error);
    }
  }

  return resultats;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const ESSENCES_BOIS_PATTERNS = [
  'chêne', 'chene', 'noyer', 'hêtre', 'hetre', 'frêne', 'frene',
  'érable', 'erable', 'bouleau', 'peuplier', 'mélèze', 'meleze',
  'pin', 'sapin', 'merisier', 'orme', 'châtaignier', 'chataignier',
  'teck', 'wengé', 'wenge', 'acacia', 'olivier', 'palissandre',
];

function detecterDecorBois(essence: string | null | undefined, nom: string): boolean {
  if (essence) return true;
  const nomLower = nom.toLowerCase();
  return ESSENCES_BOIS_PATTERNS.some((pattern) => nomLower.includes(pattern));
}

/**
 * Démonstration: appelle l'endpoint /api/optimization/demo
 */
export async function runOptimizationDemo(): Promise<ApiOptimizationResponse> {
  return apiCall<ApiOptimizationResponse>('/api/optimization/demo', {
    method: 'POST',
  });
}
