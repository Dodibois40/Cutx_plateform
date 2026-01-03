/* ================================================
   SNAPPING - Utilitaires pour l'aimantation à la grille
   ================================================ */

import { SNAP_GRID_SIZE } from '../core/constants.js';

/**
 * Arrondit une position à la grille la plus proche
 * @param {number} value - Valeur à arrondir
 * @param {number} gridSize - Taille de la grille (par défaut SNAP_GRID_SIZE)
 * @returns {number} Valeur arrondie
 */
export function snapToGrid(value, gridSize = SNAP_GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Arrondit un vecteur THREE.Vector3 à la grille
 * @param {THREE.Vector3} vector - Vecteur à arrondir
 * @param {number} gridSize - Taille de la grille
 * @returns {THREE.Vector3} Nouveau vecteur arrondi
 */
export function snapVector3ToGrid(vector, gridSize = SNAP_GRID_SIZE) {
  return {
    x: snapToGrid(vector.x, gridSize),
    y: vector.y, // On ne snap pas Y (hauteur)
    z: snapToGrid(vector.z, gridSize)
  };
}

/**
 * Vérifie si une position est alignée avec la grille
 * @param {number} value - Valeur à vérifier
 * @param {number} gridSize - Taille de la grille
 * @returns {boolean}
 */
export function isSnappedToGrid(value, gridSize = SNAP_GRID_SIZE) {
  return Math.abs(value % gridSize) < 0.01;
}

/**
 * Calcule la distance à la grille la plus proche
 * @param {number} value - Valeur
 * @param {number} gridSize - Taille de la grille
 * @returns {number} Distance à la grille
 */
export function distanceToGrid(value, gridSize = SNAP_GRID_SIZE) {
  const snapped = snapToGrid(value, gridSize);
  return Math.abs(value - snapped);
}
