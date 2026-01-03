/* ================================================
   GUIDE TOOL - Outil de création de guides (style SketchUp)
   ================================================ */

import * as THREE from 'three';

/**
 * Outil de création de lignes guides (style SketchUp)
 * - Clic sur arête = guide parallèle qui se déplace perpendiculairement
 * - Clic sur coin = point de guide
 * - Inférences automatiques sur les axes (Rouge/Vert/Bleu)
 * - Verrouillage par touches fléchées
 */
export class GuideTool {
  constructor(camera, renderer, scene, caissonManager = null) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.caissonManager = caissonManager;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // État
    this.isActive = false;
    this.isCreatingGuide = false;
    this.guideMode = null;  // 'edge', 'axis', 'corner'

    // Source de l'arête
    this.selectedEdge = null;
    this.edgeDirection = new THREE.Vector3();
    this.edgeStart = new THREE.Vector3();
    this.edgeEnd = new THREE.Vector3();
    this.sourcePoint = new THREE.Vector3();  // Point de départ sur l'arête

    // Direction du guide
    this.moveDirection = new THREE.Vector3();  // Direction perpendiculaire actuelle
    this.lockedAxis = null;  // 'x', 'y', 'z' ou null (libre)
    this.currentDistance = 0;
    this.snappedAxis = null;  // Axe sur lequel on est aligné (inférence)

    // Seuil d'inférence (en degrés)
    this.inferenceThreshold = 5;  // Snap si < 5° de l'axe

    // Guides créés
    this.guides = [];
    this.guidePoints = [];  // Points de guide
    this.guideGroup = new THREE.Group();
    this.guideGroup.name = 'guides';
    this.scene.add(this.guideGroup);

    // Preview
    this.previewGuide = null;
    this.previewPoint = null;
    this.inferenceHelper = null;  // Ligne montrant l'inférence

    // Highlight
    this.edgeHighlight = null;
    this.cornerHighlight = null;

    // UI
    this.distanceInput = this.createDistanceInput();
    this.infoLabel = this.createInfoLabel();
    this.axisIndicator = this.createAxisIndicator();

    // Bindings
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
  }

  /**
   * Crée l'input de saisie de distance
   */
  createDistanceInput() {
    const container = document.createElement('div');
    container.id = 'guide-distance-input';
    container.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 10px 15px;
      border-radius: 6px;
      display: none;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      border: 1px solid #4CAF50;
    `;

    container.innerHTML = `
      <label style="color: #4CAF50; font-size: 12px; display: block; margin-bottom: 5px;">
        Distance (mm) - Tapez puis Entrée :
      </label>
      <input type="number" id="guide-distance-value"
        style="
          width: 120px;
          padding: 8px;
          font-size: 16px;
          border: 1px solid #4CAF50;
          border-radius: 4px;
          background: #1a1a1a;
          color: white;
          text-align: center;
        "
        placeholder="500"
      />
      <button id="guide-create-btn" style="
        margin-left: 10px;
        padding: 8px 15px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">OK</button>
      <div style="color: #888; font-size: 10px; margin-top: 5px;">
        Flèches: ←Z →X ↑Y ↓libre | NumLock ON pour pavé numérique
      </div>
    `;

    document.body.appendChild(container);

    const btn = container.querySelector('#guide-create-btn');
    const input = container.querySelector('#guide-distance-value');

    btn.addEventListener('click', () => this.createGuideFromInput());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.createGuideFromInput();
      }
      // Permettre les flèches pour le verrouillage d'axe même quand on tape
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' ||
               e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        this.onKeyDown(e);  // Passer au gestionnaire d'axe
        return;  // Ne pas stopper la propagation pour les flèches
      }
      e.stopPropagation();  // Empêcher les autres raccourcis clavier
    });

    return container;
  }

  /**
   * Crée le label d'information (distance + axe)
   */
  createInfoLabel() {
    const label = document.createElement('div');
    label.id = 'guide-info-label';
    label.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Plus Jakarta Sans', monospace;
      pointer-events: none;
      z-index: 10000;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(label);
    return label;
  }

  /**
   * Crée l'indicateur d'axe (style SketchUp)
   */
  createAxisIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'guide-axis-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 140px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      font-family: 'Plus Jakarta Sans', sans-serif;
      pointer-events: none;
      z-index: 10000;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  /**
   * Affiche l'indicateur d'axe
   */
  showAxisIndicator(axis, locked = false) {
    const colors = {
      x: { bg: '#FF0000', text: 'Axe Rouge (X)' },
      y: { bg: '#00CC00', text: 'Axe Vert (Y)' },
      z: { bg: '#0066FF', text: 'Axe Bleu (Z)' }
    };

    if (axis && colors[axis]) {
      const config = colors[axis];
      this.axisIndicator.style.display = 'block';
      this.axisIndicator.style.background = config.bg;
      this.axisIndicator.style.color = 'white';
      this.axisIndicator.textContent = locked ? `🔒 ${config.text}` : `Sur ${config.text}`;
    } else {
      this.axisIndicator.style.display = 'none';
    }
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
      document.addEventListener('keyup', this.boundKeyUp);
      this.renderer.domElement.style.cursor = 'crosshair';
      this.showDistanceInput();
      console.log('📐 Outil Guide activé');
      console.log('   Clic sur arête = guide parallèle');
      console.log('   Clic sur coin = point de guide');
      console.log('   Flèches = verrouiller axe (→X, ↑Y, ←Z)');
    } else if (!enabled && this.isActive) {
      this.isActive = false;
      this.renderer.domElement.removeEventListener('mousedown', this.boundMouseDown);
      this.renderer.domElement.removeEventListener('mousemove', this.boundMouseMove);
      document.removeEventListener('keydown', this.boundKeyDown);
      document.removeEventListener('keyup', this.boundKeyUp);
      this.renderer.domElement.style.cursor = 'default';
      this.hideDistanceInput();
      this.cancelCreation();
      this.clearHighlights();
      console.log('📐 Outil Guide désactivé');
    }
  }

  showDistanceInput() {
    this.distanceInput.style.display = 'block';
  }

  hideDistanceInput() {
    this.distanceInput.style.display = 'none';
    this.infoLabel.style.display = 'none';
    this.axisIndicator.style.display = 'none';
  }

  /**
   * Gère le clic souris
   */
  onMouseDown(event) {
    if (event.button !== 0) return;

    this.updateMousePosition(event);

    if (!this.isCreatingGuide) {
      // Priorité: coin > arête > axe principal
      const cornerHit = this.detectCornerClick();
      if (cornerHit) {
        this.startCornerGuideCreation(cornerHit);
        return;
      }

      const edgeHit = this.detectEdgeClick();
      if (edgeHit) {
        this.startEdgeGuideCreation(edgeHit);
        return;
      }

      const axisHit = this.detectMainAxisClick();
      if (axisHit) {
        this.startAxisGuideCreation(axisHit);
        return;
      }
    } else {
      // Finaliser le guide
      this.finalizeGuide();
    }
  }

  /**
   * Gère le mouvement de la souris
   */
  onMouseMove(event) {
    if (!this.isActive) return;

    this.updateMousePosition(event);

    if (this.isCreatingGuide) {
      this.updatePreview(event);
    } else {
      this.updateHighlights();
    }
  }

  /**
   * Gère les touches clavier
   */
  onKeyDown(event) {
    if (event.target.tagName === 'INPUT') return;

    switch (event.key) {
      case 'Escape':
        this.cancelCreation();
        break;
      case 'Delete':
      case 'Backspace':
        this.deleteLastGuide();
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

  onKeyUp(event) {
    // Optionnel: relâcher le verrouillage quand on relâche la touche
    // Pour l'instant on garde le verrouillage permanent jusqu'à ArrowDown
  }

  /**
   * Verrouille la direction sur un axe
   */
  lockAxis(axis) {
    this.lockedAxis = axis;
    if (axis) {
      console.log(`🔒 Direction verrouillée sur l'axe ${axis.toUpperCase()}`);
      this.showAxisIndicator(axis, true);
    } else {
      console.log('🔓 Direction libre');
      this.showAxisIndicator(null);
    }
  }

  updateMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // ========================================
  // DÉTECTION DES ÉLÉMENTS
  // ========================================

  /**
   * Détecte un clic sur un coin de caisson
   */
  detectCornerClick() {
    if (!this.caissonManager) return null;

    const caissons = this.caissonManager.getAllCaissons();
    if (caissons.length === 0) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hitRadius = 25;  // Rayon de détection pour les coins
    let closestCorner = null;
    let minDistance = hitRadius;

    for (const caisson of caissons) {
      const corners = this.getCaissonCorners(caisson);

      for (const corner of corners) {
        // Projeter le coin sur l'écran et vérifier la distance
        const screenPos = corner.position.clone().project(this.camera);
        const mouseScreen = new THREE.Vector2(this.mouse.x, this.mouse.y);
        const cornerScreen = new THREE.Vector2(screenPos.x, screenPos.y);

        // Distance en coordonnées normalisées (approximation)
        const dist = mouseScreen.distanceTo(cornerScreen) * 500;  // Facteur d'échelle

        if (dist < minDistance) {
          minDistance = dist;
          closestCorner = {
            ...corner,
            caisson: caisson
          };
        }
      }
    }

    return closestCorner;
  }

  /**
   * Retourne les coins d'un caisson
   */
  getCaissonCorners(caisson) {
    const config = caisson.config;
    const pos = caisson.group.position;

    const halfW = config.width / 2;
    const halfD = config.depth / 2;
    const h = config.height;

    return [
      { position: new THREE.Vector3(pos.x - halfW, pos.y, pos.z - halfD), name: 'Coin inf. avant gauche' },
      { position: new THREE.Vector3(pos.x + halfW, pos.y, pos.z - halfD), name: 'Coin inf. avant droit' },
      { position: new THREE.Vector3(pos.x + halfW, pos.y, pos.z + halfD), name: 'Coin inf. arrière droit' },
      { position: new THREE.Vector3(pos.x - halfW, pos.y, pos.z + halfD), name: 'Coin inf. arrière gauche' },
      { position: new THREE.Vector3(pos.x - halfW, pos.y + h, pos.z - halfD), name: 'Coin sup. avant gauche' },
      { position: new THREE.Vector3(pos.x + halfW, pos.y + h, pos.z - halfD), name: 'Coin sup. avant droit' },
      { position: new THREE.Vector3(pos.x + halfW, pos.y + h, pos.z + halfD), name: 'Coin sup. arrière droit' },
      { position: new THREE.Vector3(pos.x - halfW, pos.y + h, pos.z + halfD), name: 'Coin sup. arrière gauche' },
    ];
  }

  /**
   * Détecte un clic sur une arête de caisson
   */
  detectEdgeClick() {
    if (!this.caissonManager) return null;

    const caissons = this.caissonManager.getAllCaissons();
    if (caissons.length === 0) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hitRadius = 30;
    let closestEdge = null;
    let minDistance = hitRadius;

    for (const caisson of caissons) {
      const edges = this.getCaissonEdges(caisson);

      for (const edge of edges) {
        const closest = this.closestPointOnLine(
          this.raycaster.ray.origin,
          this.raycaster.ray.direction,
          edge.start,
          edge.end
        );

        if (closest && closest.distance < minDistance) {
          minDistance = closest.distance;
          closestEdge = {
            ...edge,
            hitPoint: closest.point,
            caisson: caisson
          };
        }
      }
    }

    return closestEdge;
  }

  /**
   * Retourne les arêtes d'un caisson
   */
  getCaissonEdges(caisson) {
    const config = caisson.config;
    const pos = caisson.group.position;

    const halfW = config.width / 2;
    const halfD = config.depth / 2;
    const h = config.height;

    const corners = [
      new THREE.Vector3(pos.x - halfW, pos.y, pos.z - halfD),
      new THREE.Vector3(pos.x + halfW, pos.y, pos.z - halfD),
      new THREE.Vector3(pos.x + halfW, pos.y, pos.z + halfD),
      new THREE.Vector3(pos.x - halfW, pos.y, pos.z + halfD),
      new THREE.Vector3(pos.x - halfW, pos.y + h, pos.z - halfD),
      new THREE.Vector3(pos.x + halfW, pos.y + h, pos.z - halfD),
      new THREE.Vector3(pos.x + halfW, pos.y + h, pos.z + halfD),
      new THREE.Vector3(pos.x - halfW, pos.y + h, pos.z + halfD),
    ];

    return [
      { start: corners[0], end: corners[1], type: 'horizontal', axis: 'x', name: 'Arête inf. avant' },
      { start: corners[1], end: corners[2], type: 'horizontal', axis: 'z', name: 'Arête inf. droite' },
      { start: corners[2], end: corners[3], type: 'horizontal', axis: 'x', name: 'Arête inf. arrière' },
      { start: corners[3], end: corners[0], type: 'horizontal', axis: 'z', name: 'Arête inf. gauche' },
      { start: corners[4], end: corners[5], type: 'horizontal', axis: 'x', name: 'Arête sup. avant' },
      { start: corners[5], end: corners[6], type: 'horizontal', axis: 'z', name: 'Arête sup. droite' },
      { start: corners[6], end: corners[7], type: 'horizontal', axis: 'x', name: 'Arête sup. arrière' },
      { start: corners[7], end: corners[4], type: 'horizontal', axis: 'z', name: 'Arête sup. gauche' },
      { start: corners[0], end: corners[4], type: 'vertical', axis: 'y', name: 'Arête vert. avant gauche' },
      { start: corners[1], end: corners[5], type: 'vertical', axis: 'y', name: 'Arête vert. avant droite' },
      { start: corners[2], end: corners[6], type: 'vertical', axis: 'y', name: 'Arête vert. arrière droite' },
      { start: corners[3], end: corners[7], type: 'vertical', axis: 'y', name: 'Arête vert. arrière gauche' },
    ];
  }

  /**
   * Détecte un clic sur un axe principal (X, Y, Z)
   */
  detectMainAxisClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const axisLength = 3000;
    const hitRadius = 50;

    const axes = [
      { name: 'x', dir: new THREE.Vector3(1, 0, 0), color: 0xFF0000 },
      { name: 'y', dir: new THREE.Vector3(0, 1, 0), color: 0x00FF00 },
      { name: 'z', dir: new THREE.Vector3(0, 0, 1), color: 0x0000FF }
    ];

    for (const axis of axes) {
      const start = axis.dir.clone().multiplyScalar(-axisLength);
      const end = axis.dir.clone().multiplyScalar(axisLength);

      const closest = this.closestPointOnLine(
        this.raycaster.ray.origin,
        this.raycaster.ray.direction,
        start, end
      );

      if (closest && closest.distance < hitRadius) {
        return {
          axis: axis.name,
          point: closest.point,
          direction: axis.dir
        };
      }
    }

    return null;
  }

  closestPointOnLine(rayOrigin, rayDir, lineStart, lineEnd) {
    const lineDir = new THREE.Vector3().subVectors(lineEnd, lineStart).normalize();
    const lineLength = lineStart.distanceTo(lineEnd);

    const w0 = new THREE.Vector3().subVectors(rayOrigin, lineStart);

    const a = rayDir.dot(rayDir);
    const b = rayDir.dot(lineDir);
    const c = lineDir.dot(lineDir);
    const d = rayDir.dot(w0);
    const e = lineDir.dot(w0);

    const denom = a * c - b * b;
    if (Math.abs(denom) < 0.001) return null;

    const t = (b * e - c * d) / denom;
    const s = (a * e - b * d) / denom;

    if (s < 0 || s > lineLength) return null;

    const pointOnRay = rayOrigin.clone().add(rayDir.clone().multiplyScalar(t));
    const pointOnLine = lineStart.clone().add(lineDir.clone().multiplyScalar(s));

    return {
      point: pointOnLine,
      distance: pointOnRay.distanceTo(pointOnLine),
      lineDir: lineDir
    };
  }

  // ========================================
  // CRÉATION DE GUIDES
  // ========================================

  /**
   * Démarre la création d'un guide depuis un coin (point de guide)
   */
  startCornerGuideCreation(cornerHit) {
    this.isCreatingGuide = true;
    this.guideMode = 'corner';
    this.sourcePoint.copy(cornerHit.position);
    this.lockedAxis = null;
    this.moveDirection.set(0, 0, 0);  // Reset direction
    this.currentDistance = 0;

    this.clearHighlights();

    console.log(`📍 Point de guide depuis: ${cornerHit.name}`);
    this.updateInfoText(`Point depuis: ${cornerHit.name}`);

    const input = this.distanceInput.querySelector('#guide-distance-value');
    input.value = '';
    // Focus automatique sur l'input pour pouvoir taper directement la distance
    setTimeout(() => input.focus(), 100);
  }

  /**
   * Démarre la création d'un guide depuis une arête
   */
  startEdgeGuideCreation(edgeHit) {
    this.isCreatingGuide = true;
    this.guideMode = 'edge';
    this.selectedEdge = edgeHit;
    this.edgeDirection.subVectors(edgeHit.end, edgeHit.start).normalize();
    this.edgeStart.copy(edgeHit.start);
    this.edgeEnd.copy(edgeHit.end);
    this.sourcePoint.copy(edgeHit.hitPoint);
    this.lockedAxis = null;
    this.moveDirection.set(0, 0, 0);  // Reset direction
    this.currentDistance = 0;

    this.clearHighlights();

    console.log(`📐 Guide depuis: ${edgeHit.name}`);
    this.updateInfoText(`Guide depuis: ${edgeHit.name}`);

    const input = this.distanceInput.querySelector('#guide-distance-value');
    input.value = '';
    // Focus automatique sur l'input pour pouvoir taper directement la distance
    setTimeout(() => input.focus(), 100);
  }

  /**
   * Démarre la création d'un guide depuis un axe principal
   */
  startAxisGuideCreation(axisHit) {
    this.isCreatingGuide = true;
    this.guideMode = 'axis';
    this.sourcePoint.copy(axisHit.point);

    // Pour un axe, l'arête est l'axe lui-même
    this.edgeDirection.copy(axisHit.direction);
    this.selectedEdge = { axis: axisHit.axis };
    this.lockedAxis = null;
    this.moveDirection.set(0, 0, 0);  // Reset direction
    this.currentDistance = 0;

    console.log(`📐 Guide depuis axe ${axisHit.axis.toUpperCase()}`);
    this.updateInfoText(`Guide depuis axe ${axisHit.axis.toUpperCase()}`);

    const input = this.distanceInput.querySelector('#guide-distance-value');
    input.value = '';
    // Focus automatique sur l'input pour pouvoir taper directement la distance
    setTimeout(() => input.focus(), 100);
  }

  /**
   * Met à jour le preview du guide
   */
  updatePreview(event) {
    if (this.guideMode === 'corner') {
      this.updateCornerPreview(event);
    } else if (this.guideMode === 'edge' || this.guideMode === 'axis') {
      this.updateEdgePreview(event);
    }
  }

  /**
   * Met à jour le preview pour un point de guide
   */
  updateCornerPreview(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Plan passant par le point source, perpendiculaire à la caméra
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, this.sourcePoint);

    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, point)) return;

    // Calculer la direction du mouvement
    let moveDir = point.clone().sub(this.sourcePoint);
    const distance = moveDir.length();

    if (distance < 0.001) return;
    moveDir.normalize();

    // Appliquer verrouillage ou inférence
    const axisResult = this.applyAxisConstraint(moveDir);
    moveDir = axisResult.direction;
    this.snappedAxis = axisResult.axis;

    // Calculer la position finale
    const endPoint = this.sourcePoint.clone().add(moveDir.clone().multiplyScalar(distance));
    this.currentDistance = distance;
    this.moveDirection.copy(moveDir);

    // Créer/mettre à jour le preview
    this.updateCornerPreviewVisual(endPoint);

    // Mettre à jour l'UI
    this.updateDistanceUI(event, distance);
  }

  /**
   * Met à jour le preview pour un guide depuis une arête
   * Le guide peut se déplacer librement dans le plan perpendiculaire à l'arête
   */
  updateEdgePreview(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Plan perpendiculaire à la caméra passant par le point source
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const cameraPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, this.sourcePoint);

    const mousePoint = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(cameraPlane, mousePoint)) return;

    // Vecteur de déplacement depuis le point source
    const displacement = mousePoint.clone().sub(this.sourcePoint);

    // Projeter le déplacement sur le plan perpendiculaire à l'arête
    // Pour une arête, on enlève la composante parallèle à l'arête
    const parallelComponent = this.edgeDirection.clone().multiplyScalar(
      displacement.dot(this.edgeDirection)
    );
    const perpDisplacement = displacement.clone().sub(parallelComponent);

    // Si verrouillage actif, projeter sur l'axe verrouillé
    if (this.lockedAxis) {
      const axisDir = this.getAxisDirection(this.lockedAxis);
      const projectedDist = perpDisplacement.dot(axisDir);
      perpDisplacement.copy(axisDir).multiplyScalar(projectedDist);
      this.snappedAxis = this.lockedAxis;
    } else {
      // Sinon, vérifier l'inférence automatique (snap si proche d'un axe)
      this.snappedAxis = this.checkAxisInference(perpDisplacement);

      // Si on est sur un axe, snapper dessus
      if (this.snappedAxis) {
        const axisDir = this.getAxisDirection(this.snappedAxis);
        const projectedDist = perpDisplacement.dot(axisDir);
        perpDisplacement.copy(axisDir).multiplyScalar(projectedDist);
      }
    }

    // Stocker la distance (magnitude du déplacement)
    this.currentDistance = perpDisplacement.length();

    // Toujours mettre à jour moveDirection si le déplacement est significatif
    if (perpDisplacement.length() > 1) {
      this.moveDirection.copy(perpDisplacement).normalize();
    }

    // Distance signée (positive car moveDirection suit le déplacement)
    const signedDistance = this.currentDistance;

    // Créer le preview du guide avec le déplacement réel
    this.updateEdgePreviewVisualFree(perpDisplacement);

    // Mettre à jour l'UI
    this.updateDistanceUI(event, signedDistance);
  }

  /**
   * Vérifie si le déplacement est proche d'un axe (inférence)
   */
  checkAxisInference(displacement) {
    if (displacement.length() < 1) return null;

    const normalized = displacement.clone().normalize();
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
        return axis.name;
      }
    }

    return null;
  }

  /**
   * Retourne les directions perpendiculaires à l'arête sélectionnée
   */
  getPerpendicularDirections() {
    const dirs = [];

    if (this.guideMode === 'axis') {
      // Pour un axe principal, les perpendiculaires sont les deux autres axes
      switch (this.selectedEdge.axis) {
        case 'x':
          dirs.push(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1));
          dirs.push(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
          break;
        case 'y':
          dirs.push(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0));
          dirs.push(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1));
          break;
        case 'z':
          dirs.push(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0));
          dirs.push(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
          break;
      }
    } else {
      // Pour une arête de caisson
      if (this.selectedEdge.type === 'vertical') {
        // Arête verticale: perpendiculaires dans le plan XZ
        dirs.push(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0));
        dirs.push(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1));
      } else {
        // Arête horizontale: perpendiculaire dans le plan horizontal + verticale
        const perp = new THREE.Vector3();
        perp.crossVectors(this.edgeDirection, new THREE.Vector3(0, 1, 0)).normalize();
        dirs.push(perp, perp.clone().negate());
        dirs.push(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
      }
    }

    return dirs;
  }

  /**
   * Applique le verrouillage ou l'inférence d'axe
   */
  applyAxisConstraint(direction) {
    // Si axe verrouillé manuellement
    if (this.lockedAxis) {
      const axisDir = this.getAxisDirection(this.lockedAxis);
      // Projeter sur l'axe verrouillé
      const sign = direction.dot(axisDir) >= 0 ? 1 : -1;
      return {
        direction: axisDir.multiplyScalar(sign),
        axis: this.lockedAxis
      };
    }

    // Sinon, vérifier l'inférence automatique
    const axes = [
      { name: 'x', dir: new THREE.Vector3(1, 0, 0) },
      { name: 'y', dir: new THREE.Vector3(0, 1, 0) },
      { name: 'z', dir: new THREE.Vector3(0, 0, 1) }
    ];

    for (const axis of axes) {
      const angle = Math.abs(direction.angleTo(axis.dir)) * (180 / Math.PI);
      const angleInverse = Math.abs(direction.angleTo(axis.dir.clone().negate())) * (180 / Math.PI);

      if (angle < this.inferenceThreshold) {
        return { direction: axis.dir.clone(), axis: axis.name };
      }
      if (angleInverse < this.inferenceThreshold) {
        return { direction: axis.dir.clone().negate(), axis: axis.name };
      }
    }

    // Pas d'inférence, direction libre
    return { direction: direction.clone().normalize(), axis: null };
  }

  getAxisDirection(axis) {
    switch (axis) {
      case 'x': return new THREE.Vector3(1, 0, 0);
      case 'y': return new THREE.Vector3(0, 1, 0);
      case 'z': return new THREE.Vector3(0, 0, 1);
      default: return new THREE.Vector3(1, 0, 0);
    }
  }

  /**
   * Met à jour le visuel du preview pour un point de guide
   */
  updateCornerPreviewVisual(endPoint) {
    // Nettoyer l'ancien preview
    this.clearPreview();

    // Ligne de construction (du point source au point actuel)
    const lineGeom = new THREE.BufferGeometry().setFromPoints([this.sourcePoint, endPoint]);
    const lineColor = this.getAxisColor(this.snappedAxis) || 0x888888;
    const lineMat = new THREE.LineDashedMaterial({
      color: lineColor,
      dashSize: 20,
      gapSize: 10,
      depthTest: false
    });

    this.inferenceHelper = new THREE.Line(lineGeom, lineMat);
    this.inferenceHelper.computeLineDistances();
    this.guideGroup.add(this.inferenceHelper);

    // Point de preview
    const pointGeom = new THREE.SphereGeometry(15, 16, 16);
    const pointMat = new THREE.MeshBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });

    this.previewPoint = new THREE.Mesh(pointGeom, pointMat);
    this.previewPoint.position.copy(endPoint);
    this.guideGroup.add(this.previewPoint);
  }

  /**
   * Met à jour le visuel du preview pour un guide d'arête (mouvement libre)
   * @param {THREE.Vector3} displacement - Vecteur de déplacement perpendiculaire
   */
  updateEdgePreviewVisualFree(displacement) {
    this.clearPreview();

    // Calculer les points du guide (parallèle à l'arête, décalé par le déplacement)
    let startPoint, endPoint;

    if (this.guideMode === 'axis') {
      // Pour un axe principal
      const guideLength = 5000;
      const axisDir = this.edgeDirection.clone();
      startPoint = this.sourcePoint.clone().add(displacement).add(axisDir.clone().multiplyScalar(-guideLength));
      endPoint = this.sourcePoint.clone().add(displacement).add(axisDir.clone().multiplyScalar(guideLength));
    } else {
      // Pour une arête de caisson
      startPoint = this.edgeStart.clone().add(displacement);
      endPoint = this.edgeEnd.clone().add(displacement);

      // Étendre au-delà de l'arête
      const extension = this.edgeDirection.clone().multiplyScalar(1000);
      startPoint.sub(extension);
      endPoint.add(extension);
    }

    // Couleur selon l'axe d'inférence (ou orange si libre)
    const guideColor = this.getAxisColor(this.snappedAxis) || 0xFFA500;

    // Guide preview
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const material = new THREE.LineDashedMaterial({
      color: guideColor,
      linewidth: 1,
      dashSize: 30,
      gapSize: 15,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });

    this.previewGuide = new THREE.Line(geometry, material);
    this.previewGuide.computeLineDistances();
    this.guideGroup.add(this.previewGuide);

    // Ligne d'inférence (montrant le déplacement depuis la source)
    const targetPoint = this.sourcePoint.clone().add(displacement);

    const inferGeom = new THREE.BufferGeometry().setFromPoints([this.sourcePoint, targetPoint]);
    const inferMat = new THREE.LineDashedMaterial({
      color: guideColor,
      dashSize: 15,
      gapSize: 8,
      transparent: true,
      opacity: 0.5,
      depthTest: false
    });

    this.inferenceHelper = new THREE.Line(inferGeom, inferMat);
    this.inferenceHelper.computeLineDistances();
    this.guideGroup.add(this.inferenceHelper);

    // Stocker les données pour la création finale
    this.previewGuide.userData = {
      startPoint: startPoint.clone(),
      endPoint: endPoint.clone(),
      displacement: displacement.clone()
    };
  }

  /**
   * Met à jour le visuel du preview pour un guide d'arête (ancienne version)
   */
  updateEdgePreviewVisual(perpDir) {
    this.clearPreview();

    // Calculer les points du guide (parallèle à l'arête, décalé)
    const offset = perpDir.clone().multiplyScalar(this.currentDistance);

    let startPoint, endPoint;

    if (this.guideMode === 'axis') {
      // Pour un axe principal
      const guideLength = 5000;
      const axisDir = this.edgeDirection.clone();
      startPoint = this.sourcePoint.clone().add(offset).add(axisDir.clone().multiplyScalar(-guideLength));
      endPoint = this.sourcePoint.clone().add(offset).add(axisDir.clone().multiplyScalar(guideLength));
    } else {
      // Pour une arête de caisson
      startPoint = this.edgeStart.clone().add(offset);
      endPoint = this.edgeEnd.clone().add(offset);

      // Étendre au-delà de l'arête
      const extension = this.edgeDirection.clone().multiplyScalar(1000);
      startPoint.sub(extension);
      endPoint.add(extension);
    }

    // Couleur selon l'axe d'inférence
    const guideColor = this.getAxisColor(this.snappedAxis) || 0xFFA500;

    // Guide preview
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const material = new THREE.LineDashedMaterial({
      color: guideColor,
      linewidth: 1,
      dashSize: 30,
      gapSize: 15,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });

    this.previewGuide = new THREE.Line(geometry, material);
    this.previewGuide.computeLineDistances();
    this.guideGroup.add(this.previewGuide);

    // Ligne d'inférence (montrant le déplacement)
    const sourceOnEdge = this.guideMode === 'axis' ? this.sourcePoint : this.sourcePoint;
    const targetPoint = sourceOnEdge.clone().add(offset);

    const inferGeom = new THREE.BufferGeometry().setFromPoints([sourceOnEdge, targetPoint]);
    const inferMat = new THREE.LineDashedMaterial({
      color: guideColor,
      dashSize: 15,
      gapSize: 8,
      transparent: true,
      opacity: 0.5,
      depthTest: false
    });

    this.inferenceHelper = new THREE.Line(inferGeom, inferMat);
    this.inferenceHelper.computeLineDistances();
    this.guideGroup.add(this.inferenceHelper);

    // Stocker les données
    this.previewGuide.userData = {
      startPoint: startPoint.clone(),
      endPoint: endPoint.clone(),
      perpDir: perpDir.clone()
    };
  }

  getAxisColor(axis) {
    switch (axis) {
      case 'x': return 0xFF0000;  // Rouge
      case 'y': return 0x00CC00;  // Vert
      case 'z': return 0x0066FF;  // Bleu
      default: return null;
    }
  }

  updateDistanceUI(event, distance) {
    const absDistance = Math.abs(distance);

    // Mettre à jour l'input
    const input = this.distanceInput.querySelector('#guide-distance-value');
    input.value = Math.round(distance);

    // Mettre à jour le label
    let text = `${Math.round(absDistance)} mm`;
    if (this.snappedAxis) {
      const axisNames = { x: 'Rouge', y: 'Vert', z: 'Bleu' };
      text += ` | Sur axe ${axisNames[this.snappedAxis]}`;
    }

    this.infoLabel.textContent = text;
    this.infoLabel.style.display = 'block';
    this.infoLabel.style.left = `${event.clientX + 20}px`;
    this.infoLabel.style.top = `${event.clientY - 10}px`;
    this.infoLabel.style.color = this.snappedAxis ?
      (this.snappedAxis === 'x' ? '#FF6666' : this.snappedAxis === 'y' ? '#66FF66' : '#6699FF') :
      'white';

    // Indicateur d'axe
    if (this.lockedAxis) {
      this.showAxisIndicator(this.lockedAxis, true);
    } else {
      this.showAxisIndicator(this.snappedAxis, false);
    }
  }

  updateInfoText(text) {
    this.infoLabel.textContent = text;
    this.infoLabel.style.display = 'block';
    this.infoLabel.style.left = '50%';
    this.infoLabel.style.top = '120px';
    this.infoLabel.style.transform = 'translateX(-50%)';
    this.infoLabel.style.color = '#4CAF50';
  }

  /**
   * Crée le guide depuis l'input de distance
   */
  createGuideFromInput() {
    const input = this.distanceInput.querySelector('#guide-distance-value');
    const distance = parseFloat(input.value);

    console.log('📐 createGuideFromInput appelé');
    console.log('   - distance:', distance);
    console.log('   - guideMode:', this.guideMode);
    console.log('   - isCreatingGuide:', this.isCreatingGuide);
    console.log('   - moveDirection:', this.moveDirection.x, this.moveDirection.y, this.moveDirection.z);

    if (isNaN(distance) || distance === 0) {
      console.warn('📐 Distance invalide ou nulle');
      return;
    }

    // Vérifier qu'on est en mode création
    if (!this.isCreatingGuide) {
      console.warn('📐 Pas en mode création de guide. Cliquez d\'abord sur une arête ou un axe.');
      return;
    }

    // Si pas encore de direction définie, utiliser une direction par défaut
    if (this.moveDirection.length() < 0.001) {
      console.log('📐 Direction non définie, utilisation d\'une direction par défaut');
      this.setDefaultMoveDirection();
    }

    // S'assurer que moveDirection est normalisé
    if (this.moveDirection.length() > 0.001) {
      this.moveDirection.normalize();
    } else {
      console.error('📐 Impossible de déterminer une direction');
      return;
    }

    this.currentDistance = Math.abs(distance);

    // Créer le vecteur de déplacement avec la nouvelle distance
    const displacement = this.moveDirection.clone().multiplyScalar(distance);
    console.log('📐 Displacement créé:', displacement.x.toFixed(1), displacement.y.toFixed(1), displacement.z.toFixed(1));

    // Créer le preview avec le déplacement
    if (this.guideMode === 'edge' || this.guideMode === 'axis') {
      this.updateEdgePreviewVisualFree(displacement);
    } else if (this.guideMode === 'corner') {
      const endPoint = this.sourcePoint.clone().add(displacement);
      this.updateCornerPreviewVisual(endPoint);
    }

    // Vérifier que le preview a été créé
    if (!this.previewGuide && this.guideMode !== 'corner') {
      console.error('📐 Erreur: previewGuide non créé');
      return;
    }
    if (!this.previewPoint && this.guideMode === 'corner') {
      console.error('📐 Erreur: previewPoint non créé');
      return;
    }

    // Créer le guide final
    console.log('📐 Finalisation du guide...');
    this.finalizeGuide();
    input.value = '';
    console.log('📐 Guide créé avec succès!');
  }

  /**
   * Définit une direction par défaut selon le contexte
   */
  setDefaultMoveDirection() {
    if (this.guideMode === 'edge' && this.selectedEdge) {
      if (this.selectedEdge.type === 'vertical') {
        // Arête verticale: perpendiculaire par défaut sur X
        this.moveDirection.set(1, 0, 0);
        this.snappedAxis = 'x';
      } else if (this.selectedEdge.axis === 'x') {
        // Arête horizontale sur X: perpendiculaire sur Z
        this.moveDirection.set(0, 0, 1);
        this.snappedAxis = 'z';
      } else if (this.selectedEdge.axis === 'z') {
        // Arête horizontale sur Z: perpendiculaire sur X
        this.moveDirection.set(1, 0, 0);
        this.snappedAxis = 'x';
      } else {
        // Par défaut sur X
        this.moveDirection.set(1, 0, 0);
        this.snappedAxis = 'x';
      }
    } else if (this.guideMode === 'axis' && this.selectedEdge) {
      // Pour un axe principal, prendre une perpendiculaire
      if (this.selectedEdge.axis === 'x') {
        this.moveDirection.set(0, 0, 1);
        this.snappedAxis = 'z';
      } else if (this.selectedEdge.axis === 'y') {
        this.moveDirection.set(1, 0, 0);
        this.snappedAxis = 'x';
      } else if (this.selectedEdge.axis === 'z') {
        this.moveDirection.set(1, 0, 0);
        this.snappedAxis = 'x';
      } else {
        this.moveDirection.set(1, 0, 0);
        this.snappedAxis = 'x';
      }
    } else if (this.guideMode === 'corner') {
      // Pour un point, direction par défaut sur X
      this.moveDirection.set(1, 0, 0);
      this.snappedAxis = 'x';
    } else {
      // Fallback
      this.moveDirection.set(1, 0, 0);
      this.snappedAxis = 'x';
    }
    console.log('📐 Direction par défaut:', this.moveDirection.x, this.moveDirection.y, this.moveDirection.z, '- Axe:', this.snappedAxis);
  }

  /**
   * Finalise la création du guide
   */
  finalizeGuide() {
    if (this.guideMode === 'corner') {
      this.createGuidePoint();
    } else if (this.guideMode === 'edge' || this.guideMode === 'axis') {
      this.createGuideLine();
    }

    this.cancelCreation();
  }

  /**
   * Crée un point de guide
   */
  createGuidePoint() {
    if (!this.previewPoint) return;

    const position = this.previewPoint.position.clone();
    const color = this.getAxisColor(this.snappedAxis) || 0xFFA500;

    // Créer le point permanent
    const geometry = new THREE.SphereGeometry(12, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      depthTest: false
    });

    const point = new THREE.Mesh(geometry, material);
    point.position.copy(position);
    point.userData = {
      type: 'guide-point',
      distance: this.currentDistance,
      axis: this.snappedAxis
    };

    this.guideGroup.add(point);
    this.guidePoints.push(point);

    console.log(`📍 Point de guide créé à ${Math.round(this.currentDistance)} mm`);
  }

  /**
   * Crée une ligne de guide
   */
  createGuideLine() {
    if (!this.previewGuide) return;

    const userData = this.previewGuide.userData;
    const color = this.getAxisColor(this.snappedAxis) || 0xFFA500;

    const geometry = new THREE.BufferGeometry().setFromPoints([userData.startPoint, userData.endPoint]);
    const material = new THREE.LineDashedMaterial({
      color: color,
      linewidth: 1,
      dashSize: 30,
      gapSize: 15,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });

    const guide = new THREE.Line(geometry, material);
    guide.computeLineDistances();
    guide.userData = {
      type: 'guide-line',
      distance: this.currentDistance,
      axis: this.snappedAxis,
      edgeName: this.selectedEdge?.name
    };

    this.guideGroup.add(guide);
    this.guides.push(guide);

    console.log(`📐 Guide créé à ${Math.round(this.currentDistance)} mm` +
      (this.snappedAxis ? ` (axe ${this.snappedAxis.toUpperCase()})` : ''));
  }

  // ========================================
  // HIGHLIGHTS ET NETTOYAGE
  // ========================================

  updateHighlights() {
    this.clearHighlights();

    // Priorité: coin > arête
    const cornerHit = this.detectCornerClick();
    if (cornerHit) {
      this.showCornerHighlight(cornerHit);
      return;
    }

    const edgeHit = this.detectEdgeClick();
    if (edgeHit) {
      this.showEdgeHighlight(edgeHit);
    }
  }

  showCornerHighlight(corner) {
    const geometry = new THREE.SphereGeometry(20, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });

    this.cornerHighlight = new THREE.Mesh(geometry, material);
    this.cornerHighlight.position.copy(corner.position);
    this.scene.add(this.cornerHighlight);
  }

  showEdgeHighlight(edge) {
    const geometry = new THREE.BufferGeometry().setFromPoints([edge.start, edge.end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFF00,
      linewidth: 3,
      depthTest: false
    });

    this.edgeHighlight = new THREE.Line(geometry, material);
    this.scene.add(this.edgeHighlight);
  }

  clearHighlights() {
    if (this.edgeHighlight) {
      this.scene.remove(this.edgeHighlight);
      this.edgeHighlight.geometry.dispose();
      this.edgeHighlight.material.dispose();
      this.edgeHighlight = null;
    }
    if (this.cornerHighlight) {
      this.scene.remove(this.cornerHighlight);
      this.cornerHighlight.geometry.dispose();
      this.cornerHighlight.material.dispose();
      this.cornerHighlight = null;
    }
  }

  clearPreview() {
    if (this.previewGuide) {
      this.guideGroup.remove(this.previewGuide);
      this.previewGuide.geometry.dispose();
      this.previewGuide.material.dispose();
      this.previewGuide = null;
    }
    if (this.previewPoint) {
      this.guideGroup.remove(this.previewPoint);
      this.previewPoint.geometry.dispose();
      this.previewPoint.material.dispose();
      this.previewPoint = null;
    }
    if (this.inferenceHelper) {
      this.guideGroup.remove(this.inferenceHelper);
      this.inferenceHelper.geometry.dispose();
      this.inferenceHelper.material.dispose();
      this.inferenceHelper = null;
    }
  }

  cancelCreation() {
    this.isCreatingGuide = false;
    this.guideMode = null;
    this.selectedEdge = null;
    this.lockedAxis = null;
    this.snappedAxis = null;
    this.moveDirection.set(0, 0, 0);  // Reset direction pour le prochain guide
    this.currentDistance = 0;

    this.clearPreview();
    this.infoLabel.style.display = 'none';
    this.axisIndicator.style.display = 'none';
  }

  deleteLastGuide() {
    // D'abord essayer de supprimer un point
    if (this.guidePoints.length > 0) {
      const point = this.guidePoints.pop();
      this.guideGroup.remove(point);
      point.geometry.dispose();
      point.material.dispose();
      console.log('📍 Point de guide supprimé');
      return;
    }

    // Sinon supprimer une ligne
    if (this.guides.length > 0) {
      const guide = this.guides.pop();
      this.guideGroup.remove(guide);
      guide.geometry.dispose();
      guide.material.dispose();
      console.log('📐 Guide supprimé');
    }
  }

  clearAllGuides() {
    while (this.guides.length > 0) {
      const guide = this.guides.pop();
      this.guideGroup.remove(guide);
      guide.geometry.dispose();
      guide.material.dispose();
    }
    while (this.guidePoints.length > 0) {
      const point = this.guidePoints.pop();
      this.guideGroup.remove(point);
      point.geometry.dispose();
      point.material.dispose();
    }
    console.log('📐 Tous les guides supprimés');
  }

  getGuideCount() {
    return this.guides.length + this.guidePoints.length;
  }

  dispose() {
    this.setEnabled(false);
    this.clearAllGuides();
    this.clearHighlights();
    this.scene.remove(this.guideGroup);

    if (this.distanceInput?.parentNode) {
      this.distanceInput.parentNode.removeChild(this.distanceInput);
    }
    if (this.infoLabel?.parentNode) {
      this.infoLabel.parentNode.removeChild(this.infoLabel);
    }
    if (this.axisIndicator?.parentNode) {
      this.axisIndicator.parentNode.removeChild(this.axisIndicator);
    }
  }
}
