/* ================================================
   CAISSON - Création et gestion du caisson 3D
   ================================================ */

import * as THREE from 'three';
import { config, panelRefs, explodeDistance, setDoorMesh } from './config.js';
import { caissonGroup } from './scene.js';

/**
 * Crée un panneau 3D avec des arêtes
 */
export function createPanel(width, height, depth, color) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.1,
    roughness: 0.8
  });
  const panel = new THREE.Mesh(geometry, material);

  // Ajouter des arêtes noires (comme dans SketchUp)
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1
  });
  const lineSegments = new THREE.LineSegments(edges, lineMaterial);
  panel.add(lineSegments);

  return panel;
}

/**
 * Construit le caisson 3D complet
 */
export function buildCaisson() {
  // Vider le groupe existant
  while (caissonGroup.children.length > 0) {
    caissonGroup.remove(caissonGroup.children[0]);
  }

  const w = config.width;
  const h = config.height;
  const d = config.depth;
  const t = config.thickness;
  const colorCaisson = config.colorCaisson;
  const colorDoor = config.colorDoor;

  // Panneau inférieur
  const bottom = createPanel(w, t, d, colorCaisson);
  bottom.name = 'inferior';
  bottom.position.set(0, t / 2, 0);
  bottom.userData.basePosition = new THREE.Vector3(0, t / 2, 0);
  bottom.userData.explodedPosition = new THREE.Vector3(0, t / 2 - explodeDistance, 0);
  caissonGroup.add(bottom);
  panelRefs.bottom = bottom;

  // Panneau supérieur
  const top = createPanel(w, t, d, colorCaisson);
  top.name = 'superior';
  top.position.set(0, h - t / 2, 0);
  top.userData.basePosition = new THREE.Vector3(0, h - t / 2, 0);
  top.userData.explodedPosition = new THREE.Vector3(0, h - t / 2 + explodeDistance, 0);
  caissonGroup.add(top);
  panelRefs.top = top;

  // Côté gauche
  const left = createPanel(t, h - 2 * t, d, colorCaisson);
  left.name = 'left';
  left.position.set(-w / 2 + t / 2, h / 2, 0);
  left.userData.basePosition = new THREE.Vector3(-w / 2 + t / 2, h / 2, 0);
  left.userData.explodedPosition = new THREE.Vector3(-w / 2 + t / 2 - explodeDistance, h / 2, 0);
  caissonGroup.add(left);
  panelRefs.left = left;

  // Côté droit
  const right = createPanel(t, h - 2 * t, d, colorCaisson);
  right.name = 'right';
  right.position.set(w / 2 - t / 2, h / 2, 0);
  right.userData.basePosition = new THREE.Vector3(w / 2 - t / 2, h / 2, 0);
  right.userData.explodedPosition = new THREE.Vector3(w / 2 - t / 2 + explodeDistance, h / 2, 0);
  caissonGroup.add(right);
  panelRefs.right = right;

  // Dos
  const back = createPanel(w - 2 * t, h - 2 * t, t, colorCaisson);
  back.name = 'back';
  back.position.set(0, h / 2, -d / 2 + t / 2);
  back.userData.basePosition = new THREE.Vector3(0, h / 2, -d / 2 + t / 2);
  back.userData.explodedPosition = new THREE.Vector3(0, h / 2, -d / 2 + t / 2 - explodeDistance);
  caissonGroup.add(back);
  panelRefs.back = back;

  // Porte (panneau avant)
  const doorWidth = w - config.gapLeft - config.gapRight;
  const doorHeight = h - config.gapTop - config.gapBottom;
  const doorT = config.doorThickness;
  const door = createPanel(doorWidth, doorHeight, doorT, colorDoor);
  door.name = 'door';

  const doorX = (config.gapRight - config.gapLeft) / 2;
  const doorCenterY = config.gapBottom + doorHeight / 2;
  const doorZ = d / 2 + config.doorOffset + doorT / 2;

  door.position.set(doorX, doorCenterY, doorZ);
  door.userData.basePosition = new THREE.Vector3(doorX, doorCenterY, doorZ);
  door.userData.explodedPosition = new THREE.Vector3(doorX, doorCenterY, doorZ + explodeDistance);
  door.visible = config.showDoor;
  caissonGroup.add(door);

  setDoorMesh(door);
  panelRefs.door = door;

  // Centrer le caisson
  caissonGroup.position.y = -h / 2;
}

/**
 * Bascule entre vue standard et vue éclatée
 */
export function toggleExplode() {
  config.isExploded = !config.isExploded;

  const btn = document.getElementById('explode-btn');
  if (config.isExploded) {
    btn.innerHTML = '<span id="explode-icon">💥</span> Vue Éclatée';
    btn.classList.add('exploded');
  } else {
    btn.innerHTML = '<span id="explode-icon">🔲</span> Vue Standard';
    btn.classList.remove('exploded');
  }
}
