/* ================================================
   DRILLING VISUALIZER - Visualisation des perçages
   ================================================ */

import * as THREE from 'three';

/**
 * Visualisateur de perçages
 * Affiche les trous à percer sur les panneaux
 */
export class DrillingVisualizer {
  constructor(scene) {
    this.scene = scene;

    // Groupe contenant tous les visuels de perçage
    this.drillingsGroup = new THREE.Group();
    this.drillingsGroup.name = 'drillings_visualizer';
    this.scene.add(this.drillingsGroup);

    // Map des perçages par caisson
    this.drillingsByCaisson = new Map();

    // Visibilité
    this.isVisible = true;

    // Matériaux
    this.cupHoleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    this.fixingHoleMaterial = new THREE.MeshBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    this.outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2
    });
  }

  /**
   * Affiche les perçages pour un caisson
   */
  showDrillings(caisson, drillings) {
    // Supprimer les anciens perçages pour ce caisson
    this.clearDrillings(caisson.id);

    if (!drillings || drillings.length === 0) return;

    const caissonGroup = new THREE.Group();
    caissonGroup.name = `drillings_caisson_${caisson.id}`;

    // Obtenir les dimensions de la porte
    const door = caisson.panels.door;
    if (!door) return;

    const doorWidth = caisson.config.width - caisson.config.gapLeft - caisson.config.gapRight;
    const doorHeight = caisson.config.height - caisson.config.gapTop - caisson.config.gapBottom;
    const doorThickness = caisson.config.doorThickness;

    drillings.forEach((drilling, index) => {
      const drillGroup = this.createDrillingVisual(drilling);

      // Positionner le perçage sur la porte
      // Le perçage est sur la face arrière de la porte
      const xPos = -doorWidth / 2 + drilling.x;
      const yPos = -doorHeight / 2 + drilling.y;
      const zPos = -doorThickness / 2 - 0.5; // Légèrement en retrait

      drillGroup.position.set(xPos, yPos, zPos);
      caissonGroup.add(drillGroup);
    });

    // Positionner le groupe par rapport au caisson
    const doorWorldPos = new THREE.Vector3();
    door.getWorldPosition(doorWorldPos);

    caissonGroup.position.copy(doorWorldPos);

    this.drillingsGroup.add(caissonGroup);
    this.drillingsByCaisson.set(caisson.id, caissonGroup);
  }

  /**
   * Crée le visuel d'un perçage
   */
  createDrillingVisual(drilling) {
    const group = new THREE.Group();

    const radius = drilling.diameter / 2;
    const depth = drilling.depth || 13;

    // Déterminer le matériau selon le type
    const material = drilling.type === 'CUP_HOLE'
      ? this.cupHoleMaterial.clone()
      : this.fixingHoleMaterial.clone();

    // Créer un cylindre pour représenter le trou
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, 32);
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.z = -depth / 2;
    group.add(cylinder);

    // Ajouter un cercle de contour sur la surface
    const circleGeometry = new THREE.RingGeometry(radius - 1, radius + 1, 32);
    const circle = new THREE.Mesh(circleGeometry, new THREE.MeshBasicMaterial({
      color: drilling.type === 'CUP_HOLE' ? 0xff0000 : 0x0000ff,
      side: THREE.DoubleSide
    }));
    circle.position.z = 0.1;
    group.add(circle);

    // Ligne de contour
    const outlineGeometry = new THREE.BufferGeometry();
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0.2
      ));
    }
    outlineGeometry.setFromPoints(points);
    const outline = new THREE.Line(outlineGeometry, this.outlineMaterial);
    group.add(outline);

    // Croix au centre pour le repérage
    if (drilling.type === 'CUP_HOLE') {
      const crossSize = radius * 0.6;
      const crossMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

      const crossH = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-crossSize, 0, 0.3),
        new THREE.Vector3(crossSize, 0, 0.3)
      ]);
      const crossV = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -crossSize, 0.3),
        new THREE.Vector3(0, crossSize, 0.3)
      ]);

      group.add(new THREE.Line(crossH, crossMaterial));
      group.add(new THREE.Line(crossV, crossMaterial));
    }

    // Label avec le diamètre
    // (Les labels texte nécessitent CSS2DRenderer, on les ajoute plus tard si besoin)

    return group;
  }

  /**
   * Supprime les perçages d'un caisson
   */
  clearDrillings(caissonId) {
    const group = this.drillingsByCaisson.get(caissonId);
    if (group) {
      this.drillingsGroup.remove(group);

      // Dispose des ressources
      group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });

      this.drillingsByCaisson.delete(caissonId);
    }
  }

  /**
   * Met à jour la position des perçages quand le caisson bouge
   */
  updatePosition(caisson) {
    const group = this.drillingsByCaisson.get(caisson.id);
    if (!group) return;

    const door = caisson.panels.door;
    if (!door) return;

    const doorWorldPos = new THREE.Vector3();
    door.getWorldPosition(doorWorldPos);
    group.position.copy(doorWorldPos);
  }

  /**
   * Affiche/masque tous les perçages
   */
  setVisible(visible) {
    this.isVisible = visible;
    this.drillingsGroup.visible = visible;
  }

  /**
   * Bascule la visibilité
   */
  toggleVisibility() {
    this.setVisible(!this.isVisible);
    return this.isVisible;
  }

  /**
   * Supprime tous les perçages
   */
  clearAll() {
    this.drillingsByCaisson.forEach((group, caissonId) => {
      this.clearDrillings(caissonId);
    });
  }

  /**
   * Dispose de toutes les ressources
   */
  dispose() {
    this.clearAll();
    if (this.drillingsGroup.parent) {
      this.drillingsGroup.parent.remove(this.drillingsGroup);
    }
  }
}
