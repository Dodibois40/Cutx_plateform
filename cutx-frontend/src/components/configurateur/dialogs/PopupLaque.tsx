'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Droplet, Search, Palette, ChevronRight, Heart, Trash2 } from 'lucide-react';
import { RAL_COLORS, findClosestRAL, type RALColor } from '@/lib/configurateur/ral-colors';
import { MANUFACTURERS, searchManufacturerColor, type Manufacturer, type ManufacturerColor } from '@/lib/configurateur/manufacturer-colors';
import { hslToRgb, rgbToHex } from '@/lib/configurateur/color-utils';

interface PopupLaqueProps {
  open: boolean;
  codeCouleurActuel: string | null;
  onUpdate: (codeCouleur: string) => void;
  onClose: () => void;
}

// Types de familles de couleurs
type ColorFamily = 'toutes' | 'blancs' | 'noirs' | 'chaudes' | 'froides' | 'naturelles';

interface ColorFamilyConfig {
  id: ColorFamily;
  label: string;
  description: string;
}

const COLOR_FAMILIES: ColorFamilyConfig[] = [
  { id: 'toutes', label: 'Palette', description: 'Spectre complet' },
  { id: 'blancs', label: 'Blancs', description: 'Blancs, crèmes, ivoires' },
  { id: 'noirs', label: 'Noirs', description: 'Noirs, gris, anthracites' },
  { id: 'chaudes', label: 'Chaudes', description: 'Rouges, oranges, jaunes' },
  { id: 'froides', label: 'Froides', description: 'Bleus, verts, violets' },
  { id: 'naturelles', label: 'Naturelles', description: 'Beiges, terres, taupes' },
];

// Couleurs Tendances 2026 - Inspiration Farrow & Ball / Ressource
interface TrendColor {
  name: string;
  hex: string;
  description: string;
}

const TREND_COLORS_2026: TrendColor[] = [
  { name: 'Vert Empire', hex: '#4A5D54', description: 'Vert de gris profond' },
  { name: 'Terre Cuite', hex: '#B8725C', description: 'Terracotta éteint' },
  { name: 'Bleu Abysse', hex: '#2B4857', description: 'Bleu canard profond' },
  { name: 'Ocre Sauvage', hex: '#C1954A', description: 'Ocre moutarde raffiné' },
  { name: 'Greige Parisien', hex: '#A69B8E', description: 'Gris-beige intemporel' },
  { name: 'Noir Charbon', hex: '#2C2C2C', description: 'Noir charbon mat' },
];

// Type pour les favoris avec référence
interface FavoriteColor {
  hex: string;
  ref: string;
}

export default function PopupLaque({
  open,
  codeCouleurActuel,
  onUpdate,
  onClose,
}: PopupLaqueProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(codeCouleurActuel);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RALColor[]>([]);
  const [manufacturerResults, setManufacturerResults] = useState<{ manufacturer: Manufacturer; color: ManufacturerColor }[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<ColorFamily>('toutes');
  const [hoveredTrend, setHoveredTrend] = useState<TrendColor | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [selectedManufacturerRef, setSelectedManufacturerRef] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [favorites, setFavorites] = useState<FavoriteColor[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Fonction de rendu pour chaque famille
  const renderColorSpectrum = (family: ColorFamily, ctx: CanvasRenderingContext2D, width: number, height: number) => {
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
  };

  // Dessiner le spectre selon la famille sélectionnée
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    renderColorSpectrum(selectedFamily, ctx, width, height);
  }, [open, selectedFamily]);

  // Calculer la couleur au survol selon la famille
  const getColorAtPosition = (x: number, y: number, width: number, height: number, family: ColorFamily): string => {
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
  };

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
  };

  // Gérer la fin du touch (sélection)
  const handleCanvasTouchEnd = () => {
    if (hoveredColor) {
      setSelectedColor(hoveredColor);
    }
  };

  // Gérer la sortie du canvas
  const handleCanvasLeave = () => {
    setHoveredColor(null);
    setCursorPosition(null);
  };

  // Gérer le clic sur le canvas
  const handleCanvasClick = () => {
    if (hoveredColor) {
      setSelectedColor(hoveredColor);
    }
  };

  // Gérer le clic sur une couleur tendance
  const handleTrendColorClick = (trendColor: TrendColor) => {
    setSelectedColor(trendColor.hex);
  };

  // Recherche RAL + Fabricants
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setManufacturerResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();

    // Recherche RAL
    const ralResults = RAL_COLORS.filter(color =>
      color.code.toLowerCase().includes(query) ||
      color.name.toLowerCase().includes(query)
    ).slice(0, 6);
    setSearchResults(ralResults);

    // Recherche Fabricants
    const manuResults = searchManufacturerColor(query);
    setManufacturerResults(manuResults);
  }, [searchQuery]);

  // Sélectionner une couleur RAL depuis la recherche
  const handleSelectRAL = (ralColor: RALColor) => {
    setSelectedColor(ralColor.hex);
    setSelectedManufacturerRef(null);
    setSearchQuery('');
    setSearchResults([]);
    setManufacturerResults([]);
  };

  // Sélectionner une couleur fabricant
  const handleSelectManufacturerColor = (manufacturer: Manufacturer, color: ManufacturerColor) => {
    setSelectedColor(color.hex);
    setSelectedManufacturerRef(`${manufacturer.name} - ${color.code}${color.name ? ` (${color.name})` : ''}`);
    setSearchQuery('');
    setSearchResults([]);
    setManufacturerResults([]);
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
    setSearchQuery('');
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
              {/* Navigation par famille de couleurs */}
              <div className="color-families-nav">
                {COLOR_FAMILIES.map((family) => (
                  <button
                    key={family.id}
                    className={`family-tab ${selectedFamily === family.id ? 'active' : ''}`}
                    onClick={() => setSelectedFamily(family.id)}
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

              {/* Tendances 2026 */}
              <div className="trends-section">
                <h4 className="section-title-trend">Tendances 2026</h4>
                <div className="trends-grid">
                  {TREND_COLORS_2026.map((trendColor) => (
                    <button
                      key={trendColor.hex}
                      className="trend-swatch"
                      style={{ backgroundColor: trendColor.hex }}
                      onClick={() => handleTrendColorClick(trendColor)}
                      onMouseEnter={() => setHoveredTrend(trendColor)}
                      onMouseLeave={() => setHoveredTrend(null)}
                    >
                      {hoveredTrend?.hex === trendColor.hex && (
                        <span className="trend-name">{trendColor.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

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
              <div className="search-section">
                <h4 className="section-title">
                  <Search size={16} />
                  Recherche par Référence
                </h4>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="RAL 9010, RT001, Hague Blue..."
                    className="search-input"
                  />
                </div>

                {(searchResults.length > 0 || manufacturerResults.length > 0) && (
                  <div className="search-results">
                    {/* Résultats RAL */}
                    {searchResults.length > 0 && (
                      <>
                        <div className="results-group-label">RAL Classic</div>
                        {searchResults.map((ralColor) => (
                          <button
                            key={ralColor.code}
                            className="search-result-item"
                            onClick={() => handleSelectRAL(ralColor)}
                          >
                            <div
                              className="result-color-swatch"
                              style={{ backgroundColor: ralColor.hex }}
                            />
                            <div className="result-info">
                              <span className="result-code">{ralColor.code}</span>
                              <span className="result-name">{ralColor.name}</span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Résultats Fabricants */}
                    {manufacturerResults.length > 0 && (
                      <>
                        <div className="results-group-label">Nuanciers Fabricants</div>
                        {manufacturerResults.map(({ manufacturer, color }) => (
                          <button
                            key={`${manufacturer.id}-${color.code}`}
                            className="search-result-item manufacturer-result"
                            onClick={() => handleSelectManufacturerColor(manufacturer, color)}
                          >
                            <div
                              className="result-color-swatch"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div className="result-info">
                              <span className="result-code">{color.code}</span>
                              <span className="result-name">
                                {color.name || color.category} <span className="result-manufacturer">• {manufacturer.name}</span>
                              </span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Section Fabricants dans colonne droite */}
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
                                  onClick={() => handleSelectManufacturerColor(manufacturer, color)}
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

              {/* Section Favoris */}
              <div className="favorites-section">
                <h4 className="section-title">
                  <Heart size={16} />
                  Mes Favoris
                  <span className="favorites-count">{favorites.length}/6</span>
                </h4>
                {favorites.length > 0 ? (
                  <div className="favorites-grid">
                    {favorites.map((fav) => (
                      <div key={fav.hex} className="favorite-item">
                        <button
                          className="favorite-swatch"
                          style={{ backgroundColor: fav.hex }}
                          onClick={() => handleSelectFavorite(fav)}
                          title={`${fav.ref}\n${fav.hex}`}
                        />
                        <span className="favorite-ref">{fav.ref.split(' - ')[0]}</span>
                        <button
                          className="favorite-remove"
                          onClick={() => toggleFavorite(fav.hex)}
                          title="Retirer des favoris"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="favorites-empty">
                    Cliquez sur le coeur pour ajouter des favoris
                  </div>
                )}
              </div>
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
          transition: var(--transition);
        }

        .btn-close:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        /* Barre preview mobile - cachée sur desktop */
        .mobile-preview-bar {
          display: none;
        }

        /* Bouton fermer fabricant - caché sur desktop */
        .manufacturer-close-btn {
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

        .section-title-preview {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--admin-olive);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

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

        .color-spectrum-canvas {
          width: 100%;
          height: auto;
          max-height: 240px;
          border-radius: 12px;
          cursor: crosshair;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          transition: var(--transition);
        }

        .color-spectrum-canvas:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        /* Tendances 2026 */
        .trends-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title-trend {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--admin-noyer);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .trends-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1rem;
        }

        .trend-swatch {
          position: relative;
          aspect-ratio: 1;
          border-radius: 10px;
          border: 1px solid var(--admin-border-subtle);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .trend-swatch:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          border-color: var(--admin-noyer);
        }

        .trend-swatch:active {
          transform: translateY(-2px) scale(1.02);
        }

        .trend-name {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.6) 50%,
            transparent 100%
          );
          color: white;
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 1rem 0.5rem 0.5rem 0.5rem;
          text-align: center;
          line-height: 1.2;
          letter-spacing: 0.02em;
          animation: fadeInUp 0.2s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive pour les swatches */
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

          .popup-body {
            padding: 0.75rem;
            padding-bottom: 0.5rem;
          }

          /* Canvas */
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

          /* Trends masquées sur mobile */
          .trends-section {
            display: none;
          }

          /* Section titles plus compacts */
          .section-title {
            font-size: 0.6875rem;
            margin-bottom: 0.5rem;
          }

          /* Recherche */
          .search-input {
            padding: 0.75rem 0.875rem;
            font-size: 0.875rem;
          }

          /* Fabricants - grille 3x2 plus compacte */
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

          .manufacturer-btn .chevron-icon {
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

          /* Favoris */
          .favorites-section {
            padding-top: 0.5rem;
            gap: 0.5rem;
          }

          .favorites-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 0.375rem;
          }

          .favorite-swatch {
            border-radius: 6px;
          }

          .favorites-empty {
            padding: 0.75rem;
            font-size: 0.6875rem;
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

        /* Extra small screens */
        @media (max-width: 400px) {
          .popup-header {
            padding: 0.75rem 1rem;
          }

          .header-title h3 {
            font-size: 1rem;
          }

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

          .manufacturers-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .manufacturer-colors-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .favorites-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .preview-box {
            min-height: 80px;
          }
        }

        /* Section Titles */
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

        .section-title-disabled {
          color: var(--admin-text-muted);
        }

        /* Prévisualisation */
        .preview-section {
          display: flex;
          flex-direction: column;
          max-width: 100%;
          box-sizing: border-box;
          flex: 1;
          min-height: 0;
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
          transition: var(--transition);
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

        /* Recherche */
        .search-section {
          display: flex;
          flex-direction: column;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--admin-text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          color: var(--admin-text-primary);
          font-size: 0.9375rem;
          transition: var(--transition);
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
          font-style: italic;
        }

        .search-input:hover {
          border-color: var(--admin-border-hover);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--admin-olive);
          background: var(--admin-bg-elevated);
          box-shadow: 0 0 0 3px var(--admin-olive-bg);
        }

        /* Résultats de recherche */
        .search-results {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.75rem;
          max-height: 240px;
          overflow-y: auto;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
        }

        .search-result-item:hover {
          background: var(--admin-bg-hover);
          border-color: var(--admin-olive-border);
          transform: translateX(4px);
        }

        .result-color-swatch {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .result-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .result-code {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--admin-text-primary);
          font-family: 'Courier New', monospace;
        }

        .result-name {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .result-manufacturer {
          color: var(--admin-olive);
          font-weight: 600;
        }

        .results-group-label {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem 0.75rem 0.25rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          margin-bottom: 0.25rem;
        }

        /* Fabricants */
        .manufacturers-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
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

        .manufacturer-btn .chevron-icon {
          opacity: 0.5;
          transition: transform 0.2s ease;
        }

        .manufacturer-btn.active .chevron-icon {
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
          transition: var(--transition);
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

        /* Masquage des scrollbars */
        .search-results::-webkit-scrollbar,
        .color-families-nav::-webkit-scrollbar {
          display: none;
        }

        .search-results,
        .color-families-nav {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        /* Canvas wrapper et indicateur de curseur */
        .canvas-wrapper {
          position: relative;
          width: 100%;
        }

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

        /* Preview header avec bouton favori */
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
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

        /* Section Favoris */
        .favorites-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--admin-border-subtle);
        }

        .favorites-count {
          margin-left: auto;
          font-size: 0.6875rem;
          color: var(--admin-text-muted);
          font-weight: 500;
        }

        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
        }

        .favorite-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .favorite-swatch {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .favorite-swatch:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          border-color: var(--admin-olive);
        }

        .favorite-ref {
          font-size: 0.5625rem;
          color: var(--admin-text-muted);
          text-align: center;
          line-height: 1.2;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .favorite-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e74c3c;
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          opacity: 0;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .favorite-item:hover .favorite-remove {
          opacity: 1;
        }

        .favorite-remove:hover {
          background: #c0392b;
          transform: scale(1.1);
        }

        .favorites-empty {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
          text-align: center;
          padding: 1rem;
          background: var(--admin-bg-tertiary);
          border-radius: 8px;
          border: 1px dashed var(--admin-border-subtle);
        }
      `}</style>
    </div>
  );
}
