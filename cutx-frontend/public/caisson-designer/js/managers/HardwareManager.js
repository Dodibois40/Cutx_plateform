/* ================================================
   HARDWARE MANAGER - Gestion de la quincaillerie
   ================================================ */

import * as THREE from 'three';
import { HINGE_SPECS, DEFAULT_HINGE_CONFIG, HINGE_PLACEMENT_RULES } from '../config/hardware-specs.js';

/**
 * Gestionnaire de quincaillerie
 */
export class HardwareManager {
  constructor(scene, caissonManager) {
    this.scene = scene;
    this.caissonManager = caissonManager;

    // Conteneur pour tous les éléments de quincaillerie
    this.hardwareGroup = new THREE.Group();
    this.hardwareGroup.name = 'hardware_container';
    this.scene.add(this.hardwareGroup);

    // Liste des quincailleries par caisson
    this.hardwareByCaisson = new Map();

    // Compteur d'ID
    this.nextId = 1;

    // Configuration actuelle
    this.currentConfig = { ...DEFAULT_HINGE_CONFIG };

    // Callbacks
    this.onHardwareAdded = null;
    this.onHardwareRemoved = null;
  }

  init() {
    console.log('✅ HardwareManager initialisé');
  }

  /**
   * Crée un modèle de charnière 3D - GROS et ROUGE pour être bien visible
   */
  createHingeModel() {
    const hingeGroup = new THREE.Group();

    // Matériau ROUGE VISIBLE
    const redMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF0000,  // ROUGE VIF
      metalness: 0.3,
      roughness: 0.5
    });

    // GROS cylindre rouge pour le cup (Ø35 = 17.5 rayon)
    const cupGeometry = new THREE.CylinderGeometry(20, 20, 15, 32);
    const cup = new THREE.Mesh(cupGeometry, redMaterial.clone());
    cup.rotation.x = Math.PI / 2;
    cup.position.set(0, 0, 0);
    hingeGroup.add(cup);

    // Bras de la charnière - GROS et BLEU
    const blueMaterial = new THREE.MeshStandardMaterial({
      color: 0x0000FF,  // BLEU VIF
      metalness: 0.3,
      roughness: 0.5
    });
    const armGeometry = new THREE.BoxGeometry(60, 20, 80);
    const arm = new THREE.Mesh(armGeometry, blueMaterial);
    arm.position.set(0, 0, 50);
    hingeGroup.add(arm);

    // Ajouter des arêtes noires pour mieux voir
    hingeGroup.traverse((child) => {
      if (child.isMesh) {
        const edges = new THREE.EdgesGeometry(child.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        child.add(lineSegments);
      }
    });

    console.log('🔴 Modèle de charnière créé (rouge/bleu)');
    return hingeGroup;
  }

  /**
   * Ajoute des charnières à un caisson
   */
  addHingesToCaisson(caissonId, config = null) {
    const caisson = this.caissonManager.getCaisson(caissonId);
    if (!caisson) {
      console.error(`Caisson ${caissonId} non trouvé`);
      return null;
    }

    const hingeConfig = config || { ...this.currentConfig };
    const door = caisson.panels.door;

    if (!door || !door.visible) {
      console.warn('Pas de porte visible sur ce caisson');
      return null;
    }

    // Supprimer les anciennes charnières
    this.removeHingesFromCaisson(caissonId);

    // Initialiser le stockage
    if (!this.hardwareByCaisson.has(caissonId)) {
      this.hardwareByCaisson.set(caissonId, { hinges: [], drillings: [] });
    }

    const caissonHardware = this.hardwareByCaisson.get(caissonId);

    // Dimensions
    const doorHeight = caisson.config.height - caisson.config.gapTop - caisson.config.gapBottom;
    const doorWidth = caisson.config.width - caisson.config.gapLeft - caisson.config.gapRight;
    const doorThickness = caisson.config.doorThickness;

    // Calculer les positions Y des charnières
    const positions = HINGE_PLACEMENT_RULES.getRecommendedPositions(doorHeight, hingeConfig.count);

    const hinges = [];
    const drillings = [];

    // Position de base de la porte dans le monde
    const doorWorldPos = new THREE.Vector3();
    door.getWorldPosition(doorWorldPos);

    console.log('📍 Position porte:', doorWorldPos);
    console.log('📏 Dimensions porte:', { doorWidth, doorHeight, doorThickness });

    positions.forEach((yPos, index) => {
      // Créer le modèle 3D de charnière
      const hingeModel = this.createHingeModel();
      hingeModel.name = `hinge_${this.nextId}`;

      // Position LOCALE par rapport à la porte
      // X: côté gauche de la porte + distance du chant
      // Y: position depuis le centre de la porte
      // Z: face arrière de la porte

      const localX = -doorWidth / 2 + hingeConfig.distanceFromEdge;
      const localY = -doorHeight / 2 + yPos;
      const localZ = -doorThickness / 2 - 10; // Légèrement derrière la porte

      hingeModel.position.set(localX, localY, localZ);

      // Rotation pour orientation correcte (charnière orientée vers l'intérieur)
      hingeModel.rotation.y = -Math.PI / 2;

      // Ajouter comme enfant de la porte (pas de la scène)
      door.add(hingeModel);

      console.log(`📍 Charnière ${index + 1}: local(${localX.toFixed(0)}, ${localY.toFixed(0)}, ${localZ.toFixed(0)})`);


      hinges.push({
        id: this.nextId++,
        model: hingeModel,
        yPosition: yPos,
        distanceFromEdge: hingeConfig.distanceFromEdge
      });

      // Générer les perçages
      drillings.push({
        type: 'CUP_HOLE',
        diameter: 35,
        depth: 13,
        x: hingeConfig.distanceFromEdge,
        y: yPos,
        side: 'left'
      });

      // Trous de fixation
      drillings.push({
        type: 'FIXING_HOLE',
        diameter: 8,
        depth: 12,
        x: hingeConfig.distanceFromEdge,
        y: yPos - 22.75,
        side: 'left'
      });

      drillings.push({
        type: 'FIXING_HOLE',
        diameter: 8,
        depth: 12,
        x: hingeConfig.distanceFromEdge,
        y: yPos + 22.75,
        side: 'left'
      });

      console.log(`🔩 Charnière ${index + 1} ajoutée à Y=${yPos.toFixed(0)}mm`);
    });

    caissonHardware.hinges = hinges;
    caissonHardware.drillings = drillings;

    // Callback
    if (this.onHardwareAdded) {
      this.onHardwareAdded(caissonId, hinges);
    }

    console.log(`✅ ${hinges.length} charnières ajoutées au caisson ${caissonId}`);
    return hinges;
  }

  /**
   * Supprime les charnières d'un caisson
   */
  removeHingesFromCaisson(caissonId) {
    const caissonHardware = this.hardwareByCaisson.get(caissonId);
    if (!caissonHardware || !caissonHardware.hinges) return;

    const caisson = this.caissonManager.getCaisson(caissonId);
    const door = caisson?.panels?.door;

    caissonHardware.hinges.forEach(hinge => {
      // Retirer de la porte ou du groupe hardware
      if (hinge.model.parent) {
        hinge.model.parent.remove(hinge.model);
      }
      // Dispose des géométries et matériaux
      hinge.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });

    caissonHardware.hinges = [];
    caissonHardware.drillings = [];

    if (this.onHardwareRemoved) {
      this.onHardwareRemoved(caissonId);
    }
  }

  /**
   * Obtient les charnières d'un caisson
   */
  getHingesForCaisson(caissonId) {
    const caissonHardware = this.hardwareByCaisson.get(caissonId);
    return caissonHardware?.hinges || [];
  }

  /**
   * Obtient tous les perçages pour un caisson
   */
  getDrillingsForCaisson(caissonId) {
    const caissonHardware = this.hardwareByCaisson.get(caissonId);
    return caissonHardware?.drillings || [];
  }

  /**
   * Met à jour la position des charnières quand le caisson bouge
   */
  updateHardwarePositions(caissonId) {
    const caisson = this.caissonManager.getCaisson(caissonId);
    if (!caisson) return;

    const caissonHardware = this.hardwareByCaisson.get(caissonId);
    if (!caissonHardware || !caissonHardware.hinges) return;

    const door = caisson.panels.door;
    if (!door) return;

    const doorWorldPos = new THREE.Vector3();
    door.getWorldPosition(doorWorldPos);

    const doorHeight = caisson.config.height - caisson.config.gapTop - caisson.config.gapBottom;
    const doorWidth = caisson.config.width - caisson.config.gapLeft - caisson.config.gapRight;
    const doorThickness = caisson.config.doorThickness;

    caissonHardware.hinges.forEach(hinge => {
      const hingeX = doorWorldPos.x - doorWidth / 2 + hinge.distanceFromEdge;
      const hingeY = doorWorldPos.y - doorHeight / 2 + hinge.yPosition;
      const hingeZ = doorWorldPos.z - doorThickness / 2;

      hinge.model.position.set(hingeX, hingeY, hingeZ);
    });
  }

  /**
   * Retourne les types de charnières disponibles
   */
  getAvailableHingeTypes() {
    return Object.entries(HINGE_SPECS).map(([key, spec]) => ({
      id: key,
      name: spec.name,
      angle: spec.angle
    }));
  }

  /**
   * Nettoie tout
   */
  dispose() {
    this.hardwareByCaisson.forEach((hardware, caissonId) => {
      this.removeHingesFromCaisson(caissonId);
    });
    this.hardwareByCaisson.clear();
  }
}
