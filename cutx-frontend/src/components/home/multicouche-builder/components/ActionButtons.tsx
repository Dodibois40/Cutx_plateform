'use client';

/**
 * ActionButtons - Boutons d'action du builder multicouche
 *
 * - Configurer le débit (vers Configurateur V3)
 * - Reset
 */

import { ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';

export default function ActionButtons() {
  const { isValid, erreurs, configurerDebit, reset, couches } =
    useMulticoucheBuilder();

  const hasAnyProduct = couches.some((c) => c.produit);

  return (
    <div className="flex-shrink-0 p-3 border-t border-[var(--cx-border)] bg-[var(--cx-surface-1)]/50">
      {/* Validation errors */}
      {!isValid && hasAnyProduct && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {erreurs.map((erreur, index) => (
                <p key={index} className="text-[10px] text-red-500">
                  {erreur}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {/* Reset button */}
        {hasAnyProduct && (
          <button
            onClick={reset}
            className="
              p-2 rounded-lg
              border border-[var(--cx-border)]
              text-[var(--cx-text-muted)]
              hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5
              transition-all duration-200
            "
            title="Réinitialiser"
          >
            <RotateCcw size={18} />
          </button>
        )}

        {/* Configure button */}
        <button
          onClick={configurerDebit}
          disabled={!isValid}
          className={`
            flex-1 flex items-center justify-center gap-2
            py-3 px-4 rounded-lg
            font-medium text-sm
            transition-all duration-200
            ${
              isValid
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-muted)] cursor-not-allowed'
            }
          `}
        >
          <span>Configurer le débit</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Helper text */}
      {!hasAnyProduct && (
        <p className="mt-2 text-[10px] text-center text-[var(--cx-text-muted)]/60">
          Sélectionnez des panneaux pour chaque couche
        </p>
      )}
    </div>
  );
}
