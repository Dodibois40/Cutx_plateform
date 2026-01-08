'use client';

import { Heart, Trash2 } from 'lucide-react';

// Type pour les favoris avec référence
export interface FavoriteColor {
  hex: string;
  ref: string;
}

interface ColorFavoritesProps {
  favorites: FavoriteColor[];
  onSelectFavorite: (fav: FavoriteColor) => void;
  onRemoveFavorite: (hex: string) => void;
}

export default function ColorFavorites({
  favorites,
  onSelectFavorite,
  onRemoveFavorite,
}: ColorFavoritesProps) {
  return (
    <>
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
                  onClick={() => onSelectFavorite(fav)}
                  title={`${fav.ref}\n${fav.hex}`}
                />
                <span className="favorite-ref">{fav.ref.split(' - ')[0]}</span>
                <button
                  className="favorite-remove"
                  onClick={() => onRemoveFavorite(fav.hex)}
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

      <style jsx>{`
        .favorites-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--admin-border-subtle);
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

        /* Mobile styles */
        @media (max-width: 768px) {
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

          .section-title {
            font-size: 0.6875rem;
            margin-bottom: 0.5rem;
          }
        }

        @media (max-width: 400px) {
          .favorites-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </>
  );
}
