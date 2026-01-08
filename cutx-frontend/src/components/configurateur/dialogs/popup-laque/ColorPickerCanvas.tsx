'use client';

import { useRef, useEffect, useState } from 'react';
import { hslToRgb, rgbToHex } from '@/lib/configurateur/color-utils';

// Types de familles de couleurs
export type ColorFamily = 'toutes' | 'blancs' | 'noirs' | 'chaudes' | 'froides' | 'naturelles';

export interface ColorFamilyConfig {
  id: ColorFamily;
  label: string;
  description: string;
}

export const COLOR_FAMILIES: ColorFamilyConfig[] = [
  { id: 'toutes', label: 'Palette', description: 'Spectre complet' },
  { id: 'blancs', label: 'Blancs', description: 'Blancs, crèmes, ivoires' },
  { id: 'noirs', label: 'Noirs', description: 'Noirs, gris, anthracites' },
  { id: 'chaudes', label: 'Chaudes', description: 'Rouges, oranges, jaunes' },
  { id: 'froides', label: 'Froides', description: 'Bleus, verts, violets' },
  { id: 'naturelles', label: 'Naturelles', description: 'Beiges, terres, taupes' },
];

interface ColorPickerCanvasProps {
  selectedFamily: ColorFamily;
  onSelectFamily: (family: ColorFamily) => void;
  onColorHover: (color: string | null) => void;
  onColorSelect: (color: string) => void;
}

// Fonction de rendu pour chaque famille
function renderColorSpectrum(family: ColorFamily, ctx: CanvasRenderingContext2D, width: number, height: number) {
  switch (family) {
    case 'toutes':
      // Spectre complet arc-en-ciel (par défaut)
      for (let y = 0; y < height; y++) {
        const lightness = 90 - (y / height) * 70;
        for (let x = 0; x < width; x++) {
          const hue = (x / width) * 360;
          const saturation = 50 + (y / height) * 50;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;

    case 'blancs':
      for (let y = 0; y < height; y++) {
        const lightness = 100 - (y / height) * 25;
        for (let x = 0; x < width; x++) {
          const hue = 30 + (x / width) * 210;
          const saturation = (y / height) * 15;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;

    case 'noirs':
      for (let y = 0; y < height; y++) {
        const lightness = 45 - (y / height) * 40;
        for (let x = 0; x < width; x++) {
          const hue = (x / width) * 360;
          const saturation = (y / height) * 20;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;

    case 'chaudes':
      for (let y = 0; y < height; y++) {
        const lightness = 90 - (y / height) * 70;
        for (let x = 0; x < width; x++) {
          const hue = (x / width) * 60;
          const saturation = 50 + (y / height) * 50;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;

    case 'froides':
      for (let y = 0; y < height; y++) {
        const lightness = 90 - (y / height) * 70;
        for (let x = 0; x < width; x++) {
          const hue = 120 + (x / width) * 180;
          const saturation = 50 + (y / height) * 50;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;

    case 'naturelles':
      for (let y = 0; y < height; y++) {
        const lightness = 75 - (y / height) * 50;
        for (let x = 0; x < width; x++) {
          const hue = 20 + (x / width) * 40;
          const saturation = 15 + (y / height) * 35;
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      break;
  }
}

// Calculer la couleur au survol selon la famille
function getColorAtPosition(x: number, y: number, width: number, height: number, family: ColorFamily): string {
  let hue: number, saturation: number, lightness: number;

  switch (family) {
    case 'toutes':
      hue = (x / width) * 360;
      saturation = 50 + (y / height) * 50;
      lightness = 90 - (y / height) * 70;
      break;

    case 'blancs':
      hue = 30 + (x / width) * 210;
      saturation = (y / height) * 15;
      lightness = 100 - (y / height) * 25;
      break;

    case 'noirs':
      hue = (x / width) * 360;
      saturation = (y / height) * 20;
      lightness = 45 - (y / height) * 40;
      break;

    case 'chaudes':
      hue = (x / width) * 60;
      saturation = 50 + (y / height) * 50;
      lightness = 90 - (y / height) * 70;
      break;

    case 'froides':
      hue = 120 + (x / width) * 180;
      saturation = 50 + (y / height) * 50;
      lightness = 90 - (y / height) * 70;
      break;

    case 'naturelles':
      hue = 20 + (x / width) * 40;
      saturation = 15 + (y / height) * 35;
      lightness = 75 - (y / height) * 50;
      break;

    default:
      hue = 0;
      saturation = 0;
      lightness = 50;
  }

  const rgb = hslToRgb(hue, saturation, lightness);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export default function ColorPickerCanvas({
  selectedFamily,
  onSelectFamily,
  onColorHover,
  onColorSelect,
}: ColorPickerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Dessiner le spectre selon la famille sélectionnée
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    renderColorSpectrum(selectedFamily, ctx, width, height);
  }, [selectedFamily]);

  // Gérer le survol du canvas (mouse)
  const handleCanvasHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hex = getColorAtPosition(x, y, rect.width, rect.height, selectedFamily);
    setHoveredColor(hex);
    setCursorPosition({ x, y });
    onColorHover(hex);
  };

  // Gérer le touch sur canvas (mobile)
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));

    const hex = getColorAtPosition(clampedX, clampedY, rect.width, rect.height, selectedFamily);
    setHoveredColor(hex);
    setCursorPosition({ x: clampedX, y: clampedY });
    onColorHover(hex);
  };

  // Gérer la fin du touch (sélection)
  const handleCanvasTouchEnd = () => {
    if (hoveredColor) {
      onColorSelect(hoveredColor);
    }
  };

  // Gérer la sortie du canvas
  const handleCanvasLeave = () => {
    setHoveredColor(null);
    setCursorPosition(null);
    onColorHover(null);
  };

  // Gérer le clic sur le canvas
  const handleCanvasClick = () => {
    if (hoveredColor) {
      onColorSelect(hoveredColor);
    }
  };

  return (
    <>
      {/* Navigation par famille de couleurs */}
      <div className="color-families-nav">
        {COLOR_FAMILIES.map((family) => (
          <button
            key={family.id}
            className={`family-tab ${selectedFamily === family.id ? 'active' : ''}`}
            onClick={() => onSelectFamily(family.id)}
          >
            {family.label}
          </button>
        ))}
      </div>

      {/* Spectre chromatique moderne */}
      <div className="color-spectrum-section">
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="color-spectrum-canvas"
            onMouseMove={handleCanvasHover}
            onMouseLeave={handleCanvasLeave}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasTouch}
            onTouchMove={handleCanvasTouch}
            onTouchEnd={handleCanvasTouchEnd}
          />
          {/* Indicateur de curseur */}
          {cursorPosition && hoveredColor && (
            <div
              className="canvas-cursor-indicator"
              style={{
                left: cursorPosition.x,
                top: cursorPosition.y,
              }}
            >
              <div className="cursor-ring" style={{ borderColor: hoveredColor }} />
              <div className="cursor-tooltip">
                <div className="cursor-color-preview" style={{ backgroundColor: hoveredColor }} />
                <span className="cursor-hex">{hoveredColor.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Navigation par famille - HAUT CONTRASTE */
        .color-families-nav {
          display: flex;
          gap: 0.375rem;
          background: #2d2d2d;
          border: 1px solid #404040;
          border-radius: 10px;
          padding: 0.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          margin-bottom: 0.5rem;
        }

        .family-tab {
          flex: 1;
          padding: 0.625rem 0.5rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #b0b0b0;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
        }

        .family-tab:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .family-tab.active {
          color: #ffffff;
          background: var(--admin-olive);
          border-color: var(--admin-olive);
          box-shadow: 0 2px 8px rgba(139, 154, 75, 0.4);
          font-weight: 700;
        }

        .family-tab.active:hover {
          background: var(--admin-olive-hover);
        }

        /* Spectre chromatique */
        .color-spectrum-section {
          display: flex;
          flex-direction: column;
        }

        .canvas-wrapper {
          position: relative;
          width: 100%;
        }

        .color-spectrum-canvas {
          width: 100%;
          height: auto;
          max-height: 240px;
          border-radius: 12px;
          cursor: crosshair;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          transition: box-shadow 0.2s ease;
        }

        .color-spectrum-canvas:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        /* Canvas cursor indicator */
        .canvas-cursor-indicator {
          position: absolute;
          pointer-events: none;
          z-index: 10;
          transform: translate(-50%, -50%);
        }

        .cursor-ring {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .cursor-tooltip {
          position: absolute;
          left: 50%;
          top: 32px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          padding: 0.375rem 0.625rem;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .cursor-color-preview {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .cursor-hex {
          font-size: 0.6875rem;
          font-weight: 700;
          color: white;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.02em;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .color-spectrum-canvas {
            min-height: 160px;
            max-height: 200px;
            touch-action: none;
          }

          /* Tabs famille - Scrollable horizontalement sur mobile */
          .color-families-nav {
            display: flex;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding: 0.375rem;
            padding-right: 0.75rem;
            gap: 0.375rem;
            background: #1a1a1a;
            border: 1px solid var(--admin-olive);
            border-radius: 10px;
            margin-bottom: 0.5rem;
            min-height: 44px;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .color-families-nav::-webkit-scrollbar {
            display: none;
          }

          .family-tab {
            padding: 0.625rem 0.75rem;
            font-size: 0.6875rem;
            min-width: max-content;
            flex-shrink: 0;
            background: #2d2d2d;
            border: 1px solid #404040;
            color: #e0e0e0;
            border-radius: 6px;
          }

          .family-tab.active {
            background: var(--admin-olive);
            border-color: var(--admin-olive);
            color: #ffffff;
            font-weight: 700;
          }
        }

        @media (max-width: 400px) {
          .color-families-nav {
            flex-wrap: nowrap;
            justify-content: flex-start;
            padding: 0.25rem;
            gap: 0.25rem;
          }

          .family-tab {
            flex: 0 0 auto;
            padding: 0.5rem 0.625rem;
            font-size: 0.625rem;
          }

          .color-spectrum-canvas {
            min-height: 140px;
            max-height: 180px;
          }
        }
      `}</style>
    </>
  );
}
