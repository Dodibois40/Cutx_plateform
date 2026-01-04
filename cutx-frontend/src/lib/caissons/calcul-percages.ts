// lib/caissons/calcul-percages.ts
// Calcul precis des positions de percage pour charnieres Blum
// Systeme de coordonnees: Origine = coin bas-gauche de chaque panneau (vue interne)

import {
  PERCAGE_CHARNIERE_BLUM,
  calculerNombreCharnieres,
  calculerPositionsYCharnieres,
  getEmbaseByType,
  type TypeEmbaseBlum,
  type CoteCaisson,
} from './blum-hardware';
import type { ConfigCaisson, PositionCharniere } from './types';

// === TYPES DE PERCAGE ===

/** Type de percage */
export type TypePercage =
  | 'cup_35mm'        // Trou borgne principal charniere
  | 'inserta_8mm'     // Trous vis INSERTA sur porte
  | 'pilote_10mm'     // Trou pilote embase INSERTA/EXPANDO
  | 'vis_5mm';        // Trous vis embase Wing

/** Panneau cible du percage */
export type PanneauPercage = 'facade' | 'cote_gauche' | 'cote_droit';

/** Face du panneau pour le percage */
export type FacePercage = 'interne' | 'externe';

/**
 * Percage avec coordonnees absolues
 * Origine: coin bas-gauche du panneau (vue de la face interne)
 * X: horizontal (positif vers la droite)
 * Y: vertical (positif vers le haut)
 */
export interface PercageAbsolu {
  id: string;
  type: TypePercage;
  panneau: PanneauPercage;
  face: FacePercage;
  // Coordonnees en mm depuis l'origine (bas-gauche)
  x: number;
  y: number;
  // Specifications du trou
  diametre: number;       // mm
  profondeur: number;     // mm
  // Metadata
  indexCharniere: number; // 0, 1, 2... (bas vers haut)
  description: string;
}

/**
 * Resultat complet du calcul de percages
 */
export interface ResultatPercagesCharnieres {
  // Configuration source
  config: {
    hauteurFacade: number;
    largeurFacade: number;
    profondeurCote: number;
    hauteurCote: number;
    positionCharniere: PositionCharniere;
    typeEmbase: TypeEmbaseBlum;
    nombreCharnieres: number;
  };

  // Positions Y des charnieres (depuis le bas)
  positionsY: number[];

  // Tous les percages par panneau
  percages: {
    facade: PercageAbsolu[];
    coteGauche: PercageAbsolu[];
    coteDroit: PercageAbsolu[];
  };

  // Statistiques
  stats: {
    nombreTotalPercages: number;
    nombreCups: number;
    nombreInserta: number;
    nombreEmbases: number;
  };
}

// === FONCTIONS DE CALCUL ===

/**
 * Calcule les percages cups (35mm) sur la facade
 *
 * @param hauteurFacade - Hauteur de la facade en mm
 * @param largeurFacade - Largeur de la facade en mm
 * @param positionCharniere - 'gauche' ou 'droite'
 * @param positionsY - Positions verticales des charnieres
 */
function calculerPercagesCup(
  hauteurFacade: number,
  largeurFacade: number,
  positionCharniere: PositionCharniere,
  positionsY: number[],
): PercageAbsolu[] {
  const { cup } = PERCAGE_CHARNIERE_BLUM.porte;
  const percages: PercageAbsolu[] = [];

  // Position X du cup selon le cote d'ouverture
  const xCup = positionCharniere === 'gauche'
    ? cup.distanceBord                    // 23mm du bord gauche
    : largeurFacade - cup.distanceBord;   // 23mm du bord droit

  positionsY.forEach((y, index) => {
    percages.push({
      id: `cup_${index}`,
      type: 'cup_35mm',
      panneau: 'facade',
      face: 'interne',
      x: xCup,
      y: y,
      diametre: cup.diametre,
      profondeur: cup.profondeur,
      indexCharniere: index,
      description: `Cup charniere ${index + 1} (Ø${cup.diametre}mm x ${cup.profondeur}mm)`,
    });
  });

  return percages;
}

/**
 * Calcule les percages INSERTA (8mm) sur la facade
 * 2 trous par charniere, espaces de 45mm verticalement
 */
function calculerPercagesInserta(
  hauteurFacade: number,
  largeurFacade: number,
  positionCharniere: PositionCharniere,
  positionsY: number[],
): PercageAbsolu[] {
  const { cup, inserta } = PERCAGE_CHARNIERE_BLUM.porte;
  const percages: PercageAbsolu[] = [];

  // Position X du cup
  const xCup = positionCharniere === 'gauche'
    ? cup.distanceBord
    : largeurFacade - cup.distanceBord;

  // Position X des trous INSERTA (decale vers l'interieur de la porte)
  const xInserta = positionCharniere === 'gauche'
    ? xCup + inserta.distanceCentreCup     // 9.5mm a droite du cup
    : xCup - inserta.distanceCentreCup;    // 9.5mm a gauche du cup

  // Demi-espacement vertical
  const demiEspacement = inserta.espacement / 2; // 22.5mm

  positionsY.forEach((yCup, index) => {
    // Trou bas
    percages.push({
      id: `inserta_${index}_bas`,
      type: 'inserta_8mm',
      panneau: 'facade',
      face: 'interne',
      x: xInserta,
      y: yCup - demiEspacement,
      diametre: inserta.diametre,
      profondeur: inserta.profondeur,
      indexCharniere: index,
      description: `INSERTA bas charniere ${index + 1} (Ø${inserta.diametre}mm)`,
    });

    // Trou haut
    percages.push({
      id: `inserta_${index}_haut`,
      type: 'inserta_8mm',
      panneau: 'facade',
      face: 'interne',
      x: xInserta,
      y: yCup + demiEspacement,
      diametre: inserta.diametre,
      profondeur: inserta.profondeur,
      indexCharniere: index,
      description: `INSERTA haut charniere ${index + 1} (Ø${inserta.diametre}mm)`,
    });
  });

  return percages;
}

/**
 * Calcule les percages d'embase sur un cote du caisson
 *
 * @param profondeurCote - Profondeur du panneau cote en mm
 * @param hauteurCote - Hauteur du panneau cote en mm
 * @param positionsY - Positions verticales des charnieres
 * @param typeEmbase - Type d'embase Blum
 * @param cote - 'gauche' ou 'droit'
 */
function calculerPercagesEmbase(
  profondeurCote: number,
  hauteurCote: number,
  positionsY: number[],
  typeEmbase: TypeEmbaseBlum,
  cote: CoteCaisson,
): PercageAbsolu[] {
  const { distanceBordAvant } = PERCAGE_CHARNIERE_BLUM.cote;
  const embase = getEmbaseByType(typeEmbase);
  const percages: PercageAbsolu[] = [];

  // Position X: distance depuis le bord AVANT (face avant du caisson)
  // Dans notre systeme, X=0 est le bord arriere, donc:
  const xEmbase = profondeurCote - distanceBordAvant; // ex: 522 - 37 = 485mm

  const panneauCible: PanneauPercage = cote === 'gauche' ? 'cote_gauche' : 'cote_droit';

  if (embase.percage.type === 'pilote') {
    // INSERTA ou EXPANDO: 1 trou pilote de 10mm
    positionsY.forEach((y, index) => {
      percages.push({
        id: `embase_${cote}_${index}`,
        type: 'pilote_10mm',
        panneau: panneauCible,
        face: 'interne',
        x: xEmbase,
        y: y,
        diametre: embase.percage.diametre,
        profondeur: embase.percage.profondeur,
        indexCharniere: index,
        description: `Embase ${typeEmbase} charniere ${index + 1} (Ø${embase.percage.diametre}mm)`,
      });
    });
  } else if (embase.percage.type === 'vis_system32') {
    // Wing: 2 trous de 5mm espaces de 32mm (System32)
    const demiEspacement = (embase.percage.espacement || 32) / 2; // 16mm

    positionsY.forEach((yCharniere, index) => {
      // Trou bas
      percages.push({
        id: `embase_${cote}_${index}_bas`,
        type: 'vis_5mm',
        panneau: panneauCible,
        face: 'interne',
        x: xEmbase,
        y: yCharniere - demiEspacement,
        diametre: embase.percage.diametre,
        profondeur: embase.percage.profondeur,
        indexCharniere: index,
        description: `Embase Wing vis bas charniere ${index + 1} (Ø${embase.percage.diametre}mm)`,
      });

      // Trou haut
      percages.push({
        id: `embase_${cote}_${index}_haut`,
        type: 'vis_5mm',
        panneau: panneauCible,
        face: 'interne',
        x: xEmbase,
        y: yCharniere + demiEspacement,
        diametre: embase.percage.diametre,
        profondeur: embase.percage.profondeur,
        indexCharniere: index,
        description: `Embase Wing vis haut charniere ${index + 1} (Ø${embase.percage.diametre}mm)`,
      });
    });
  }

  return percages;
}

/**
 * Calcule les dimensions de la facade a partir du caisson
 */
function calculerDimensionsFacade(config: ConfigCaisson): {
  hauteur: number;
  largeur: number;
} {
  // Facade en applique: recouvre les cotes
  if (config.typeFacade === 'applique') {
    return {
      hauteur: config.hauteur - config.jeuFacade,
      largeur: config.largeur - config.jeuFacade,
    };
  }
  // Facade encastree: entre les cotes
  return {
    hauteur: config.hauteur - 2 * config.epaisseurStructure - config.jeuFacade,
    largeur: config.largeur - 2 * config.epaisseurStructure - config.jeuFacade,
  };
}

/**
 * FONCTION PRINCIPALE
 * Calcule tous les percages pour les charnieres d'un caisson
 */
export function calculerTousPercagesCharnieres(
  config: ConfigCaisson,
  typeEmbase: TypeEmbaseBlum = 'EXPANDO_0mm',
): ResultatPercagesCharnieres {
  // Calculer les dimensions de la facade
  const dimensionsFacade = calculerDimensionsFacade(config);

  // Calculer le nombre et positions des charnieres
  const nombreCharnieres = calculerNombreCharnieres(dimensionsFacade.hauteur);
  const positionsY = calculerPositionsYCharnieres(dimensionsFacade.hauteur);

  // Percages facade
  const percagesCup = calculerPercagesCup(
    dimensionsFacade.hauteur,
    dimensionsFacade.largeur,
    config.positionCharniere,
    positionsY,
  );

  const percagesInserta = calculerPercagesInserta(
    dimensionsFacade.hauteur,
    dimensionsFacade.largeur,
    config.positionCharniere,
    positionsY,
  );

  // Percages cote (seulement du cote des charnieres)
  // Map PositionCharniere ('gauche'|'droite') to CoteCaisson ('gauche'|'droit')
  const coteCible: CoteCaisson = config.positionCharniere === 'droite' ? 'droit' : 'gauche';
  const percagesEmbase = calculerPercagesEmbase(
    config.profondeur,
    config.hauteur,
    positionsY,
    typeEmbase,
    coteCible,
  );

  // Organiser par panneau
  const percagesFacade = [...percagesCup, ...percagesInserta];
  const percagesCoteGauche = coteCible === 'gauche' ? percagesEmbase : [];
  const percagesCoteDroit = coteCible === 'droit' ? percagesEmbase : [];

  // Statistiques
  const nombreCups = percagesCup.length;
  const nombreInserta = percagesInserta.length;
  const nombreEmbases = percagesEmbase.length;

  return {
    config: {
      hauteurFacade: dimensionsFacade.hauteur,
      largeurFacade: dimensionsFacade.largeur,
      profondeurCote: config.profondeur,
      hauteurCote: config.hauteur,
      positionCharniere: config.positionCharniere,
      typeEmbase,
      nombreCharnieres,
    },
    positionsY,
    percages: {
      facade: percagesFacade,
      coteGauche: percagesCoteGauche,
      coteDroit: percagesCoteDroit,
    },
    stats: {
      nombreTotalPercages: nombreCups + nombreInserta + nombreEmbases,
      nombreCups,
      nombreInserta,
      nombreEmbases,
    },
  };
}

// === EXPORT CNC ===

/**
 * Format de coordonnees pour export CNC
 */
export interface CoordonneesCNC {
  panneau: string;
  typePercage: string;
  x: number;
  y: number;
  diametre: number;
  profondeur: number;
  face: string;
}

/**
 * Genere les coordonnees au format CNC (CSV)
 */
export function genererCoordonneesCNC(
  resultat: ResultatPercagesCharnieres,
): CoordonneesCNC[] {
  const coordonnees: CoordonneesCNC[] = [];

  const tousPercages = [
    ...resultat.percages.facade,
    ...resultat.percages.coteGauche,
    ...resultat.percages.coteDroit,
  ];

  tousPercages.forEach((percage) => {
    coordonnees.push({
      panneau: percage.panneau,
      typePercage: percage.type,
      x: Math.round(percage.x * 100) / 100,  // Arrondir a 0.01mm
      y: Math.round(percage.y * 100) / 100,
      diametre: percage.diametre,
      profondeur: percage.profondeur,
      face: percage.face,
    });
  });

  return coordonnees;
}

/**
 * Exporte les coordonnees en format CSV pour CNC
 */
export function exporterCSV(coordonnees: CoordonneesCNC[]): string {
  const header = 'PANNEAU;TYPE;X_MM;Y_MM;DIAMETRE_MM;PROFONDEUR_MM;FACE';
  const lignes = coordonnees.map(
    (c) => `${c.panneau};${c.typePercage};${c.x};${c.y};${c.diametre};${c.profondeur};${c.face}`
  );
  return [header, ...lignes].join('\n');
}

// === VALIDATION ===

/**
 * Valide que les percages ne se chevauchent pas et sont dans les limites du panneau
 */
export function validerPercages(
  percages: PercageAbsolu[],
  largeurPanneau: number,
  hauteurPanneau: number,
): { valide: boolean; erreurs: string[] } {
  const erreurs: string[] = [];

  percages.forEach((percage) => {
    const rayon = percage.diametre / 2;

    // Verifier les limites du panneau
    if (percage.x - rayon < 0) {
      erreurs.push(`${percage.id}: Deborde a gauche (X=${percage.x}mm, rayon=${rayon}mm)`);
    }
    if (percage.x + rayon > largeurPanneau) {
      erreurs.push(`${percage.id}: Deborde a droite (X=${percage.x}mm, largeur=${largeurPanneau}mm)`);
    }
    if (percage.y - rayon < 0) {
      erreurs.push(`${percage.id}: Deborde en bas (Y=${percage.y}mm, rayon=${rayon}mm)`);
    }
    if (percage.y + rayon > hauteurPanneau) {
      erreurs.push(`${percage.id}: Deborde en haut (Y=${percage.y}mm, hauteur=${hauteurPanneau}mm)`);
    }
  });

  // Verifier les chevauchements
  for (let i = 0; i < percages.length; i++) {
    for (let j = i + 1; j < percages.length; j++) {
      const p1 = percages[i];
      const p2 = percages[j];

      if (p1.panneau !== p2.panneau) continue;

      const distance = Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
      );
      const distanceMin = (p1.diametre + p2.diametre) / 2 + 2; // 2mm de marge

      if (distance < distanceMin) {
        erreurs.push(
          `Chevauchement: ${p1.id} et ${p2.id} (distance=${distance.toFixed(1)}mm, min=${distanceMin}mm)`
        );
      }
    }
  }

  return { valide: erreurs.length === 0, erreurs };
}

// === UTILITAIRES DE DEBUG ===

/**
 * Affiche un resume textuel des percages pour debug
 */
export function debugPercages(resultat: ResultatPercagesCharnieres): string {
  const lignes: string[] = [
    '=== RESUME PERCAGES CHARNIERES ===',
    '',
    `Facade: ${resultat.config.largeurFacade} x ${resultat.config.hauteurFacade} mm`,
    `Cote: ${resultat.config.profondeurCote} x ${resultat.config.hauteurCote} mm`,
    `Charnieres: ${resultat.config.nombreCharnieres} (cote ${resultat.config.positionCharniere})`,
    `Embase: ${resultat.config.typeEmbase}`,
    '',
    '--- POSITIONS Y ---',
    ...resultat.positionsY.map((y, i) => `  Charniere ${i + 1}: Y = ${y.toFixed(1)} mm`),
    '',
    '--- PERCAGES FACADE ---',
    ...resultat.percages.facade.map(
      (p) => `  ${p.type}: X=${p.x.toFixed(1)}, Y=${p.y.toFixed(1)}, Ø${p.diametre}mm`
    ),
    '',
  ];

  if (resultat.percages.coteGauche.length > 0) {
    lignes.push('--- PERCAGES COTE GAUCHE ---');
    resultat.percages.coteGauche.forEach((p) => {
      lignes.push(`  ${p.type}: X=${p.x.toFixed(1)}, Y=${p.y.toFixed(1)}, Ø${p.diametre}mm`);
    });
    lignes.push('');
  }

  if (resultat.percages.coteDroit.length > 0) {
    lignes.push('--- PERCAGES COTE DROIT ---');
    resultat.percages.coteDroit.forEach((p) => {
      lignes.push(`  ${p.type}: X=${p.x.toFixed(1)}, Y=${p.y.toFixed(1)}, Ø${p.diametre}mm`);
    });
    lignes.push('');
  }

  lignes.push('--- STATISTIQUES ---');
  lignes.push(`  Total: ${resultat.stats.nombreTotalPercages} percages`);
  lignes.push(`  Cups 35mm: ${resultat.stats.nombreCups}`);
  lignes.push(`  INSERTA 8mm: ${resultat.stats.nombreInserta}`);
  lignes.push(`  Embases: ${resultat.stats.nombreEmbases}`);

  return lignes.join('\n');
}
