'use client';

import { useState } from 'react';
import { Palette, ChevronRight, X } from 'lucide-react';
import { MANUFACTURERS, type Manufacturer, type ManufacturerColor } from '@/lib/configurateur/manufacturer-colors';

interface ManufacturerColorPickerProps {
  onSelectColor: (manufacturer: Manufacturer, color: ManufacturerColor) => void;
}

export default function ManufacturerColorPicker({
  onSelectColor,
}: ManufacturerColorPickerProps) {
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);

  return (
    <>
      <div className="manufacturers-section">
        <h4 className="section-title">
          <Palette size={16} />
          Nuanciers Fabricants
        </h4>
        <div className="manufacturers-grid">
          {MANUFACTURERS.map((manufacturer) => (
            <button
              key={manufacturer.id}
              className={`manufacturer-btn ${selectedManufacturer === manufacturer.id ? 'active' : ''}`}
              onClick={() => setSelectedManufacturer(
                selectedManufacturer === manufacturer.id ? null : manufacturer.id
              )}
            >
              {manufacturer.name}
              <ChevronRight size={14} className="chevron-icon" />
            </button>
          ))}
        </div>

        {/* Couleurs du fabricant sélectionné */}
        {selectedManufacturer && (() => {
          const manufacturer = MANUFACTURERS.find(m => m.id === selectedManufacturer);
          if (!manufacturer) return null;

          const colorsByCategory: Record<string, ManufacturerColor[]> = {};
          manufacturer.colors.forEach(color => {
            const cat = color.category || 'Autres';
            if (!colorsByCategory[cat]) colorsByCategory[cat] = [];
            colorsByCategory[cat].push(color);
          });

          return (
            <div className="manufacturer-colors">
              {/* Bouton fermer sur mobile */}
              <button
                className="manufacturer-close-btn"
                onClick={() => setSelectedManufacturer(null)}
              >
                <X size={16} />
                <span>Fermer {manufacturer.name}</span>
              </button>
              <div className="manufacturer-colors-scroll">
                {Object.entries(colorsByCategory).map(([category, colors]) => (
                  <div key={category} className="manufacturer-category">
                    <div className="manufacturer-category-label">{category}</div>
                    <div className="manufacturer-colors-grid">
                      {colors.map((color) => (
                        <button
                          key={color.code}
                          className="manufacturer-color-swatch"
                          style={{ backgroundColor: color.hex }}
                          onClick={() => onSelectColor(manufacturer, color)}
                          title={`${color.code}${color.name ? ` - ${color.name}` : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <span className="manufacturer-colors-hint">
                {manufacturer.colors.length} couleurs • {Object.keys(colorsByCategory).length} catégories
              </span>
            </div>
          );
        })()}
      </div>

      <style jsx>{`
        .manufacturers-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--admin-olive);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.75rem 0;
        }

        .manufacturers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .manufacturer-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.875rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 8px;
          color: var(--admin-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .manufacturer-btn:hover {
          background: var(--admin-bg-hover);
          border-color: var(--admin-border-hover);
          color: var(--admin-text-primary);
        }

        .manufacturer-btn.active {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .manufacturer-btn :global(.chevron-icon) {
          opacity: 0.5;
          transition: transform 0.2s ease;
        }

        .manufacturer-btn.active :global(.chevron-icon) {
          opacity: 1;
          transform: rotate(90deg);
        }

        .manufacturer-colors {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: var(--admin-bg-tertiary);
          border-radius: 10px;
          border: 1px solid var(--admin-border-subtle);
          overflow: hidden;
        }

        /* Bouton fermer fabricant - caché sur desktop */
        .manufacturer-close-btn {
          display: none;
        }

        .manufacturer-colors-scroll {
          max-height: 280px;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          scrollbar-width: thin;
          scrollbar-color: var(--admin-olive) transparent;
        }

        .manufacturer-colors-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .manufacturer-colors-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .manufacturer-colors-scroll::-webkit-scrollbar-thumb {
          background: var(--admin-olive);
          border-radius: 3px;
        }

        .manufacturer-category {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .manufacturer-category-label {
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid var(--admin-border-subtle);
        }

        .manufacturer-colors-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
        }

        .manufacturer-color-swatch {
          aspect-ratio: 1;
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 36px;
        }

        .manufacturer-color-swatch:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          border-color: var(--admin-olive);
          z-index: 1;
        }

        .manufacturer-colors-hint {
          font-size: 0.6875rem;
          color: var(--admin-text-muted);
          text-align: center;
          padding: 0.5rem;
          background: var(--admin-bg-elevated);
          border-top: 1px solid var(--admin-border-subtle);
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .manufacturers-section {
            gap: 0.5rem;
          }

          .manufacturers-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.375rem;
          }

          .manufacturer-btn {
            padding: 0.5rem 0.5rem;
            font-size: 0.625rem;
            border-radius: 6px;
          }

          .manufacturer-btn :global(.chevron-icon) {
            display: none;
          }

          .manufacturer-colors-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 0.375rem;
          }

          .manufacturer-color-swatch {
            min-height: 32px;
          }

          .manufacturer-colors-scroll {
            max-height: 200px;
            padding: 0.75rem;
          }

          /* === BOUTON FERMER FABRICANT === */
          .manufacturer-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.625rem;
            background: var(--admin-bg-hover);
            border: none;
            border-bottom: 1px solid var(--admin-border-subtle);
            color: var(--admin-text-secondary);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .manufacturer-close-btn:hover,
          .manufacturer-close-btn:active {
            background: var(--admin-olive-bg);
            color: var(--admin-olive);
          }

          .section-title {
            font-size: 0.6875rem;
            margin-bottom: 0.5rem;
          }
        }

        @media (max-width: 400px) {
          .manufacturers-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .manufacturer-colors-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
      `}</style>
    </>
  );
}
