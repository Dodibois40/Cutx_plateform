/* ================================================
   INTERACTION MANAGER - Gestion des interactions 3D
   Selection de panneaux + Drag & Drop des etageres
   ================================================ */

import * as THREE from 'three';
import { camera, renderer, scene, controls } from './scene-simple.js';

// Configuration
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Plan horizontal pour le drag

// Etat
let caissonRef = null;
let selectedPanel = null;
let hoveredPanel = null;
let isDraggingShelf = false;
let draggedShelf = null;
let dragStartY = 0;
let shelfStartY = 0;

// Detection de clic vs drag (pour ne pas selectionner pendant la rotation camera)
let mouseDownPosition = { x: 0, y: 0 };
let isMouseDown = false;
const CLICK_THRESHOLD = 5; // pixels de mouvement max pour considerer comme un clic

// Ligne de guidage pour le centrage
let centerGuideLine = null;
let isNearCenter = false;

// Callbacks
let onPanelSelect = null;
let onShelfMove = null;

// Materiaux pour le highlight
const highlightMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B9A4B,
  metalness: 0.1,
  roughness: 0.8,
  emissive: 0x8B9A4B,
  emissiveIntensity: 0.3
});

const hoverMaterial = new THREE.MeshStandardMaterial({
  color: 0xC9B896,
  metalness: 0.1,
  roughness: 0.8,
  emissive: 0xC9B896,
  emissiveIntensity: 0.15
});

// Map pour stocker les materiaux originaux
const originalMaterials = new Map();

/**
 * Cree la ligne de guidage pour le centrage vertical
 * Coordonnees: origine au coin arriere-bas-gauche du caisson
 */
function createCenterGuideLine() {
  if (!caissonRef) return;

  const config = caissonRef.config;
  const w = config.width;
  const d = config.depth;
  const h = config.height;
  const t = config.thickness;
  const centerY = h / 2;

  // Supprimer l'ancienne ligne si elle existe
  removeCenterGuideLine();

  // Creer un groupe pour contenir les lignes de guidage
  const guideGroup = new THREE.Group();
  guideGroup.name = 'center-guide-line';

  // Materiau pour les lignes en pointilles
  const material = new THREE.LineDashedMaterial({
    color: 0x8B9A4B,
    dashSize: 15,
    gapSize: 8,
    linewidth: 2,
    transparent: true,
    opacity: 0.9
  });

  // Ligne horizontale traversant le caisson de gauche a droite (axe X)
  // Position: au centre Y, au milieu de la profondeur
  const lineXPoints = [
    new THREE.Vector3(t + 10, centerY, d / 2),
    new THREE.Vector3(w - t - 10, centerY, d / 2)
  ];
  const lineXGeom = new THREE.BufferGeometry().setFromPoints(lineXPoints);
  const lineX = new THREE.Line(lineXGeom, material.clone());
  lineX.computeLineDistances();
  guideGroup.add(lineX);

  // Ligne de profondeur (axe Z) - de l'avant vers l'arriere
  const lineZPoints = [
    new THREE.Vector3(w / 2, centerY, t + 10),
    new THREE.Vector3(w / 2, centerY, d - 10)
  ];
  const lineZGeom = new THREE.BufferGeometry().setFromPoints(lineZPoints);
  const lineZ = new THREE.Line(lineZGeom, material.clone());
  lineZ.computeLineDistances();
  guideGroup.add(lineZ);

  guideGroup.visible = false;
  centerGuideLine = guideGroup;

  // Ajouter au groupe du caisson pour qu'elle suive sa position
  caissonRef.group.add(centerGuideLine);
}

/**
 * Supprime la ligne de guidage
 */
function removeCenterGuideLine() {
  if (centerGuideLine) {
    if (centerGuideLine.parent) {
      centerGuideLine.parent.remove(centerGuideLine);
    }
    // Nettoyer toutes les ressources du groupe
    centerGuideLine.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    centerGuideLine = null;
  }
}

/**
 * Affiche ou masque la ligne de guidage
 */
function showCenterGuide(show) {
  if (centerGuideLine) {
    centerGuideLine.visible = show;

    // Changer la couleur de toutes les lignes du groupe selon si on est snap ou pas
    centerGuideLine.traverse((child) => {
      if (child.material && child.material.color) {
        if (show && isNearCenter) {
          child.material.color.setHex(0x4CAF50); // Vert quand snap
          child.material.opacity = 1;
        } else if (show) {
          child.material.color.setHex(0x8B9A4B); // Olive sinon
          child.material.opacity = 0.7;
        }
      }
    });
  }
}

/**
 * Definit la reference au caisson
 */
export function setCaissonRef(caisson) {
  caissonRef = caisson;
}

/**
 * Definit le callback de selection de panneau
 */
export function setOnPanelSelect(callback) {
  onPanelSelect = callback;
}

/**
 * Definit le callback de deplacement d'etagere
 */
export function setOnShelfMove(callback) {
  onShelfMove = callback;
}

/**
 * Retourne le panneau actuellement selectionne
 */
export function getSelectedPanel() {
  return selectedPanel;
}

/**
 * Deselectionne le panneau actuel
 */
export function deselectPanel() {
  if (selectedPanel) {
    restoreMaterial(selectedPanel);
    selectedPanel = null;
    if (onPanelSelect) {
      onPanelSelect(null);
    }
  }
}

/**
 * Sauvegarde le materiau original d'un mesh
 */
function saveMaterial(mesh) {
  if (!originalMaterials.has(mesh.uuid)) {
    originalMaterials.set(mesh.uuid, mesh.material.clone());
  }
}

/**
 * Restaure le materiau original d'un mesh
 */
function restoreMaterial(mesh) {
  const original = originalMaterials.get(mesh.uuid);
  if (original) {
    mesh.material.dispose();
    mesh.material = original.clone();
  }
}

/**
 * Applique le materiau de selection
 */
function applySelectMaterial(mesh) {
  saveMaterial(mesh);
  const color = mesh.material.color ? mesh.material.color.getHex() : 0xFFFFFF;
  mesh.material = highlightMaterial.clone();
  mesh.material.color.setHex(color);
  mesh.material.emissive.setHex(0x8B9A4B);
  mesh.material.emissiveIntensity = 0.4;
}

/**
 * Applique le materiau de hover
 */
function applyHoverMaterial(mesh) {
  if (mesh === selectedPanel) return;
  saveMaterial(mesh);
  const color = mesh.material.color ? mesh.material.color.getHex() : 0xFFFFFF;
  mesh.material = hoverMaterial.clone();
  mesh.material.color.setHex(color);
  mesh.material.emissive.setHex(0xC9B896);
  mesh.material.emissiveIntensity = 0.2;
}

/**
 * Obtient les objets cliquables du caisson (uniquement les visibles)
 */
function getClickableObjects() {
  if (!caissonRef) return [];

  const clickables = [];

  // Panneaux principaux (seulement les visibles)
  Object.values(caissonRef.panels).forEach(panel => {
    if (panel && panel.visible) clickables.push(panel);
  });

  // Etageres (seulement les visibles)
  caissonRef.shelfMeshes.forEach(shelf => {
    if (shelf && shelf.visible) clickables.push(shelf);
  });

  return clickables;
}

/**
 * Detecte l'objet sous la souris (uniquement les objets visibles)
 */
function getIntersectedObject(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const clickables = getClickableObjects();
  const intersects = raycaster.intersectObjects(clickables, false);

  // Filtrer pour ne garder que les objets visibles
  for (const intersect of intersects) {
    if (intersect.object.visible) {
      return intersect.object;
    }
  }
  return null;
}

/**
 * Gere le mousedown sur la scene
 */
function onMouseDown(event) {
  // Ignorer si ce n'est pas un clic gauche
  if (event.button !== 0) return;

  // Ignorer si Alt est enfonce (rotation camera)
  if (event.altKey) return;

  // Enregistrer la position de depart pour detecter clic vs drag
  mouseDownPosition.x = event.clientX;
  mouseDownPosition.y = event.clientY;
  isMouseDown = true;

  const intersected = getIntersectedObject(event);

  // Si c'est une etagere, demarrer le drag immediatement
  if (intersected && intersected.userData.type === 'shelf') {
    isDraggingShelf = true;
    draggedShelf = intersected;
    dragStartY = event.clientY;
    shelfStartY = caissonRef.config.shelves[intersected.userData.shelfIndex].positionY;

    // Desactiver les controles de camera pendant le drag
    controls.enabled = false;

    // Changer le curseur
    renderer.domElement.style.cursor = 'ns-resize';

    // Creer et afficher la ligne de guidage
    createCenterGuideLine();
    showCenterGuide(true);

    // Selectionner aussi l'etagere visuellement
    if (selectedPanel !== intersected) {
      deselectPanel();
      selectedPanel = intersected;
      applySelectMaterial(intersected);
      if (onPanelSelect) {
        onPanelSelect({
          type: 'shelf',
          name: intersected.name,
          index: intersected.userData.shelfIndex,
          mesh: intersected
        });
      }
    }
  }
}

/**
 * Verifie si le mouvement de souris est un simple clic
 */
function isClick(event) {
  const dx = Math.abs(event.clientX - mouseDownPosition.x);
  const dy = Math.abs(event.clientY - mouseDownPosition.y);
  return dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD;
}

/**
 * Gere le deplacement de la souris
 */
function onMouseMove(event) {
  // Gestion du drag d'etagere
  if (isDraggingShelf && draggedShelf) {
    const deltaY = dragStartY - event.clientY;
    const sensitivity = 1.5; // Ajuster la sensibilite
    let newPositionY = shelfStartY + deltaY * sensitivity;

    // Limites
    const t = caissonRef.config.thickness;
    const h = caissonRef.config.height;
    const shelfT = caissonRef.config.shelves[draggedShelf.userData.shelfIndex].thickness;
    const minY = t + 10;
    const maxY = h - t - shelfT - 10;

    // Snap au centre (si proche du milieu)
    const centerY = h / 2;
    const snapThreshold = 20;
    const wasNearCenter = isNearCenter;
    isNearCenter = Math.abs(newPositionY - centerY) < snapThreshold;

    if (isNearCenter) {
      newPositionY = centerY;
      renderer.domElement.style.cursor = 'crosshair'; // Indicateur de snap
    } else {
      renderer.domElement.style.cursor = 'ns-resize';
    }

    // Mettre a jour la ligne de guidage si l'etat change
    if (wasNearCenter !== isNearCenter) {
      showCenterGuide(true);
    }

    newPositionY = Math.max(minY, Math.min(maxY, newPositionY));

    // Mettre a jour la position
    caissonRef.updateShelfPosition(draggedShelf.userData.shelfIndex, newPositionY);

    // Callback
    if (onShelfMove) {
      onShelfMove(draggedShelf.userData.shelfIndex, newPositionY);
    }

    return;
  }

  // Gestion du hover
  const intersected = getIntersectedObject(event);

  if (intersected !== hoveredPanel) {
    // Restaurer l'ancien hover
    if (hoveredPanel && hoveredPanel !== selectedPanel) {
      restoreMaterial(hoveredPanel);
    }

    hoveredPanel = intersected;

    // Appliquer le nouveau hover
    if (hoveredPanel && hoveredPanel !== selectedPanel) {
      applyHoverMaterial(hoveredPanel);
      renderer.domElement.style.cursor = 'pointer';
    } else if (!hoveredPanel) {
      renderer.domElement.style.cursor = 'default';
    }
  }
}

/**
 * Gere le relachement du clic
 */
function onMouseUp(event) {
  // Fin du drag d'etagere
  if (isDraggingShelf) {
    isDraggingShelf = false;
    draggedShelf = null;
    controls.enabled = true;
    renderer.domElement.style.cursor = hoveredPanel ? 'pointer' : 'default';

    // Masquer et supprimer la ligne de guidage
    showCenterGuide(false);
    removeCenterGuideLine();
    isNearCenter = false;
  }

  // Detection de clic simple (pas de mouvement significatif)
  // Ignorer si Alt etait enfonce (rotation camera)
  if (isMouseDown && isClick(event) && event.button === 0 && !event.altKey) {
    const intersected = getIntersectedObject(event);

    if (intersected) {
      // Ne pas re-selectionner si deja selectionne
      if (selectedPanel !== intersected) {
        deselectPanel();
        selectedPanel = intersected;
        applySelectMaterial(intersected);

        if (onPanelSelect) {
          if (intersected.userData.type === 'shelf') {
            onPanelSelect({
              type: 'shelf',
              name: intersected.name,
              index: intersected.userData.shelfIndex,
              mesh: intersected
            });
          } else {
            onPanelSelect({
              type: 'panel',
              name: intersected.name,
              mesh: intersected
            });
          }
        }
      }
    } else {
      // Clic dans le vide - deselectionner
      deselectPanel();
    }
  }

  isMouseDown = false;
}

/**
 * Gere la sortie de la souris du canvas
 */
function onMouseLeave(event) {
  if (isDraggingShelf) {
    isDraggingShelf = false;
    draggedShelf = null;
    controls.enabled = true;

    // Nettoyer la ligne de guidage
    showCenterGuide(false);
    removeCenterGuideLine();
    isNearCenter = false;
  }
  isMouseDown = false;
  renderer.domElement.style.cursor = 'default';
}

/**
 * Initialise le gestionnaire d'interactions
 */
export function initInteractionManager() {
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mouseleave', onMouseLeave);

  // Echap pour deselectionner
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      deselectPanel();
    }
  });

  console.log('✅ Gestionnaire d\'interactions initialise');
}

/**
 * Rafraichit l'etat apres reconstruction du caisson
 */
export function refreshInteractionState() {
  // Nettoyer les materiaux sauvegardes obsoletes
  originalMaterials.clear();

  // Reinitialiser la selection si le mesh n'existe plus
  if (selectedPanel) {
    const stillExists = getClickableObjects().includes(selectedPanel);
    if (!stillExists) {
      selectedPanel = null;
      if (onPanelSelect) {
        onPanelSelect(null);
      }
    }
  }
}
