/* ================================================
   TEXTURE PAINTER - Système de peinture de textures
   ================================================ */

import * as THREE from 'three';
import { camera, renderer, scene } from './scene-simple.js';

// Configuration du Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();

// État du système
let paintMode = false;
let selectedTexturePath = null;
let selectedTextureItem = null;

/**
 * Applique une texture à un mesh 3D
 */
function applyTextureToMesh(mesh, texturePath) {
  if (!texturePath) {
    // Supprimer la texture
    if (mesh.material.map) {
      mesh.material.map.dispose();
      mesh.material.map = null;
      mesh.material.color.setHex(mesh.userData.originalColor || 0xFFFFFF);
      mesh.material.needsUpdate = true;
      console.log('Texture supprimée de:', mesh.name);
    }
    return;
  }

  // Charger et appliquer la texture
  textureLoader.load(
    texturePath,
    (texture) => {
      if (mesh.userData.originalColor === undefined) {
        mesh.userData.originalColor = mesh.material.color.getHex();
      }

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      const scale = 0.002;
      texture.repeat.set(
        mesh.geometry.parameters.width * scale,
        mesh.geometry.parameters.height * scale
      );

      mesh.material.map = texture;
      mesh.material.color.setHex(0xFFFFFF);
      mesh.material.needsUpdate = true;

      console.log('Texture appliquée à:', mesh.name, texturePath);
    },
    undefined,
    (error) => {
      console.error('Erreur de chargement de la texture:', error);
    }
  );
}

/**
 * Désactive le mode peinture
 */
function deactivatePaintMode() {
  paintMode = false;
  document.body.classList.remove('paint-mode');
  const paintModeIndicator = document.getElementById('paint-mode-indicator');
  paintModeIndicator.classList.add('hidden');
  paintModeIndicator.querySelector('span').textContent = '🖌️ Mode Peinture';
  paintModeIndicator.querySelector('small').textContent = 'Cliquez sur un panneau pour appliquer la texture';

  if (selectedTextureItem) {
    selectedTextureItem.classList.remove('selected');
    selectedTextureItem = null;
  }
  selectedTexturePath = null;
}

/**
 * Initialise le système de peinture de textures
 */
export function initTexturePainter() {
  const textureItems = document.querySelectorAll('.texture-item:not(.texture-remove)');
  const textureRemoveBtn = document.querySelector('.texture-item.texture-remove');
  const paintModeIndicator = document.getElementById('paint-mode-indicator');

  // Gestion de la sélection de texture
  textureItems.forEach(item => {
    item.addEventListener('click', () => {
      if (selectedTextureItem) {
        selectedTextureItem.classList.remove('selected');
      }

      item.classList.add('selected');
      selectedTextureItem = item;
      selectedTexturePath = item.dataset.texture;

      paintMode = true;
      document.body.classList.add('paint-mode');
      paintModeIndicator.classList.remove('hidden');

      console.log('Texture sélectionnée:', selectedTexturePath);
    });
  });

  // Gestion du bouton de suppression
  textureRemoveBtn.addEventListener('click', () => {
    if (selectedTextureItem) {
      selectedTextureItem.classList.remove('selected');
      selectedTextureItem = null;
    }

    selectedTexturePath = null;
    paintMode = true;
    document.body.classList.add('paint-mode');
    paintModeIndicator.classList.remove('hidden');
    paintModeIndicator.querySelector('span').textContent = '🗑️ Mode Suppression';
    paintModeIndicator.querySelector('small').textContent = 'Cliquez sur un panneau pour retirer sa texture';

    console.log('Mode suppression activé');
  });

  // Gestion des clics sur la scène 3D
  renderer.domElement.addEventListener('click', (event) => {
    if (!paintMode) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Trouver le premier mesh VISIBLE
      const intersectedMesh = intersects.find(intersect =>
        intersect.object.isMesh && intersect.object.visible
      );

      if (intersectedMesh) {
        const mesh = intersectedMesh.object;

        // Verifier si c'est un panneau ou une etagere
        if (mesh.name && (
          mesh.name.includes('superior') ||
          mesh.name.includes('inferior') ||
          mesh.name.includes('left') ||
          mesh.name.includes('right') ||
          mesh.name.includes('back') ||
          mesh.name.includes('door') ||
          mesh.name.includes('shelf')
        )) {
          applyTextureToMesh(mesh, selectedTexturePath);
          deactivatePaintMode();
        }
      }
    }
  });

  // Désactiver avec Échap
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && paintMode) {
      deactivatePaintMode();
      console.log('Mode peinture désactivé');
    }
  });

  console.log('✅ Système de peinture initialisé');
}
