// lib/configurateur/optimiseur/bin-packing.ts
// Logique d'optimisation de découpe avec binpackingjs

import type {
  DebitAOptimiser,
  DebitPlace,
  PanneauOptimise,
  ResultatOptimisation,
  OptionsOptimisation,
} from './types';

// Import de binpackingjs (2D bin packing)
// @ts-ignore - Le package n'a pas de types TypeScript
import { BP2D } from 'binpackingjs';

const { Bin, Box } = BP2D;

// Constantes
const MARGE_COUPE_DEFAUT = 4; // mm entre chaque pièce

// Essences de bois courantes (pour détecter le sens du fil dans le nom)
const ESSENCES_BOIS_PATTERNS = [
  'chêne', 'chene',
  'noyer',
  'hêtre', 'hetre',
  'frêne', 'frene',
  'érable', 'erable',
  'bouleau',
  'peuplier',
  'mélèze', 'meleze',
  'pin',
  'sapin',
  'merisier',
  'orme',
  'châtaignier', 'chataignier',
  'teck',
  'wengé', 'wenge',
  'acacia',
  'olivier',
  'palissandre',
];

/**
 * Détecte si un panneau a un décor bois (nécessite respect du sens du fil)
 * On vérifie l'essence OU on cherche des noms de bois dans le nom du panneau
 */
function detecterDecorBois(essence: string | null | undefined, nom: string): boolean {
  // Si essence est définie, c'est un décor bois
  if (essence) return true;

  // Sinon, chercher des essences de bois dans le nom
  const nomLower = nom.toLowerCase();
  return ESSENCES_BOIS_PATTERNS.some(pattern => nomLower.includes(pattern));
}

/**
 * Optimise le placement des débits sur des panneaux bruts
 */
export function optimiserDebits(
  panneauDimensions: { longueur: number; largeur: number; epaisseur: number },
  panneauId: string,
  panneauNom: string,
  debits: DebitAOptimiser[],
  options: OptionsOptimisation = {}
): ResultatOptimisation {
  const { margeCoupe = MARGE_COUPE_DEFAUT, respecterSensFil = true } = options;

  // Si pas de débits, retourner un résultat vide
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

  // Préparer les boxes (débits) avec marge de coupe
  const boxes: Array<{ box: InstanceType<typeof Box>; debit: DebitAOptimiser }> = [];

  for (const debit of debits) {
    // Ajouter la marge de coupe aux dimensions
    const longueurAvecMarge = debit.longueur + margeCoupe;
    const largeurAvecMarge = debit.largeur + margeCoupe;

    // Déterminer si le débit doit être pré-tourné pour respecter le sens du fil
    // - sensDuFil 'longueur': le fil du débit est sur sa longueur → pas de rotation
    // - sensDuFil 'largeur': le fil du débit est sur sa largeur → rotation 90° pour aligner avec le panneau
    const doitEtrePreTourne = respecterSensFil && debit.sensDuFil === 'largeur';

    // Créer la box - si pré-tournée, on inverse les dimensions
    const boxWidth = doitEtrePreTourne ? largeurAvecMarge : longueurAvecMarge;
    const boxHeight = doitEtrePreTourne ? longueurAvecMarge : largeurAvecMarge;

    const box = new Box(boxWidth, boxHeight);
    box.data = {
      debitId: debit.id,
      preTourne: doitEtrePreTourne, // Marquer si on a pré-tourné
    };

    // Si on doit respecter le sens du fil, bloquer toute rotation supplémentaire
    if (respecterSensFil) {
      box.constrainRotation = true;
    }

    boxes.push({ box, debit });
  }

  // === ALGORITHME SHELF (FFDH - First Fit Decreasing Height) ===
  // Plus adapté à la découpe de panneaux que MaxRects

  // Trier par hauteur décroissante (pour créer des étagères efficaces)
  boxes.sort((a, b) => {
    // D'abord par hauteur (pour grouper les pièces de même hauteur)
    if (b.box.height !== a.box.height) return b.box.height - a.box.height;
    // Puis par largeur décroissante
    return b.box.width - a.box.width;
  });

  // Structure pour suivre les placements
  interface Shelf {
    y: number;        // Position Y du début de l'étagère
    height: number;   // Hauteur de l'étagère (= hauteur de la première pièce)
    usedWidth: number; // Largeur déjà utilisée sur cette étagère
  }

  interface PanneauData {
    index: number;
    shelves: Shelf[];
    boxes: Array<{ box: typeof boxes[0]['box']; x: number; y: number }>;
  }

  const panneauxData: PanneauData[] = [];
  let currentPanneauIndex = 1;

  // Placer chaque box
  for (const boxInfo of boxes) {
    const box = boxInfo.box;
    const boxWidth = box.width;
    const boxHeight = box.height;
    let placed = false;

    // Essayer de placer dans un panneau existant
    for (const panneauData of panneauxData) {
      // Essayer chaque étagère existante
      for (const shelf of panneauData.shelves) {
        // Vérifier si la pièce rentre dans l'étagère (même hauteur ou moins)
        if (boxHeight <= shelf.height && shelf.usedWidth + boxWidth <= panneauDimensions.longueur) {
          // Placer la pièce
          box.x = shelf.usedWidth;
          box.y = shelf.y;
          box.packed = true;
          shelf.usedWidth += boxWidth;
          panneauData.boxes.push({ box, x: box.x, y: box.y });
          placed = true;
          break;
        }
      }

      if (placed) break;

      // Essayer de créer une nouvelle étagère dans ce panneau
      const lastShelf = panneauData.shelves[panneauData.shelves.length - 1];
      const nextY = lastShelf ? lastShelf.y + lastShelf.height : 0;

      if (nextY + boxHeight <= panneauDimensions.largeur && boxWidth <= panneauDimensions.longueur) {
        // Créer nouvelle étagère
        const newShelf: Shelf = {
          y: nextY,
          height: boxHeight,
          usedWidth: boxWidth,
        };
        panneauData.shelves.push(newShelf);
        box.x = 0;
        box.y = nextY;
        box.packed = true;
        panneauData.boxes.push({ box, x: box.x, y: box.y });
        placed = true;
        break;
      }
    }

    // Si pas placé, créer un nouveau panneau
    if (!placed) {
      if (boxWidth <= panneauDimensions.longueur && boxHeight <= panneauDimensions.largeur) {
        const newPanneau: PanneauData = {
          index: currentPanneauIndex++,
          shelves: [{
            y: 0,
            height: boxHeight,
            usedWidth: boxWidth,
          }],
          boxes: [],
        };
        box.x = 0;
        box.y = 0;
        box.packed = true;
        newPanneau.boxes.push({ box, x: 0, y: 0 });
        panneauxData.push(newPanneau);
      } else {
        console.warn(`⚠️ Pièce trop grande: ${boxWidth}x${boxHeight} pour panneau ${panneauDimensions.longueur}x${panneauDimensions.largeur}`);
      }
    }
  }

  // Convertir en format bins pour la suite du code
  const bins: InstanceType<typeof Bin>[] = panneauxData.map(p => {
    const bin = new Bin(panneauDimensions.longueur, panneauDimensions.largeur);
    bin.data = { index: p.index };
    bin.boxes = p.boxes.map(b => b.box);
    return bin;
  });

  // Construire le résultat
  const panneauxUtilises: Map<number, PanneauOptimise> = new Map();
  const debitsNonPlaces: DebitAOptimiser[] = [];
  let surfaceTotaleDebits = 0;

  // Créer un map des boxes par référence pour retrouver les débits
  const boxToDebitMap = new Map<InstanceType<typeof Box>, DebitAOptimiser>();
  for (const boxInfo of boxes) {
    boxToDebitMap.set(boxInfo.box, boxInfo.debit);
  }

  // Parcourir les bins et leurs boxes (binpackingjs stocke les boxes dans bin.boxes)
  for (let binIdx = 0; binIdx < bins.length; binIdx++) {
    const bin = bins[binIdx];
    const binBoxes = bin.boxes || [];

    if (binBoxes.length === 0) continue;

    const binIndex = bin.data?.index || (binIdx + 1);

    // Créer le panneau
    panneauxUtilises.set(binIndex, {
      index: binIndex,
      panneauId,
      panneauNom,
      dimensions: { ...panneauDimensions },
      debitsPlaces: [],
      zonesChute: [], // L'optimiseur local ne calcule pas les zones de chute détaillées
      surfaceUtilisee: 0,
      surfaceTotale: (panneauDimensions.longueur * panneauDimensions.largeur) / 1_000_000,
      tauxRemplissage: 0,
      chute: 0,
    });

    const panneau = panneauxUtilises.get(binIndex)!;

    // Parcourir les boxes dans ce bin
    for (const box of binBoxes) {
      const debit = boxToDebitMap.get(box);
      if (!debit) continue;

      // Déterminer si rotation finale par rapport aux dimensions ORIGINALES du débit
      // - rotation = true : la longueur originale est affichée verticalement (sur Y)
      // - rotation = false : la longueur originale est affichée horizontalement (sur X)
      //
      // Cas avec respecterSensFil:
      // - sensDuFil='longueur': pas de pré-rotation, longueur sur X → rotation=false
      // - sensDuFil='largeur': pré-rotation, longueur sur Y → rotation=true
      // Comme constrainRotation=true, binpacking ne tourne pas, donc rotation = preTourne
      //
      // Cas SANS respecterSensFil: binpacking peut tourner librement
      const preTourne = box.data?.preTourne || false;

      let rotation: boolean;
      if (respecterSensFil) {
        // Avec contrainte de fil: rotation = pré-tournement (binpacking n'a pas tourné)
        rotation = preTourne;
      } else {
        // Sans contrainte: vérifier si binpacking a tourné
        rotation = box.width !== (debit.longueur + margeCoupe);
      }

      // Créer le débit placé - on garde les dimensions ORIGINALES
      // La rotation est une info pour la visualisation du placement
      const debitPlace: DebitPlace = {
        id: debit.id,
        reference: debit.reference,
        x: box.x || 0,
        y: box.y || 0,
        longueur: debit.longueur,  // Toujours les dimensions originales
        largeur: debit.largeur,     // Toujours les dimensions originales
        rotation,
        chants: debit.chants,
      };

      panneau.debitsPlaces.push(debitPlace);

      // Calculer la surface utilisée
      const surfaceDebit = (debit.longueur * debit.largeur) / 1_000_000;
      panneau.surfaceUtilisee += surfaceDebit;
      surfaceTotaleDebits += surfaceDebit;
    }
  }

  // Identifier les débits non placés
  for (const boxInfo of boxes) {
    if (!boxInfo.box.packed) {
      debitsNonPlaces.push(boxInfo.debit);
    }
  }

  // Finaliser les calculs pour chaque panneau
  const panneauxResult: PanneauOptimise[] = [];

  Array.from(panneauxUtilises.values()).forEach((p) => {
    p.tauxRemplissage = (p.surfaceUtilisee / p.surfaceTotale) * 100;
    p.chute = p.surfaceTotale - p.surfaceUtilisee;
    panneauxResult.push(p);
  });

  // Trier par index
  panneauxResult.sort((a, b) => a.index - b.index);

  // Calculer les totaux
  const surfaceTotalePanneaux = panneauxResult.reduce((sum, p) => sum + p.surfaceTotale, 0);
  const tauxRemplissageMoyen = panneauxResult.length > 0
    ? panneauxResult.reduce((sum, p) => sum + p.tauxRemplissage, 0) / panneauxResult.length
    : 0;

  return {
    panneaux: panneauxResult,
    debitsNonPlaces,
    nombrePanneaux: panneauxResult.length,
    surfaceTotaleDebits,
    surfaceTotalePanneaux,
    tauxRemplissageMoyen,
  };
}

/**
 * Groupe les lignes par panneau sélectionné et optimise chaque groupe
 */
export function optimiserParPanneau(
  lignes: Array<{
    id: string;
    reference: string;
    panneauId: string | null;
    panneauNom: string | null;
    dimensions: { longueur: number; largeur: number; epaisseur: number };
    chants: { A: boolean; B: boolean; C: boolean; D: boolean };
    sensDuFil?: 'longueur' | 'largeur';
  }>,
  panneauxCatalogue: Array<{
    id: string;
    nom: string;
    longueur: number;
    largeur: number;
    epaisseurs: number[];
    categorie?: string;
    essence?: string | null;  // Si essence != null, le panneau a un décor bois → respecter sens du fil
  }>,
  options: OptionsOptimisation = {}
): Map<string, ResultatOptimisation> {
  const resultats = new Map<string, ResultatOptimisation>();

  // Filtrer les lignes avec un panneau sélectionné et des dimensions valides
  const lignesValides = lignes.filter(l =>
    l.panneauId &&
    l.dimensions.longueur > 0 &&
    l.dimensions.largeur > 0
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
    // Trouver le panneau dans le catalogue
    const panneau = panneauxCatalogue.find(p => p.id === panneauId);

    if (!panneau) {
      console.warn(`Panneau ${panneauId} non trouvé dans le catalogue`);
      continue;
    }

    // Convertir les lignes en débits à optimiser
    const debits: DebitAOptimiser[] = lignesGroupe.map(l => ({
      id: l.id,
      reference: l.reference || 'Sans ref',
      longueur: l.dimensions.longueur,
      largeur: l.dimensions.largeur,
      chants: l.chants,
      sensDuFil: l.sensDuFil || 'longueur',
    }));

    // Trouver l'épaisseur la plus utilisée
    const epaisseur = lignesGroupe[0]?.dimensions.epaisseur || panneau.epaisseurs[0] || 19;

    // Déterminer si on doit respecter le sens du fil
    // Utilise l'essence OU détecte automatiquement à partir du nom du panneau
    const doitRespecterSensFil = detecterDecorBois(panneau.essence, panneau.nom);

    // Optimiser avec les options appropriées
    const resultat = optimiserDebits(
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
        respecterSensFil: doitRespecterSensFil,
      }
    );

    resultats.set(panneauId, resultat);
  }

  return resultats;
}
