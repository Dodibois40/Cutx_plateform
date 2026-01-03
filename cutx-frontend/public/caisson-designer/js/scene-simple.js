/* ================================================
   SCENE-SIMPLE - Scène Three.js simplifiée mono-caisson
   Version optimisée: pas de multi-caisson, performance max
   ================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { appConfig } from './core/config.js';

// Variables exportées pour accès global
export let scene, camera, renderer, controls;

// Référence au caisson unique
let caissonRef = null;

/**
 * Définit la référence au caisson unique
 */
export function setCaissonRef(caisson) {
  caissonRef = caisson;
}

/**
 * Initialise la scène Three.js optimisée
 */
export function initScene() {
  // Créer la scène
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1918); // Gris fonce (moins noir)

  // Créer la caméra
  camera = new THREE.PerspectiveCamera(
    60, // FOV légèrement réduit pour meilleure perspective
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  // Position optimisée pour voir un seul caisson
  // Positionnee en diagonale avant-droite-haut par rapport au centre du caisson
  camera.position.set(1100, 900, 1000);

  // Créer le renderer avec optimisations et meilleure qualité
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false // Pas besoin de stencil buffer
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Tone mapping pour meilleure gestion des couleurs
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  document.getElementById('container').appendChild(renderer.domElement);

  // Contrôles de caméra (OrbitControls)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;   // Activer pour fluidite
  controls.dampingFactor = 0.20;   // Facteur eleve = arret rapide (0.05 par defaut)
  controls.screenSpacePanning = true;
  controls.minDistance = 200;
  controls.maxDistance = 2000;

  // Cible au centre du caisson (dimensions par defaut: 600x900x350)
  // Origine du caisson: coin arriere-bas-gauche
  controls.target.set(300, 450, 175);

  // Configuration des boutons souris
  // Clic gauche = RIEN (reserve pour la selection des panneaux)
  // Alt + Clic gauche = Rotation orbitale (pour souris sans molette)
  // Molette (bouton du milieu) = Rotation orbitale
  // Clic droit = Pan
  // Scroll = Zoom
  controls.mouseButtons = {
    LEFT: null,              // Desactive pour permettre la selection
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.PAN
  };

  // Support Alt + Clic gauche pour rotation (pour souris sans bouton du milieu)
  setupAltClickRotation();

  // Ajouter les axes 3D
  addAxesHelper();

  // Ajouter les lumières optimisées
  addLights();

  // Grille de référence subtile
  addGrid();

  // Gestion du redimensionnement
  window.addEventListener('resize', onWindowResize);

  console.log('✅ Scène Three.js mono-caisson initialisée');
}

/**
 * Configure Alt + Clic gauche pour la rotation
 * Alternative pour les souris sans bouton du milieu
 */
function setupAltClickRotation() {
  let altPressed = false;

  // Ecouter les touches du clavier
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' && !altPressed) {
      altPressed = true;
      // Activer la rotation avec le clic gauche quand Alt est enfonce
      controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      renderer.domElement.style.cursor = 'grab';
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
      altPressed = false;
      // Desactiver la rotation avec le clic gauche quand Alt est relache
      controls.mouseButtons.LEFT = null;
      renderer.domElement.style.cursor = 'default';
    }
  });

  // Si la fenetre perd le focus, reset l'etat Alt
  window.addEventListener('blur', () => {
    if (altPressed) {
      altPressed = false;
      controls.mouseButtons.LEFT = null;
      renderer.domElement.style.cursor = 'default';
    }
  });
}

/**
 * Ajoute les axes 3D (style SketchUp)
 */
function addAxesHelper() {
  const axisLength = 1000;

  const axesGroup = new THREE.Group();
  axesGroup.name = 'axes-helper';

  const createAxisLine = (start, end, color) => {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6
    });
    return new THREE.Line(geometry, material);
  };

  // Axe X (Rouge)
  axesGroup.add(createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(axisLength, 0, 0),
    0xFF4444
  ));

  // Axe Y (Vert) - vers le haut
  axesGroup.add(createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, axisLength, 0),
    0x44FF44
  ));

  // Axe Z (Bleu)
  axesGroup.add(createAxisLine(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, axisLength),
    0x4444FF
  ));

  scene.add(axesGroup);
}

/**
 * Ajoute une grille de référence subtile
 */
function addGrid() {
  // Grille 4x plus grande (8000mm = 8m) avec subdivisions adaptees
  // Couleurs eclairices pour etre visibles sur le fond gris fonce (0x1a1918)
  const gridHelper = new THREE.GridHelper(8000, 40, 0x3a3a3a, 0x2a2a2a);
  gridHelper.position.y = -1; // Légèrement sous le sol

  // Rendre la grille plus subtile (GridHelper a un tableau de materiaux)
  if (Array.isArray(gridHelper.material)) {
    gridHelper.material.forEach(mat => {
      mat.opacity = 0.35;
      mat.transparent = true;
    });
  } else {
    gridHelper.material.opacity = 0.35;
    gridHelper.material.transparent = true;
  }

  scene.add(gridHelper);
}

/**
 * Ajoute les lumières à la scène
 * Configuration optimisee pour voir l'interieur du caisson
 */
function addLights() {
  // Lumière ambiante - augmentee pour mieux voir l'interieur
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.85);
  scene.add(ambientLight);

  // Lumière directionnelle principale (avant-droite-haut)
  const directionalLight1 = new THREE.DirectionalLight(0xFFFFFF, 0.5);
  directionalLight1.position.set(800, 1000, 800);
  scene.add(directionalLight1);

  // Lumière directionnelle secondaire (arriere-gauche)
  const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 0.3);
  directionalLight2.position.set(-500, 600, -400);
  scene.add(directionalLight2);

  // Lumière pour eclairer l'interieur (depuis l'avant)
  const frontLight = new THREE.DirectionalLight(0xFFFFFF, 0.4);
  frontLight.position.set(300, 400, 800);
  scene.add(frontLight);

  // Lumière de dessous pour eliminer les ombres trop fortes
  const bottomLight = new THREE.DirectionalLight(0xFFFFFF, 0.15);
  bottomLight.position.set(0, -200, 0);
  scene.add(bottomLight);
}

/**
 * Gère le redimensionnement de la fenêtre
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Mettre a jour la resolution des LineMaterial (Fat Lines)
  if (caissonRef && caissonRef.updateEdgeResolution) {
    caissonRef.updateEdgeResolution(window.innerWidth, window.innerHeight);
  }
}

/**
 * Boucle d'animation optimisée
 */
export function animate() {
  requestAnimationFrame(animate);

  // Mise à jour des contrôles
  controls.update();

  // Animation de l'explosion si nécessaire
  if (caissonRef) {
    animateExplode();
  }

  // Rendu
  renderer.render(scene, camera);
}

/**
 * Anime la transition entre positions normale et éclatée
 * Version simplifiée pour un seul caisson
 */
function animateExplode() {
  if (!caissonRef) return;

  const lerpSpeed = 0.12; // Légèrement plus rapide

  Object.values(caissonRef.panels).forEach(panel => {
    if (panel && panel.userData.basePosition && panel.userData.explodedPosition) {
      const targetPosition = appConfig.isExploded
        ? panel.userData.explodedPosition
        : panel.userData.basePosition;

      // Interpolation linéaire optimisée
      panel.position.lerp(targetPosition, lerpSpeed);
    }
  });
}
