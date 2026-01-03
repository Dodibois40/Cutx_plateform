/* ================================================
   UI HANDLERS - Gestion des événements UI
   ================================================ */

import { appConfig, updateAppConfig } from '../core/config.js';
import { updateCuttingList } from '../cutting-list.js';

let caissonManagerInstance = null;

/**
 * Définit l'instance du CaissonManager
 */
export function setCaissonManager(manager) {
  caissonManagerInstance = manager;
}

/**
 * Initialise tous les gestionnaires d'événements UI
 */
export function initUIHandlers() {
  // Gestion des inputs de dimensions
  initDimensionInputs();

  // Gestion des sélections de couleur
  initColorSelection();

  // Gestion de la checkbox show-door
  initShowDoorCheckbox();

  // Gestion du bouton éclaté
  initExplodeButton();

  // Gestion du bouton "Ajouter un caisson"
  initAddCaissonButton();

  console.log('✅ Gestionnaires UI initialisés');
}

/**
 * Initialise le bouton d'ajout de caisson
 */
function initAddCaissonButton() {
  const addBtn = document.getElementById('add-caisson-btn');
  if (addBtn && caissonManagerInstance) {
    addBtn.addEventListener('click', () => {
      const newCaisson = caissonManagerInstance.addCaisson();
      caissonManagerInstance.selectCaisson(newCaisson.id);

      // Mettre à jour la liste
      const event = new CustomEvent('caisson-added', { detail: { caisson: newCaisson } });
      window.dispatchEvent(event);

      console.log(`✅ Nouveau caisson ${newCaisson.id} ajouté`);
    });
  }
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

        // Mettre à jour le caisson sélectionné
        if (caissonManagerInstance) {
          const caisson = caissonManagerInstance.getSelectedCaisson();
          if (caisson) {
            caisson.updateConfig({ [key]: value });
            updateCuttingList();
          }
        }
      });
    }
  });
}

/**
 * Initialise la sélection de couleur pour le caisson
 */
function initColorSelection() {
  // Couleurs du caisson
  const caissonColors = document.querySelectorAll('#caisson-colors .color-option');
  caissonColors.forEach(option => {
    option.addEventListener('click', () => {
      caissonColors.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');

      const color = parseInt(option.dataset.color.replace('#', '0x'));

      // Mettre à jour le caisson sélectionné
      if (caissonManagerInstance) {
        const caisson = caissonManagerInstance.getSelectedCaisson();
        if (caisson) {
          caisson.updateConfig({ colorCaisson: color });
        }
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

      // Mettre à jour le caisson sélectionné
      if (caissonManagerInstance) {
        const caisson = caissonManagerInstance.getSelectedCaisson();
        if (caisson) {
          caisson.updateConfig({ colorDoor: color });
        }
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

      // Mettre à jour le caisson sélectionné
      if (caissonManagerInstance) {
        const caisson = caissonManagerInstance.getSelectedCaisson();
        if (caisson) {
          caisson.updateConfig({ showDoor });
          updateCuttingList();
        }
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
        explodeBtn.innerHTML = '<span id="explode-icon">💥</span> Vue Éclatée';
        explodeBtn.classList.add('exploded');
      } else {
        explodeBtn.innerHTML = '<span id="explode-icon">🔲</span> Vue Standard';
        explodeBtn.classList.remove('exploded');
      }
    });
  }
}

/**
 * Met à jour les inputs avec la configuration du caisson sélectionné
 */
export function updateInputsFromSelectedCaisson() {
  if (!caissonManagerInstance) return;

  const caisson = caissonManagerInstance.getSelectedCaisson();
  if (!caisson) return;

  const config = caisson.config;

  // Mettre à jour les inputs de dimensions
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
