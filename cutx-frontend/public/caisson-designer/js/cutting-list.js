/* ================================================
   CUTTING LIST - Generation de la liste de debits
   Version mono-caisson
   ================================================ */

// Reference au caisson (sera definie par main.js)
let caissonRef = null;

/**
 * Definit la reference au caisson
 */
export function setCaissonRef(caisson) {
  caissonRef = caisson;
}

/**
 * Met a jour la liste de debits affichee
 */
export function updateCuttingList() {
  const container = document.getElementById('cutting-list-content');
  if (!container) return;

  // Si pas de caisson, vider la liste
  if (!caissonRef || !caissonRef.config) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">Aucun caisson configure</p>';
    return;
  }

  const config = caissonRef.config;
  const w = config.width;
  const h = config.height;
  const d = config.depth;
  const t = config.thickness;

  const cuttingItems = [
    {
      name: 'Superieur',
      width: w,
      depth: d,
      thickness: t,
      quantity: 1,
      badge: 'Tablette'
    },
    {
      name: 'Inferieur',
      width: w,
      depth: d,
      thickness: t,
      quantity: 1,
      badge: 'Tablette'
    },
    {
      name: 'Cote Gauche',
      width: d,
      depth: h - 2 * t,
      thickness: t,
      quantity: 1,
      badge: 'Montant'
    },
    {
      name: 'Cote Droit',
      width: d,
      depth: h - 2 * t,
      thickness: t,
      quantity: 1,
      badge: 'Montant'
    },
    {
      name: 'Dos',
      width: w - 2 * t,
      depth: h - 2 * t,
      thickness: t,
      quantity: 1,
      badge: 'Fond'
    }
  ];

  // Ajouter la porte si visible
  if (config.showDoor) {
    cuttingItems.push({
      name: 'Porte',
      width: w - config.gapLeft - config.gapRight,
      depth: h - config.gapTop - config.gapBottom,
      thickness: config.doorThickness,
      quantity: 1,
      badge: 'Facade'
    });
  }

  // Ajouter les etageres
  if (config.shelves && config.shelves.length > 0) {
    config.shelves.forEach((shelf, index) => {
      cuttingItems.push({
        name: `Etagere ${index + 1}`,
        width: w - 2 * t,
        depth: d - t,
        thickness: shelf.thickness || t,
        quantity: 1,
        badge: 'Etagere'
      });
    });
  }

  container.innerHTML = '';

  cuttingItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cutting-item';

    itemDiv.innerHTML = `
      <div class="cutting-item-header">
        <span class="cutting-item-name">${item.name}</span>
        <span class="cutting-item-badge">${item.badge}</span>
      </div>
      <div class="cutting-item-dimensions">
        ${Math.round(item.width)} x ${Math.round(item.depth)} x ${item.thickness} mm
      </div>
      <div class="cutting-item-qty">
        Quantite : ${item.quantity}
      </div>
    `;

    container.appendChild(itemDiv);
  });
}

/**
 * Fonction pour gerer le pliage/depliage des sections
 */
export function toggleCollapsible(sectionId) {
  const panel = document.getElementById(sectionId);
  const content = document.getElementById(sectionId + '-content');
  const icon = document.getElementById(sectionId + '-icon');

  if (content && icon) {
    content.classList.toggle('collapsed');
    icon.classList.toggle('collapsed');

    if (panel) {
      panel.classList.toggle('collapsed');
    }
  }
}

// Exposer la fonction globalement pour les onclick HTML
window.toggleCollapsible = toggleCollapsible;
