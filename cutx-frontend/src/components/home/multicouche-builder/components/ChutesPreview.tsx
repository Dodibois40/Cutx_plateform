'use client';

/**
 * ChutesPreview - Aperçu des chutes générées (rétractable)
 *
 * Quand les couches ont des dimensions différentes, les feuilles
 * plus grandes génèrent des chutes (excédents) à valoriser.
 */

import { useState } from 'react';
import { Scissors, ChevronDown } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';

export default function ChutesPreview() {
  const { chutes } = useMulticoucheBuilder();
  const [isExpanded, setIsExpanded] = useState(false);

  if (chutes.length === 0) {
    return null;
  }

  // Valeur totale des chutes
  const valeurTotale = chutes.reduce((sum, c) => sum + c.valeurEstimee, 0);

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Scissors size={14} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--cx-text)]">
            Chutes à valoriser
          </h3>
          <span className="text-xs text-[var(--cx-text-muted)]">
            ({chutes.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-500 font-medium">
            ~{valeurTotale.toFixed(0)}€
          </span>
          <ChevronDown
            size={14}
            className={`text-[var(--cx-text-muted)] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Info text */}
          <p className="text-[10px] text-[var(--cx-text-muted)] leading-tight">
            Excédents conservables pour d&apos;autres projets
          </p>

          {/* Chutes list */}
          {chutes.map((chute) => (
            <div
              key={chute.id}
              className="p-2 bg-[var(--cx-surface-2)] rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--cx-text)] truncate">
                  {chute.sourceCoucheNom}
                </span>
                <span className="text-xs text-amber-500 font-medium">
                  {chute.valeurEstimee.toFixed(2)}€
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[var(--cx-text-muted)]">
                <span>
                  {chute.dimensions.longueur} × {chute.dimensions.largeur} mm
                </span>
                <span>ép. {chute.dimensions.epaisseur}mm</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
