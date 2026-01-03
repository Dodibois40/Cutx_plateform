/* ================================================
   HARDWARE - Classe de base pour la quincaillerie
   ================================================ */

import * as THREE from 'three';

/**
 * Classe de base pour tous les éléments de quincaillerie
 */
export class Hardware {
  constructor(id, type, specs) {
    this.id = id;
    this.type = type;
    this.specs = specs;

    // Groupe Three.js contenant le modèle 3D
    this.group = new THREE.Group();
    this.group.name = `hardware_${type}_${id}`;
    this.group.userData.hardwareId = id;
    this.group.userData.hardwareType = type;
    this.group.userData.type = 'hardware';

    // État
    this.isSelected = false;
    this.isHovered = false;
    this.isAttached = false;

    // Référence au panneau parent (porte, côté, etc.)
    this.parentPanel = null;
    this.parentCaisson = null;

    // Position relative sur le panneau parent
    this.relativePosition = { x: 0, y: 0, z: 0 };

    // Modèle 3D chargé
    this.model = null;
  }

  /**
   * Définit le modèle 3D chargé
   */
  setModel(model) {
    this.model = model;

    // Vider le groupe et ajouter le nouveau modèle
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    this.group.add(model);

    // Appliquer une échelle si nécessaire (les modèles DAE sont souvent en mètres)
    // Les modèles Blum sont généralement en mm, donc pas de conversion nécessaire
  }

  /**
   * Crée un modèle de placeholder (utilisé si le DAE n'est pas chargé)
   */
  createPlaceholder() {
    const geometry = new THREE.BoxGeometry(
      this.specs.dimensions?.width || 50,
      this.specs.dimensions?.height || 45,
      this.specs.dimensions?.depth || 18
    );

    const material = new THREE.MeshStandardMaterial({
      color: this.specs.color || 0xC0C0C0,
      metalness: 0.6,
      roughness: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.type = 'hardware-placeholder';

    // Ajouter des arêtes
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const lineSegments = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(lineSegments);

    this.group.add(mesh);
  }

  /**
   * Attache la quincaillerie à un panneau
   */
  attachTo(panel, caisson, relativePosition) {
    this.parentPanel = panel;
    this.parentCaisson = caisson;
    this.relativePosition = { ...relativePosition };
    this.isAttached = true;

    // Mettre à jour les userData
    this.group.userData.parentPanelName = panel.name;
    this.group.userData.caissonId = caisson.id;

    // Positionner par rapport au panneau
    this.updatePosition();
  }

  /**
   * Détache la quincaillerie de son panneau parent
   */
  detach() {
    this.parentPanel = null;
    this.parentCaisson = null;
    this.isAttached = false;
    this.group.userData.parentPanelName = null;
    this.group.userData.caissonId = null;
  }

  /**
   * Met à jour la position de la quincaillerie par rapport au panneau parent
   */
  updatePosition() {
    if (!this.parentPanel || !this.isAttached) return;

    // Obtenir la position mondiale du panneau
    const panelWorldPos = new THREE.Vector3();
    this.parentPanel.getWorldPosition(panelWorldPos);

    // Calculer la position finale
    this.group.position.set(
      panelWorldPos.x + this.relativePosition.x,
      panelWorldPos.y + this.relativePosition.y,
      panelWorldPos.z + this.relativePosition.z
    );
  }

  /**
   * Marque la quincaillerie comme sélectionnée
   */
  setSelected(selected) {
    this.isSelected = selected;
    this.updateVisualState();
  }

  /**
   * Marque la quincaillerie comme survolée
   */
  setHovered(hovered) {
    this.isHovered = hovered;
    this.updateVisualState();
  }

  /**
   * Met à jour l'état visuel (surbrillance)
   */
  updateVisualState() {
    this.group.traverse((child) => {
      if (child.isMesh && child.material) {
        if (this.isSelected) {
          child.material.emissive = new THREE.Color(0x00ff00);
          child.material.emissiveIntensity = 0.3;
        } else if (this.isHovered) {
          child.material.emissive = new THREE.Color(0x0088ff);
          child.material.emissiveIntensity = 0.2;
        } else {
          child.material.emissive = new THREE.Color(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }

  /**
   * Obtient la bounding box
   */
  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.group);
  }

  /**
   * Dispose les ressources
   */
  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
