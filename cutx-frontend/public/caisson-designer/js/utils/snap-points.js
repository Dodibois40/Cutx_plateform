/* ================================================
   SNAP POINTS - Points de référence pour snapping
   ================================================ */

import * as THREE from 'three';

/**
 * Types de points de référence
 */
export const SnapPointType = {
  CORNER: 'corner',           // Coin (8 points)
  EDGE_CENTER: 'edge_center', // Centre d'arête (12 points)
  FACE_CENTER: 'face_center'  // Centre de face (6 points)
};

/**
 * Couleurs des points selon le type (comme SketchUp)
 */
export const SnapPointColors = {
  [SnapPointType.CORNER]: 0x00FF00,        // Vert pour les coins
  [SnapPointType.EDGE_CENTER]: 0x00FFFF,   // Cyan pour les centres d'arêtes
  [SnapPointType.FACE_CENTER]: 0xFF0000    // Rouge pour les centres de faces
};

/**
 * Calcule tous les points de référence d'un caisson
 * @param {Caisson} caisson - Le caisson
 * @returns {Array<Object>} Liste des points avec type et position
 */
export function getSnapPoints(caisson) {
  // Utiliser les dimensions réelles du caisson au lieu de la bounding box
  // pour avoir des points précis sur les faces externes
  const config = caisson.config;
  const position = caisson.group.position;

  // Calculer les limites basées sur les dimensions réelles
  const halfWidth = config.width / 2;
  const halfDepth = config.depth / 2;
  const minX = position.x - halfWidth;
  const maxX = position.x + halfWidth;
  const minY = position.y;
  const maxY = position.y + config.height;
  const minZ = position.z - halfDepth;
  const maxZ = position.z + halfDepth;
  const centerX = position.x;
  const centerY = position.y + config.height / 2;
  const centerZ = position.z;

  const points = [];

  // === 8 COINS ===
  points.push(
    // Coins inférieurs
    { type: SnapPointType.CORNER, position: new THREE.Vector3(minX, minY, minZ), name: 'Coin inf. avant gauche' },
    { type: SnapPointType.CORNER, position: new THREE.Vector3(maxX, minY, minZ), name: 'Coin inf. avant droit' },
    { type: SnapPointType.CORNER, position: new THREE.Vector3(minX, minY, maxZ), name: 'Coin inf. arrière gauche' },
    { type: SnapPointType.CORNER, position: new THREE.Vector3(maxX, minY, maxZ), name: 'Coin inf. arrière droit' },
    // Coins supérieurs
    { type: SnapPointType.CORNER, position: new THREE.Vector3(minX, maxY, minZ), name: 'Coin sup. avant gauche' },
    { type: SnapPointType.CORNER, position: new THREE.Vector3(maxX, maxY, minZ), name: 'Coin sup. avant droit' },
    { type: SnapPointType.CORNER, position: new THREE.Vector3(minX, maxY, maxZ), name: 'Coin sup. arrière gauche' },
    { type: SnapPointType.CORNER, position: new THREE.Vector3(maxX, maxY, maxZ), name: 'Coin sup. arrière droit' }
  );

  // === 12 CENTRES D'ARÊTES ===
  // Arêtes inférieures (4)
  points.push(
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(centerX, minY, minZ), name: 'Centre arête avant inf.' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(centerX, minY, maxZ), name: 'Centre arête arrière inf.' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(minX, minY, centerZ), name: 'Centre arête gauche inf.' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(maxX, minY, centerZ), name: 'Centre arête droite inf.' }
  );
  // Arêtes supérieures (4)
  points.push(
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(centerX, maxY, minZ), name: 'Centre arête avant sup.' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(centerX, maxY, maxZ), name: 'Centre arête arrière sup.' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(minX, maxY, centerZ), name: 'Centre arête gauche sup.' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(maxX, maxY, centerZ), name: 'Centre arête droite sup.' }
  );
  // Arêtes verticales (4)
  points.push(
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(minX, centerY, minZ), name: 'Centre arête vert. avant gauche' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(maxX, centerY, minZ), name: 'Centre arête vert. avant droit' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(minX, centerY, maxZ), name: 'Centre arête vert. arrière gauche' },
    { type: SnapPointType.EDGE_CENTER, position: new THREE.Vector3(maxX, centerY, maxZ), name: 'Centre arête vert. arrière droit' }
  );

  // === 6 CENTRES DE FACES ===
  points.push(
    { type: SnapPointType.FACE_CENTER, position: new THREE.Vector3(centerX, minY, centerZ), name: 'Centre face inférieure' },
    { type: SnapPointType.FACE_CENTER, position: new THREE.Vector3(centerX, maxY, centerZ), name: 'Centre face supérieure' },
    { type: SnapPointType.FACE_CENTER, position: new THREE.Vector3(minX, centerY, centerZ), name: 'Centre face gauche' },
    { type: SnapPointType.FACE_CENTER, position: new THREE.Vector3(maxX, centerY, centerZ), name: 'Centre face droite' },
    { type: SnapPointType.FACE_CENTER, position: new THREE.Vector3(centerX, centerY, minZ), name: 'Centre face avant' },
    { type: SnapPointType.FACE_CENTER, position: new THREE.Vector3(centerX, centerY, maxZ), name: 'Centre face arrière' }
  );

  return points;
}

/**
 * Trouve le point de snap le plus proche
 * @param {THREE.Vector3} position - Position de référence
 * @param {Array<Object>} snapPoints - Liste des points de snap
 * @param {number} threshold - Distance maximum pour snapper (en unités 3D)
 * @returns {Object|null} Point le plus proche ou null
 */
export function findClosestSnapPoint(position, snapPoints, threshold = 50) {
  let closestPoint = null;
  let minDistance = threshold;

  snapPoints.forEach(point => {
    // Calculer distance en 2D (X et Z seulement, ignorer Y)
    const distance = Math.sqrt(
      Math.pow(position.x - point.position.x, 2) +
      Math.pow(position.z - point.position.z, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = {
        ...point,
        distance
      };
    }
  });

  return closestPoint;
}

/**
 * Calcule la position ajustée pour snapper deux points
 * @param {THREE.Vector3} currentPosition - Position actuelle du caisson
 * @param {THREE.Vector3} sourcePoint - Point source sur le caisson en mouvement
 * @param {THREE.Vector3} targetPoint - Point cible sur le caisson fixe
 * @returns {THREE.Vector3} Nouvelle position ajustée
 */
export function calculateSnappedPosition(currentPosition, sourcePoint, targetPoint) {
  // Calculer le décalage nécessaire pour aligner les points
  const offset = new THREE.Vector3(
    targetPoint.x - sourcePoint.x,
    0, // Ne pas ajuster Y
    targetPoint.z - sourcePoint.z
  );

  return currentPosition.clone().add(offset);
}
