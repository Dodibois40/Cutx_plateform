/* ================================================
   HINGE - Classe représentant une charnière
   ================================================ */

import * as THREE from 'three';
import { Hardware } from './Hardware.js';
import { getHingeSpecs, HINGE_PLACEMENT_RULES } from '../config/hardware-specs.js';

/**
 * Classe Hinge (Charnière)
 * Hérite de Hardware
 */
export class Hinge extends Hardware {
  constructor(id, hingeType = 'CLIP_TOP_BLUMOTION_110') {
    const specs = getHingeSpecs(hingeType);
    super(id, hingeType, specs);

    // Configuration spécifique charnière
    this.hingeType = hingeType;
    this.angle = specs.angle;

    // Position sur la porte
    this.distanceFromTop = 0;
    this.distanceFromBottom = 0;
    this.distanceFromEdge = specs.cupHole.distanceFromEdge + (specs.cupHole.diameter / 2);

    // Côté de montage (left ou right)
    this.mountingSide = 'left';

    // Perçages associés
    this.drillings = [];

    // Créer un placeholder par défaut
    this.createHingePlaceholder();
  }

  /**
   * Crée un modèle de charnière simplifié mais réaliste
   */
  createHingePlaceholder() {
    const hingeGroup = new THREE.Group();

    // Couleur métal
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xB8B8B8,
      metalness: 0.7,
      roughness: 0.3
    });

    // Partie cup (cylindre qui entre dans le trou Ø35)
    const cupGeometry = new THREE.CylinderGeometry(17.5, 17.5, 13, 32);
    const cup = new THREE.Mesh(cupGeometry, metalMaterial.clone());
    cup.rotation.x = Math.PI / 2;
    cup.position.z = -6.5;
    hingeGroup.add(cup);

    // Corps de la charnière (bras)
    const bodyGeometry = new THREE.BoxGeometry(50, 12, 40);
    const body = new THREE.Mesh(bodyGeometry, metalMaterial.clone());
    body.position.set(0, 0, 15);
    hingeGroup.add(body);

    // Articulation (cylindre)
    const pivotGeometry = new THREE.CylinderGeometry(5, 5, 14, 16);
    const pivot = new THREE.Mesh(pivotGeometry, metalMaterial.clone());
    pivot.position.set(0, 0, 35);
    hingeGroup.add(pivot);

    // Embase (plaque de montage sur caisson)
    const plateGeometry = new THREE.BoxGeometry(35, 8, 50);
    const plate = new THREE.Mesh(plateGeometry, metalMaterial.clone());
    plate.position.set(0, 3, 50);
    hingeGroup.add(plate);

    // Ajouter des arêtes à tous les mesh
    hingeGroup.traverse((child) => {
      if (child.isMesh) {
        const edges = new THREE.EdgesGeometry(child.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 });
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        child.add(lineSegments);
      }
    });

    // Rotation pour orientation correcte (charnière horizontale)
    hingeGroup.rotation.y = Math.PI / 2;

    this.group.add(hingeGroup);
  }

  /**
   * Configure la charnière pour une porte spécifique
   */
  configureForDoor(doorHeight, doorWidth, positionIndex, totalHinges, side = 'left') {
    this.mountingSide = side;

    // Calculer la position Y selon le nombre et l'index
    const positions = HINGE_PLACEMENT_RULES.getRecommendedPositions(doorHeight, totalHinges);

    if (positionIndex < positions.length) {
      const yPos = positions[positionIndex];
      this.distanceFromBottom = yPos;
      this.distanceFromTop = doorHeight - yPos;
    }

    // Position X (distance du chant)
    this.distanceFromEdge = 21; // 21mm = centre du trou à 35mm du bord

    // Générer les perçages
    this.generateDrillings();
  }

  /**
   * Génère les données de perçage pour cette charnière
   */
  generateDrillings() {
    this.drillings = [];

    // Perçage principal (cup hole Ø35)
    this.drillings.push({
      type: 'CUP_HOLE',
      diameter: this.specs.cupHole.diameter,
      depth: this.specs.cupHole.depth,
      x: this.distanceFromEdge,
      y: this.distanceFromBottom,
      side: this.mountingSide
    });

    // Trous de fixation
    const halfSpacing = this.specs.fixingHoles.spacing / 2;

    this.drillings.push({
      type: 'FIXING_HOLE',
      diameter: this.specs.fixingHoles.diameter,
      depth: this.specs.fixingHoles.depth,
      x: this.distanceFromEdge,
      y: this.distanceFromBottom - halfSpacing,
      side: this.mountingSide
    });

    this.drillings.push({
      type: 'FIXING_HOLE',
      diameter: this.specs.fixingHoles.diameter,
      depth: this.specs.fixingHoles.depth,
      x: this.distanceFromEdge,
      y: this.distanceFromBottom + halfSpacing,
      side: this.mountingSide
    });

    return this.drillings;
  }

  /**
   * Positionne la charnière sur une porte
   */
  positionOnDoor(door, doorConfig) {
    if (!door) return;

    // Calculer la position en fonction du côté de montage
    const doorWidth = doorConfig.width || 600;
    const doorHeight = doorConfig.height || 900;
    const doorThickness = doorConfig.thickness || 18;

    // Position X (gauche ou droite de la porte)
    let xOffset;
    if (this.mountingSide === 'left') {
      xOffset = -doorWidth / 2 + this.distanceFromEdge;
      this.group.rotation.y = 0;
    } else {
      xOffset = doorWidth / 2 - this.distanceFromEdge;
      this.group.rotation.y = Math.PI;
    }

    // Position Y (depuis le bas de la porte)
    const yOffset = -doorHeight / 2 + this.distanceFromBottom;

    // Position Z (face arrière de la porte)
    const zOffset = -doorThickness / 2 - 5;

    this.relativePosition = { x: xOffset, y: yOffset, z: zOffset };
  }

  /**
   * Clone la charnière
   */
  clone(newId) {
    const cloned = new Hinge(newId, this.hingeType);
    cloned.distanceFromTop = this.distanceFromTop;
    cloned.distanceFromBottom = this.distanceFromBottom;
    cloned.distanceFromEdge = this.distanceFromEdge;
    cloned.mountingSide = this.mountingSide;
    return cloned;
  }

  /**
   * Retourne les informations de perçage formatées
   */
  getDrillingInfo() {
    return {
      hingeId: this.id,
      hingeType: this.hingeType,
      position: {
        distanceFromBottom: this.distanceFromBottom,
        distanceFromEdge: this.distanceFromEdge,
        side: this.mountingSide
      },
      drillings: this.drillings
    };
  }
}
