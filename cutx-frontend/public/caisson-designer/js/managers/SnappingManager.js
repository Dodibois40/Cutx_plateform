/* ================================================
   SNAPPING MANAGER - Skeleton Raycasting (Style CAD)

   Stratégie en 2 passes :
   1. Raycast sur les arêtes (LineSegments invisibles)
   2. Fallback sur les faces (Meshes)

   Avantages :
   - Pas de détection de diagonales fantômes
   - Arêtes prioritaires sur les faces
   - Snapping précis et stable
   ================================================ */

import * as THREE from 'three';

/**
 * Types de points d'accroche (par ordre de priorité)
 */
export const SnapType = {
  VERTEX: 'VERTEX',       // Priorité 1 - Sommets (vert)
  MIDPOINT: 'MIDPOINT',   // Priorité 2 - Milieux d'arêtes (cyan)
  EDGE: 'EDGE',           // Priorité 3 - Sur une arête (rouge)
  FACE: 'FACE'            // Priorité 4 - Sur une face (bleu)
};

/**
 * Couleurs des marqueurs selon le type de snap
 */
export const SnapColors = {
  [SnapType.VERTEX]: 0x00FF00,    // Vert - Endpoint/Vertex
  [SnapType.MIDPOINT]: 0x00FFFF,  // Cyan - Midpoint
  [SnapType.EDGE]: 0xFF0000,      // Rouge - On Edge
  [SnapType.FACE]: 0x0066FF       // Bleu - On Face
};

/**
 * Gestionnaire de snapping géométrique - Méthode Skeleton Raycasting
 */
export class SnappingManager {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Configuration
    this.config = {
      enabled: true,
      showHelpers: true,
      markerSize: 8,

      // ========== SEUILS EN PIXELS (Screen Space) ==========
      // C'est le coeur du système : ces valeurs sont en PIXELS
      // donc indépendantes du niveau de zoom !
      vertexThresholdPx: 15,     // Distance en pixels pour snapper un vertex
      midpointThresholdPx: 12,   // Distance en pixels pour snapper un midpoint
      edgeThresholdPx: 10,       // Distance en pixels pour snapper une arête
      maxScreenDistancePx: 25,   // Distance MAX en pixels pour accepter un hit de raycast

      // ========== CONFIGURATION 3D ==========
      // Seuil pour EdgesGeometry (angle en degrés pour ignorer les arêtes douces)
      edgeAngleThreshold: 1,     // Seules les arêtes avec angle > 1° sont détectées
      // Seuil du raycaster pour les lignes (en unités monde) - peut être large
      // car la validation se fait ensuite en pixels !
      lineRaycastThreshold: 100, // "Épaisseur" virtuelle des lignes (large car filtré après)

      inferenceLineColor: 0x00FFFF
    };

    // Layers
    this.LAYER_DEFAULT = 0;
    this.LAYER_HELPERS = 1;
    this.LAYER_SKELETON = 2;  // Layer pour les squelettes (invisible mais raycastable)

    // ========== STOCKAGE DES OBJETS ==========
    this.targetMeshes = [];           // Meshes originaux (pour raycast faces)
    this.skeletonLines = [];          // LineSegments des arêtes (pour raycast edges)
    this.edgeDataMap = new Map();     // Map: lineSegments.uuid -> { vertices, midpoints, segments }

    // ========== RAYCASTERS SPÉCIALISÉS ==========
    // Raycaster pour les arêtes (LineSegments)
    // Le threshold 3D peut être large car on filtre ensuite en pixels !
    this.edgeRaycaster = new THREE.Raycaster();
    this.edgeRaycaster.params.Line.threshold = this.config.lineRaycastThreshold;
    this.edgeRaycaster.layers.set(this.LAYER_SKELETON);
    // Note: Le vrai filtrage se fait dans getSnappedPoint() avec maxScreenDistancePx

    // Raycaster pour les faces (Meshes)
    this.faceRaycaster = new THREE.Raycaster();
    this.faceRaycaster.layers.set(this.LAYER_DEFAULT);

    // Activer les layers sur la caméra
    this.camera.layers.enable(this.LAYER_HELPERS);
    // Note: LAYER_SKELETON n'est PAS activé sur la caméra (invisible à l'écran)

    // État
    this.currentSnap = null;
    this.dragStartPoint = null;

    // Groupe pour les helpers visuels
    this.helpersGroup = new THREE.Group();
    this.helpersGroup.name = 'snapping-helpers';
    this.helpersGroup.renderOrder = 9999;
    this.helpersGroup.userData.isHelper = true;
    this.helpersGroup.layers.set(this.LAYER_HELPERS);
    this.scene.add(this.helpersGroup);

    // Groupe pour les squelettes (invisible mais raycastable)
    this.skeletonGroup = new THREE.Group();
    this.skeletonGroup.name = 'snapping-skeleton';
    this.skeletonGroup.visible = false;  // Invisible à l'écran
    this.skeletonGroup.layers.set(this.LAYER_SKELETON);
    this.scene.add(this.skeletonGroup);

    // Créer les helpers visuels
    this.snapMarker = null;
    this.inferenceLine = null;
    this._createHelpers();
  }

  // ============================================
  // GESTION DES OBJETS CIBLES
  // ============================================

  /**
   * Définit les objets cibles pour le snapping
   * Génère automatiquement les squelettes (EdgesGeometry) pour chaque mesh
   * @param {THREE.Mesh[]} meshes - Liste des meshes
   */
  setObjects(meshes) {
    // Nettoyer les anciens squelettes
    this._clearSkeletons();

    this.targetMeshes = [];

    for (const mesh of meshes) {
      if (!mesh || !mesh.isMesh) continue;
      if (mesh.userData && mesh.userData.isHelper) continue;

      // Ajouter le mesh aux cibles (pour raycast faces)
      mesh.layers.enable(this.LAYER_DEFAULT);
      this.targetMeshes.push(mesh);

      // Générer le squelette (arêtes) pour ce mesh
      this._generateSkeleton(mesh);
    }

    console.log(`🎯 SnappingManager: ${this.targetMeshes.length} meshes, ${this.skeletonLines.length} squelettes`);
  }

  /**
   * Génère le squelette (LineSegments) pour un mesh
   * Utilise EdgesGeometry pour ne garder que les vraies arêtes (pas les diagonales)
   */
  _generateSkeleton(mesh) {
    const geometry = mesh.geometry;
    if (!geometry) return;

    // Créer EdgesGeometry avec seuil d'angle
    // Seules les arêtes dont l'angle entre les faces adjacentes > threshold seront gardées
    const thresholdAngle = this.config.edgeAngleThreshold;
    const edgesGeometry = new THREE.EdgesGeometry(geometry, thresholdAngle);

    // Créer le LineSegments (invisible mais raycastable)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      visible: false  // Invisible à l'écran
    });

    const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
    lineSegments.name = `skeleton-${mesh.uuid}`;
    lineSegments.userData.sourceMesh = mesh;
    lineSegments.layers.set(this.LAYER_SKELETON);

    // Synchroniser la transformation avec le mesh source
    lineSegments.matrixAutoUpdate = false;
    lineSegments.matrix = mesh.matrixWorld;

    // Extraire les données des arêtes pour le snap précis
    const edgeData = this._extractEdgeData(edgesGeometry, mesh);
    this.edgeDataMap.set(lineSegments.uuid, edgeData);

    // Ajouter au groupe et à la liste
    this.skeletonGroup.add(lineSegments);
    this.skeletonLines.push(lineSegments);
  }

  /**
   * Extrait les vertices, midpoints et segments d'une EdgesGeometry
   */
  _extractEdgeData(edgesGeometry, mesh) {
    const positions = edgesGeometry.attributes.position;
    const vertices = [];
    const midpoints = [];
    const segments = [];
    const vertexSet = new Set();

    // Parcourir les segments (2 points par segment)
    for (let i = 0; i < positions.count; i += 2) {
      const start = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      const end = new THREE.Vector3(
        positions.getX(i + 1),
        positions.getY(i + 1),
        positions.getZ(i + 1)
      );

      // Stocker le segment
      segments.push({ start: start.clone(), end: end.clone() });

      // Calculer le midpoint
      const midpoint = start.clone().add(end).multiplyScalar(0.5);
      midpoints.push(midpoint);

      // Ajouter les vertices (dédupliqués)
      const keyStart = `${start.x.toFixed(2)}_${start.y.toFixed(2)}_${start.z.toFixed(2)}`;
      const keyEnd = `${end.x.toFixed(2)}_${end.y.toFixed(2)}_${end.z.toFixed(2)}`;

      if (!vertexSet.has(keyStart)) {
        vertexSet.add(keyStart);
        vertices.push(start.clone());
      }
      if (!vertexSet.has(keyEnd)) {
        vertexSet.add(keyEnd);
        vertices.push(end.clone());
      }
    }

    return {
      vertices,
      midpoints,
      segments,
      mesh  // Référence au mesh source
    };
  }

  /**
   * Nettoie tous les squelettes
   */
  _clearSkeletons() {
    for (const line of this.skeletonLines) {
      this.skeletonGroup.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
    }
    this.skeletonLines = [];
    this.edgeDataMap.clear();
  }

  // ============================================
  // MÉTHODE PRINCIPALE - SKELETON RAYCASTING
  // ============================================

  /**
   * Trouve le point d'accroche en utilisant le Skeleton Raycasting
   * avec VALIDATION EN ESPACE ÉCRAN (Screen Space Validation)
   *
   * PASSE 1: Raycast sur les arêtes (squelettes LineSegments)
   * - Si hit -> valide en pixels -> cherche VERTEX ou MIDPOINT proche, sinon EDGE
   *
   * PASSE 2: Fallback sur les faces (meshes)
   * - Si hit -> FACE
   *
   * La validation en pixels rend le snapping indépendant du niveau de zoom !
   */
  getSnappedPoint(mouse, camera = this.camera) {
    if (!this.config.enabled) return null;

    // Mettre à jour les matrices des squelettes
    this._updateSkeletonMatrices();

    // Position souris en pixels pour les calculs de distance
    const mousePixels = this._mouseToPixels(mouse);

    // ========================================
    // PASSE 1 : Raycast sur les ARÊTES
    // ========================================
    this.edgeRaycaster.setFromCamera(mouse, camera);
    const edgeIntersects = this.edgeRaycaster.intersectObjects(this.skeletonLines, false);

    if (edgeIntersects.length > 0) {
      const edgeHit = edgeIntersects[0];
      const lineSegments = edgeHit.object;
      const hitPoint = edgeHit.point.clone();

      // ========== VALIDATION SCREEN SPACE (LE FIX CRITIQUE) ==========
      // Projeter le point d'impact 3D vers l'écran 2D
      const hitScreenPos = this._worldToPixels(hitPoint, camera);

      // Si le hit est trop loin en PIXELS -> ignorer et passer aux faces
      // Cela rend le snapping indépendant du zoom !
      if (!hitScreenPos || mousePixels.distanceTo(hitScreenPos) > this.config.maxScreenDistancePx) {
        // Le hit 3D est trop loin visuellement -> passer au fallback faces
        return this._checkFaceSnap(mouse, camera);
      }

      const edgeData = this.edgeDataMap.get(lineSegments.uuid);

      if (edgeData) {
        const sourceMesh = edgeData.mesh;
        const worldMatrix = sourceMesh.matrixWorld;

        // Chercher le VERTEX le plus proche (validation pixel incluse)
        const vertexResult = this._findClosestVertex(edgeData.vertices, worldMatrix, mousePixels, camera);
        if (vertexResult && vertexResult.pixelDistance < this.config.vertexThresholdPx) {
          return {
            position: vertexResult.worldPosition,
            type: SnapType.VERTEX,
            distance: vertexResult.pixelDistance,
            mesh: sourceMesh
          };
        }

        // Chercher le MIDPOINT le plus proche (validation pixel incluse)
        const midpointResult = this._findClosestMidpoint(edgeData.midpoints, worldMatrix, mousePixels, camera);
        if (midpointResult && midpointResult.pixelDistance < this.config.midpointThresholdPx) {
          return {
            position: midpointResult.worldPosition,
            type: SnapType.MIDPOINT,
            distance: midpointResult.pixelDistance,
            mesh: sourceMesh
          };
        }

        // Chercher le point sur l'ARÊTE le plus proche (validation pixel incluse)
        const edgeResult = this._findClosestEdgePoint(edgeData.segments, worldMatrix, mousePixels, camera);
        if (edgeResult && edgeResult.pixelDistance < this.config.edgeThresholdPx) {
          return {
            position: edgeResult.worldPosition,
            type: SnapType.EDGE,
            distance: edgeResult.pixelDistance,
            mesh: sourceMesh
          };
        }

        // Aucun élément assez proche en pixels -> passer aux faces
        // (Ne PAS retourner le hitPoint brut du raycast 3D !)
      }
    }

    // ========================================
    // PASSE 2 : Fallback sur les FACES
    // ========================================
    return this._checkFaceSnap(mouse, camera);
  }

  /**
   * Vérifie le snap sur les faces (méthode extraite pour réutilisation)
   */
  _checkFaceSnap(mouse, camera) {
    this.faceRaycaster.setFromCamera(mouse, camera);
    const faceIntersects = this.faceRaycaster.intersectObjects(this.targetMeshes, false);

    if (faceIntersects.length > 0) {
      const faceHit = faceIntersects[0];
      return {
        position: faceHit.point.clone(),
        type: SnapType.FACE,
        distance: 0,
        mesh: faceHit.object
      };
    }

    return null;
  }

  /**
   * Met à jour les matrices des squelettes pour suivre leurs meshes sources
   */
  _updateSkeletonMatrices() {
    for (const line of this.skeletonLines) {
      const sourceMesh = line.userData.sourceMesh;
      if (sourceMesh) {
        line.matrix.copy(sourceMesh.matrixWorld);
        line.matrixWorld.copy(sourceMesh.matrixWorld);
      }
    }
  }

  // ============================================
  // MÉTHODES DE RECHERCHE DE SNAP
  // ============================================

  /**
   * Trouve le vertex le plus proche en screen space
   */
  _findClosestVertex(vertices, worldMatrix, mousePixels, camera) {
    let closest = null;
    let minDistance = Infinity;

    for (const vertex of vertices) {
      const worldPos = vertex.clone().applyMatrix4(worldMatrix);
      const screenPos = this._worldToPixels(worldPos, camera);

      if (screenPos) {
        const dist = mousePixels.distanceTo(screenPos);
        if (dist < minDistance) {
          minDistance = dist;
          closest = {
            worldPosition: worldPos,
            screenPosition: screenPos,
            pixelDistance: dist
          };
        }
      }
    }

    return closest;
  }

  /**
   * Trouve le midpoint le plus proche en screen space
   */
  _findClosestMidpoint(midpoints, worldMatrix, mousePixels, camera) {
    let closest = null;
    let minDistance = Infinity;

    for (const midpoint of midpoints) {
      const worldPos = midpoint.clone().applyMatrix4(worldMatrix);
      const screenPos = this._worldToPixels(worldPos, camera);

      if (screenPos) {
        const dist = mousePixels.distanceTo(screenPos);
        if (dist < minDistance) {
          minDistance = dist;
          closest = {
            worldPosition: worldPos,
            screenPosition: screenPos,
            pixelDistance: dist
          };
        }
      }
    }

    return closest;
  }

  /**
   * Trouve le point sur l'arête le plus proche en screen space
   */
  _findClosestEdgePoint(segments, worldMatrix, mousePixels, camera) {
    let closest = null;
    let minDistance = Infinity;

    for (const segment of segments) {
      const startWorld = segment.start.clone().applyMatrix4(worldMatrix);
      const endWorld = segment.end.clone().applyMatrix4(worldMatrix);

      const startScreen = this._worldToPixels(startWorld, camera);
      const endScreen = this._worldToPixels(endWorld, camera);

      if (!startScreen || !endScreen) continue;

      // Projeter la souris sur le segment 2D
      const projected = this._projectPointOnSegment2D(mousePixels, startScreen, endScreen);

      if (projected.isOnSegment) {
        const dist = mousePixels.distanceTo(projected.point);

        if (dist < minDistance) {
          minDistance = dist;

          // Calculer le point 3D correspondant
          const worldPoint = startWorld.clone().lerp(endWorld, projected.t);

          closest = {
            worldPosition: worldPoint,
            screenPosition: projected.point,
            pixelDistance: dist
          };
        }
      }
    }

    return closest;
  }

  /**
   * Projette un point sur un segment 2D
   */
  _projectPointOnSegment2D(point, segStart, segEnd) {
    const line = new THREE.Vector2().subVectors(segEnd, segStart);
    const lineLength = line.length();

    if (lineLength < 0.0001) {
      return { point: segStart.clone(), t: 0, isOnSegment: true };
    }

    const lineNorm = line.clone().normalize();
    const pointToStart = new THREE.Vector2().subVectors(point, segStart);

    let t = pointToStart.dot(lineNorm) / lineLength;

    const isOnSegment = t >= 0 && t <= 1;
    t = Math.max(0, Math.min(1, t));

    const projectedPoint = segStart.clone().add(line.clone().multiplyScalar(t));

    return {
      point: projectedPoint,
      t: t,
      isOnSegment: isOnSegment
    };
  }

  // ============================================
  // CONVERSIONS DE COORDONNÉES
  // ============================================

  _mouseToPixels(mouse) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      (mouse.x + 1) / 2 * rect.width,
      (-mouse.y + 1) / 2 * rect.height
    );
  }

  _worldToPixels(worldPos, camera) {
    const projected = worldPos.clone().project(camera);
    if (projected.z > 1) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      (projected.x + 1) / 2 * rect.width,
      (-projected.y + 1) / 2 * rect.height
    );
  }

  // ============================================
  // MÉTHODE UPDATE
  // ============================================

  /**
   * Met à jour le snap et les helpers visuels
   */
  update(mouse, camera = this.camera) {
    this.currentSnap = this.getSnappedPoint(mouse, camera);
    this._updateHelpers();
    return this.currentSnap;
  }

  setDragStart(point) {
    this.dragStartPoint = point ? point.clone() : null;
  }

  clearDragStart() {
    this.dragStartPoint = null;
    if (this.inferenceLine) this.inferenceLine.visible = false;
  }

  // ============================================
  // HELPERS VISUELS
  // ============================================

  _createHelpers() {
    this.snapMarker = this._createSnapMarker();
    this.snapMarker.visible = false;
    this.helpersGroup.add(this.snapMarker);

    this.inferenceLine = this._createInferenceLine();
    this.inferenceLine.visible = false;
    this.helpersGroup.add(this.inferenceLine);
  }

  _createSnapMarker() {
    const group = new THREE.Group();
    group.name = 'snap-marker';
    group.userData.isHelper = true;
    group.layers.set(this.LAYER_HELPERS);

    // Point central
    const dotGeometry = new THREE.SphereGeometry(1, 16, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 1
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.renderOrder = 10000;
    dot.userData.isHelper = true;
    dot.layers.set(this.LAYER_HELPERS);
    dot.raycast = () => {};
    group.add(dot);

    // Anneau externe
    const ringGeometry = new THREE.RingGeometry(1.5, 2.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.renderOrder = 9999;
    ring.userData.isHelper = true;
    ring.layers.set(this.LAYER_HELPERS);
    ring.raycast = () => {};
    group.add(ring);

    return group;
  }

  _createInferenceLine() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));

    const material = new THREE.LineDashedMaterial({
      color: this.config.inferenceLineColor,
      linewidth: 2,
      dashSize: 10,
      gapSize: 5,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);
    line.renderOrder = 9998;
    line.userData.isHelper = true;
    line.layers.set(this.LAYER_HELPERS);
    line.raycast = () => {};

    return line;
  }

  _updateHelpers() {
    if (!this.config.showHelpers) {
      this.snapMarker.visible = false;
      this.inferenceLine.visible = false;
      return;
    }

    if (this.currentSnap) {
      this._showSnapMarker(this.currentSnap.position, this.currentSnap.type);

      if (this.dragStartPoint) {
        this._showInferenceLine(this.dragStartPoint, this.currentSnap.position);
      }
    } else {
      this.snapMarker.visible = false;
      this.inferenceLine.visible = false;
    }
  }

  _showSnapMarker(position, type) {
    const color = SnapColors[type];

    this.snapMarker.children.forEach(child => {
      if (child.material) {
        child.material.color.setHex(color);
      }
    });

    this.snapMarker.position.copy(position);

    const distance = this.camera.position.distanceTo(position);
    const scale = distance * this.config.markerSize / 500;
    this.snapMarker.scale.setScalar(scale);

    this.snapMarker.quaternion.copy(this.camera.quaternion);
    this.snapMarker.visible = true;
  }

  _showInferenceLine(startPoint, endPoint) {
    const positions = this.inferenceLine.geometry.attributes.position;
    positions.setXYZ(0, startPoint.x, startPoint.y, startPoint.z);
    positions.setXYZ(1, endPoint.x, endPoint.y, endPoint.z);
    positions.needsUpdate = true;

    this.inferenceLine.geometry.computeBoundingSphere();
    this.inferenceLine.computeLineDistances();
    this.inferenceLine.visible = true;
  }

  hideHelpers() {
    this.snapMarker.visible = false;
    this.inferenceLine.visible = false;
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  setEnabled(enabled) {
    this.config.enabled = enabled;
    if (!enabled) {
      this.hideHelpers();
      this.currentSnap = null;
    }
  }

  setPixelThreshold(pixels) {
    this.config.vertexThresholdPx = pixels + 2;
    this.config.midpointThresholdPx = pixels;
    this.config.edgeThresholdPx = pixels - 2;
  }

  setShowHelpers(show) {
    this.config.showHelpers = show;
    if (!show) this.hideHelpers();
  }

  getCurrentSnap() {
    return this.currentSnap;
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  dispose() {
    // Nettoyer les squelettes
    this._clearSkeletons();
    this.scene.remove(this.skeletonGroup);

    // Nettoyer les helpers
    this.scene.remove(this.helpersGroup);
    this.helpersGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.targetMeshes = [];
    this.currentSnap = null;
  }
}

export default SnappingManager;
