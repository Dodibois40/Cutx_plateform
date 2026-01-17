'use client';

/**
 * ChutesPreview - Aperçu des chutes générées
 *
 * Quand les couches ont des dimensions différentes, les feuilles
 * plus grandes génèrent des chutes (excédents) à valoriser.
 */

import { Scissors, AlertTriangle, Info } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';

export default function ChutesPreview() {
  const { chutes } = useMulticoucheBuilder();

  if (chutes.length === 0) {
    return null;
  }

  // Valeur totale des chutes
  const valeurTotale = chutes.reduce((sum, c) => sum + c.valeurEstimee, 0);

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scissors size={14} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--cx-text)]">
            Chutes à valoriser
          </h3>
        </div>
        <span className="text-xs text-amber-500 font-medium">
          ~{valeurTotale.toFixed(0)}€
        </span>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
        <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-500/90 leading-tight">
          Certaines couches sont plus grandes que les dimensions finales.
          Les excédents peuvent être conservés pour d&apos;autres projets.
        </p>
      </div>

      {/* Chutes list */}
      <div className="space-y-2">
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
              <span>{chute.surfaceM2.toFixed(2)} m²</span>
            </div>
          </div>
        ))}
      </div>

      {/* Future feature hint */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--cx-text-muted)]/60">
        <Info size={10} />
        <span>Gestion des chutes disponible prochainement</span>
      </div>
    </div>
  );
}
