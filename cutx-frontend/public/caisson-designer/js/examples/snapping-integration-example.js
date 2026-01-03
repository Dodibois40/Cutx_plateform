/* ================================================
   EXEMPLE D'INTÉGRATION - SnappingManager
   Montre comment intégrer le snapping dans votre viewer
   ================================================ */

import * as THREE from 'three';
import { SnappingManager, SnapType, SnapColors } from '../managers/SnappingManager.js';

/**
 * Exemple d'intégration du SnappingManager
 * Copiez et adaptez ce code dans votre application
 */
export function initSnappingExample(scene, camera, renderer, controls) {
  // 1. Créer le SnappingManager
  const snappingManager = new SnappingManager(scene, camera, renderer);

  // 2. Variables pour le déplacement
  const mouse = new THREE.Vector2();
  let selectedObject = null;
  let isDragging = false;
  let dragOffset = new THREE.Vector3();

  // 3. Collecter les meshes de la scène
  function updateTargetMeshes() {
    const meshes = [];
    scene.traverse((child) => {
      if (child.isMesh && child.name !== 'snap-marker') {
        meshes.push(child);
      }
    });
    snappingManager.setObjects(meshes);
  }

  // 4. Gestion des événements souris
  function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Mettre à jour le snapping
    const snap = snappingManager.update(mouse, camera);

    // Si on drag un objet
    if (isDragging && selectedObject && snap) {
      // Appliquer la position snappée moins l'offset
      const newPosition = snap.position.clone().sub(dragOffset);
      selectedObject.position.copy(newPosition);
    }

    // Afficher l'info de debug
    updateDebugInfo(snap);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;

    const snap = snappingManager.getCurrentSnap();

    if (snap && snap.mesh) {
      // Sélectionner l'objet
      selectedObject = snap.mesh;
      isDragging = true;

      // Calculer l'offset entre le point cliqué et le centre de l'objet
      dragOffset.copy(snap.position).sub(selectedObject.position);

      // Définir le point de départ pour la ligne d'inférence
      snappingManager.setDragStart(snap.position);

      // Désactiver les contrôles de caméra
      if (controls) controls.enabled = false;

      // Changer le curseur
      renderer.domElement.style.cursor = 'grabbing';
    }
  }

  function onMouseUp(event) {
    if (isDragging) {
      isDragging = false;
      selectedObject = null;

      // Effacer la ligne d'inférence
      snappingManager.clearDragStart();

      // Réactiver les contrôles de caméra
      if (controls) controls.enabled = true;

      // Restaurer le curseur
      renderer.domElement.style.cursor = 'default';
    }
  }

  // 5. Affichage de debug
  function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'snap-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 250px;
    `;
    panel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #4CAF50;">
        🎯 Snapping Debug
      </div>
      <div id="snap-type">Type: -</div>
      <div id="snap-position">Position: -</div>
      <div id="snap-distance">Distance: -</div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function updateDebugInfo(snap) {
    const typeEl = document.getElementById('snap-type');
    const posEl = document.getElementById('snap-position');
    const distEl = document.getElementById('snap-distance');

    if (!typeEl) return;

    if (snap) {
      const color = SnapColors[snap.type];
      const colorHex = '#' + color.toString(16).padStart(6, '0');

      typeEl.innerHTML = `Type: <span style="color: ${colorHex}; font-weight: bold;">${snap.type}</span>`;
      posEl.textContent = `Position: (${snap.position.x.toFixed(1)}, ${snap.position.y.toFixed(1)}, ${snap.position.z.toFixed(1)})`;
      distEl.textContent = `Distance: ${snap.distance.toFixed(1)} px`;
    } else {
      typeEl.textContent = 'Type: -';
      posEl.textContent = 'Position: -';
      distEl.textContent = 'Distance: -';
    }
  }

  // 6. Initialisation
  createDebugPanel();
  updateTargetMeshes();

  // Ajouter les événements
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mouseup', onMouseUp);

  // 7. API publique
  return {
    snappingManager,

    // Mettre à jour les cibles après ajout/suppression d'objets
    refreshTargets: updateTargetMeshes,

    // Activer/désactiver
    setEnabled: (enabled) => snappingManager.setEnabled(enabled),

    // Changer le seuil en pixels
    setThreshold: (pixels) => snappingManager.setPixelThreshold(pixels),

    // Nettoyer
    dispose: () => {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      snappingManager.dispose();

      const panel = document.getElementById('snap-debug-panel');
      if (panel) panel.remove();
    }
  };
}

/**
 * Légende des couleurs de snap
 */
export const SNAP_LEGEND = `
╔════════════════════════════════════════════════╗
║         SNAPPING - GUIDE DES COULEURS          ║
╠════════════════════════════════════════════════╣
║  🟢 VERT   (VERTEX)   - Sommet / Extrémité     ║
║  🔵 CYAN   (MIDPOINT) - Milieu d'arête         ║
║  🔴 ROUGE  (EDGE)     - Sur une arête          ║
║  🔷 BLEU   (FACE)     - Sur une face           ║
╚════════════════════════════════════════════════╝
`;
