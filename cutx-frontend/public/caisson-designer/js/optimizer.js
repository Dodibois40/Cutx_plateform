/* ================================================
   OPTIMIZER - Optimisation de debit de panneaux
   Algorithme: Guillotine avec First Fit Decreasing Height
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
 * Classe pour optimiser le debit de panneaux
 */
class PanelOptimizer {
  constructor(panelLength, panelWidth, sawKerf, margin) {
    this.panelLength = panelLength;
    this.panelWidth = panelWidth;
    this.sawKerf = sawKerf;
    this.margin = margin;
    this.panels = [];
  }

  createFreeRect(x, y, width, height) {
    return { x, y, width, height };
  }

  optimize(pieces, mode) {
    // Trier les pieces par hauteur decroissante (FFDH)
    const sortedPieces = pieces.map((p, index) => ({ ...p, originalIndex: index }))
      .sort((a, b) => b.height - a.height);

    this.panels = [];
    const placedPieces = [];

    for (const piece of sortedPieces) {
      let placed = false;

      // Essayer de placer dans un panneau existant
      for (let i = 0; i < this.panels.length && !placed; i++) {
        const panel = this.panels[i];

        for (let j = 0; j < panel.freeRects.length && !placed; j++) {
          const rect = panel.freeRects[j];

          // Mode vertical - pas de rotation
          if (mode === 'vertical' && piece.width <= rect.width && piece.height <= rect.height) {
            placedPieces.push({
              ...piece,
              panelIndex: i,
              x: rect.x,
              y: rect.y,
              rotated: false
            });

            panel.freeRects.splice(j, 1);

            if (rect.width > piece.width + this.sawKerf) {
              panel.freeRects.push(this.createFreeRect(
                rect.x + piece.width + this.sawKerf,
                rect.y,
                rect.width - piece.width - this.sawKerf,
                rect.height
              ));
            }

            if (rect.height > piece.height + this.sawKerf) {
              panel.freeRects.push(this.createFreeRect(
                rect.x,
                rect.y + piece.height + this.sawKerf,
                piece.width,
                rect.height - piece.height - this.sawKerf
              ));
            }

            placed = true;
          }
          // Mode horizontal - rotation 90 deg
          else if (mode === 'horizontal' && piece.height <= rect.width && piece.width <= rect.height) {
            placedPieces.push({
              ...piece,
              panelIndex: i,
              x: rect.x,
              y: rect.y,
              rotated: true
            });

            panel.freeRects.splice(j, 1);

            if (rect.width > piece.height + this.sawKerf) {
              panel.freeRects.push(this.createFreeRect(
                rect.x + piece.height + this.sawKerf,
                rect.y,
                rect.width - piece.height - this.sawKerf,
                rect.height
              ));
            }

            if (rect.height > piece.width + this.sawKerf) {
              panel.freeRects.push(this.createFreeRect(
                rect.x,
                rect.y + piece.width + this.sawKerf,
                piece.height,
                rect.height - piece.width - this.sawKerf
              ));
            }

            placed = true;
          }
          // Mode optimise - essayer les deux orientations
          else if (mode === 'optimized') {
            if (piece.width <= rect.width && piece.height <= rect.height) {
              placedPieces.push({
                ...piece,
                panelIndex: i,
                x: rect.x,
                y: rect.y,
                rotated: false
              });

              panel.freeRects.splice(j, 1);

              if (rect.width > piece.width + this.sawKerf) {
                panel.freeRects.push(this.createFreeRect(
                  rect.x + piece.width + this.sawKerf,
                  rect.y,
                  rect.width - piece.width - this.sawKerf,
                  rect.height
                ));
              }

              if (rect.height > piece.height + this.sawKerf) {
                panel.freeRects.push(this.createFreeRect(
                  rect.x,
                  rect.y + piece.height + this.sawKerf,
                  piece.width,
                  rect.height - piece.height - this.sawKerf
                ));
              }

              placed = true;
            }
            else if (piece.height <= rect.width && piece.width <= rect.height) {
              placedPieces.push({
                ...piece,
                panelIndex: i,
                x: rect.x,
                y: rect.y,
                rotated: true
              });

              panel.freeRects.splice(j, 1);

              if (rect.width > piece.height + this.sawKerf) {
                panel.freeRects.push(this.createFreeRect(
                  rect.x + piece.height + this.sawKerf,
                  rect.y,
                  rect.width - piece.height - this.sawKerf,
                  rect.height
                ));
              }

              if (rect.height > piece.width + this.sawKerf) {
                panel.freeRects.push(this.createFreeRect(
                  rect.x,
                  rect.y + piece.width + this.sawKerf,
                  piece.height,
                  rect.height - piece.width - this.sawKerf
                ));
              }

              placed = true;
            }
          }
        }
      }

      // Si pas place, creer un nouveau panneau
      if (!placed) {
        const usableWidth = this.panelLength - 2 * this.margin;
        const usableHeight = this.panelWidth - 2 * this.margin;

        const newPanel = {
          freeRects: [this.createFreeRect(this.margin, this.margin, usableWidth, usableHeight)]
        };

        this.panels.push(newPanel);

        const rect = newPanel.freeRects[0];
        let rotated = false;
        let pieceWidth = piece.width;
        let pieceHeight = piece.height;

        if (mode === 'horizontal' || (mode === 'optimized' && piece.height > piece.width)) {
          rotated = true;
          pieceWidth = piece.height;
          pieceHeight = piece.width;
        }

        placedPieces.push({
          ...piece,
          panelIndex: this.panels.length - 1,
          x: rect.x,
          y: rect.y,
          rotated
        });

        newPanel.freeRects.splice(0, 1);

        if (rect.width > pieceWidth + this.sawKerf) {
          newPanel.freeRects.push(this.createFreeRect(
            rect.x + pieceWidth + this.sawKerf,
            rect.y,
            rect.width - pieceWidth - this.sawKerf,
            rect.height
          ));
        }

        if (rect.height > pieceHeight + this.sawKerf) {
          newPanel.freeRects.push(this.createFreeRect(
            rect.x,
            rect.y + pieceHeight + this.sawKerf,
            pieceWidth,
            rect.height - pieceHeight - this.sawKerf
          ));
        }
      }
    }

    return { panels: this.panels, placedPieces };
  }
}

/**
 * Dessine le resultat de l'optimisation sur le canvas
 */
function drawOptimization(result, panelLength, panelWidth, pieces, canvas, ctx) {
  const container = document.querySelector('.canvas-container');
  const availableWidth = container.clientWidth - 80;
  const availableHeight = container.clientHeight - 80;

  const padding = 40;
  const panelsPerRow = Math.ceil(Math.sqrt(result.panels.length));
  const panelsPerCol = Math.ceil(result.panels.length / panelsPerRow);

  const scale = Math.min(
    availableWidth / (panelLength * panelsPerRow),
    availableHeight / (panelWidth * panelsPerCol)
  );

  canvas.width = panelLength * scale * panelsPerRow + padding * 2;
  canvas.height = panelWidth * scale * panelsPerCol + padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0F0E0D';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dessiner chaque panneau
  result.panels.forEach((panel, panelIndex) => {
    const row = Math.floor(panelIndex / panelsPerRow);
    const col = panelIndex % panelsPerRow;
    const offsetX = padding + col * panelLength * scale;
    const offsetY = padding + row * panelWidth * scale;

    ctx.fillStyle = '#1C1B19';
    ctx.fillRect(offsetX, offsetY, panelLength * scale, panelWidth * scale);

    ctx.strokeStyle = '#3A3835';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, panelLength * scale, panelWidth * scale);

    ctx.fillStyle = '#F5F4F1';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Panneau ${panelIndex + 1}`, offsetX + 10, offsetY - 10);
  });

  // Dessiner les pieces
  result.placedPieces.forEach((piece) => {
    const row = Math.floor(piece.panelIndex / panelsPerRow);
    const col = piece.panelIndex % panelsPerRow;
    const offsetX = padding + col * panelLength * scale;
    const offsetY = padding + row * panelWidth * scale;

    const x = offsetX + piece.x * scale;
    const y = offsetY + piece.y * scale;
    const w = (piece.rotated ? piece.height : piece.width) * scale;
    const h = (piece.rotated ? piece.width : piece.height) * scale;

    const colors = ['#8B9A4B', '#8B5A3C', '#C9B896', '#7A8B9A'];
    ctx.fillStyle = colors[piece.originalIndex % colors.length];
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#0A0A09';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#F5F4F1';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.name, x + w / 2, y + h / 2 - 8);
    ctx.fillStyle = '#E0DFDA';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(
      `${Math.round(piece.rotated ? piece.height : piece.width)}x${Math.round(piece.rotated ? piece.width : piece.height)}`,
      x + w / 2,
      y + h / 2 + 6
    );

    if (piece.rotated) {
      ctx.fillText('90 deg', x + w / 2, y + h / 2 + 18);
    }
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * Initialise le module d'optimisation
 */
export function initOptimizer() {
  const optimizerModal = document.getElementById('optimizer-modal');
  const optimizerBtn = document.getElementById('optimize-btn');

  if (!optimizerModal || !optimizerBtn) {
    console.warn('Elements optimizer non trouves');
    return;
  }

  const closeOptimizerBtn = optimizerModal.querySelector('.modal-close');
  const runOptimizationBtn = document.getElementById('run-optimizer');
  const canvas = document.getElementById('optimizer-canvas');
  const ctx = canvas.getContext('2d');

  // Ouvrir la modale
  optimizerBtn.addEventListener('click', () => {
    optimizerModal.classList.remove('hidden');
  });

  // Fermer la modale
  closeOptimizerBtn.addEventListener('click', () => {
    optimizerModal.classList.add('hidden');
  });

  optimizerModal.querySelector('.modal-overlay').addEventListener('click', () => {
    optimizerModal.classList.add('hidden');
  });

  // Lancer l'optimisation
  runOptimizationBtn.addEventListener('click', () => {
    if (!caissonRef || !caissonRef.config) {
      alert('Aucun caisson configure');
      return;
    }

    const panelLength = parseFloat(document.getElementById('panel-length').value);
    const panelWidth = parseFloat(document.getElementById('panel-width').value);
    const sawKerf = parseFloat(document.getElementById('saw-kerf').value);
    const margin = parseFloat(document.getElementById('edge-margin').value);
    const mode = document.querySelector('input[name="optimization-mode"]:checked').value;

    const config = caissonRef.config;
    const w = config.width;
    const h = config.height;
    const d = config.depth;
    const t = config.thickness;

    const pieces = [
      { name: 'Superieur', width: w, height: d, thickness: t },
      { name: 'Inferieur', width: w, height: d, thickness: t },
      { name: 'Gauche', width: d, height: h - 2 * t, thickness: t },
      { name: 'Droite', width: d, height: h - 2 * t, thickness: t },
      { name: 'Dos', width: w - 2 * t, height: h - 2 * t, thickness: t }
    ];

    // Ajouter la porte si visible
    if (config.showDoor) {
      pieces.push({
        name: 'Porte',
        width: w - config.gapLeft - config.gapRight,
        height: h - config.gapTop - config.gapBottom,
        thickness: config.doorThickness
      });
    }

    // Ajouter les etageres
    if (config.shelves && config.shelves.length > 0) {
      config.shelves.forEach((shelf, index) => {
        pieces.push({
          name: `Etagere ${index + 1}`,
          width: w - 2 * t,
          height: d - t,
          thickness: shelf.thickness || t
        });
      });
    }

    const optimizer = new PanelOptimizer(panelLength, panelWidth, sawKerf, margin);
    const result = optimizer.optimize(pieces, mode);

    drawOptimization(result, panelLength, panelWidth, pieces, canvas, ctx);

    const totalPanelArea = panelLength * panelWidth * result.panels.length;
    const usedArea = pieces.reduce((sum, p) => sum + p.width * p.height, 0);
    const efficiency = (usedArea / totalPanelArea * 100).toFixed(1);
    const wasteArea = (totalPanelArea - usedArea).toFixed(0);

    document.getElementById('stat-panels').textContent = result.panels.length;
    document.getElementById('stat-efficiency').textContent = efficiency + '%';
    document.getElementById('stat-waste').textContent = (wasteArea / 1000000).toFixed(2) + ' m2';
    document.getElementById('stat-pieces').textContent = pieces.length + '/' + pieces.length;
  });

  console.log('Optimiseur initialise');
}
