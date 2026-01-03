/* ================================================
   INTERACTION MANAGER - Drag-and-drop avec snapping optimisé
   Intégration du SnappingManager pour snap géométrique style SketchUp
   ================================================ */

import * as THREE from 'three';
import { snapVector3ToGrid } from '../utils/snapping.js';
import { checkCaissonCollision } from '../utils/collision.js';
import { getSnapPoints, findClosestSnapPoint, calculateSnappedPosition } from '../utils/snap-points.js';
import { appConfig } from '../core/config.js';
import { SnappingManager, SnapType, SnapColors } from './SnappingManager.js';

/**
 * Gestionnaire d'interactions OPTIMISÉ
 * Snapping intelligent avec cache et throttling
 */
export class InteractionManager {
  constructor(camera, renderer, caissonManager, controls, scene, snapPointsVisualizer = null, toolbar = null) {
    this.camera = camera;
    this.renderer = renderer;
    this.caissonManager = caissonManager;
    this.controls = controls;
    this.scene = scene;
    this.snapPointsVisualizer = snapPointsVisualizer;
    this.toolbar = toolbar;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();  // Plan de drag (perpendiculaire à la caméra)
    this.planeIntersectPoint = new THREE.Vector3();

    // État du drag (workflow SketchUp en 2 phases)
    this.isDragging = false;
    this.draggedCaisson = null;
    this.dragStartPosition = new THREE.Vector3();
    this.dragOffset = new THREE.Vector3();
    this.selectedSnapPoint = null;  // Point de snap sélectionné pour l'ancrage
    this.anchorPoint = null;  // Point d'ancrage une fois cliqué
    this.anchorStartOffset = new THREE.Vector3();  // Offset du point d'ancrage par rapport au centre
    this.hoveredSnapPoint = null;  // Point survolé (magnétisé)
    this.hoveredMarker = null;  // Marqueur actuellement survolé
    this.currentTargetMarker = null;  // Marqueur cible actuellement magnétisé

    // Cache et optimisation
    this.snapPointsCache = new Map(); // Cache des points de snap par caisson
    this.frameCount = 0;
    this.snapCheckInterval = 2; // Vérifier le snap toutes les 2 frames
    this.snapThreshold = 150; // Distance pour activer le snap (mm) - Augmenté pour faciliter l'alignement
    this.currentSnapInfo = null;

    // ========== NOUVEAU: SnappingManager pour snap géométrique ==========
    this.snappingManager = new SnappingManager(scene, camera, renderer);
    this.geometricSnapEnabled = true;  // Activer le snap géométrique par défaut
    this.geometricSnapThresholdPx = 15; // Seuil en pixels
    this.currentGeometricSnap = null;  // Snap géométrique actuel

    // Feedback visuel léger
    this.snapLine = null;
    this.tooltip = this.createTooltip();

    this.enabled = true;
    this.dragEnabled = false; // Désactivé par défaut, activé en mode MOVE

    // Callbacks
    this.onDragStart = null;
    this.onDragMove = null;
    this.onDragEnd = null;
  }

  /**
   * Crée le tooltip
   */
  createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'snap-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(75, 154, 75, 0.9);
      color: white;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      pointer-events: none;
      z-index: 10000;
      display: none;
      font-family: 'Plus Jakarta Sans', sans-serif;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  /**
   * Initialise les événements
   */
  init() {
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);

    this.renderer.domElement.addEventListener('mousedown', this.boundMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.boundMouseMove);

    // Initialiser le SnappingManager avec les meshes existants
    this.updateSnappingTargets();

    console.log('✅ InteractionManager initialisé (workflow SketchUp + Snap Géométrique)');
  }

  /**
   * Met à jour les cibles du SnappingManager avec tous les meshes des caissons
   */
  updateSnappingTargets() {
    const meshes = [];
    const caissons = this.caissonManager.getAllCaissons();

    caissons.forEach(caisson => {
      // Parcourir tous les panneaux du caisson
      caisson.group.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
        }
      });
    });

    this.snappingManager.setObjects(meshes);
    console.log(`🎯 SnappingManager: ${meshes.length} meshes configurés`);
  }

  /**
   * Active/désactive le snap géométrique
   */
  setGeometricSnapEnabled(enabled) {
    this.geometricSnapEnabled = enabled;
    this.snappingManager.setEnabled(enabled);
    console.log(`🎯 Snap géométrique: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  /**
   * Définit le seuil de snap en pixels
   */
  setGeometricSnapThreshold(pixels) {
    this.geometricSnapThresholdPx = pixels;
    this.snappingManager.setPixelThreshold(pixels);
  }

  /**
   * Met à jour le plan de drag (perpendiculaire à la caméra, passant par l'objet)
   */
  updateDragPlane() {
    if (!this.draggedCaisson) return;

    // Créer un plan perpendiculaire à la direction de vue de la caméra
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Le plan passe par la position du caisson
    const planeConstant = -cameraDirection.dot(this.draggedCaisson.group.position);

    this.dragPlane.set(cameraDirection, planeConstant);
  }

  /**
   * Gère le mousedown (workflow SketchUp en 2 phases)
   */
  onMouseDown(event) {
    if (!this.enabled || !this.dragEnabled) return;
    if (event.button !== 0) return;

    this.updateMousePosition(event);

    // PHASE 1: Pas encore de drag, on sélectionne le point d'ancrage
    if (!this.isDragging) {
      // Vérifier si on clique sur un marqueur magnétisé
      const clickedMarker = this.raycastSnapMarker();

      if (clickedMarker && clickedMarker === this.hoveredMarker) {
        // L'utilisateur a cliqué sur le point magnétisé
        // Le caisson est celui actuellement affiché par le visualizer
        const caisson = this.snapPointsVisualizer ? this.snapPointsVisualizer.currentCaisson : null;

        if (caisson) {
          this.anchorPoint = clickedMarker.userData.snapPoint;
          this.startDrag(caisson, event);
          console.log(`📍 Point d'ancrage sélectionné: ${this.anchorPoint.name}`);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
    // PHASE 2: Déjà en drag, on dépose le caisson
    else {
      this.endDrag();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Gère le mousemove
   */
  onMouseMove(event) {
    if (!this.enabled) return;

    this.updateMousePosition(event);

    // Si en train de drag, mettre à jour la position
    if (this.isDragging) {
      this.updateDrag(event);
      event.preventDefault();
    }
    // Sinon, détecter le survol des points de snap (magnétisme)
    else if (this.dragEnabled) {
      this.updateHover(event);

      // Mettre à jour le snap géométrique pour le feedback visuel
      if (this.geometricSnapEnabled) {
        this.currentGeometricSnap = this.snappingManager.update(this.mouse, this.camera);
      }
    }
  }

  /**
   * Détecte et highlight le point de snap le plus proche (magnétisme visuel)
   */
  updateHover(event) {
    const hoveredMarker = this.raycastSnapMarker();

    // Si on survole un nouveau marqueur différent
    if (hoveredMarker !== this.hoveredMarker) {
      // Restaurer l'ancien marqueur
      if (this.hoveredMarker) {
        this.unhighlightMarker(this.hoveredMarker);
      }

      // Mettre à jour le nouveau
      this.hoveredMarker = hoveredMarker;

      if (this.hoveredMarker) {
        this.hoveredSnapPoint = this.hoveredMarker.userData.snapPoint;
        this.highlightMarker(this.hoveredMarker);
        console.log(`🧲 Magnétisé sur: ${this.hoveredSnapPoint.name}`);
      } else {
        this.hoveredSnapPoint = null;
      }
    }
  }

  /**
   * Highlight un marqueur (magnétisé)
   */
  highlightMarker(marker) {
    // Agrandir et rendre plus opaque
    marker.scale.set(1.5, 1.5, 1.5);
    // Les marqueurs sont des groupes avec des lignes en enfants
    marker.children.forEach(child => {
      if (child.material) {
        child.material.opacity = 0.9;
        child.material.color.setHex(0xFFFFFF);
      }
    });
    // Changer curseur
    this.renderer.domElement.style.cursor = 'crosshair';
  }

  /**
   * Restaure un marqueur à son état normal
   */
  unhighlightMarker(marker) {
    marker.scale.set(1, 1, 1);
    // Les marqueurs sont des groupes avec des lignes en enfants
    marker.children.forEach(child => {
      if (child.material) {
        child.material.opacity = 0.4;
        child.material.color.setHex(0xFFFFFF);
      }
    });
    this.renderer.domElement.style.cursor = 'crosshair';
  }

  /**
   * Démarre le drag
   */
  startDrag(caisson, event) {
    this.isDragging = true;
    this.draggedCaisson = caisson;
    this.dragStartPosition.copy(caisson.group.position);
    this.frameCount = 0;

    // Stocker la position initiale du point d'ancrage
    if (this.anchorPoint) {
      this.anchorStartOffset = this.anchorPoint.position.clone().sub(caisson.group.position);
    }

    // Pré-calculer les points de snap des autres caissons (cache)
    this.updateSnapPointsCache();

    // Sélectionner le caisson
    this.caissonManager.selectCaisson(caisson.id);

    // Afficher les points des autres caissons (cibles)
    const otherCaissons = this.caissonManager.getAllCaissonsExcept(caisson.id);
    if (this.snapPointsVisualizer) {
      this.snapPointsVisualizer.showTargetPoints(otherCaissons);
    }

    // ========== NOUVEAU: Configurer le SnappingManager pour le drag ==========
    if (this.geometricSnapEnabled) {
      // Mettre à jour les cibles (exclure le caisson en cours de drag)
      const targetMeshes = [];
      otherCaissons.forEach(c => {
        c.group.traverse((child) => {
          if (child.isMesh) {
            targetMeshes.push(child);
          }
        });
      });
      this.snappingManager.setObjects(targetMeshes);

      // Définir le point de départ pour la ligne d'inférence
      if (this.anchorPoint) {
        this.snappingManager.setDragStart(this.anchorPoint.position);
      } else {
        this.snappingManager.setDragStart(caisson.group.position);
      }
    }

    // Initialiser le plan de drag perpendiculaire à la caméra
    this.updateDragPlane();

    // Calculer l'offset pour le déplacement
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint);
    this.dragOffset.copy(caisson.group.position).sub(this.planeIntersectPoint);

    // Désactiver les contrôles de caméra
    if (this.controls) {
      this.controls.enabled = false;
    }

    this.renderer.domElement.style.cursor = 'grabbing';

    // Cacher les marqueurs du caisson source (on ne garde que les cibles)
    if (this.snapPointsVisualizer) {
      this.snapPointsVisualizer.clear();
    }

    if (this.onDragStart) {
      this.onDragStart(caisson);
    }

    console.log(`🖱️ Drag démarré depuis: ${this.anchorPoint ? this.anchorPoint.name : 'centre'}`);
  }

  /**
   * Met à jour le cache des points de snap
   */
  updateSnapPointsCache() {
    this.snapPointsCache.clear();
    const otherCaissons = this.caissonManager.getAllCaissonsExcept(this.draggedCaisson.id);

    otherCaissons.forEach(caisson => {
      this.snapPointsCache.set(caisson.id, getSnapPoints(caisson));
    });
  }

  /**
   * Met à jour la position pendant le drag (workflow SketchUp - mouvement libre 3D)
   */
  updateDrag(event) {
    if (!this.draggedCaisson) return;

    // Mettre à jour le plan de drag (suit la caméra)
    this.updateDragPlane();

    // Calculer la nouvelle position de base
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersected = this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint);

    // Si pas d'intersection (rare), ne rien faire
    if (!intersected) return;

    // Mouvement libre sur les 3 axes
    let newPosition = this.planeIntersectPoint.clone().add(this.dragOffset);
    let snapped = false;
    let snapTypeUsed = null;

    // Calculer où serait le point d'ancrage à cette nouvelle position
    let anchorCurrentPosition = newPosition.clone();
    if (this.anchorPoint && this.anchorStartOffset) {
      anchorCurrentPosition = newPosition.clone().add(this.anchorStartOffset);
    }

    // ========== NOUVEAU: Snap géométrique (priorité haute) ==========
    if (this.geometricSnapEnabled) {
      // Mettre à jour le snap géométrique
      this.currentGeometricSnap = this.snappingManager.update(this.mouse, this.camera);

      if (this.currentGeometricSnap && this.currentGeometricSnap.type !== SnapType.FACE) {
        // Snap trouvé ! Calculer l'offset pour aligner l'ancre sur le point de snap
        const snapOffset = this.currentGeometricSnap.position.clone().sub(anchorCurrentPosition);
        newPosition.add(snapOffset);
        snapped = true;
        snapTypeUsed = this.currentGeometricSnap.type;

        // Afficher le tooltip avec le type de snap
        if (this.tooltip) {
          const snapLabels = {
            [SnapType.VERTEX]: '🟢 Sommet',
            [SnapType.MIDPOINT]: '🔵 Milieu',
            [SnapType.EDGE]: '🔴 Arête',
            [SnapType.FACE]: '⬜ Face'
          };
          this.tooltip.textContent = snapLabels[this.currentGeometricSnap.type] || 'Snap';
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = `${event.clientX + 15}px`;
          this.tooltip.style.top = `${event.clientY - 25}px`;

          // Changer la couleur du tooltip selon le type
          const snapColorCSS = {
            [SnapType.VERTEX]: 'rgba(0, 200, 0, 0.9)',
            [SnapType.MIDPOINT]: 'rgba(0, 200, 200, 0.9)',
            [SnapType.EDGE]: 'rgba(200, 50, 50, 0.9)',
            [SnapType.FACE]: 'rgba(50, 100, 200, 0.9)'
          };
          this.tooltip.style.background = snapColorCSS[this.currentGeometricSnap.type] || 'rgba(75, 154, 75, 0.9)';
        }
      }
    }

    // ========== Fallback: Snap sur points de caisson (si pas de snap géométrique) ==========
    if (!snapped && this.snapPointsVisualizer) {
      const closestTarget = this.snapPointsVisualizer.findClosestTargetPoint(
        anchorCurrentPosition,
        this.snapThreshold
      );

      // Restaurer l'ancien marqueur cible
      if (this.currentTargetMarker && this.currentTargetMarker !== (closestTarget?.marker)) {
        this.snapPointsVisualizer.unhighlightTargetMarker(this.currentTargetMarker);
      }

      if (closestTarget) {
        // Highlight le marqueur cible
        this.snapPointsVisualizer.highlightTargetMarker(closestTarget.marker);
        this.currentTargetMarker = closestTarget.marker;

        // SNAP! Aligner le point d'ancrage sur le point cible
        const snapOffset = closestTarget.point.position.clone().sub(anchorCurrentPosition);
        newPosition.add(snapOffset);
        snapped = true;

        // Afficher le tooltip
        if (this.tooltip) {
          this.tooltip.textContent = `📍 ${this.anchorPoint?.name || 'Centre'} → ${closestTarget.point.name}`;
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = `${event.clientX + 15}px`;
          this.tooltip.style.top = `${event.clientY - 25}px`;
          this.tooltip.style.background = 'rgba(75, 154, 75, 0.9)';
        }
      } else {
        this.currentTargetMarker = null;
      }
    }

    // Cacher le tooltip si pas de snap
    if (!snapped && this.tooltip) {
      this.tooltip.style.display = 'none';
    }

    // Cacher les helpers du SnappingManager si on utilise le snap classique
    if (snapped && snapTypeUsed === null) {
      this.snappingManager.hideHelpers();
    }

    // Appliquer la position
    this.draggedCaisson.group.position.copy(newPosition);
    this.dragStartPosition.copy(newPosition);
    this.renderer.domElement.style.cursor = 'grabbing';

    if (this.onDragMove) {
      this.onDragMove(this.draggedCaisson);
    }
  }

  /**
   * Trouve les caissons proches (optimisation)
   */
  findNearCaissons(position, caissons, maxDistance) {
    return caissons.filter(caisson => {
      const caissonPos = caisson.group.position;
      const distance = Math.sqrt(
        Math.pow(position.x - caissonPos.x, 2) +
        Math.pow(position.z - caissonPos.z, 2)
      );
      return distance < maxDistance;
    });
  }

  /**
   * Affiche le feedback visuel (léger)
   */
  showSnapFeedback(snapInfo, event) {
    // Ligne simple
    this.hideSnapLine();

    const points = [
      snapInfo.sourcePoint.position,
      snapInfo.targetPoint.position
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x4CAF50,
      linewidth: 2,
      dashSize: 10,
      gapSize: 5
    });

    this.snapLine = new THREE.Line(geometry, material);
    this.snapLine.computeLineDistances();

    // Ajouter des marqueurs visuels sur les points (comme SketchUp)
    // Marqueur source (point du caisson en mouvement) - Rouge vif
    const sourceMarker = new THREE.Mesh(
      new THREE.SphereGeometry(25, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.9,
        depthTest: false  // Toujours visible devant tout
      })
    );
    sourceMarker.position.copy(snapInfo.sourcePoint.position);
    this.snapLine.add(sourceMarker);

    // Marqueur cible (point du caisson fixe) - Vert vif
    const targetMarker = new THREE.Mesh(
      new THREE.SphereGeometry(25, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.9,
        depthTest: false  // Toujours visible devant tout
      })
    );
    targetMarker.position.copy(snapInfo.targetPoint.position);
    this.snapLine.add(targetMarker);

    this.scene.add(this.snapLine);

    // Tooltip amélioré (style SketchUp)
    if (this.tooltip) {
      const typeNames = {
        'corner': 'Coin',
        'edge_center': 'Centre arête',
        'face_center': 'Centre face'
      };
      const sourceName = typeNames[snapInfo.sourcePoint.type] || snapInfo.sourcePoint.type;
      const targetName = typeNames[snapInfo.targetPoint.type] || snapInfo.targetPoint.type;

      this.tooltip.textContent = `📍 ${sourceName} → ${targetName}`;
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${event.clientX + 15}px`;
      this.tooltip.style.top = `${event.clientY - 25}px`;
    }
  }

  /**
   * Cache le feedback visuel
   */
  hideSnapFeedback() {
    this.hideSnapLine();
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  /**
   * Cache la ligne de snap
   */
  hideSnapLine() {
    if (this.snapLine) {
      this.scene.remove(this.snapLine);
      this.snapLine.geometry.dispose();
      this.snapLine.material.dispose();
      this.snapLine = null;
    }
  }

  /**
   * Termine le drag
   */
  endDrag() {
    const draggedCaisson = this.draggedCaisson;

    if (draggedCaisson) {
      console.log(`✅ Drag terminé`);
    }

    // Nettoyer les marqueurs cibles
    if (this.snapPointsVisualizer) {
      this.snapPointsVisualizer.clearTargetPoints();
    }

    // ========== NOUVEAU: Nettoyer le SnappingManager ==========
    if (this.snappingManager) {
      this.snappingManager.clearDragStart();
      this.snappingManager.hideHelpers();
      this.currentGeometricSnap = null;

      // Restaurer tous les meshes comme cibles
      this.updateSnappingTargets();
    }

    // Réinitialiser les états
    this.isDragging = false;
    this.draggedCaisson = null;
    this.currentSnapInfo = null;
    this.selectedSnapPoint = null;
    this.anchorPoint = null;
    this.anchorStartOffset = new THREE.Vector3();
    this.currentTargetMarker = null;
    this.snapPointsCache.clear();
    this.hideSnapFeedback();

    if (this.controls) {
      this.controls.enabled = true;
    }

    // Rester en mode crosshair si drag toujours activé
    this.renderer.domElement.style.cursor = this.dragEnabled ? 'crosshair' : 'default';

    // Callback après pour réafficher les points
    if (draggedCaisson && this.onDragEnd) {
      this.onDragEnd(draggedCaisson);
    }
  }

  /**
   * Met à jour la position de la souris
   */
  updateMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Lance un rayon et retourne le marqueur de snap cliqué
   */
  raycastSnapMarker() {
    if (!this.snapPointsVisualizer) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const markers = this.snapPointsVisualizer.getMarkers();

    if (markers.length === 0) return null;

    // Essayer avec récursion pour attraper les enfants aussi
    const intersects = this.raycaster.intersectObjects(markers, true);

    if (intersects.length > 0) {
      // Si on a touché le glow (enfant), remonter au parent
      const hitObject = intersects[0].object;
      if (hitObject.userData.isSnapMarker) {
        return hitObject;
      } else if (hitObject.parent && hitObject.parent.userData.isSnapMarker) {
        return hitObject.parent;
      }
    }

    return null;
  }

  /**
   * Lance un rayon et retourne le caisson intersecté
   */
  raycastCaisson() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allCaissons = this.caissonManager.getAllCaissons();
    const objects = allCaissons.flatMap(c => c.group.children);

    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      return this.caissonManager.getCaissonByObject(intersects[0].object);
    }

    return null;
  }

  /**
   * Active/désactive les interactions
   */
  setEnabled(enabled) {
    this.enabled = enabled;

    if (!enabled && this.isDragging) {
      this.endDrag();
    }
  }

  /**
   * Active/désactive le mode drag (pour la toolbar)
   */
  setDragEnabled(enabled) {
    this.dragEnabled = enabled;
    console.log(`🔧 Mode drag: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);

    if (enabled) {
      // Changer le curseur en croix
      this.renderer.domElement.style.cursor = 'crosshair';
    } else {
      // Restaurer le curseur
      this.renderer.domElement.style.cursor = 'default';

      // Nettoyer l'état de survol
      if (this.hoveredMarker) {
        this.unhighlightMarker(this.hoveredMarker);
        this.hoveredMarker = null;
        this.hoveredSnapPoint = null;
      }

      // Arrêter le drag si en cours
      if (this.isDragging) {
        this.endDrag();
      }
    }
  }

  /**
   * Nettoie les événements
   */
  dispose() {
    this.renderer.domElement.removeEventListener('mousedown', this.boundMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.boundMouseMove);
    this.hideSnapFeedback();
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }

    // ========== NOUVEAU: Nettoyer le SnappingManager ==========
    if (this.snappingManager) {
      this.snappingManager.dispose();
    }
  }

  /**
   * Retourne le SnappingManager pour usage externe
   */
  getSnappingManager() {
    return this.snappingManager;
  }
}
