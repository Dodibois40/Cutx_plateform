/* ================================================
   SELECTION MANAGER - Gestion de la sélection de caissons
   ================================================ */

import * as THREE from 'three';

/**
 * Gestionnaire de sélection
 * Gère la sélection des caissons via raycasting
 */
export class SelectionManager {
  constructor(camera, renderer, caissonManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.caissonManager = caissonManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredCaisson = null;
    this.enabled = true;

    // Événements
    this.onSelectionChange = null; // Callback appelé quand la sélection change
  }

  /**
   * Initialise les événements de sélection
   */
  init() {
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    console.log('✅ SelectionManager initialisé');
  }

  /**
   * Gère le clic de souris
   */
  onClick(event) {
    if (!this.enabled) return;

    this.updateMousePosition(event);
    const intersectedCaisson = this.raycast();

    if (intersectedCaisson) {
      // Sélectionner le caisson cliqué
      this.caissonManager.selectCaisson(intersectedCaisson.id);
    } else {
      // Clic dans le vide : désélectionner tout
      this.caissonManager.deselectAll();
    }

    // Notifier le changement de sélection
    if (this.onSelectionChange) {
      this.onSelectionChange(intersectedCaisson);
    }
  }

  /**
   * Gère le mouvement de souris (pour le hover)
   */
  onMouseMove(event) {
    if (!this.enabled) return;

    this.updateMousePosition(event);
    const intersectedCaisson = this.raycast();

    // Gérer le hover
    if (intersectedCaisson !== this.hoveredCaisson) {
      // Désactiver le hover précédent
      if (this.hoveredCaisson) {
        this.hoveredCaisson.setHovered(false);
      }

      // Activer le nouveau hover (seulement si non sélectionné)
      this.hoveredCaisson = intersectedCaisson;
      if (this.hoveredCaisson && !this.hoveredCaisson.isSelected) {
        this.hoveredCaisson.setHovered(true);
      }
    }
  }

  /**
   * Met à jour la position de la souris en coordonnées normalisées
   */
  updateMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Lance un rayon et retourne le caisson intersecté
   * @returns {Caisson|null}
   */
  raycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allCaissons = this.caissonManager.getAllCaissons();
    const objects = allCaissons.flatMap(c => c.group.children);

    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      // Trouver le caisson à partir de l'objet intersecté
      return this.caissonManager.getCaissonByObject(intersects[0].object);
    }

    return null;
  }

  /**
   * Active/désactive la sélection
   */
  setEnabled(enabled) {
    this.enabled = enabled;

    // Désactiver le hover si désactivé
    if (!enabled && this.hoveredCaisson) {
      this.hoveredCaisson.setHovered(false);
      this.hoveredCaisson = null;
    }
  }

  /**
   * Nettoie les événements
   */
  dispose() {
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
  }
}
