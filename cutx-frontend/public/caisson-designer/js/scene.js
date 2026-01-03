/* ================================================
   SCENE - Configuration de la scène Three.js
   ================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { appConfig } from './core/config.js';

// Variables exportées pour accès global
export let scene, camera, renderer, controls;

// Référence au CaissonManager (sera définie par main.js)
let caissonManagerRef = null;

/**
 * Définit la référence au CaissonManager
 */
export function setCaissonManagerRef(manager) {
  caissonManagerRef = manager;
}

/**
 * Initialise la scène Three.js
 */
export function initScene() {
  // Créer la scène
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0F0E0D);

  // Créer la caméra
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(1500, 1000, 1500);

  // Créer le renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);

  // Contrôles de caméra (OrbitControls) - Style SketchUp
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;  // Pan dans le plan de l'écran
  controls.minDistance = 100;
  controls.maxDistance = 5000;
  controls.target.set(0, 0, 0);

  // Configuration des boutons souris (style SketchUp)
  // Molette (bouton du milieu) = Rotation orbitale
  // Clic droit = Pan
  // Scroll = Zoom
  controls.mouseButtons = {
    LEFT: null,  // Désactivé (utilisé pour la sélection/déplacement)
    MIDDLE: THREE.MOUSE.ROTATE,  // Molette = rotation
    RIGHT: THREE.MOUSE.PAN  // Clic droit = pan
  };

  // Ajouter les axes 3D (style SketchUp)
  addAxesHelper();

  // Ajouter les lumières
  addLights();

  // Ajouter une grille au sol (optionnel - pour debug)
  if (appConfig.debugMode) {
    const gridHelper = new THREE.GridHelper(5000, 50, 0x444444, 0x222222);
    scene.add(gridHelper);
  }

  // Gestion du redimensionnement
  window.addEventListener('resize', onWindowResize);

  console.log('✅ Scène Three.js initialisée');
}

/**
 * Ajoute les axes 3D (style SketchUp)
 * Rouge = X, Vert = Y (haut), Bleu = Z
 */
function addAxesHelper() {
  const axisLength = 3000;  // Longueur des axes
  const axisWidth = 3;      // Épaisseur des lignes

  // Créer un groupe pour les axes
  const axesGroup = new THREE.Group();
  axesGroup.name = 'axes-helper';

  // Matériau pour chaque axe
  const createAxisLine = (start, end, color) => {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: axisWidth,
      transparent: true,
      opacity: 0.8
    });
    return new THREE.Line(geometry, material);
  };

  // Axe X (Rouge) - vers la droite
  const axisX = createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(axisLength, 0, 0),
    0xFF0000
  );
  axesGroup.add(axisX);

  // Partie négative de X (plus sombre)
  const axisXNeg = createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-axisLength, 0, 0),
    0x660000
  );
  axesGroup.add(axisXNeg);

  // Axe Y (Vert) - vers le haut
  const axisY = createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, axisLength, 0),
    0x00FF00
  );
  axesGroup.add(axisY);

  // Partie négative de Y (plus sombre) - normalement pas visible sous le sol
  const axisYNeg = createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -axisLength, 0),
    0x006600
  );
  axesGroup.add(axisYNeg);

  // Axe Z (Bleu) - vers l'avant
  const axisZ = createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, axisLength),
    0x0000FF
  );
  axesGroup.add(axisZ);

  // Partie négative de Z (plus sombre)
  const axisZNeg = createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -axisLength),
    0x000066
  );
  axesGroup.add(axisZNeg);

  // Ajouter des cônes aux extrémités positives (flèches)
  const coneGeometry = new THREE.ConeGeometry(20, 60, 8);

  // Flèche X
  const coneX = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
  coneX.position.set(axisLength, 0, 0);
  coneX.rotation.z = -Math.PI / 2;
  axesGroup.add(coneX);

  // Flèche Y
  const coneY = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
  coneY.position.set(0, axisLength, 0);
  axesGroup.add(coneY);

  // Flèche Z
  const coneZ = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: 0x0000FF }));
  coneZ.position.set(0, 0, axisLength);
  coneZ.rotation.x = Math.PI / 2;
  axesGroup.add(coneZ);

  scene.add(axesGroup);
  console.log('✅ Axes 3D ajoutés (X=Rouge, Y=Vert, Z=Bleu)');
}

/**
 * Ajoute les lumières à la scène
 */
function addLights() {
  // Lumière ambiante
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
  scene.add(ambientLight);

  // Lumière directionnelle principale
  const directionalLight1 = new THREE.DirectionalLight(0xFFFFFF, 0.8);
  directionalLight1.position.set(50, 50, 50);
  directionalLight1.castShadow = true;
  scene.add(directionalLight1);

  // Lumière directionnelle secondaire
  const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 0.4);
  directionalLight2.position.set(-50, 30, -30);
  scene.add(directionalLight2);

  // Lumière du bas pour éviter les zones trop sombres
  const directionalLight3 = new THREE.DirectionalLight(0xFFFFFF, 0.3);
  directionalLight3.position.set(0, -20, 0);
  scene.add(directionalLight3);
}

/**
 * Gère le redimensionnement de la fenêtre
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Boucle d'animation
 */
export function animate() {
  requestAnimationFrame(animate);
  controls.update();
  animateExplode();
  renderer.render(scene, camera);
}

/**
 * Anime la transition entre positions normale et éclatée
 * Fonctionne avec tous les caissons gérés par le CaissonManager
 */
function animateExplode() {
  if (!caissonManagerRef) return;

  const lerpSpeed = 0.1;
  const caissons = caissonManagerRef.getAllCaissons();

  caissons.forEach(caisson => {
    Object.values(caisson.panels).forEach(panel => {
      if (panel) {
        const targetPosition = appConfig.isExploded
          ? panel.userData.explodedPosition
          : panel.userData.basePosition;

        // Interpolation linéaire (lerp)
        panel.position.x += (targetPosition.x - panel.position.x) * lerpSpeed;
        panel.position.y += (targetPosition.y - panel.position.y) * lerpSpeed;
        panel.position.z += (targetPosition.z - panel.position.z) * lerpSpeed;
      }
    });
  });
}
