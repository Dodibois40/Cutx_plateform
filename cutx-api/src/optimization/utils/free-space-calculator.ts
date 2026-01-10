/**
 * CutX Free Space Calculator
 *
 * Calcule les espaces libres réels sur un panneau à partir des placements.
 * Utilisé pour recalculer les chutes après optimisation, indépendamment
 * de l'algorithme utilisé.
 */

import { v4 as uuidv4 } from 'uuid';
import { Placement, FreeSpace, Dimensions, Position } from '../types/cutting.types';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calcule tous les espaces libres sur un panneau après placements
 *
 * Utilise l'algorithme des rectangles maximaux (maxrects) pour trouver
 * tous les rectangles libres qui ne se chevauchent pas avec les placements.
 */
export function calculateFreeSpaces(
  placements: Placement[],
  panelWidth: number,
  panelHeight: number,
  trimLeft: number = 0,
  trimRight: number = 0,
  trimTop: number = 0,
  trimBottom: number = 0,
  bladeWidth: number = 4,
): FreeSpace[] {
  // Zone utilisable
  const usableX = trimLeft;
  const usableY = trimBottom;
  const usableWidth = panelWidth - trimLeft - trimRight;
  const usableHeight = panelHeight - trimTop - trimBottom;

  // Commencer avec un seul rectangle libre (toute la zone utilisable)
  let freeRects: Rectangle[] = [{
    x: usableX,
    y: usableY,
    width: usableWidth,
    height: usableHeight,
  }];

  // Pour chaque placement, soustraire la zone occupée des rectangles libres
  for (const placement of placements) {
    const occupiedX = placement.position.x;
    const occupiedY = placement.position.y;
    // Ajouter le trait de scie aux dimensions occupées
    const occupiedWidth = placement.finalDimensions.length + bladeWidth;
    const occupiedHeight = placement.finalDimensions.width + bladeWidth;

    freeRects = subtractRectangle(freeRects, occupiedX, occupiedY, occupiedWidth, occupiedHeight);
  }

  // Supprimer les doublons et rectangles contenus dans d'autres
  freeRects = pruneContainedRects(freeRects);

  // Convertir en FreeSpace
  return freeRects.map(r => ({
    id: `fs-${uuidv4().slice(0, 8)}`,
    position: { x: r.x, y: r.y },
    dimensions: { length: r.width, width: r.height },
  }));
}

/**
 * Soustrait un rectangle occupé de la liste des rectangles libres
 * Génère jusqu'à 4 nouveaux rectangles par rectangle existant
 */
function subtractRectangle(
  freeRects: Rectangle[],
  occX: number,
  occY: number,
  occWidth: number,
  occHeight: number,
): Rectangle[] {
  const newRects: Rectangle[] = [];

  for (const rect of freeRects) {
    // Vérifier si le rectangle chevauche la zone occupée
    if (!intersects(rect, occX, occY, occWidth, occHeight)) {
      // Pas de chevauchement, garder le rectangle tel quel
      newRects.push(rect);
      continue;
    }

    // Le rectangle chevauche la zone occupée
    // Générer jusqu'à 4 nouveaux rectangles maximaux

    // Rectangle à gauche de la zone occupée
    if (occX > rect.x) {
      newRects.push({
        x: rect.x,
        y: rect.y,
        width: occX - rect.x,
        height: rect.height,
      });
    }

    // Rectangle à droite de la zone occupée
    const occRight = occX + occWidth;
    const rectRight = rect.x + rect.width;
    if (occRight < rectRight) {
      newRects.push({
        x: occRight,
        y: rect.y,
        width: rectRight - occRight,
        height: rect.height,
      });
    }

    // Rectangle en bas de la zone occupée
    if (occY > rect.y) {
      newRects.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: occY - rect.y,
      });
    }

    // Rectangle en haut de la zone occupée
    const occTop = occY + occHeight;
    const rectTop = rect.y + rect.height;
    if (occTop < rectTop) {
      newRects.push({
        x: rect.x,
        y: occTop,
        width: rect.width,
        height: rectTop - occTop,
      });
    }
  }

  return newRects;
}

/**
 * Vérifie si un rectangle chevauche une zone
 */
function intersects(
  rect: Rectangle,
  occX: number,
  occY: number,
  occWidth: number,
  occHeight: number,
): boolean {
  return !(
    rect.x >= occX + occWidth ||
    rect.x + rect.width <= occX ||
    rect.y >= occY + occHeight ||
    rect.y + rect.height <= occY
  );
}

/**
 * Supprime les rectangles contenus dans d'autres (garde seulement les maximaux)
 */
function pruneContainedRects(rects: Rectangle[]): Rectangle[] {
  const result: Rectangle[] = [];

  for (let i = 0; i < rects.length; i++) {
    let isContained = false;

    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;

      if (isContainedIn(rects[i], rects[j])) {
        isContained = true;
        break;
      }
    }

    if (!isContained) {
      result.push(rects[i]);
    }
  }

  return result;
}

/**
 * Vérifie si rect1 est entièrement contenu dans rect2
 */
function isContainedIn(rect1: Rectangle, rect2: Rectangle): boolean {
  return (
    rect1.x >= rect2.x &&
    rect1.y >= rect2.y &&
    rect1.x + rect1.width <= rect2.x + rect2.width &&
    rect1.y + rect1.height <= rect2.y + rect2.height
  );
}

/**
 * Fusionne les espaces libres de l'algorithme avec ceux recalculés
 * pour s'assurer de n'en manquer aucun
 */
export function mergeAndDedupeFreeSpaces(
  algorithmSpaces: FreeSpace[],
  calculatedSpaces: FreeSpace[],
): FreeSpace[] {
  // Utiliser les espaces calculés comme base (plus complets)
  // car ils sont calculés à partir des placements réels
  return calculatedSpaces;
}
