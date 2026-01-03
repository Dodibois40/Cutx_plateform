/* ================================================
   MEASURE TOOL - Outil de mesure (style SketchUp)
   Intégration du SnappingManager pour snap géométrique précis
   ================================================ */

import * as THREE from 'three';
import { SnapType, SnapColors } from '../managers/SnappingManager.js';

/**
 * Outil de mesure pour calculer les distances
 */
export class MeasureTool {
  constructor(camera, renderer, scene, snapPointsVisualizer = null) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.snapPointsVisualizer = snapPointsVisualizer;
    this.guideTool = null;  // Référence au GuideTool pour snapper sur les guides
    this.caissonManager = null;  // Référence au CaissonManager pour le snap sur arêtes

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.planeIntersectPoint = new THREE.Vector3();

    // État de la mesure
    this.isActive = false;
    this.isMeasuring = false;
    this.startPoint = null;
    this.endPoint = null;
    this.previewEndPoint = new THREE.Vector3();

    // Inférence d'axes (style SketchUp)
    this.lockedAxis = null;  // 'x', 'y', 'z' ou null (libre)
    this.snappedAxis = null;  // Axe sur lequel on est aligné (inférence automatique)
    this.inferenceThreshold = 8;  // Degrés pour snap automatique sur un axe

    // Snap sur géométrie (style SketchUp)
    this.currentSnapType = null;  // 'corner', 'edge', 'face', 'guide', null
    this.currentSnapPoint = null;  // Point 3D du snap actuel
    this.edgeSnapThreshold = 30;   // Distance écran pour snap sur arête
    this.cornerSnapThreshold = 40; // Distance écran pour snap sur coin (plus large)

    // Éléments visuels
    this.measureLine = null;
    this.measureLabel = null;
    this.startMarker = null;
    this.endMarker = null;

    // Curseur de snap (petit cercle qui suit la souris)
    this.snapCursor = this.createSnapCursor();

    // Groupe pour les éléments de mesure
    this.measureGroup = new THREE.Group();
    this.measureGroup.name = 'measure-tool';
    this.scene.add(this.measureGroup);

    // Label HTML pour afficher la distance
    this.labelElement = this.createLabelElement();

    // Indicateur d'axe (style SketchUp)
    this.axisIndicator = this.createAxisIndicator();

    // Label de snap (affiche le type de point)
    this.snapLabel = this.createSnapLabel();

    // Bindings
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * Définit la référence au CaissonManager
   */
  setCaissonManager(caissonManager) {
    this.caissonManager = caissonManager;
  }

  /**
   * Définit la référence au SnappingManager pour le snap géométrique
   */
  setSnappingManager(snappingManager) {
    this.snappingManager = snappingManager;
    this.useGeometricSnap = true; // Activer le snap géométrique par défaut
  }

  /**
   * Crée le curseur de snap (petite croix style AutoCAD)
   */
  createSnapCursor() {
    const group = new THREE.Group();
    group.visible = false;
    group.renderOrder = 999;

    // Matériau blanc discret
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });

    const size = 8;

    // Croix horizontale
    const hPoints = [
      new THREE.Vector3(-size, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ];
    const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
    const hLine = new THREE.Line(hGeometry, material);
    group.add(hLine);

    // Croix verticale
    const vPoints = [
      new THREE.Vector3(0, -size, 0),
      new THREE.Vector3(0, size, 0)
    ];
    const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
    const vLine = new THREE.Line(vGeometry, material);
    group.add(vLine);

    // Stocker la référence au matériau pour changer la couleur
    group.userData.material = material;

    this.scene.add(group);
    return group;
  }

  /**
   * Crée le label de snap (affiche "Coin", "Arête", etc.)
   */
  createSnapLabel() {
    const label = document.createElement('div');
    label.id = 'snap-label';
    label.style.cssText = `
      position: fixed;
      background: transparent;
      color: rgba(255, 255, 255, 0.6);
      padding: 2px 4px;
      font-size: 10px;
      font-family: 'Consolas', 'Monaco', monospace;
      pointer-events: none;
      z-index: 10001;
      display: none;
      white-space: nowrap;
      text-transform: lowercase;
    `;
    document.body.appendChild(label);
    return label;
  }

  /**
   * Met à jour le curseur de snap selon le type
   */
  updateSnapCursor(point, snapType, snapInfo = null) {
    if (!point) {
      this.snapCursor.visible = false;
      this.snapLabel.style.display = 'none';
      this.currentSnapType = null;
      this.currentSnapPoint = null;
      return;
    }

    this.currentSnapType = snapType;
    this.currentSnapPoint = point.clone();
    this.snapCursor.visible = true;
    this.snapCursor.position.copy(point);

    // Orienter le curseur vers la caméra
    this.snapCursor.lookAt(this.camera.position);

    // Style discret - tout en blanc avec opacité variable
    const material = this.snapCursor.userData.material;
    let opacity, scale, labelText;

    switch (snapType) {
      case 'corner':
        opacity = 0.9;
        scale = 1.2;
        labelText = 'coin';
        break;
      case 'edge':
        opacity = 0.7;
        scale = 1.0;
        labelText = 'arête';
        break;
      case 'face':
        opacity = 0.5;
        scale = 0.8;
        labelText = 'face';
        break;
      case 'guide':
        opacity = 0.8;
        scale = 1.1;
        labelText = 'guide';
        break;
      case 'endpoint':
        opacity = 0.9;
        scale = 1.2;
        labelText = 'point';
        break;
      default:
        opacity = 0.4;
        scale = 0.7;
        labelText = null;
    }

    // Appliquer le style
    if (material) {
      material.opacity = opacity;
    }
    this.snapCursor.scale.setScalar(scale);

    // Mettre à jour le label de snap (discret)
    if (labelText && snapType !== 'free') {
      this.snapLabel.textContent = labelText;
      this.snapLabel.style.display = 'block';

      // Positionner près du curseur 3D
      const screenPos = point.clone().project(this.camera);
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = (screenPos.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height + rect.top;
      this.snapLabel.style.left = `${x + 12}px`;
      this.snapLabel.style.top = `${y - 15}px`;
    } else {
      this.snapLabel.style.display = 'none';
    }
  }

  /**
   * Crée l'indicateur d'axe (style AutoCAD discret)
   */
  createAxisIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'measure-axis-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 10px;
      border-radius: 2px;
      font-size: 10px;
      font-family: 'Consolas', 'Monaco', monospace;
      pointer-events: none;
      z-index: 10000;
      display: none;
      background: rgba(0, 0, 0, 0.5);
      color: rgba(255, 255, 255, 0.7);
      text-transform: lowercase;
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  /**
   * Affiche l'indicateur d'axe (style discret)
   */
  showAxisIndicator(axis, locked = false) {
    const texts = {
      x: 'axe x',
      y: 'axe y',
      z: 'axe z'
    };

    if (axis && texts[axis]) {
      this.axisIndicator.style.display = 'block';
      this.axisIndicator.textContent = locked ? `[${texts[axis]}]` : texts[axis];
    } else {
      this.axisIndicator.style.display = 'none';
    }
  }

  /**
   * Crée l'élément HTML pour le label de distance (style AutoCAD)
   */
  createLabelElement() {
    const label = document.createElement('div');
    label.id = 'measure-label';
    label.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.6);
      color: rgba(255, 255, 255, 0.9);
      padding: 3px 8px;
      border-radius: 2px;
      font-size: 11px;
      font-family: 'Consolas', 'Monaco', monospace;
      pointer-events: none;
      z-index: 10000;
      display: none;
    `;
    document.body.appendChild(label);
    return label;
  }

  /**
   * Active l'outil
   */
  setEnabled(enabled) {
    if (enabled && !this.isActive) {
      this.isActive = true;
      this.renderer.domElement.addEventListener('mousedown', this.boundMouseDown);
      this.renderer.domElement.addEventListener('mousemove', this.boundMouseMove);
      document.addEventListener('keydown', this.boundKeyDown);
      this.renderer.domElement.style.cursor = 'crosshair';
      console.log('📏 Outil Mètre activé');
    } else if (!enabled && this.isActive) {
      this.isActive = false;
      this.renderer.domElement.removeEventListener('mousedown', this.boundMouseDown);
      this.renderer.domElement.removeEventListener('mousemove', this.boundMouseMove);
      document.removeEventListener('keydown', this.boundKeyDown);
      this.renderer.domElement.style.cursor = 'default';
      this.clearMeasurement();
      console.log('📏 Outil Mètre désactivé');
    }
  }

  /**
   * Gère le clic souris
   */
  onMouseDown(event) {
    if (event.button !== 0) return;

    this.updateMousePosition(event);
    const point = this.getPointAtMouse();

    if (!point) return;

    if (!this.isMeasuring) {
      // Premier clic : définir le point de départ
      this.startPoint = point.clone();
      this.isMeasuring = true;
      this.createStartMarker(point);
      console.log(`📍 Point de départ: (${point.x.toFixed(0)}, ${point.y.toFixed(0)}, ${point.z.toFixed(0)})`);
    } else {
      // Deuxième clic : définir le point d'arrivée
      this.endPoint = point.clone();
      this.isMeasuring = false;
      this.createEndMarker(point);
      this.finalizeMeasurement();
    }
  }

  /**
   * Gère le mouvement de la souris
   */
  onMouseMove(event) {
    if (!this.isActive) return;

    this.updateMousePosition(event);
    const point = this.getPointAtMouse();

    // Toujours mettre à jour le curseur de snap (même sans mesurer)
    // Le curseur est déjà mis à jour dans getPointAtMouse()

    if (point && this.isMeasuring && this.startPoint) {
      // Appliquer le verrouillage ou l'inférence d'axe
      const constrainedPoint = this.applyAxisConstraint(point);
      this.previewEndPoint.copy(constrainedPoint);
      this.updatePreviewLine();
      this.updateLabel(event.clientX, event.clientY);

      // Mettre à jour l'indicateur d'axe
      if (this.lockedAxis) {
        this.showAxisIndicator(this.lockedAxis, true);
      } else {
        this.showAxisIndicator(this.snappedAxis, false);
      }
    }
  }

  /**
   * Applique le verrouillage ou l'inférence d'axe au point
   */
  applyAxisConstraint(point) {
    if (!this.startPoint) return point;

    const direction = point.clone().sub(this.startPoint);
    const distance = direction.length();

    if (distance < 0.001) return point;

    // Si un axe est verrouillé, projeter sur cet axe
    if (this.lockedAxis) {
      const axisDir = this.getAxisDirection(this.lockedAxis);
      const projectedDist = direction.dot(axisDir);
      this.snappedAxis = this.lockedAxis;
      return this.startPoint.clone().add(axisDir.multiplyScalar(projectedDist));
    }

    // Sinon, vérifier l'inférence automatique
    const normalized = direction.clone().normalize();
    const axes = [
      { name: 'x', dir: new THREE.Vector3(1, 0, 0) },
      { name: 'y', dir: new THREE.Vector3(0, 1, 0) },
      { name: 'z', dir: new THREE.Vector3(0, 0, 1) }
    ];

    for (const axis of axes) {
      // Vérifier alignement positif et négatif
      const dotProduct = Math.abs(normalized.dot(axis.dir));
      const angle = Math.acos(Math.min(1, dotProduct)) * (180 / Math.PI);

      if (angle < this.inferenceThreshold) {
        // Snapper sur cet axe
        this.snappedAxis = axis.name;
        const projectedDist = direction.dot(axis.dir);
        return this.startPoint.clone().add(axis.dir.clone().multiplyScalar(projectedDist));
      }
    }

    // Pas d'inférence
    this.snappedAxis = null;
    return point;
  }

  /**
   * Retourne la direction d'un axe
   */
  getAxisDirection(axis) {
    switch (axis) {
      case 'x': return new THREE.Vector3(1, 0, 0);
      case 'y': return new THREE.Vector3(0, 1, 0);
      case 'z': return new THREE.Vector3(0, 0, 1);
      default: return new THREE.Vector3(1, 0, 0);
    }
  }

  /**
   * Retourne la couleur d'un axe
   */
  getAxisColor(axis) {
    switch (axis) {
      case 'x': return 0xFF0000;  // Rouge
      case 'y': return 0x00CC00;  // Vert
      case 'z': return 0x0066FF;  // Bleu
      default: return 0xFFD700;   // Or (défaut)
    }
  }

  /**
   * Gère les touches clavier
   */
  onKeyDown(event) {
    if (event.target.tagName === 'INPUT') return;

    switch (event.key) {
      case 'Escape':
        this.clearMeasurement();
        break;
      case 'ArrowRight':
        // Verrouiller sur X (Rouge)
        this.lockAxis('x');
        event.preventDefault();
        break;
      case 'ArrowUp':
        // Verrouiller sur Y (Vert)
        this.lockAxis('y');
        event.preventDefault();
        break;
      case 'ArrowLeft':
        // Verrouiller sur Z (Bleu)
        this.lockAxis('z');
        event.preventDefault();
        break;
      case 'ArrowDown':
        // Libérer le verrouillage
        this.lockAxis(null);
        event.preventDefault();
        break;
    }
  }

  /**
   * Verrouille la direction sur un axe
   */
  lockAxis(axis) {
    this.lockedAxis = axis;
    if (axis) {
      console.log(`🔒 Mesure verrouillée sur l'axe ${axis.toUpperCase()}`);
      this.showAxisIndicator(axis, true);
    } else {
      console.log('🔓 Mesure libre');
      this.showAxisIndicator(null);
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
   * Définit la référence au GuideTool
   */
  setGuideTool(guideTool) {
    this.guideTool = guideTool;
  }

  /**
   * Calcule les 12 arêtes d'un caisson
   */
  getCaissonEdges(caisson) {
    const config = caisson.config;
    const pos = caisson.group.position;

    const halfWidth = config.width / 2;
    const halfDepth = config.depth / 2;

    // 8 coins du caisson
    const corners = [
      new THREE.Vector3(pos.x - halfWidth, pos.y, pos.z - halfDepth),                    // 0: inf avant gauche
      new THREE.Vector3(pos.x + halfWidth, pos.y, pos.z - halfDepth),                    // 1: inf avant droit
      new THREE.Vector3(pos.x - halfWidth, pos.y, pos.z + halfDepth),                    // 2: inf arrière gauche
      new THREE.Vector3(pos.x + halfWidth, pos.y, pos.z + halfDepth),                    // 3: inf arrière droit
      new THREE.Vector3(pos.x - halfWidth, pos.y + config.height, pos.z - halfDepth),    // 4: sup avant gauche
      new THREE.Vector3(pos.x + halfWidth, pos.y + config.height, pos.z - halfDepth),    // 5: sup avant droit
      new THREE.Vector3(pos.x - halfWidth, pos.y + config.height, pos.z + halfDepth),    // 6: sup arrière gauche
      new THREE.Vector3(pos.x + halfWidth, pos.y + config.height, pos.z + halfDepth)     // 7: sup arrière droit
    ];

    // 12 arêtes
    const edges = [
      // Arêtes inférieures (4)
      { start: corners[0], end: corners[1], axis: 'x', type: 'bottom' },
      { start: corners[2], end: corners[3], axis: 'x', type: 'bottom' },
      { start: corners[0], end: corners[2], axis: 'z', type: 'bottom' },
      { start: corners[1], end: corners[3], axis: 'z', type: 'bottom' },
      // Arêtes supérieures (4)
      { start: corners[4], end: corners[5], axis: 'x', type: 'top' },
      { start: corners[6], end: corners[7], axis: 'x', type: 'top' },
      { start: corners[4], end: corners[6], axis: 'z', type: 'top' },
      { start: corners[5], end: corners[7], axis: 'z', type: 'top' },
      // Arêtes verticales (4)
      { start: corners[0], end: corners[4], axis: 'y', type: 'vertical' },
      { start: corners[1], end: corners[5], axis: 'y', type: 'vertical' },
      { start: corners[2], end: corners[6], axis: 'y', type: 'vertical' },
      { start: corners[3], end: corners[7], axis: 'y', type: 'vertical' }
    ];

    return { corners, edges };
  }

  /**
   * Trouve le snap le plus proche (coin, arête, face) sur tous les caissons
   */
  findBestSnap() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    let bestSnap = null;
    let minScreenDist = Infinity;

    // ========== NOUVEAU: Priorité 0 - Snap géométrique via SnappingManager ==========
    if (this.useGeometricSnap && this.snappingManager) {
      const geoSnap = this.snappingManager.getSnappedPoint(this.mouse, this.camera);

      if (geoSnap && geoSnap.type !== SnapType.FACE) {
        // Convertir le type de snap géométrique vers le type MeasureTool
        const typeMap = {
          [SnapType.VERTEX]: 'corner',
          [SnapType.MIDPOINT]: 'edge',  // Milieu traité comme arête pour la couleur
          [SnapType.EDGE]: 'edge'
        };

        return {
          point: geoSnap.position.clone(),
          type: typeMap[geoSnap.type] || 'edge',
          info: { geometricType: geoSnap.type, distance: geoSnap.distance }
        };
      }
    }

    // 1. D'abord vérifier les points de snap visuels (priorité max pour les coins colorés)
    if (this.snapPointsVisualizer) {
      const markers = this.snapPointsVisualizer.getMarkers();
      for (const marker of markers) {
        const snapPoint = marker.userData.snapPoint;
        if (!snapPoint) continue;

        const screenDist = this.getScreenDistance(snapPoint.position);
        if (screenDist < this.cornerSnapThreshold && screenDist < minScreenDist) {
          minScreenDist = screenDist;
          bestSnap = {
            point: snapPoint.position.clone(),
            type: 'endpoint',
            info: { name: snapPoint.name }
          };
        }
      }
    }

    // 2. Vérifier les guides
    const guideSnap = this.findGuideSnap();
    if (guideSnap && guideSnap.screenDist < minScreenDist) {
      minScreenDist = guideSnap.screenDist;
      bestSnap = guideSnap;
    }

    // 3. Parcourir tous les caissons pour les arêtes et coins
    if (this.caissonManager) {
      const caissons = this.caissonManager.getAllCaissons();

      for (const caisson of caissons) {
        const { corners, edges } = this.getCaissonEdges(caisson);

        // Vérifier les coins en premier (priorité plus haute)
        for (let i = 0; i < corners.length; i++) {
          const corner = corners[i];
          const screenDist = this.getScreenDistance(corner);

          if (screenDist < this.cornerSnapThreshold && screenDist < minScreenDist) {
            minScreenDist = screenDist;
            bestSnap = {
              point: corner.clone(),
              type: 'corner',
              info: { index: i }
            };
          }
        }

        // Vérifier les arêtes
        for (const edge of edges) {
          const closestOnEdge = this.closestPointOnSegment(edge.start, edge.end);
          if (closestOnEdge) {
            const screenDist = this.getScreenDistance(closestOnEdge);

            if (screenDist < this.edgeSnapThreshold && screenDist < minScreenDist) {
              // Vérifier si c'est proche d'un bout de l'arête (snap sur extrémité = coin)
              const distToStart = closestOnEdge.distanceTo(edge.start);
              const distToEnd = closestOnEdge.distanceTo(edge.end);
              const edgeLength = edge.start.distanceTo(edge.end);

              if (distToStart < 20 || distToEnd < 20) {
                // Proche d'une extrémité = snap sur le coin
                const nearestCorner = distToStart < distToEnd ? edge.start : edge.end;
                minScreenDist = screenDist;
                bestSnap = {
                  point: nearestCorner.clone(),
                  type: 'corner',
                  info: { axis: edge.axis }
                };
              } else {
                // Sur l'arête
                minScreenDist = screenDist;
                bestSnap = {
                  point: closestOnEdge.clone(),
                  type: 'edge',
                  info: { axis: edge.axis }
                };
              }
            }
          }
        }
      }
    }

    return bestSnap;
  }

  /**
   * Calcule la distance écran entre la souris et un point 3D
   */
  getScreenDistance(point3D) {
    const screenPos = point3D.clone().project(this.camera);
    const mouseScreen = new THREE.Vector2(this.mouse.x, this.mouse.y);
    const pointScreen = new THREE.Vector2(screenPos.x, screenPos.y);
    // Multiplier par la largeur de l'écran pour avoir une distance en pixels
    return mouseScreen.distanceTo(pointScreen) * this.renderer.domElement.clientWidth / 2;
  }

  /**
   * Trouve le point le plus proche sur un segment
   */
  closestPointOnSegment(start, end) {
    const rayOrigin = this.raycaster.ray.origin;
    const rayDir = this.raycaster.ray.direction;

    const lineDir = new THREE.Vector3().subVectors(end, start);
    const lineLength = lineDir.length();
    if (lineLength < 0.001) return null;
    lineDir.normalize();

    // Calcul du point le plus proche entre le rayon et le segment
    const w0 = new THREE.Vector3().subVectors(rayOrigin, start);
    const a = rayDir.dot(rayDir);
    const b = rayDir.dot(lineDir);
    const c = lineDir.dot(lineDir);
    const d = rayDir.dot(w0);
    const e = lineDir.dot(w0);

    const denom = a * c - b * b;
    if (Math.abs(denom) < 0.001) return null;

    const t = (a * e - b * d) / denom;  // Paramètre sur la ligne

    // Clamper t entre 0 et la longueur du segment
    const tClamped = Math.max(0, Math.min(lineLength, t));

    return start.clone().add(lineDir.clone().multiplyScalar(tClamped));
  }

  /**
   * Trouve le snap sur les guides
   */
  findGuideSnap() {
    if (!this.guideTool) return null;

    const guideGroup = this.guideTool.guideGroup;
    if (!guideGroup || guideGroup.children.length === 0) return null;

    let bestSnap = null;
    let minScreenDist = Infinity;

    guideGroup.children.forEach(child => {
      if (child.userData.type === 'guide-point') {
        const screenDist = this.getScreenDistance(child.position);
        if (screenDist < this.cornerSnapThreshold && screenDist < minScreenDist) {
          minScreenDist = screenDist;
          bestSnap = {
            point: child.position.clone(),
            type: 'guide',
            info: { subtype: 'point' },
            screenDist: screenDist
          };
        }
      } else if (child.userData.type === 'guide-line' && child.geometry) {
        const positions = child.geometry.attributes.position;
        if (positions && positions.count >= 2) {
          const lineStart = new THREE.Vector3().fromBufferAttribute(positions, 0);
          const lineEnd = new THREE.Vector3().fromBufferAttribute(positions, 1);

          const closestOnLine = this.closestPointOnSegment(lineStart, lineEnd);
          if (closestOnLine) {
            const screenDist = this.getScreenDistance(closestOnLine);
            if (screenDist < this.edgeSnapThreshold && screenDist < minScreenDist) {
              minScreenDist = screenDist;
              bestSnap = {
                point: closestOnLine.clone(),
                type: 'guide',
                info: { subtype: 'line' },
                screenDist: screenDist
              };
            }
          }
        }
      }
    });

    return bestSnap;
  }

  /**
   * Obtient le point 3D sous la souris avec snap intelligent
   */
  getPointAtMouse() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Trouver le meilleur snap
    const snap = this.findBestSnap();

    if (snap) {
      this.updateSnapCursor(snap.point, snap.type, snap.info);
      return snap.point;
    }

    // Pas de snap - point libre sur le plan
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    let planeY = 0;
    if (this.startPoint) {
      planeY = this.startPoint.y;
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const point = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(plane, point)) {
      this.updateSnapCursor(point, 'free');
      return point;
    }

    this.updateSnapCursor(null, null);
    return null;
  }


  /**
   * Crée le marqueur du point de départ (petite croix discrète)
   */
  createStartMarker(position) {
    if (this.startMarker) {
      this.measureGroup.remove(this.startMarker);
      this.disposeMarker(this.startMarker);
    }

    this.startMarker = this.createCrossMarker(0xFFFFFF, 0.8);
    this.startMarker.position.copy(position);
    this.measureGroup.add(this.startMarker);
  }

  /**
   * Crée le marqueur du point d'arrivée (petite croix discrète)
   */
  createEndMarker(position) {
    if (this.endMarker) {
      this.measureGroup.remove(this.endMarker);
      this.disposeMarker(this.endMarker);
    }

    this.endMarker = this.createCrossMarker(0xFFFFFF, 0.8);
    this.endMarker.position.copy(position);
    this.measureGroup.add(this.endMarker);
  }

  /**
   * Crée un marqueur en croix
   */
  createCrossMarker(color, opacity) {
    const group = new THREE.Group();
    const size = 6;

    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      depthTest: false
    });

    // Croix horizontale
    const hPoints = [
      new THREE.Vector3(-size, 0, 0),
      new THREE.Vector3(size, 0, 0)
    ];
    const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
    group.add(new THREE.Line(hGeometry, material));

    // Croix verticale
    const vPoints = [
      new THREE.Vector3(0, -size, 0),
      new THREE.Vector3(0, size, 0)
    ];
    const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
    group.add(new THREE.Line(vGeometry, material));

    return group;
  }

  /**
   * Dispose un marqueur en croix
   */
  disposeMarker(marker) {
    if (!marker) return;
    marker.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }

  /**
   * Met à jour la ligne de prévisualisation (style discret)
   */
  updatePreviewLine() {
    // Supprimer l'ancienne ligne
    if (this.measureLine) {
      this.measureGroup.remove(this.measureLine);
      this.measureLine.geometry.dispose();
      this.measureLine.material.dispose();
    }

    // Ligne blanche fine avec tirets discrets
    const points = [this.startPoint, this.previewEndPoint];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
      dashSize: 10,
      gapSize: 5,
      depthTest: false
    });

    this.measureLine = new THREE.Line(geometry, material);
    this.measureLine.computeLineDistances();
    this.measureGroup.add(this.measureLine);
  }

  /**
   * Met à jour le label de distance
   */
  updateLabel(mouseX, mouseY) {
    if (!this.startPoint) return;

    const distance = this.startPoint.distanceTo(this.previewEndPoint);
    const formattedDistance = this.formatDistance(distance);

    this.labelElement.textContent = formattedDistance;
    this.labelElement.style.display = 'block';
    this.labelElement.style.left = `${mouseX + 20}px`;
    this.labelElement.style.top = `${mouseY - 10}px`;
  }

  /**
   * Formate la distance pour l'affichage
   */
  formatDistance(distanceMm) {
    if (distanceMm >= 1000) {
      return `${(distanceMm / 1000).toFixed(2)} m`;
    } else if (distanceMm >= 10) {
      return `${(distanceMm / 10).toFixed(1)} cm`;
    } else {
      return `${distanceMm.toFixed(1)} mm`;
    }
  }

  /**
   * Finalise la mesure
   */
  finalizeMeasurement() {
    const distance = this.startPoint.distanceTo(this.endPoint);
    const formattedDistance = this.formatDistance(distance);

    console.log(`📏 Distance mesurée: ${formattedDistance} (${distance.toFixed(0)} mm)`);

    // Afficher le label au milieu de la ligne
    const midPoint = new THREE.Vector3().addVectors(this.startPoint, this.endPoint).multiplyScalar(0.5);
    this.positionLabelAt3DPoint(midPoint);

    // Garder la mesure affichée
    this.labelElement.style.display = 'block';
  }

  /**
   * Positionne le label à un point 3D
   */
  positionLabelAt3DPoint(point3D) {
    const vector = point3D.clone();
    vector.project(this.camera);

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;

    this.labelElement.style.left = `${x}px`;
    this.labelElement.style.top = `${y - 30}px`;
  }

  /**
   * Efface la mesure actuelle
   */
  clearMeasurement() {
    this.isMeasuring = false;
    this.startPoint = null;
    this.endPoint = null;

    // Réinitialiser l'état des axes
    this.lockedAxis = null;
    this.snappedAxis = null;

    // Réinitialiser l'état du snap
    this.currentSnapType = null;
    this.currentSnapPoint = null;

    // Supprimer les éléments visuels
    if (this.measureLine) {
      this.measureGroup.remove(this.measureLine);
      this.measureLine.geometry.dispose();
      this.measureLine.material.dispose();
      this.measureLine = null;
    }

    if (this.startMarker) {
      this.measureGroup.remove(this.startMarker);
      this.disposeMarker(this.startMarker);
      this.startMarker = null;
    }

    if (this.endMarker) {
      this.measureGroup.remove(this.endMarker);
      this.disposeMarker(this.endMarker);
      this.endMarker = null;
    }

    this.labelElement.style.display = 'none';

    // Cacher l'indicateur d'axe
    if (this.axisIndicator) {
      this.axisIndicator.style.display = 'none';
    }

    // Cacher le curseur et label de snap
    if (this.snapCursor) {
      this.snapCursor.visible = false;
    }
    if (this.snapLabel) {
      this.snapLabel.style.display = 'none';
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose() {
    this.setEnabled(false);
    this.clearMeasurement();
    this.scene.remove(this.measureGroup);

    // Supprimer le curseur de snap
    if (this.snapCursor) {
      this.scene.remove(this.snapCursor);
      this.snapCursor.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    if (this.labelElement && this.labelElement.parentNode) {
      this.labelElement.parentNode.removeChild(this.labelElement);
    }

    if (this.axisIndicator && this.axisIndicator.parentNode) {
      this.axisIndicator.parentNode.removeChild(this.axisIndicator);
    }

    if (this.snapLabel && this.snapLabel.parentNode) {
      this.snapLabel.parentNode.removeChild(this.snapLabel);
    }
  }
}
