/* ================================================
   CAISSON LIST UI - Interface de gestion des caissons
   ================================================ */

/**
 * Gestionnaire de l'interface de liste des caissons
 */
export class CaissonListUI {
  constructor(caissonManager, containerId = 'caisson-list') {
    this.caissonManager = caissonManager;
    this.containerId = containerId;
    this.container = null;

    // Callbacks
    this.onCaissonSelect = null;
    this.onCaissonDelete = null;
    this.onCaissonDuplicate = null;
  }

  /**
   * Initialise l'interface
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Conteneur ${this.containerId} non trouvé`);
      return;
    }

    // Mise à jour initiale
    this.update();
    console.log('✅ CaissonListUI initialisé');
  }

  /**
   * Met à jour la liste des caissons
   */
  update() {
    if (!this.container) return;

    const caissons = this.caissonManager.getAllCaissons();
    const selectedId = this.caissonManager.selectedCaissonId;

    // Générer le HTML
    let html = `
      <div class="caisson-list-header">
        <span class="caisson-count">${caissons.length} caisson(s)</span>
      </div>
      <div class="caisson-items">
    `;

    if (caissons.length === 0) {
      html += `
        <div class="caisson-empty">
          <p>Aucun caisson</p>
          <small>Cliquez sur "Ajouter un caisson" pour commencer</small>
        </div>
      `;
    } else {
      caissons.forEach(caisson => {
        const isSelected = caisson.id === selectedId;
        html += this.renderCaissonItem(caisson, isSelected);
      });
    }

    html += '</div>';

    this.container.innerHTML = html;

    // Attacher les événements
    this.attachEvents();
  }

  /**
   * Génère le HTML pour un item de caisson
   */
  renderCaissonItem(caisson, isSelected) {
    const config = caisson.config;
    return `
      <div class="caisson-item ${isSelected ? 'selected' : ''}" data-caisson-id="${caisson.id}">
        <div class="caisson-item-header">
          <div class="caisson-item-info">
            <span class="caisson-item-icon">📦</span>
            <span class="caisson-item-name">Caisson ${caisson.id}</span>
          </div>
          <div class="caisson-item-actions">
            <button class="caisson-action-btn duplicate-btn" data-action="duplicate" title="Dupliquer">
              <span>📋</span>
            </button>
            <button class="caisson-action-btn delete-btn" data-action="delete" title="Supprimer">
              <span>🗑️</span>
            </button>
          </div>
        </div>
        <div class="caisson-item-details">
          <small>${config.width} × ${config.height} × ${config.depth} mm</small>
        </div>
      </div>
    `;
  }

  /**
   * Attache les événements aux éléments
   */
  attachEvents() {
    // Événement de sélection
    const items = this.container.querySelectorAll('.caisson-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        // Ignorer si on clique sur un bouton d'action
        if (e.target.closest('.caisson-action-btn')) return;

        const id = parseInt(item.dataset.caissonId);
        this.caissonManager.selectCaisson(id);
        this.update();

        if (this.onCaissonSelect) {
          this.onCaissonSelect(id);
        }
      });
    });

    // Événements des boutons d'action
    const deleteButtons = this.container.querySelectorAll('[data-action="delete"]');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.caisson-item');
        const id = parseInt(item.dataset.caissonId);

        if (confirm(`Voulez-vous vraiment supprimer le caisson ${id} ?`)) {
          this.caissonManager.removeCaisson(id);
          this.update();

          if (this.onCaissonDelete) {
            this.onCaissonDelete(id);
          }
        }
      });
    });

    const duplicateButtons = this.container.querySelectorAll('[data-action="duplicate"]');
    duplicateButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.caisson-item');
        const id = parseInt(item.dataset.caissonId);

        const newCaisson = this.caissonManager.duplicateCaisson(id);
        this.update();

        if (this.onCaissonDuplicate && newCaisson) {
          this.onCaissonDuplicate(newCaisson.id);
        }
      });
    });
  }

  /**
   * Affiche/masque le panneau
   */
  toggle() {
    if (this.container) {
      this.container.classList.toggle('hidden');
    }
  }
}
