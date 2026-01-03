/* ================================================
   CAISSON - Classe representant un caisson 3D
   Avec support des etageres et aretes ameliorees (Fat Lines)
   ================================================ */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { EXPLODE_DISTANCE } from '../core/constants.js';

// Configuration des aretes
const EDGE_CONFIG = {
  linewidth: 1.5,         // Epaisseur des lignes en pixels
  color: 0x2a2a2a,        // Couleur gris fonce
  opacity: 0.9,           // Legere transparence
  dashed: false,
  // Configuration pour les aretes internes (plus subtiles)
  innerLinewidth: 1.2,
  innerColor: 0x3a3a3a,
  innerOpacity: 0.7
};
import { getDefaultCaissonConfig } from '../core/config.js';

/**
 * Classe Caisson
 * Encapsule toute la logique d'un caisson individuel
 */
export class Caisson {
  constructor(id, config = null, position = { x: 0, y: 0, z: 0 }) {
    this.id = id;
    this.config = config || getDefaultCaissonConfig();

    // Initialiser les etageres si non definies
    if (!this.config.shelves) {
      this.config.shelves = [];
    }

    this.group = new THREE.Group();
    this.group.name = `caisson_${id}`;
    this.group.userData.caissonId = id;
    this.group.userData.type = 'caisson';

    // References aux panneaux
    this.panels = {
      bottom: null,
      top: null,
      left: null,
      right: null,
      back: null,
      door: null
    };

    // References aux etageres (tableau)
    this.shelfMeshes = [];

    // Etat de selection
    this.isSelected = false;
    this.isHovered = false;

    // Position initiale
    this.group.position.set(position.x, position.y, position.z);

    // Construire le caisson
    this.build();
  }

  /**
   * Cree un panneau 3D avec des aretes ameliorees (Fat Lines)
   */
  createPanel(width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.92,  // Legere transparence pour voir l'interieur
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.userData.type = 'panel';
    panel.userData.caissonId = this.id;

    // Creer les aretes avec LineSegments2 (Fat Lines) pour meilleure qualite
    const edgeLines = this.createFatEdges(geometry);
    panel.add(edgeLines);

    return panel;
  }

  /**
   * Cree des aretes epaisses (Fat Lines) a partir d'une geometrie
   * Utilise LineSegments2/LineMaterial pour des lignes de qualite
   * Version optimisee: un seul objet LineSegments2 par panneau
   */
  createFatEdges(geometry) {
    const edges = new THREE.EdgesGeometry(geometry, 1); // threshold angle = 1 degree
    const positions = edges.attributes.position.array;

    // Creer la geometrie pour LineSegments2
    const lineGeometry = new LineSegmentsGeometry();
    lineGeometry.setPositions(positions);

    // Creer le materiau pour les lignes epaisses
    const lineMaterial = new LineMaterial({
      color: EDGE_CONFIG.color,
      linewidth: EDGE_CONFIG.linewidth,
      transparent: true,
      opacity: EDGE_CONFIG.opacity,
      depthTest: true,
      depthWrite: false,
      alphaToCoverage: false,
      worldUnits: false, // Utiliser les pixels ecran
      dashed: EDGE_CONFIG.dashed,
      vertexColors: false
    });

    // Definir la resolution (important pour LineMaterial)
    lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

    // Creer l'objet LineSegments2
    const lineSegments = new LineSegments2(lineGeometry, lineMaterial);
    lineSegments.computeLineDistances();
    lineSegments.userData.isEdge = true;
    lineSegments.renderOrder = 1; // Rendre apres les meshes pour meilleure visibilite

    return lineSegments;
  }

  /**
   * Met a jour la resolution des materiaux de ligne (pour le resize)
   */
  updateEdgeResolution(width, height) {
    this.group.traverse((child) => {
      if (child.material && child.material.isLineMaterial) {
        child.material.resolution.set(width, height);
      }
    });
  }

  /**
   * Construit le caisson 3D complet
   * Origine: coin arriere-bas-gauche (style Blum)
   * X: vers la droite (largeur)
   * Y: vers le haut (hauteur)
   * Z: vers l'avant (profondeur)
   */
  build() {
    // Vider le groupe existant
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Reinitialiser les references
    this.shelfMeshes = [];

    const w = this.config.width;
    const h = this.config.height;
    const d = this.config.depth;
    const t = this.config.thickness;
    const colorCaisson = this.config.colorCaisson;
    const colorDoor = this.config.colorDoor;

    // Panneau inferieur - au niveau y=0
    const bottom = this.createPanel(w, t, d, colorCaisson);
    bottom.name = 'inferior';
    bottom.position.set(w / 2, t / 2, d / 2);
    bottom.userData.basePosition = new THREE.Vector3(w / 2, t / 2, d / 2);
    bottom.userData.explodedPosition = new THREE.Vector3(w / 2, t / 2 - EXPLODE_DISTANCE, d / 2);
    this.group.add(bottom);
    this.panels.bottom = bottom;

    // Panneau superieur - en haut du caisson
    const top = this.createPanel(w, t, d, colorCaisson);
    top.name = 'superior';
    top.position.set(w / 2, h - t / 2, d / 2);
    top.userData.basePosition = new THREE.Vector3(w / 2, h - t / 2, d / 2);
    top.userData.explodedPosition = new THREE.Vector3(w / 2, h - t / 2 + EXPLODE_DISTANCE, d / 2);
    this.group.add(top);
    this.panels.top = top;

    // Cote gauche - a x=0
    const left = this.createPanel(t, h - 2 * t, d, colorCaisson);
    left.name = 'left';
    left.position.set(t / 2, h / 2, d / 2);
    left.userData.basePosition = new THREE.Vector3(t / 2, h / 2, d / 2);
    left.userData.explodedPosition = new THREE.Vector3(t / 2 - EXPLODE_DISTANCE, h / 2, d / 2);
    this.group.add(left);
    this.panels.left = left;

    // Cote droit - a x=w
    const right = this.createPanel(t, h - 2 * t, d, colorCaisson);
    right.name = 'right';
    right.position.set(w - t / 2, h / 2, d / 2);
    right.userData.basePosition = new THREE.Vector3(w - t / 2, h / 2, d / 2);
    right.userData.explodedPosition = new THREE.Vector3(w - t / 2 + EXPLODE_DISTANCE, h / 2, d / 2);
    this.group.add(right);
    this.panels.right = right;

    // Dos - a z=0
    const back = this.createPanel(w - 2 * t, h - 2 * t, t, colorCaisson);
    back.name = 'back';
    back.position.set(w / 2, h / 2, t / 2);
    back.userData.basePosition = new THREE.Vector3(w / 2, h / 2, t / 2);
    back.userData.explodedPosition = new THREE.Vector3(w / 2, h / 2, t / 2 - EXPLODE_DISTANCE);
    this.group.add(back);
    this.panels.back = back;

    // Porte (panneau avant) - a z=d+offset
    const doorWidth = w - this.config.gapLeft - this.config.gapRight;
    const doorHeight = h - this.config.gapTop - this.config.gapBottom;
    const doorT = this.config.doorThickness;
    const door = this.createPanel(doorWidth, doorHeight, doorT, colorDoor);
    door.name = 'door';

    const doorX = w / 2 + (this.config.gapRight - this.config.gapLeft) / 2;
    const doorCenterY = this.config.gapBottom + doorHeight / 2;
    const doorZ = d + this.config.doorOffset + doorT / 2;

    door.position.set(doorX, doorCenterY, doorZ);
    door.userData.basePosition = new THREE.Vector3(doorX, doorCenterY, doorZ);
    door.userData.explodedPosition = new THREE.Vector3(doorX, doorCenterY, doorZ + EXPLODE_DISTANCE);
    door.visible = this.config.showDoor;
    this.group.add(door);
    this.panels.door = door;

    // Construire les etageres
    this.buildShelves();

    // Le caisson reste a l'origine (0,0,0) = coin arriere-bas-gauche
    this.group.position.set(0, 0, 0);
  }

  /**
   * Construit les etageres 3D
   * Coordonnees: origine au coin arriere-bas-gauche
   */
  buildShelves() {
    const w = this.config.width;
    const d = this.config.depth;
    const t = this.config.thickness;
    const colorCaisson = this.config.colorCaisson;

    // Largeur interieure (entre les cotes)
    const shelfWidth = w - 2 * t;
    // Profondeur de l'etagere (peut etre ajustee)
    const shelfDepth = d - t; // Un peu moins profond que le caisson pour le dos

    this.config.shelves.forEach((shelfConfig, index) => {
      const shelfThickness = shelfConfig.thickness || t;
      const shelfY = shelfConfig.positionY;

      const shelf = this.createPanel(shelfWidth, shelfThickness, shelfDepth, colorCaisson);
      shelf.name = `shelf_${index}`;
      shelf.userData.type = 'shelf';
      shelf.userData.shelfIndex = index;

      // Position: centree horizontalement (x=w/2), a la hauteur specifiee
      const posX = w / 2;
      const posY = shelfY + shelfThickness / 2;
      const posZ = t + shelfDepth / 2; // Decale vers l'avant apres le dos

      shelf.position.set(posX, posY, posZ);
      shelf.userData.basePosition = new THREE.Vector3(posX, posY, posZ);
      shelf.userData.explodedPosition = new THREE.Vector3(posX, posY, posZ + EXPLODE_DISTANCE * 0.5);

      this.group.add(shelf);
      this.shelfMeshes.push(shelf);
    });
  }

  /**
   * Ajoute une etagere a une position donnee
   * @param {number} positionY - Position Y de l'etagere (depuis le bas du caisson)
   * @param {number} thickness - Epaisseur de l'etagere (optionnel)
   * @returns {number} Index de l'etagere ajoutee
   */
  addShelf(positionY = null, thickness = null) {
    const t = this.config.thickness;
    const h = this.config.height;

    // Position par defaut: au milieu de l'espace disponible
    if (positionY === null) {
      const usableHeight = h - 2 * t;
      const numShelves = this.config.shelves.length;
      // Repartir equitablement
      positionY = t + (usableHeight / (numShelves + 2)) * (numShelves + 1);
    }

    // Verifier que la position est valide (entre bas+epaisseur et haut-epaisseur)
    const minY = t + 10; // 10mm minimum au-dessus du bas
    const maxY = h - t - (thickness || t) - 10; // 10mm minimum en-dessous du haut
    positionY = Math.max(minY, Math.min(maxY, positionY));

    const shelfConfig = {
      positionY: positionY,
      thickness: thickness || t
    };

    this.config.shelves.push(shelfConfig);
    this.build();

    return this.config.shelves.length - 1;
  }

  /**
   * Supprime une etagere par son index
   * @param {number} index - Index de l'etagere a supprimer
   */
  removeShelf(index) {
    if (index >= 0 && index < this.config.shelves.length) {
      this.config.shelves.splice(index, 1);
      this.build();
    }
  }

  /**
   * Met a jour la position d'une etagere
   * @param {number} index - Index de l'etagere
   * @param {number} newPositionY - Nouvelle position Y
   */
  updateShelfPosition(index, newPositionY) {
    if (index >= 0 && index < this.config.shelves.length) {
      const t = this.config.thickness;
      const h = this.config.height;
      const shelfT = this.config.shelves[index].thickness;

      // Limiter la position
      const minY = t + 10;
      const maxY = h - t - shelfT - 10;
      newPositionY = Math.max(minY, Math.min(maxY, newPositionY));

      this.config.shelves[index].positionY = newPositionY;
      this.build();
    }
  }

  /**
   * Obtient le nombre d'etageres
   * @returns {number}
   */
  getShelfCount() {
    return this.config.shelves.length;
  }

  /**
   * Obtient les informations sur toutes les etageres
   * @returns {Array}
   */
  getShelvesInfo() {
    const w = this.config.width;
    const d = this.config.depth;
    const t = this.config.thickness;

    return this.config.shelves.map((shelf, index) => ({
      index: index,
      positionY: shelf.positionY,
      thickness: shelf.thickness,
      width: w - 2 * t,
      depth: d - t
    }));
  }

  /**
   * Met a jour la configuration du caisson et le reconstruit
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.build();
  }

  /**
   * Obtient la bounding box du caisson
   */
  getBoundingBox() {
    const box = new THREE.Box3().setFromObject(this.group);
    return box;
  }

  /**
   * Marque le caisson comme selectionne
   */
  setSelected(selected) {
    this.isSelected = selected;
    this.updateVisualState();
  }

  /**
   * Marque le caisson comme survole
   */
  setHovered(hovered) {
    this.isHovered = hovered;
    this.updateVisualState();
  }

  /**
   * Met a jour l'etat visuel (selection/survol)
   */
  updateVisualState() {
    if (this.isSelected || this.isHovered) {
      this.addOutline();
    } else {
      this.removeOutline();
    }
  }

  /**
   * Ajoute un outline au caisson
   */
  addOutline() {
    this.removeOutline();

    const box = this.getBoundingBox();
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const localCenter = this.group.worldToLocal(center.clone());

    const outlineGeometry = new THREE.BoxGeometry(
      size.x + 10,
      size.y + 10,
      size.z + 10
    );
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: this.isSelected ? 0x4CAF50 : 0x2196F3,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });

    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.name = 'outline';
    outline.position.copy(localCenter);
    this.group.add(outline);
  }

  /**
   * Supprime l'outline du caisson
   */
  removeOutline() {
    const outline = this.group.getObjectByName('outline');
    if (outline) {
      this.group.remove(outline);
    }
  }

  /**
   * Clone la configuration du caisson
   */
  cloneConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Detruit le caisson et libere les ressources
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
