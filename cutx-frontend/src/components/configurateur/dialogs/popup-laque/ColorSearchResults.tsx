'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { RAL_COLORS, type RALColor } from '@/lib/configurateur/ral-colors';
import { searchManufacturerColor, type Manufacturer, type ManufacturerColor } from '@/lib/configurateur/manufacturer-colors';

interface ColorSearchResultsProps {
  onSelectRAL: (ralColor: RALColor) => void;
  onSelectManufacturer: (manufacturer: Manufacturer, color: ManufacturerColor) => void;
}

export default function ColorSearchResults({
  onSelectRAL,
  onSelectManufacturer,
}: ColorSearchResultsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RALColor[]>([]);
  const [manufacturerResults, setManufacturerResults] = useState<{ manufacturer: Manufacturer; color: ManufacturerColor }[]>([]);

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

  const handleSelectRAL = (ralColor: RALColor) => {
    onSelectRAL(ralColor);
    setSearchQuery('');
    setSearchResults([]);
    setManufacturerResults([]);
  };

  const handleSelectManufacturerColor = (manufacturer: Manufacturer, color: ManufacturerColor) => {
    onSelectManufacturer(manufacturer, color);
    setSearchQuery('');
    setSearchResults([]);
    setManufacturerResults([]);
  };

  return (
    <>
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

      <style jsx>{`
        .search-section {
          display: flex;
          flex-direction: column;
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

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input {
          width: 100%;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 10px;
          padding: 0.875rem 1rem;
          color: var(--admin-text-primary);
          font-size: 0.9375rem;
          transition: all 0.2s ease;
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
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .search-results::-webkit-scrollbar {
          display: none;
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

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
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

        /* Mobile styles */
        @media (max-width: 768px) {
          .search-input {
            padding: 0.75rem 0.875rem;
            font-size: 0.875rem;
          }

          .section-title {
            font-size: 0.6875rem;
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}
