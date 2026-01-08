'use client';

import { useState, useEffect } from 'react';
import { X, Droplet, Heart } from 'lucide-react';
import { findClosestRAL, type RALColor } from '@/lib/configurateur/ral-colors';
import type { Manufacturer, ManufacturerColor } from '@/lib/configurateur/manufacturer-colors';

// Import sub-components
import ColorPickerCanvas from './popup-laque/ColorPickerCanvas';
import ColorTrends from './popup-laque/ColorTrends';
import ColorFavorites from './popup-laque/ColorFavorites';
import ManufacturerColorPicker from './popup-laque/ManufacturerColorPicker';
import ColorSearchResults from './popup-laque/ColorSearchResults';
import type { ColorFamily, FavoriteColor } from './popup-laque';

interface PopupLaqueProps {
  open: boolean;
  codeCouleurActuel: string | null;
  onUpdate: (codeCouleur: string) => void;
  onClose: () => void;
}

export default function PopupLaque({
  open,
  codeCouleurActuel,
  onUpdate,
  onClose,
}: PopupLaqueProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(codeCouleurActuel);
  const [selectedFamily, setSelectedFamily] = useState<ColorFamily>('toutes');
  const [selectedManufacturerRef, setSelectedManufacturerRef] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteColor[]>([]);

  // Charger les favoris depuis localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('laque-favorites-v2');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  // Sauvegarder les favoris dans localStorage
  const saveFavorites = (newFavorites: FavoriteColor[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('laque-favorites-v2', JSON.stringify(newFavorites));
  };

  // Vérifier si une couleur est dans les favoris
  const isFavorite = (hex: string) => favorites.some(f => f.hex === hex);

  // Obtenir la référence actuelle de la couleur sélectionnée
  const getCurrentRef = () => {
    if (selectedManufacturerRef) return selectedManufacturerRef;
    if (selectedColor) {
      const ral = findClosestRAL(selectedColor);
      return `${ral.code} - ${ral.name}`;
    }
    return '';
  };

  // Ajouter/Retirer des favoris
  const toggleFavorite = (hex: string) => {
    if (isFavorite(hex)) {
      saveFavorites(favorites.filter(f => f.hex !== hex));
    } else if (favorites.length < 6) {
      saveFavorites([...favorites, { hex, ref: getCurrentRef() }]);
    }
  };

  // Sélectionner un favori
  const handleSelectFavorite = (fav: FavoriteColor) => {
    setSelectedColor(fav.hex);
    // Si la ref contient un fabricant (pas RAL), on la restaure
    if (!fav.ref.startsWith('RAL')) {
      setSelectedManufacturerRef(fav.ref);
    } else {
      setSelectedManufacturerRef(null);
    }
  };

  // Sélectionner une couleur RAL depuis la recherche
  const handleSelectRAL = (ralColor: RALColor) => {
    setSelectedColor(ralColor.hex);
    setSelectedManufacturerRef(null);
  };

  // Sélectionner une couleur fabricant
  const handleSelectManufacturerColor = (manufacturer: Manufacturer, color: ManufacturerColor) => {
    setSelectedColor(color.hex);
    setSelectedManufacturerRef(`${manufacturer.name} - ${color.code}${color.name ? ` (${color.name})` : ''}`);
  };

  // Valider la sélection
  const handleValider = () => {
    if (selectedColor) {
      let codeReference: string;

      if (selectedManufacturerRef) {
        // Référence fabricant + hex
        codeReference = `${selectedManufacturerRef} (${selectedColor.toUpperCase()})`;
      } else {
        // RAL classique
        const closestRAL = findClosestRAL(selectedColor);
        codeReference = `${closestRAL.code} (${selectedColor.toUpperCase()})`;
      }

      onUpdate(codeReference);
    }
    onClose();
  };

  const handleAnnuler = () => {
    setSelectedColor(codeCouleurActuel);
    setHoveredColor(null);
    onClose();
  };

  // Couleur affichée dans la prévisualisation
  const previewColor = hoveredColor || selectedColor || '#CCCCCC';
  const closestRAL = findClosestRAL(previewColor);

  if (!open) return null;

  return (
    <div className="popup-overlay" onClick={handleAnnuler}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="header-title">
            <Droplet size={20} style={{ color: 'var(--admin-olive)' }} />
            <h3>Sélection Couleur Laque</h3>
          </div>
          <button className="btn-close" onClick={handleAnnuler}>
            <X size={20} />
          </button>
        </div>

        {/* Barre de preview mobile - visible uniquement sur mobile */}
        <div className="mobile-preview-bar">
          <div className="mobile-preview-color" style={{ backgroundColor: previewColor }} />
          <div className="mobile-preview-info">
            <span className="mobile-preview-hex">{previewColor.toUpperCase()}</span>
            <span className="mobile-preview-ref">{selectedManufacturerRef?.split(' - ')[0] || closestRAL.code}</span>
          </div>
          {selectedColor && (
            <button
              className={`mobile-btn-favorite ${isFavorite(selectedColor) ? 'is-favorite' : ''}`}
              onClick={() => toggleFavorite(selectedColor)}
              disabled={!isFavorite(selectedColor) && favorites.length >= 6}
            >
              <Heart size={18} fill={isFavorite(selectedColor) ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Body - Layout 2 colonnes */}
        <div className="popup-body">
          <div className="popup-layout">
            {/* COLONNE GAUCHE - Sélection couleurs */}
            <div className="column-left">
              {/* Color Picker Canvas */}
              <ColorPickerCanvas
                selectedFamily={selectedFamily}
                onSelectFamily={setSelectedFamily}
                onColorHover={setHoveredColor}
                onColorSelect={(color) => {
                  setSelectedColor(color);
                  setSelectedManufacturerRef(null);
                }}
              />

              {/* Tendances 2026 */}
              <ColorTrends
                onSelectColor={(hex) => {
                  setSelectedColor(hex);
                  setSelectedManufacturerRef(null);
                }}
              />

              {/* Prévisualisation - en bas de la colonne gauche */}
              <div className="preview-section">
                <div className="preview-header">
                  <h4 className="section-title-preview">Couleur Sélectionnée</h4>
                  {selectedColor && (
                    <button
                      className={`btn-add-favorite ${isFavorite(selectedColor) ? 'is-favorite' : ''}`}
                      onClick={() => toggleFavorite(selectedColor)}
                      disabled={!isFavorite(selectedColor) && favorites.length >= 6}
                      title={isFavorite(selectedColor) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Heart size={16} fill={isFavorite(selectedColor) ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>
                <div className="preview-box" style={{ backgroundColor: previewColor }}>
                  <div className="preview-info">
                    <span className="preview-hex">{previewColor.toUpperCase()}</span>
                    <span className="preview-ral">{selectedManufacturerRef || `${closestRAL.code} - ${closestRAL.name}`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE - Recherche + Fabricants */}
            <div className="column-right">
              {/* Recherche par référence */}
              <ColorSearchResults
                onSelectRAL={handleSelectRAL}
                onSelectManufacturer={handleSelectManufacturerColor}
              />

              {/* Section Fabricants */}
              <ManufacturerColorPicker
                onSelectColor={handleSelectManufacturerColor}
              />

              {/* Section Favoris */}
              <ColorFavorites
                favorites={favorites}
                onSelectFavorite={handleSelectFavorite}
                onRemoveFavorite={(hex) => toggleFavorite(hex)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="popup-footer">
          <button className="btn-cancel" onClick={handleAnnuler}>
            Annuler
          </button>
          <button
            className="btn-confirm"
            onClick={handleValider}
            disabled={!selectedColor}
          >
            {selectedColor ? (
              <>
                <span
                  className="btn-color-swatch"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="btn-confirm-text">
                  Appliquer {selectedManufacturerRef?.split(' - ')[0] || closestRAL.code}
                </span>
              </>
            ) : (
              'Sélectionnez une couleur'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .popup-content {
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-default);
          border-radius: 20px;
          width: 100%;
          max-width: 1200px;
          max-height: 92vh;
          margin: 1rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          flex-shrink: 0;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-title h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--admin-text-primary);
          margin: 0;
        }

        .btn-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: var(--admin-text-tertiary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-close:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        /* Barre preview mobile - cachée sur desktop */
        .mobile-preview-bar {
          display: none;
        }

        .popup-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .popup-body::-webkit-scrollbar {
          display: none;
        }

        /* Layout 2 colonnes */
        .popup-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          min-height: 0;
        }

        .column-left {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }

        .column-right {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-width: 0;
        }

        /* Preview section */
        .preview-section {
          display: flex;
          flex-direction: column;
          max-width: 100%;
          box-sizing: border-box;
          flex: 1;
          min-height: 0;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .section-title-preview {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--admin-olive);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .btn-add-favorite {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 8px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-add-favorite:hover:not(:disabled) {
          background: var(--admin-bg-hover);
          border-color: #e74c3c;
          color: #e74c3c;
        }

        .btn-add-favorite.is-favorite {
          background: rgba(231, 76, 60, 0.15);
          border-color: #e74c3c;
          color: #e74c3c;
        }

        .btn-add-favorite:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .preview-box {
          width: 100%;
          max-width: 100%;
          min-height: 180px;
          flex: 1;
          border-radius: 12px;
          display: flex;
          align-items: flex-end;
          padding: 0.875rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }

        .preview-box::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }

        .preview-info {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }

        .preview-hex {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          font-family: 'Courier New', monospace;
        }

        .preview-ral {
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        }

        /* Footer */
        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.875rem;
          padding: 1.25rem 2rem;
          border-top: 1px solid var(--admin-border-subtle);
          background: var(--admin-bg-elevated);
          border-radius: 0 0 20px 20px;
          flex-shrink: 0;
        }

        .btn-cancel,
        .btn-confirm {
          padding: 0.75rem 1.75rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--admin-border-default);
          color: var(--admin-text-secondary);
        }

        .btn-cancel:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        .btn-confirm {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          border: none;
          color: white;
          box-shadow: 0 2px 8px var(--admin-olive-bg);
        }

        .btn-confirm:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--admin-olive-hover) 0%, var(--admin-olive) 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 154, 75, 0.25);
        }

        .btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-color-swatch {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .btn-confirm-text {
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .popup-layout {
            grid-template-columns: 1fr;
          }

          .column-right {
            border-top: 1px solid var(--admin-border-subtle);
            padding-top: 1rem;
          }
        }

        @media (max-width: 768px) {
          .popup-content {
            max-width: 100%;
            max-height: 100vh;
            margin: 0;
            border-radius: 0;
            height: 100%;
          }

          .popup-header {
            padding: 0.75rem 1rem;
          }

          /* === BARRE PREVIEW MOBILE === */
          .mobile-preview-bar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 1rem;
            background: var(--admin-bg-elevated);
            border-bottom: 1px solid var(--admin-border-subtle);
            flex-shrink: 0;
          }

          .mobile-preview-color {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            flex-shrink: 0;
          }

          .mobile-preview-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            min-width: 0;
          }

          .mobile-preview-hex {
            font-size: 0.875rem;
            font-weight: 700;
            color: var(--admin-text-primary);
            font-family: 'Courier New', monospace;
          }

          .mobile-preview-ref {
            font-size: 0.6875rem;
            color: var(--admin-text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mobile-btn-favorite {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-subtle);
            border-radius: 10px;
            color: var(--admin-text-muted);
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.2s ease;
          }

          .mobile-btn-favorite:hover:not(:disabled),
          .mobile-btn-favorite:active:not(:disabled) {
            background: rgba(231, 76, 60, 0.15);
            border-color: #e74c3c;
            color: #e74c3c;
          }

          .mobile-btn-favorite.is-favorite {
            background: rgba(231, 76, 60, 0.2);
            border-color: #e74c3c;
            color: #e74c3c;
          }

          .mobile-btn-favorite:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          /* Cacher la preview desktop sur mobile */
          .preview-section {
            display: none;
          }

          .popup-body {
            padding: 0.75rem;
            padding-bottom: 0.5rem;
          }

          /* Footer - boutons côte à côte sur mobile */
          .popup-footer {
            padding: 0.75rem 1rem;
            flex-direction: row;
            gap: 0.5rem;
          }

          .btn-cancel {
            flex: 0 0 auto;
            padding: 0.75rem 1rem;
            font-size: 0.8125rem;
          }

          .btn-confirm {
            flex: 1;
            justify-content: center;
            padding: 0.75rem 1rem;
            font-size: 0.8125rem;
          }

          .btn-color-swatch {
            width: 16px;
            height: 16px;
          }

          .btn-confirm-text {
            font-size: 0.8125rem;
          }
        }

        @media (max-width: 400px) {
          .popup-header {
            padding: 0.75rem 1rem;
          }

          .header-title h3 {
            font-size: 1rem;
          }

          .preview-box {
            min-height: 80px;
          }
        }
      `}</style>
    </div>
  );
}
