/* ================================================
   PANEL POSITIONING - Positionnement dynamique des panneaux
   ================================================ */

/**
 * Positionne automatiquement les panneaux de droite
 * pour éviter les chevauchements
 */
export function initPanelPositioning() {
  const panels = [
    { id: 'cutting-list', top: 20 },
    { id: 'caisson-list-panel', spacing: 20 },
    { id: 'texture-panel', spacing: 20 }
  ];

  function updatePositions() {
    let currentTop = 20; // Position de départ

    panels.forEach((panelConfig, index) => {
      const panel = document.getElementById(panelConfig.id);
      if (!panel) return;

      if (index === 0) {
        // Premier panneau avec position fixe
        currentTop = panelConfig.top;
      } else {
        // Panneaux suivants : positionner après le précédent
        panel.style.top = `${currentTop}px`;
      }

      // Calculer la position du prochain panneau
      const panelHeight = panel.offsetHeight;
      const spacing = panelConfig.spacing || 20;
      currentTop += panelHeight + spacing;
    });

    console.log('📐 Positions des panneaux mises à jour');
  }

  // Mise à jour initiale après un court délai pour laisser le DOM se charger
  setTimeout(updatePositions, 200);

  // Deuxième mise à jour pour être sûr (après que tout soit rendu)
  setTimeout(updatePositions, 500);

  // Observer les changements de taille des panneaux
  panels.forEach(panelConfig => {
    const panel = document.getElementById(panelConfig.id);
    if (panel) {
      const observer = new ResizeObserver(() => {
        requestAnimationFrame(updatePositions);
      });
      observer.observe(panel);

      // Observer aussi les clics sur les headers collapsibles
      const header = panel.querySelector('.collapsible-header');
      if (header) {
        header.addEventListener('click', () => {
          // Attendre que l'animation de collapse soit terminée
          setTimeout(updatePositions, 350);
        });
      }
    }
  });

  // Écouter les événements de changement dans les listes
  window.addEventListener('caisson-added', () => {
    setTimeout(updatePositions, 100);
  });

  console.log('✅ Panel positioning initialisé');
}
