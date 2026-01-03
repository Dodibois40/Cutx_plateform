/* ================================================
   COLLISION - Utilitaires pour la détection de collision
   ================================================ */

import * as THREE from 'three';
import { MIN_CAISSON_SPACING } from '../core/constants.js';

/**
 * Vérifie si deux bounding boxes entrent en collision
 * @param {THREE.Box3} box1 - Première box
 * @param {THREE.Box3} box2 - Deuxième box
 * @param {number} spacing - Espacement minimum (optionnel)
 * @returns {boolean}
 */
export function checkBoxCollision(box1, box2, spacing = 0) {
  if (spacing > 0) {
    // Agrandir les boxes pour inclure l'espacement
    const expandedBox1 = box1.clone();
    const expandedBox2 = box2.clone();
    expandedBox1.expandByScalar(spacing / 2);
    expandedBox2.expandByScalar(spacing / 2);
    return expandedBox1.intersectsBox(expandedBox2);
  }
  return box1.intersectsBox(box2);
}

/**
 * Vérifie si un caisson entre en collision avec une liste de caissons
 * @param {Caisson} caisson - Caisson à vérifier
 * @param {Array<Caisson>} otherCaissons - Liste des autres caissons
 * @param {number} spacing - Espacement minimum
 * @returns {boolean}
 */
export function checkCaissonCollision(caisson, otherCaissons, spacing = MIN_CAISSON_SPACING) {
  const box1 = caisson.getBoundingBox();

  for (const other of otherCaissons) {
    if (other.id === caisson.id) continue;

    const box2 = other.getBoundingBox();
    if (checkBoxCollision(box1, box2, spacing)) {
      return true;
    }
  }

  return false;
}

/**
 * Trouve le caisson le plus proche en collision
 * @param {Caisson} caisson - Caisson à vérifier
 * @param {Array<Caisson>} otherCaissons - Liste des autres caissons
 * @returns {Caisson|null} Caisson en collision ou null
 */
export function findCollidingCaisson(caisson, otherCaissons) {
  const box1 = caisson.getBoundingBox();

  for (const other of otherCaissons) {
    if (other.id === caisson.id) continue;

    const box2 = other.getBoundingBox();
    if (checkBoxCollision(box1, box2, MIN_CAISSON_SPACING)) {
      return other;
    }
  }

  return null;
}

/**
 * Calcule une position valide sans collision
 * @param {Caisson} caisson - Caisson à positionner
 * @param {THREE.Vector3} targetPosition - Position cible
 * @param {Array<Caisson>} otherCaissons - Liste des autres caissons
 * @returns {THREE.Vector3} Position valide
 */
export function findValidPosition(caisson, targetPosition, otherCaissons) {
  // Sauvegarder la position actuelle
  const originalPosition = caisson.group.position.clone();

  // Essayer la position cible
  caisson.group.position.copy(targetPosition);

  if (!checkCaissonCollision(caisson, otherCaissons)) {
    // Position valide
    return targetPosition.clone();
  }

  // Position invalide, chercher une position proche
  const searchRadius = 100;
  const searchStep = 50;

  for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX += searchStep) {
    for (let offsetZ = -searchRadius; offsetZ <= searchRadius; offsetZ += searchStep) {
      const testPosition = new THREE.Vector3(
        targetPosition.x + offsetX,
        targetPosition.y,
        targetPosition.z + offsetZ
      );

      caisson.group.position.copy(testPosition);

      if (!checkCaissonCollision(caisson, otherCaissons)) {
        return testPosition.clone();
      }
    }
  }

  // Aucune position valide trouvée, retourner la position originale
  caisson.group.position.copy(originalPosition);
  return originalPosition;
}

/**
 * Vérifie si un point est à l'intérieur d'une bounding box
 * @param {THREE.Vector3} point - Point à vérifier
 * @param {THREE.Box3} box - Bounding box
 * @returns {boolean}
 */
export function isPointInBox(point, box) {
  return box.containsPoint(point);
}
