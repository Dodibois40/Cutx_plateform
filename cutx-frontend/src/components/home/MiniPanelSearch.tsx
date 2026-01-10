'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, ImageIcon, Check, Loader2, Clock } from 'lucide-react';
import type { SearchProduct } from './types';
import { useDebounce } from '@/lib/hooks/useDebounce';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

interface MiniPanelSearchProps {
  thickness: number;
  onSelect: (panel: SearchProduct) => void;
  existingPanels?: SearchProduct[];
}

interface SearchResult {
  id: string;
  reference: string;
  nom: string;
  refFabricant?: string | null;
  epaisseur?: number | null;
  imageUrl?: string | null;
  prixAchatM2?: number | null;
  prixMl?: number | null;
}

export default function MiniPanelSearch({
  thickness,
  onSelect,
  existingPanels = [],
}: MiniPanelSearchProps) {
  const [search, setSearch] = useState(`${thickness}mm`);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  // Matching existing panels for this thickness
  const matchingExisting = existingPanels.filter(
    p => p.epaisseur === thickness
  );

  // Search API
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: debouncedSearch,
          limit: '10',
        });

        const res = await fetch(`${API_URL}/api/catalogues/smart-search?${params}`);
        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();
        setResults(data.produits || []);
        setHasSearched(true);
      } catch (error) {
        console.error('[MiniPanelSearch] Error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearch]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    // Convert to SearchProduct format
    const panel: SearchProduct = {
      id: result.id,
      reference: result.reference,
      nom: result.nom,
      refFabricant: result.refFabricant,
      epaisseur: result.epaisseur,
      imageUrl: result.imageUrl,
      prixAchatM2: result.prixAchatM2,
      prixMl: result.prixMl,
    };
    onSelect(panel);
  }, [onSelect]);

  const handleSelectExisting = useCallback((panel: SearchProduct) => {
    onSelect(panel);
  }, [onSelect]);

  return (
    <div className="space-y-3">
      {/* Existing panels suggestion */}
      {matchingExisting.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Panneaux déjà sélectionnés ({thickness}mm)
          </p>
          <div className="flex flex-wrap gap-2">
            {matchingExisting.map((panel) => (
              <button
                key={panel.id}
                onClick={() => handleSelectExisting(panel)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-500 hover:bg-green-500/20 transition-colors"
              >
                <Check className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{panel.nom}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher un panneau ${thickness}mm...`}
          className="w-full pl-9 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />
        )}
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900">
          {results.length === 0 ? (
            <div className="p-3 text-center text-xs text-neutral-500">
              Aucun résultat pour "{debouncedSearch}"
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-neutral-800 transition-colors"
                >
                  {/* Image */}
                  <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-neutral-800 border border-neutral-700">
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt={result.nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-neutral-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{result.nom}</div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span className="font-mono">{result.refFabricant || result.reference}</span>
                      {result.epaisseur && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className={result.epaisseur === thickness ? 'text-green-500' : 'text-amber-500'}>
                            {result.epaisseur}mm
                          </span>
                        </>
                      )}
                      {(result.prixAchatM2 || result.prixMl) && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="text-amber-500">
                            {result.prixMl
                              ? `${result.prixMl.toFixed(2)}€/ml`
                              : `${result.prixAchatM2?.toFixed(2)}€/m²`
                            }
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thickness match indicator */}
                  {result.epaisseur === thickness && (
                    <div className="flex-shrink-0">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      {!hasSearched && (
        <p className="text-xs text-neutral-500 text-center">
          Tapez pour rechercher un panneau compatible
        </p>
      )}
    </div>
  );
}
