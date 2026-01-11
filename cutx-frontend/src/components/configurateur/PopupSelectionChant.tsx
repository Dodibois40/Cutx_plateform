'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ImageIcon, Loader2, Ruler, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import type { ChantGroupe } from '@/lib/configurateur/groupes/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

interface ChantResult {
  id: string;
  reference: string;
  nom: string;
  refFabricant?: string | null;
  epaisseur?: number | null;
  largeur?: number | null;
  prixMl?: number | null;
  imageUrl?: string | null;
}

interface ThicknessFacet {
  value: number;
  count: number;
}

interface PopupSelectionChantProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chant: ChantGroupe) => void;
  /** Reference fabricant du panneau pour suggérer un chant correspondant */
  suggestedRef?: string | null;
}

// Popular thicknesses for edge banding
const POPULAR_THICKNESSES = [0.4, 0.8, 1, 2, 3];

export default function PopupSelectionChant({
  isOpen,
  onClose,
  onSelect,
  suggestedRef,
}: PopupSelectionChantProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ChantResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thicknesses, setThicknesses] = useState<ThicknessFacet[]>([]);
  const [selectedThickness, setSelectedThickness] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [hasSuggestion, setHasSuggestion] = useState(false);

  // Reset and initialize on open
  useEffect(() => {
    console.log('[PopupSelectionChant] isOpen changed:', isOpen, 'suggestedRef:', suggestedRef);
    if (isOpen) {
      // If we have a suggested ref, start with that search
      if (suggestedRef) {
        setSearchQuery(suggestedRef);
        setHasSuggestion(true);
      } else {
        setSearchQuery('');
        setHasSuggestion(false);
      }
      setSelectedThickness(null);
      setResults([]);
      setThicknesses([]);

      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, suggestedRef]);

  // Search function
  const doSearch = useCallback(async (query: string, thickness?: number | null) => {
    if (!query.trim()) {
      setResults([]);
      setThicknesses([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        productType: 'BANDE_DE_CHANT',
        limit: '30',
      });

      // Add thickness filter if selected
      if (thickness) {
        params.set('thickness', String(thickness));
      }

      const response = await fetch(`${API_URL}/api/catalogues/smart-search?${params}`);
      if (!response.ok) throw new Error('Erreur de recherche');

      const data = await response.json();
      // L'API renvoie "panels" pas "results"
      const panels = data.panels || data.results || [];

      // Mapper les panels vers le format ChantResult
      const mappedResults: ChantResult[] = panels
        .filter((p: any) => p.productType === 'BANDE_DE_CHANT')
        .map((p: any) => ({
          id: p.id,
          reference: p.reference,
          nom: p.name || p.nom,
          refFabricant: p.manufacturerRef || p.refFabricant,
          epaisseur: p.defaultThickness || p.epaisseur,
          largeur: p.defaultWidth || p.largeur,
          prixMl: p.pricePerMl || p.prixMl,
          imageUrl: p.imageUrl,
        }));

      setResults(mappedResults);

      // Extract thickness facets from API facets or from results
      if (data.facets?.thicknesses) {
        const sorted = [...data.facets.thicknesses].sort((a, b) => {
          const aPopIndex = POPULAR_THICKNESSES.indexOf(a.value);
          const bPopIndex = POPULAR_THICKNESSES.indexOf(b.value);
          if (aPopIndex !== -1 && bPopIndex !== -1) return aPopIndex - bPopIndex;
          if (aPopIndex !== -1) return -1;
          if (bPopIndex !== -1) return 1;
          return a.value - b.value;
        });
        setThicknesses(sorted);
      } else {
        // Extract from results if no facets
        const thicknessMap = new Map<number, number>();
        mappedResults.forEach((r: ChantResult) => {
          if (r.epaisseur) {
            thicknessMap.set(r.epaisseur, (thicknessMap.get(r.epaisseur) || 0) + 1);
          }
        });
        const extracted = Array.from(thicknessMap.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value - b.value);
        setThicknesses(extracted);
      }
    } catch (err) {
      console.error('Erreur recherche chant:', err);
      setError('Erreur lors de la recherche');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      doSearch(searchQuery, selectedThickness);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, selectedThickness, doSearch]);

  // Handle selection
  const handleSelect = useCallback((result: ChantResult) => {
    console.log('[PopupSelectionChant] handleSelect called, result:', result);
    const chant: ChantGroupe = {
      id: result.id,
      reference: result.reference,
      nom: result.nom,
      refFabricant: result.refFabricant,
      epaisseur: result.epaisseur,
      prixMl: result.prixMl,
      imageUrl: result.imageUrl,
    };
    console.log('[PopupSelectionChant] Calling onSelect with chant:', chant);
    onSelect(chant);
    console.log('[PopupSelectionChant] Calling onClose');
    onClose();
  }, [onSelect, onClose]);

  // Handle thickness filter
  const handleThicknessFilter = useCallback((thickness: number) => {
    if (selectedThickness === thickness) {
      setSelectedThickness(null);
    } else {
      setSelectedThickness(thickness);
    }
  }, [selectedThickness]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Styles inline (comme PopupSelectionPanneau) pour éviter les problèmes avec styled-jsx
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  };

  const containerStyle: React.CSSProperties = {
    background: 'var(--cx-surface-1, #1a1a1a)',
    border: '1px solid var(--cx-border-default, #333)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '650px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  };

  const content = (
    <div style={overlayStyle} onClick={onClose}>
      <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--cx-border-subtle, #2a2a2a)',
          background: 'var(--cx-surface-2, #222)',
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--cx-text-primary, #fff)',
            margin: 0,
          }}>Sélectionner une bande de chant</h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              border: 'none',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--cx-text-muted, #888)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Suggestion banner */}
        {hasSuggestion && suggestedRef && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'rgba(234, 179, 8, 0.1)',
            borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
          }}>
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              color: '#eab308',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>Chant suggéré</span>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--cx-text-primary, #fff)',
            }}>{suggestedRef}</span>
            <ArrowRight size={14} style={{ color: '#eab308', opacity: 0.7 }} />
          </div>
        )}

        {/* Search */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--cx-border-subtle, #2a2a2a)',
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--cx-text-muted, #888)',
              pointerEvents: 'none',
            }} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHasSuggestion(false);
              }}
              placeholder="Rechercher un chant (ex: H1180, ABS blanc 0.4mm)..."
              style={{
                width: '100%',
                padding: '12px 40px',
                background: 'var(--cx-surface-2, #222)',
                border: '1px solid var(--cx-border-default, #333)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: 'var(--cx-text-primary, #fff)',
                outline: 'none',
              }}
            />
            {isLoading && (
              <Loader2 size={18} style={{
                position: 'absolute',
                right: '12px',
                color: '#eab308',
                animation: 'spin 1s linear infinite',
              }} />
            )}
          </div>
        </div>

        {/* Thickness filters */}
        {thicknesses.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--cx-border-subtle, #2a2a2a)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.6875rem',
              fontWeight: 500,
              color: 'var(--cx-text-muted, #888)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              <Ruler size={14} />
              <span>Épaisseur</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {thicknesses.slice(0, 8).map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleThicknessFilter(t.value)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: selectedThickness === t.value ? '#eab308' : 'var(--cx-surface-2, #222)',
                    border: `1px solid ${selectedThickness === t.value ? '#eab308' : 'var(--cx-border-default, #333)'}`,
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: selectedThickness === t.value ? 'black' : 'var(--cx-text-primary, #fff)',
                    cursor: 'pointer',
                  }}
                >
                  {t.value}mm
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>({t.count})</span>
                </button>
              ))}
              {selectedThickness && (
                <button
                  onClick={() => setSelectedThickness(null)}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: 'var(--cx-text-muted, #888)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}>
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.875rem',
            }}>{error}</div>
          )}

          {!searchQuery.trim() && !isLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--cx-text-muted, #888)',
              textAlign: 'center',
              gap: '12px',
            }}>
              <Search size={32} style={{ opacity: 0.3 }} />
              <p style={{ margin: 0 }}>Tapez pour rechercher une bande de chant</p>
              {suggestedRef && (
                <button
                  onClick={() => setSearchQuery(suggestedRef)}
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#eab308',
                    cursor: 'pointer',
                  }}
                >
                  Rechercher "{suggestedRef}"
                </button>
              )}
            </div>
          )}

          {searchQuery.trim() && !isLoading && results.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--cx-text-muted, #888)',
              textAlign: 'center',
              gap: '12px',
            }}>
              <p style={{ margin: 0 }}>Aucun résultat pour "{searchQuery}"</p>
              {selectedThickness && (
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>
                  Essayez de retirer le filtre d'épaisseur
                </p>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--cx-surface-2, #222)';
                    e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '6px',
                    background: 'var(--cx-surface-3, #2a2a2a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    color: 'var(--cx-text-muted, #888)',
                  }}>
                    {result.imageUrl ? (
                      <Image
                        src={result.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ImageIcon size={20} />
                    )}
                  </div>
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--cx-text-primary, #fff)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{result.nom}</span>
                    <span style={{
                      display: 'flex',
                      gap: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--cx-text-tertiary, #666)',
                    }}>
                      {result.epaisseur && (
                        <span style={{
                          background: 'rgba(234, 179, 8, 0.1)',
                          color: '#eab308',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}>{result.epaisseur}mm</span>
                      )}
                      {result.largeur && <span>L: {result.largeur}mm</span>}
                      {result.reference && (
                        <span style={{ color: 'var(--cx-text-muted, #888)' }}>{result.reference}</span>
                      )}
                    </span>
                  </div>
                  {result.prixMl && (
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#eab308',
                      flexShrink: 0,
                    }}>{result.prixMl.toFixed(2)}€/mL</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Animation keyframes for spinner */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
