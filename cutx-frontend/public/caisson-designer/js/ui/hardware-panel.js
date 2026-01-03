/* ================================================
   HARDWARE PANEL - Interface de configuration quincaillerie
   Avec système de Drag & Drop
   ================================================ */

import * as THREE from 'three';
import { HINGE_SPECS, HINGE_PLACEMENT_RULES, DEFAULT_HINGE_CONFIG } from '../config/hardware-specs.js';

/**
 * Panneau de configuration de la quincaillerie avec Drag & Drop
 */
export class HardwarePanel {
  constructor(hardwareManager, caissonManager) {
    this.hardwareManager = hardwareManager;
    this.caissonManager = caissonManager;

    this.panel = null;
    this.draggedItem = null;
    this.dragGhost = null;
    this.isDragging = false;

    // Configuration actuelle
    this.currentConfig = { ...DEFAULT_HINGE_CONFIG };

    // Référence à la porte survolée
    this.hoveredDoor = null;

    // Raycaster pour détecter la porte
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Callbacks
    this.onHingeDropped = null;
  }

  /**
   * Initialise le panneau
   */
  init() {
    this.createPanel();
    this.attachDragEvents();
    this.addStyles();
    console.log('✅ HardwarePanel avec Drag & Drop initialisé');
  }

  /**
   * Crée le panneau HTML avec items draggables
   */
  createPanel() {
    const configPanel = document.getElementById('config-panel');
    if (!configPanel) {
      console.error('Panneau de configuration non trouvé');
      return;
    }

    // Créer le groupe de configuration quincaillerie
    const hardwareGroup = document.createElement('div');
    hardwareGroup.className = 'config-group';
    hardwareGroup.id = 'hardware-config';
    hardwareGroup.innerHTML = `
      <div class="collapsible-header" onclick="toggleCollapsible('hardware-config')">
        <h3>🔩 Quincaillerie</h3>
        <span class="collapsible-icon" id="hardware-config-icon">▼</span>
      </div>

      <div class="collapsible-content" id="hardware-config-content">
        <!-- Bouton simple pour ajouter les charnières -->
        <button id="add-hinges-quick-btn" class="hardware-btn-main">
          🔩 Ajouter 2 Charnières au Caisson
        </button>

        <p class="drag-instruction">Ou glissez une charnière sur la porte</p>

        <!-- Items de quincaillerie draggables -->
        <div class="hardware-items">
          <div class="hardware-item" draggable="true" data-type="CLIP_TOP_BLUMOTION_110">
            <div class="hardware-icon">
              <svg viewBox="0 0 60 40" width="50" height="35">
                <rect x="5" y="10" width="20" height="20" rx="3" fill="#B8B8B8" stroke="#666" stroke-width="1"/>
                <rect x="25" y="15" width="25" height="10" rx="2" fill="#A0A0A0" stroke="#666" stroke-width="1"/>
                <circle cx="15" cy="20" r="6" fill="#888" stroke="#555" stroke-width="1"/>
              </svg>
            </div>
            <span class="hardware-name">CLIP top 110°</span>
          </div>

          <div class="hardware-item" draggable="true" data-type="CLIP_TOP_170">
            <div class="hardware-icon">
              <svg viewBox="0 0 60 40" width="50" height="35">
                <rect x="5" y="8" width="20" height="24" rx="3" fill="#B8B8B8" stroke="#666" stroke-width="1"/>
                <rect x="25" y="13" width="28" height="14" rx="2" fill="#A0A0A0" stroke="#666" stroke-width="1"/>
                <circle cx="15" cy="20" r="6" fill="#888" stroke="#555" stroke-width="1"/>
              </svg>
            </div>
            <span class="hardware-name">CLIP top 170°</span>
          </div>
        </div>

        <!-- Configuration après drop -->
        <div id="hinge-config-section" class="hinge-config-section hidden">
          <h4>Configuration Charnières</h4>

          <div class="input-group">
            <label for="hinge-count">Nombre</label>
            <div class="input-wrapper">
              <input type="number" id="hinge-count" value="2" min="2" max="6" step="1">
            </div>
          </div>

          <div class="input-group">
            <label for="hinge-distance-top">Distance haut</label>
            <div class="input-wrapper">
              <input type="number" id="hinge-distance-top" value="100" min="50" max="300" step="5">
              <span class="unit">mm</span>
            </div>
          </div>

          <div class="input-group">
            <label for="hinge-distance-bottom">Distance bas</label>
            <div class="input-wrapper">
              <input type="number" id="hinge-distance-bottom" value="100" min="50" max="300" step="5">
              <span class="unit">mm</span>
            </div>
          </div>

          <div class="input-group">
            <label for="hinge-distance-edge">Distance chant</label>
            <div class="input-wrapper">
              <input type="number" id="hinge-distance-edge" value="21" min="15" max="50" step="1">
              <span class="unit">mm</span>
            </div>
          </div>

          <button id="apply-hinges-btn" class="hardware-btn">
            Appliquer
          </button>

          <button id="remove-hinges-btn" class="hardware-btn hardware-btn-danger">
            Supprimer Charnières
          </button>
        </div>

        <!-- Informations perçages -->
        <div id="drilling-info" class="drilling-info hidden">
          <h4>Perçages générés</h4>
          <div id="drilling-list"></div>
        </div>
      </div>
    `;

    // Insérer après "Configuration Porte"
    const doorConfigContent = document.getElementById('door-config-content');
    if (doorConfigContent) {
      const doorConfigGroup = doorConfigContent.closest('.config-group');
      if (doorConfigGroup) {
        doorConfigGroup.after(hardwareGroup);
      } else {
        configPanel.appendChild(hardwareGroup);
      }
    } else {
      configPanel.appendChild(hardwareGroup);
    }

    this.panel = hardwareGroup;
  }

  /**
   * Attache les événements de drag & drop
   */
  attachDragEvents() {
    // Récupérer tous les items draggables
    const items = document.querySelectorAll('.hardware-item[draggable="true"]');

    items.forEach(item => {
      // Début du drag
      item.addEventListener('dragstart', (e) => {
        this.isDragging = true;
        this.draggedItem = item;
        this.currentConfig.type = item.dataset.type;

        // Créer un ghost personnalisé
        this.createDragGhost(item);

        e.dataTransfer.setData('text/plain', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';

        item.classList.add('dragging');

        // Activer le mode drop sur le canvas
        this.enableDropZone();
      });

      // Fin du drag
      item.addEventListener('dragend', (e) => {
        this.isDragging = false;
        item.classList.remove('dragging');
        this.removeDragGhost();
        this.disableDropZone();
        this.clearDoorHighlight();
      });
    });

    // Événements sur le canvas 3D
    const canvas = document.querySelector('#container canvas');
    if (canvas) {
      canvas.addEventListener('dragover', (e) => this.onCanvasDragOver(e));
      canvas.addEventListener('drop', (e) => this.onCanvasDrop(e));
      canvas.addEventListener('dragleave', (e) => this.onCanvasDragLeave(e));
    }

    // Bouton rapide pour ajouter des charnières
    const quickAddBtn = document.getElementById('add-hinges-quick-btn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => this.quickAddHinges());
    }

    // Boutons de configuration
    const applyBtn = document.getElementById('apply-hinges-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applyHingeConfig());
    }

    const removeBtn = document.getElementById('remove-hinges-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => this.removeHinges());
    }

    // Inputs de configuration
    ['hinge-count', 'hinge-distance-top', 'hinge-distance-bottom', 'hinge-distance-edge'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => this.onConfigChange());
      }
    });
  }

  /**
   * Crée le ghost de drag
   */
  createDragGhost(item) {
    this.dragGhost = document.createElement('div');
    this.dragGhost.className = 'drag-ghost';
    this.dragGhost.innerHTML = `
      <div class="ghost-icon">🔩</div>
      <div class="ghost-text">Charnière</div>
    `;
    document.body.appendChild(this.dragGhost);
  }

  /**
   * Supprime le ghost de drag
   */
  removeDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  /**
   * Active la zone de drop sur le canvas
   */
  enableDropZone() {
    const container = document.getElementById('container');
    if (container) {
      container.classList.add('drop-zone-active');
    }
  }

  /**
   * Désactive la zone de drop
   */
  disableDropZone() {
    const container = document.getElementById('container');
    if (container) {
      container.classList.remove('drop-zone-active');
    }
  }

  /**
   * Gère le survol du canvas pendant le drag
   */
  onCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Mettre à jour la position du ghost
    if (this.dragGhost) {
      this.dragGhost.style.left = (e.clientX + 10) + 'px';
      this.dragGhost.style.top = (e.clientY + 10) + 'px';
    }

    // Détecter si on survole une porte
    this.detectDoorHover(e);
  }

  /**
   * Détecte si on survole une porte
   */
  detectDoorHover(e) {
    const canvas = document.querySelector('#container canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Obtenir la caméra depuis window.app
    const camera = window.app?.camera;
    const caissonManager = window.app?.caissonManager;

    if (!camera || !caissonManager) return;

    this.raycaster.setFromCamera(this.mouse, camera);

    // Chercher les portes
    const allCaissons = caissonManager.getAllCaissons();
    const doors = allCaissons
      .map(c => c.panels.door)
      .filter(d => d && d.visible);

    const intersects = this.raycaster.intersectObjects(doors, true);

    if (intersects.length > 0) {
      const door = intersects[0].object;
      this.highlightDoor(door);
      this.hoveredDoor = door;

      if (this.dragGhost) {
        this.dragGhost.classList.add('valid-drop');
      }
    } else {
      this.clearDoorHighlight();
      this.hoveredDoor = null;

      if (this.dragGhost) {
        this.dragGhost.classList.remove('valid-drop');
      }
    }
  }

  /**
   * Surligne une porte
   */
  highlightDoor(door) {
    if (this.hoveredDoor && this.hoveredDoor !== door) {
      this.clearDoorHighlight();
    }

    if (door.material) {
      if (!door.userData.originalEmissive) {
        door.userData.originalEmissive = door.material.emissive?.clone() || new THREE.Color(0x000000);
      }
      door.material.emissive = new THREE.Color(0x00ff00);
      door.material.emissiveIntensity = 0.3;
    }
  }

  /**
   * Supprime la surbrillance de la porte
   */
  clearDoorHighlight() {
    if (this.hoveredDoor && this.hoveredDoor.material) {
      if (this.hoveredDoor.userData.originalEmissive) {
        this.hoveredDoor.material.emissive = this.hoveredDoor.userData.originalEmissive;
      } else {
        this.hoveredDoor.material.emissive = new THREE.Color(0x000000);
      }
      this.hoveredDoor.material.emissiveIntensity = 0;
    }
  }

  /**
   * Gère le drop sur le canvas
   */
  onCanvasDrop(e) {
    e.preventDefault();

    if (!this.hoveredDoor) {
      console.log('⚠️ Aucune porte ciblée');
      return;
    }

    // Trouver le caisson associé à cette porte
    const caissonManager = window.app?.caissonManager;
    if (!caissonManager) return;

    const caisson = caissonManager.getCaissonByObject(this.hoveredDoor);
    if (!caisson) {
      console.log('⚠️ Caisson non trouvé');
      return;
    }

    console.log(`✅ Charnière déposée sur caisson ${caisson.id}`);

    // Sélectionner ce caisson
    caissonManager.selectCaisson(caisson.id);

    // Ajouter les charnières
    this.addHingesToCaisson(caisson.id);

    // Afficher la section de configuration
    this.showConfigSection();

    // Nettoyer
    this.clearDoorHighlight();
    this.hoveredDoor = null;
  }

  /**
   * Gère la sortie du canvas
   */
  onCanvasDragLeave(e) {
    this.clearDoorHighlight();
    this.hoveredDoor = null;

    if (this.dragGhost) {
      this.dragGhost.classList.remove('valid-drop');
    }
  }

  /**
   * Ajoute rapidement des charnières au caisson sélectionné
   */
  quickAddHinges() {
    const selectedCaisson = this.caissonManager.getSelectedCaisson();
    if (!selectedCaisson) {
      alert('Veuillez d\'abord sélectionner un caisson en cliquant dessus');
      return;
    }

    console.log('🔩 Ajout rapide de charnières au caisson', selectedCaisson.id);
    this.addHingesToCaisson(selectedCaisson.id);
    this.showConfigSection();
  }

  /**
   * Ajoute des charnières au caisson
   */
  async addHingesToCaisson(caissonId) {
    const config = {
      type: this.currentConfig.type,
      count: parseInt(document.getElementById('hinge-count')?.value || 2),
      distanceFromTop: parseInt(document.getElementById('hinge-distance-top')?.value || 100),
      distanceFromBottom: parseInt(document.getElementById('hinge-distance-bottom')?.value || 100),
      distanceFromEdge: parseInt(document.getElementById('hinge-distance-edge')?.value || 21)
    };

    await this.hardwareManager.addHingesToCaisson(caissonId, config);
    this.updateDrillingInfo(caissonId);
  }

  /**
   * Applique la configuration des charnières
   */
  applyHingeConfig() {
    const selectedCaisson = this.caissonManager.getSelectedCaisson();
    if (!selectedCaisson) {
      alert('Veuillez sélectionner un caisson');
      return;
    }

    this.addHingesToCaisson(selectedCaisson.id);
  }

  /**
   * Supprime les charnières
   */
  removeHinges() {
    const selectedCaisson = this.caissonManager.getSelectedCaisson();
    if (!selectedCaisson) return;

    this.hardwareManager.removeHingesFromCaisson(selectedCaisson.id);
    this.hideConfigSection();
    this.updateDrillingInfo(selectedCaisson.id);
  }

  /**
   * Gère le changement de configuration
   */
  onConfigChange() {
    // Mise à jour en temps réel optionnelle
  }

  /**
   * Affiche la section de configuration
   */
  showConfigSection() {
    const section = document.getElementById('hinge-config-section');
    const drillingInfo = document.getElementById('drilling-info');
    if (section) section.classList.remove('hidden');
    if (drillingInfo) drillingInfo.classList.remove('hidden');
  }

  /**
   * Cache la section de configuration
   */
  hideConfigSection() {
    const section = document.getElementById('hinge-config-section');
    const drillingInfo = document.getElementById('drilling-info');
    if (section) section.classList.add('hidden');
    if (drillingInfo) drillingInfo.classList.add('hidden');
  }

  /**
   * Met à jour les infos de perçage
   */
  updateDrillingInfo(caissonId) {
    const drillingList = document.getElementById('drilling-list');
    if (!drillingList) return;

    const drillings = this.hardwareManager.getDrillingsForCaisson(caissonId);

    if (drillings.length === 0) {
      drillingList.innerHTML = '<p class="no-drillings">Aucun perçage</p>';
      return;
    }

    const cupHoles = drillings.filter(d => d.type === 'CUP_HOLE');

    let html = '<ul class="drilling-list">';
    cupHoles.forEach((hole, i) => {
      html += `<li>Trou Ø${hole.diameter}mm à Y=${hole.y.toFixed(0)}mm</li>`;
    });
    html += '</ul>';
    html += `<p class="drilling-summary">${cupHoles.length} trous Ø35 + ${drillings.length - cupHoles.length} trous Ø8</p>`;

    drillingList.innerHTML = html;
  }

  /**
   * Rafraîchit le panneau
   */
  refresh() {
    const selectedCaisson = this.caissonManager.getSelectedCaisson();
    if (!selectedCaisson) {
      this.hideConfigSection();
      return;
    }

    const hinges = this.hardwareManager.getHingesForCaisson(selectedCaisson.id);
    if (hinges.length > 0) {
      this.showConfigSection();
      this.updateDrillingInfo(selectedCaisson.id);
    } else {
      this.hideConfigSection();
    }
  }

  /**
   * Ajoute les styles CSS
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hardware-btn-main {
        width: 100%;
        padding: 14px 20px;
        margin-bottom: 15px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
      }

      .hardware-btn-main:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
      }

      .hardware-btn-main:active {
        transform: translateY(0);
      }

      .drag-instruction {
        font-size: 11px;
        color: #666;
        margin-bottom: 10px;
        text-align: center;
      }

      .hardware-items {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }

      .hardware-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: grab;
        transition: all 0.2s ease;
        min-width: 80px;
      }

      .hardware-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-color: #667eea;
      }

      .hardware-item.dragging {
        opacity: 0.5;
        cursor: grabbing;
      }

      .hardware-icon {
        margin-bottom: 5px;
      }

      .hardware-name {
        font-size: 11px;
        color: #555;
        text-align: center;
      }

      .drag-ghost {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        background: rgba(102, 126, 234, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .drag-ghost.valid-drop {
        background: rgba(76, 175, 80, 0.9);
      }

      .ghost-icon {
        font-size: 18px;
      }

      #container.drop-zone-active {
        outline: 3px dashed #667eea;
        outline-offset: -3px;
      }

      .hinge-config-section {
        margin-top: 15px;
        padding: 12px;
        background: rgba(139, 154, 75, 0.1);
        border-radius: 8px;
        border-left: 3px solid var(--olive-main, #8B9A4B);
      }

      .hinge-config-section.hidden {
        display: none;
      }

      .hinge-config-section h4 {
        margin: 0 0 12px 0;
        font-size: 13px;
        color: var(--olive-main, #8B9A4B);
      }

      .hardware-btn {
        width: 100%;
        padding: 10px 15px;
        margin: 8px 0;
        border: none;
        border-radius: 6px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .hardware-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .hardware-btn-danger {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
      }

      .hardware-btn-danger:hover {
        box-shadow: 0 4px 12px rgba(238, 90, 90, 0.4);
      }

      .drilling-info {
        margin-top: 15px;
        padding: 12px;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 8px;
        border-left: 3px solid #667eea;
      }

      .drilling-info.hidden {
        display: none;
      }

      .drilling-info h4 {
        margin: 0 0 10px 0;
        font-size: 13px;
        color: #667eea;
      }

      .drilling-list {
        margin: 0;
        padding-left: 20px;
        font-size: 12px;
        color: #555;
      }

      .drilling-list li {
        margin: 4px 0;
      }

      .drilling-summary {
        margin: 10px 0 0 0;
        font-size: 12px;
        font-weight: 600;
        color: #333;
      }

      .no-drillings {
        color: #888;
        font-size: 12px;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
}
