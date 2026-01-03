/* ================================================
   MAIN - Point d'entrée mono-caisson (style Blum)
   Version simplifiée: 1 seul caisson, pas de multi-sélection
   ================================================ */

import { initScene, animate, scene, camera, renderer, controls, setCaissonRef } from './scene-simple.js';
import { Caisson } from './models/Caisson.js';
import { getDefaultCaissonConfig, appConfig, updateAppConfig } from './core/config.js';
import { updateCuttingList, toggleCollapsible, setCaissonRef as setCuttingListCaissonRef } from './cutting-list.js';
import { initOptimizer, setCaissonRef as setOptimizerCaissonRef } from './optimizer.js';
import { initTexturePainter } from './texture-painter.js';
import {
  initInteractionManager,
  setCaissonRef as setInteractionCaissonRef,
  setOnPanelSelect,
  setOnShelfMove,
  refreshInteractionState
} from './interaction-manager.js';

// Instance unique du caisson
let caisson = null;

/**
 * Initialise l'application mono-caisson
 */
function init() {
  console.log('%c🚀 Configurateur 3D CutX - Mode Mono-Caisson', 'font-size: 16px; font-weight: bold; color: #8B9A4B');

  // 1. Initialiser la scène Three.js
  initScene();

  // 2. Creer le caisson unique
  const config = getDefaultCaissonConfig();
  caisson = new Caisson(1, config, { x: 0, y: 0, z: 0 });
  scene.add(caisson.group);

  // Definir les references au caisson pour tous les modules
  setCaissonRef(caisson);
  setCuttingListCaissonRef(caisson);
  setOptimizerCaissonRef(caisson);
  setInteractionCaissonRef(caisson);

  // En mode mono-caisson, pas besoin d'outline de selection
  // (etait utilise pour le multi-caisson)

  // 3. Initialiser le gestionnaire d'interactions 3D
  initInteractionManager();
  setOnPanelSelect(handlePanelSelect);
  setOnShelfMove(handleShelfMove);

  // 4. Initialiser les gestionnaires UI simplifiés
  initUIHandlers();

  // 4. Initialiser l'optimiseur de débit
  initOptimizer();

  // 5. Initialiser le système de peinture de textures
  initTexturePainter();

  // 6. Mettre à jour l'UI initiale
  updateInputsFromCaisson();
  updateCuttingList();

  // 7. Lancer l'animation
  animate();

  // 8. Afficher les instructions
  updateInfoPanel();

  console.log('%c✅ Configurateur mono-caisson initialisé', 'font-size: 14px; color: #8B9A4B');
}

/**
 * Met à jour le panneau d'informations
 */
function updateInfoPanel() {
  const infoPanel = document.getElementById('info');
  if (infoPanel) {
    infoPanel.innerHTML = `
      Rotation : Molette (bouton) | Pan : Clic droit | Zoom : Scroll
    `;
  }
}

/**
 * Initialise les gestionnaires d'événements UI
 */
function initUIHandlers() {
  // Gestion des inputs de dimensions
  initDimensionInputs();

  // Gestion des sélections de couleur
  initColorSelection();

  // Gestion de la checkbox show-door
  initShowDoorCheckbox();

  // Gestion du bouton éclaté
  initExplodeButton();

  // Gestion des étagères
  initShelvesUI();

  console.log('✅ Gestionnaires UI initialisés');
}

/**
 * Initialise les inputs de dimensions
 */
function initDimensionInputs() {
  const inputs = {
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    depth: document.getElementById('depth'),
    thickness: document.getElementById('thickness'),
    doorThickness: document.getElementById('door-thickness'),
    gapTop: document.getElementById('gap-top'),
    gapBottom: document.getElementById('gap-bottom'),
    gapLeft: document.getElementById('gap-left'),
    gapRight: document.getElementById('gap-right'),
    doorOffset: document.getElementById('door-offset')
  };

  Object.keys(inputs).forEach(key => {
    if (inputs[key]) {
      inputs[key].addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (caisson) {
          caisson.updateConfig({ [key]: value });
          updateCuttingList();
        }
      });
    }
  });
}

/**
 * Initialise la sélection de couleur
 */
function initColorSelection() {
  // Couleurs du caisson
  const caissonColors = document.querySelectorAll('#caisson-colors .color-option');
  caissonColors.forEach(option => {
    option.addEventListener('click', () => {
      caissonColors.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');

      const color = parseInt(option.dataset.color.replace('#', '0x'));
      if (caisson) {
        caisson.updateConfig({ colorCaisson: color });
      }
    });
  });

  // Couleurs de la porte
  const doorColors = document.querySelectorAll('#door-colors .color-option');
  doorColors.forEach(option => {
    option.addEventListener('click', () => {
      doorColors.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');

      const color = parseInt(option.dataset.color.replace('#', '0x'));
      if (caisson) {
        caisson.updateConfig({ colorDoor: color });
      }
    });
  });
}

/**
 * Initialise la checkbox pour afficher/masquer la porte
 */
function initShowDoorCheckbox() {
  const showDoorCheckbox = document.getElementById('show-door');

  if (showDoorCheckbox) {
    showDoorCheckbox.addEventListener('change', (e) => {
      const showDoor = e.target.checked;
      if (caisson) {
        caisson.updateConfig({ showDoor });
        updateCuttingList();
      }
    });
  }
}

/**
 * Initialise le bouton de vue éclatée
 */
function initExplodeButton() {
  const explodeBtn = document.getElementById('explode-btn');
  if (explodeBtn) {
    explodeBtn.addEventListener('click', () => {
      const isExploded = !appConfig.isExploded;
      updateAppConfig('isExploded', isExploded);

      if (isExploded) {
        explodeBtn.innerHTML = '<span class="explode-icon">💥</span><span class="explode-text">Vue Éclatée</span>';
        explodeBtn.classList.add('exploded');
      } else {
        explodeBtn.innerHTML = '<span class="explode-icon">🔲</span><span class="explode-text">Vue Standard</span>';
        explodeBtn.classList.remove('exploded');
      }
    });
  }
}

/**
 * Gere la selection d'un panneau ou etagere
 */
function handlePanelSelect(selection) {
  const panelInfo = document.getElementById('panel-info');
  const panelName = document.getElementById('selected-panel-name');
  const panelDimensions = document.getElementById('selected-panel-dimensions');

  if (!panelInfo) return;

  if (selection) {
    panelInfo.classList.remove('hidden');

    // Noms lisibles pour les panneaux
    const panelNames = {
      'inferior': 'Panneau Inferieur',
      'superior': 'Panneau Superieur',
      'left': 'Cote Gauche',
      'right': 'Cote Droit',
      'back': 'Fond (Dos)',
      'door': 'Facade / Porte'
    };

    if (selection.type === 'shelf') {
      panelName.textContent = `Etagere ${selection.index + 1}`;
      const shelf = caisson.config.shelves[selection.index];
      const w = caisson.config.width - 2 * caisson.config.thickness;
      const d = caisson.config.depth - caisson.config.thickness;
      panelDimensions.textContent = `${Math.round(w)} x ${Math.round(d)} x ${shelf.thickness} mm`;
    } else {
      panelName.textContent = panelNames[selection.name] || selection.name;

      // Calculer les dimensions du panneau
      const config = caisson.config;
      let dims = '';
      switch (selection.name) {
        case 'inferior':
        case 'superior':
          dims = `${config.width} x ${config.depth} x ${config.thickness} mm`;
          break;
        case 'left':
        case 'right':
          dims = `${config.depth} x ${config.height - 2 * config.thickness} x ${config.thickness} mm`;
          break;
        case 'back':
          dims = `${config.width - 2 * config.thickness} x ${config.height - 2 * config.thickness} x ${config.thickness} mm`;
          break;
        case 'door':
          const doorW = config.width - config.gapLeft - config.gapRight;
          const doorH = config.height - config.gapTop - config.gapBottom;
          dims = `${Math.round(doorW)} x ${Math.round(doorH)} x ${config.doorThickness} mm`;
          break;
        default:
          dims = '-';
      }
      panelDimensions.textContent = dims;
    }
  } else {
    panelInfo.classList.add('hidden');
  }
}

/**
 * Gere le deplacement d'une etagere par drag
 */
function handleShelfMove(shelfIndex, newPositionY) {
  // Mettre a jour l'UI des etageres
  updateShelvesUI();
  updateCuttingList();
}

/**
 * Initialise l'UI des étagères
 */
function initShelvesUI() {
  const addShelfBtn = document.getElementById('add-shelf-btn');

  if (addShelfBtn) {
    addShelfBtn.addEventListener('click', () => {
      if (caisson) {
        caisson.addShelf();
        updateShelvesUI();
        updateCuttingList();
      }
    });
  }

  // Mise à jour initiale
  updateShelvesUI();
}

/**
 * Met à jour l'affichage de la liste des étagères
 */
function updateShelvesUI() {
  const shelvesList = document.getElementById('shelves-list');
  const noShelvesMsg = document.getElementById('no-shelves-msg');

  if (!shelvesList || !caisson) return;

  // Vider la liste
  shelvesList.innerHTML = '';

  const shelvesInfo = caisson.getShelvesInfo();

  // Afficher/masquer le message "aucune étagère"
  if (noShelvesMsg) {
    noShelvesMsg.style.display = shelvesInfo.length === 0 ? 'block' : 'none';
  }

  // Créer les éléments pour chaque étagère
  shelvesInfo.forEach((shelf, index) => {
    const shelfDiv = document.createElement('div');
    shelfDiv.className = 'shelf-item';
    shelfDiv.dataset.index = index;

    shelfDiv.innerHTML = `
      <div class="shelf-item-header">
        <span class="shelf-item-name">
          <span class="shelf-item-icon">📏</span>
          Etagere ${index + 1}
        </span>
        <button class="shelf-delete-btn" data-index="${index}" title="Supprimer cette etagere">
          ✕
        </button>
      </div>
      <div class="shelf-item-controls">
        <label>Position Y</label>
        <input type="number" class="shelf-position-input" data-index="${index}"
               value="${Math.round(shelf.positionY)}" min="30" max="2000" step="10">
        <span class="unit">mm</span>
      </div>
    `;

    shelvesList.appendChild(shelfDiv);
  });

  // Ajouter les event listeners pour les boutons de suppression
  const deleteButtons = shelvesList.querySelectorAll('.shelf-delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      if (caisson) {
        caisson.removeShelf(index);
        updateShelvesUI();
        updateCuttingList();
      }
    });
  });

  // Ajouter les event listeners pour les inputs de position
  const positionInputs = shelvesList.querySelectorAll('.shelf-position-input');
  positionInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const newPosition = parseFloat(e.target.value);
      if (caisson && !isNaN(newPosition)) {
        caisson.updateShelfPosition(index, newPosition);
        updateCuttingList();
      }
    });
  });
}

/**
 * Met à jour les inputs avec la configuration du caisson
 */
function updateInputsFromCaisson() {
  if (!caisson) return;

  const config = caisson.config;

  const inputs = {
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    depth: document.getElementById('depth'),
    thickness: document.getElementById('thickness'),
    doorThickness: document.getElementById('door-thickness'),
    gapTop: document.getElementById('gap-top'),
    gapBottom: document.getElementById('gap-bottom'),
    gapLeft: document.getElementById('gap-left'),
    gapRight: document.getElementById('gap-right'),
    doorOffset: document.getElementById('door-offset')
  };

  Object.keys(inputs).forEach(key => {
    if (inputs[key] && config[key] !== undefined) {
      inputs[key].value = config[key];
    }
  });

  // Mettre à jour la checkbox show-door
  const showDoorCheckbox = document.getElementById('show-door');
  if (showDoorCheckbox) {
    showDoorCheckbox.checked = config.showDoor;
  }
}

// Exposer toggleCollapsible globalement
window.toggleCollapsible = toggleCollapsible;

// Lancer l'application
init();

// Exposer l'instance du caisson pour le debug
if (typeof window !== 'undefined') {
  window.app = {
    caisson,
    scene,
    camera,
    renderer
  };
}
