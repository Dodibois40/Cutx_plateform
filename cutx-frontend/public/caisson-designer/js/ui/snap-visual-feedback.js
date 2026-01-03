/* ================================================
   SNAP VISUAL FEEDBACK - Feedback visuel pour le snapping
   ================================================ */

import * as THREE from 'three';
import { SnapPointColors } from '../utils/snap-points.js';

/**
 * Gestionnaire du feedback visuel de snapping
 */
export class SnapVisualFeedback {
  constructor(scene) {
    this.scene = scene;

    // Groupe pour tous les éléments visuels
    this.visualGroup = new THREE.Group();
    this.visualGroup.name = 'snap-visuals';
    this.scene.add(this.visualGroup);

    // Ligne d'inférence
    this.inferenceLine = null;

    // Marqueurs de points
    this.sourceMarker = null;
    this.targetMarker = null;

    // Tooltip HTML
    this.tooltip = this.createTooltip();
  }

  /**
   * Crée le tooltip HTML
   */
  createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'snap-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      pointer-events: none;
      z-index: 10000;
      display: none;
      white-space: nowrap;
      font-family: 'Plus Jakarta Sans', sans-serif;
    `;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  /**
   * Affiche la ligne d'inférence entre deux points
   */
  showInferenceLine(sourcePoint, targetPoint) {
    this.clearInferenceLine();

    // Créer une ligne pointillée
    const points = [sourcePoint, targetPoint];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
      color: 0x00FFFF,
      linewidth: 2,
      dashSize: 10,
      gapSize: 5
    });

    this.inferenceLine = new THREE.Line(geometry, material);
    this.inferenceLine.computeLineDistances();
    this.visualGroup.add(this.inferenceLine);
  }

  /**
   * Affiche un marqueur sur un point
   */
  showMarker(position, color, size = 15) {
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });

    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);

    // Ajouter un glow
    const glowGeometry = new THREE.SphereGeometry(size * 1.5, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    marker.add(glow);

    return marker;
  }

  /**
   * Affiche le feedback complet de snapping
   */
  show(sourcePoint, targetPoint, snapInfo) {
    // Ligne d'inférence
    this.showInferenceLine(sourcePoint.position, targetPoint.position);

    // Marqueur source (point du caisson en mouvement)
    const sourceColor = SnapPointColors[sourcePoint.type];
    this.sourceMarker = this.showMarker(sourcePoint.position, sourceColor);
    this.visualGroup.add(this.sourceMarker);

    // Marqueur cible (point du caisson fixe)
    const targetColor = SnapPointColors[targetPoint.type];
    this.targetMarker = this.showMarker(targetPoint.position, targetColor);
    this.visualGroup.add(this.targetMarker);

    // Animation de pulsation
    this.animateMarkers();

    // Tooltip
    this.showTooltip(snapInfo);
  }

  /**
   * Anime les marqueurs (pulsation)
   */
  animateMarkers() {
    if (this.sourceMarker) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
      this.sourceMarker.scale.setScalar(scale);
    }
    if (this.targetMarker) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
      this.targetMarker.scale.setScalar(scale);
    }
  }

  /**
   * Affiche le tooltip avec les informations de snap
   */
  showTooltip(snapInfo) {
    if (!this.tooltip) return;

    const text = this.getSnapText(snapInfo);
    this.tooltip.textContent = text;
    this.tooltip.style.display = 'block';

    // Positionner le tooltip près du curseur
    this.updateTooltipPosition();
  }

  /**
   * Génère le texte du tooltip
   */
  getSnapText(snapInfo) {
    const { sourcePoint, targetPoint } = snapInfo;

    if (sourcePoint.type === targetPoint.type) {
      switch (sourcePoint.type) {
        case 'corner':
          return '📍 Coin à coin';
        case 'edge_center':
          return '📍 Centre à centre (arête)';
        case 'face_center':
          return '📍 Centre à centre (face)';
      }
    }

    return `📍 ${sourcePoint.name} → ${targetPoint.name}`;
  }

  /**
   * Met à jour la position du tooltip
   */
  updateTooltipPosition(x, y) {
    if (!this.tooltip) return;

    if (x !== undefined && y !== undefined) {
      this.tooltip.style.left = `${x + 20}px`;
      this.tooltip.style.top = `${y - 10}px`;
    }
  }

  /**
   * Cache la ligne d'inférence
   */
  clearInferenceLine() {
    if (this.inferenceLine) {
      this.visualGroup.remove(this.inferenceLine);
      this.inferenceLine.geometry.dispose();
      this.inferenceLine.material.dispose();
      this.inferenceLine = null;
    }
  }

  /**
   * Cache les marqueurs
   */
  clearMarkers() {
    if (this.sourceMarker) {
      this.visualGroup.remove(this.sourceMarker);
      this.sourceMarker.geometry.dispose();
      this.sourceMarker.material.dispose();
      this.sourceMarker = null;
    }
    if (this.targetMarker) {
      this.visualGroup.remove(this.targetMarker);
      this.targetMarker.geometry.dispose();
      this.targetMarker.material.dispose();
      this.targetMarker = null;
    }
  }

  /**
   * Cache le tooltip
   */
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  /**
   * Cache tout le feedback visuel
   */
  hide() {
    this.clearInferenceLine();
    this.clearMarkers();
    this.hideTooltip();
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    this.hide();
    this.scene.remove(this.visualGroup);
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}
