/* ================================================
   TOOLBAR - Palette d'outils (style SketchUp)
   ================================================ */

/**
 * Types d'outils disponibles
 */
export const ToolType = {
  SELECT: 'select',
  MOVE: 'move',
  MEASURE: 'measure',
  GUIDE: 'guide'
};

/**
 * Gestionnaire de la palette d'outils
 */
export class Toolbar {
  constructor(containerId) {
    this.containerId = containerId;
    this.currentTool = ToolType.SELECT;
    this.onToolChange = null;
    this.buttons = {};
  }

  /**
   * Initialise la toolbar
   */
  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`❌ Container "${this.containerId}" non trouvé`);
      return;
    }

    container.innerHTML = '';
    container.className = 'toolbar';

    // Bouton Sélection
    this.buttons.select = this.createButton({
      id: 'tool-select',
      icon: '👆',
      title: 'Sélection (Espace)',
      tool: ToolType.SELECT,
      active: true
    });

    // Bouton Déplacer
    this.buttons.move = this.createButton({
      id: 'tool-move',
      icon: '✋',
      title: 'Déplacer (M)',
      tool: ToolType.MOVE,
      active: false
    });

    // Bouton Mètre
    this.buttons.measure = this.createButton({
      id: 'tool-measure',
      icon: '📏',
      title: 'Mètre (T)',
      tool: ToolType.MEASURE,
      active: false
    });

    // Bouton Guide
    this.buttons.guide = this.createButton({
      id: 'tool-guide',
      icon: '📐',
      title: 'Guide (G)',
      tool: ToolType.GUIDE,
      active: false
    });

    container.appendChild(this.buttons.select);
    container.appendChild(this.buttons.move);
    container.appendChild(this.buttons.measure);
    container.appendChild(this.buttons.guide);

    // Raccourcis clavier
    this.initKeyboardShortcuts();

    console.log('✅ Toolbar initialisée');
  }

  /**
   * Crée un bouton d'outil
   */
  createButton({ id, icon, title, tool, active }) {
    const button = document.createElement('button');
    button.id = id;
    button.className = `tool-button ${active ? 'active' : ''}`;
    button.title = title;
    button.innerHTML = `<span class="tool-icon">${icon}</span>`;

    button.addEventListener('click', () => {
      this.setActiveTool(tool);
    });

    return button;
  }

  /**
   * Active un outil
   */
  setActiveTool(tool) {
    if (this.currentTool === tool) return;

    // Désactiver tous les boutons
    Object.values(this.buttons).forEach(btn => {
      btn.classList.remove('active');
    });

    // Activer le bouton sélectionné
    if (tool === ToolType.SELECT) {
      this.buttons.select.classList.add('active');
    } else if (tool === ToolType.MOVE) {
      this.buttons.move.classList.add('active');
    } else if (tool === ToolType.MEASURE) {
      this.buttons.measure.classList.add('active');
    } else if (tool === ToolType.GUIDE) {
      this.buttons.guide.classList.add('active');
    }

    this.currentTool = tool;

    console.log(`🔧 Outil activé: ${tool}`);

    // Notifier le changement
    if (this.onToolChange) {
      this.onToolChange(tool);
    }
  }

  /**
   * Retourne l'outil actuel
   */
  getCurrentTool() {
    return this.currentTool;
  }

  /**
   * Initialise les raccourcis clavier
   */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignorer si on tape dans un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':  // Barre d'espace = Sélection
          e.preventDefault();  // Empêcher le scroll de la page
          this.setActiveTool(ToolType.SELECT);
          break;
        case 'm':
        case 'M':
          this.setActiveTool(ToolType.MOVE);
          break;
        case 't':
        case 'T':
          this.setActiveTool(ToolType.MEASURE);
          break;
        case 'g':
        case 'G':
          this.setActiveTool(ToolType.GUIDE);
          break;
        case 'Escape':
          this.setActiveTool(ToolType.SELECT);
          break;
      }
    });
  }
}
