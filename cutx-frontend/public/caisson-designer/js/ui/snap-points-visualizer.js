/* ================================================
   SNAP POINTS VISUALIZER - Style AutoCAD minimaliste
   ================================================ */

import * as THREE from 'three';
import { getSnapPoints } from '../utils/snap-points.js';

/**
 * Visualiseur de points de snap (style AutoCAD discret)
 * Affiche des petites croix discrètes sur les points du caisson sélectionné
 */
export class SnapPointsVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.markersGroup = new THREE.Group();
    this.markersGroup.name = 'snap-points-markers';
    this.scene.add(this.markersGroup);

    // Groupe séparé pour les points des caissons cibles (pendant le drag)
    this.targetMarkersGroup = new THREE.Group();
    this.targetMarkersGroup.name = 'snap-points-targets';
    this.scene.add(this.targetMarkersGroup);

    this.currentCaisson = null;
    this.targetCaissons = [];
  }

  /**
   * Affiche les points de snap pour un caisson
   */
  showPoints(caisson) {
    this.clear();

    if (!caisson) return;

    this.currentCaisson = caisson;
    const snapPoints = getSnapPoints(caisson);

    snapPoints.forEach(point => {
      const marker = this.createMarker(point);
      this.markersGroup.add(marker);
    });
  }

  /**
   * Crée un marqueur visuel discret (petite croix style AutoCAD)
   */
  createMarker(point) {
    // Taille selon le type (très petit)
    let size;
    switch (point.type) {
      case 'corner':
        size = 6;
        break;
      case 'edge_center':
        size = 5;
        break;
      case 'face_center':
        size = 7;
        break;
      default:
        size = 5;
    }

    // Couleur unique : blanc discret
    const color = 0xFFFFFF;
    const opacity = 0.4;

    // Créer une croix 3D (deux lignes perpendiculaires)
    const group = new THREE.Group();

    // Matériau pour les lignes
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      depthTest: false
    });

    // Ligne horizontale
    const hPoints = [
      new THREE.Vector3(-size, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ];
    const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
    const hLine = new THREE.Line(hGeometry, material);
    group.add(hLine);

    // Ligne verticale
    const vPoints = [
      new THREE.Vector3(0, -size, 0),
      new THREE.Vector3(0, size, 0)
    ];
    const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
    const vLine = new THREE.Line(vGeometry, material);
    group.add(vLine);

    // Ligne de profondeur
    const dPoints = [
      new THREE.Vector3(0, 0, -size),
      new THREE.Vector3(0, 0, size)
    ];
    const dGeometry = new THREE.BufferGeometry().setFromPoints(dPoints);
    const dLine = new THREE.Line(dGeometry, material);
    group.add(dLine);

    group.position.copy(point.position);
    group.userData.snapPoint = point;
    group.userData.isSnapMarker = true;

    return group;
  }

  /**
   * Trouve le point de snap le plus proche d'une position
   */
  findClosestPoint(mousePosition3D) {
    if (!this.currentCaisson) return null;

    const snapPoints = getSnapPoints(this.currentCaisson);
    let closestPoint = null;
    let minDistance = Infinity;

    snapPoints.forEach(point => {
      const distance = mousePosition3D.distanceTo(point.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    return closestPoint;
  }

  /**
   * Retourne tous les marqueurs pour le raycasting
   */
  getMarkers() {
    return this.markersGroup.children;
  }

  /**
   * Affiche les points de snap des caissons cibles (pendant le drag)
   */
  showTargetPoints(caissons) {
    this.clearTargetPoints();

    if (!caissons || caissons.length === 0) return;

    this.targetCaissons = caissons;

    caissons.forEach(caisson => {
      const snapPoints = getSnapPoints(caisson);

      snapPoints.forEach(point => {
        const marker = this.createTargetMarker(point, caisson.id);
        this.targetMarkersGroup.add(marker);
      });
    });
  }

  /**
   * Crée un marqueur pour un point cible (même style discret)
   */
  createTargetMarker(point, caissonId) {
    let size;
    switch (point.type) {
      case 'corner':
        size = 5;
        break;
      case 'edge_center':
        size = 4;
        break;
      case 'face_center':
        size = 6;
        break;
      default:
        size = 4;
    }

    // Couleur gris clair pour les cibles
    const color = 0xAAAAAA;
    const opacity = 0.3;

    const group = new THREE.Group();

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      depthTest: false
    });

    // Croix simple
    const hPoints = [
      new THREE.Vector3(-size, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ];
    const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
    group.add(new THREE.Line(hGeometry, material));

    const vPoints = [
      new THREE.Vector3(0, -size, 0),
      new THREE.Vector3(0, size, 0)
    ];
    const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
    group.add(new THREE.Line(vGeometry, material));

    group.position.copy(point.position);
    group.userData.snapPoint = point;
    group.userData.isTargetMarker = true;
    group.userData.caissonId = caissonId;

    return group;
  }

  /**
   * Trouve le point cible le plus proche d'une position
   */
  findClosestTargetPoint(anchorPosition, threshold = 100) {
    let closestPoint = null;
    let closestMarker = null;
    let minDistance = threshold;

    this.targetMarkersGroup.children.forEach(marker => {
      const distance = anchorPosition.distanceTo(marker.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = marker.userData.snapPoint;
        closestMarker = marker;
      }
    });

    if (closestPoint) {
      return {
        point: closestPoint,
        marker: closestMarker,
        distance: minDistance
      };
    }

    return null;
  }

  /**
   * Highlight un marqueur cible (quand proche)
   */
  highlightTargetMarker(marker) {
    if (!marker) return;
    marker.scale.set(1.5, 1.5, 1.5);
    marker.children.forEach(child => {
      if (child.material) {
        child.material.opacity = 0.8;
        child.material.color.setHex(0xFFFFFF);
      }
    });
  }

  /**
   * Restaure un marqueur cible à son état normal
   */
  unhighlightTargetMarker(marker) {
    if (!marker) return;
    marker.scale.set(1, 1, 1);
    marker.children.forEach(child => {
      if (child.material) {
        child.material.opacity = 0.3;
        child.material.color.setHex(0xAAAAAA);
      }
    });
  }

  /**
   * Nettoie les marqueurs cibles
   */
  clearTargetPoints() {
    while (this.targetMarkersGroup.children.length > 0) {
      const marker = this.targetMarkersGroup.children[0];
      this.targetMarkersGroup.remove(marker);
      marker.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    this.targetCaissons = [];
  }

  /**
   * Nettoie tous les marqueurs
   */
  clear() {
    while (this.markersGroup.children.length > 0) {
      const marker = this.markersGroup.children[0];
      this.markersGroup.remove(marker);
      marker.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    this.currentCaisson = null;
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    this.clear();
    this.clearTargetPoints();
    this.scene.remove(this.markersGroup);
    this.scene.remove(this.targetMarkersGroup);
  }
}
