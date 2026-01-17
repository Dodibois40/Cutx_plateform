'use client';

/**
 * ChantsSection - Sélection des chants pour le panneau multicouche
 *
 * Affiché uniquement en mode "fournisseur" (le fournisseur peut coller les chants).
 * Permet de sélectionner un chant et les côtés actifs.
 */

import { X, Plus, AlertCircle } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';

interface ChantsSectionProps {
  /** Callback pour déclencher la recherche de chant */
  onSearchChant: () => void;
}

export default function ChantsSection({ onSearchChant }: ChantsSectionProps) {
  const {
    modeCollage,
    chants,
    retirerChant,
    toggleChantCote,
  } = useMulticoucheBuilder();

  // Pas de chants en mode artisan
  if (modeCollage === 'client') {
    return null;
  }

  const hasChant = !!chants.chant;
  const activeSides = Object.entries(chants.actifs)
    .filter(([, active]) => active)
    .map(([side]) => side);

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--cx-text)]">
          Chants
        </h3>
        {hasChant && activeSides.length > 0 && (
          <span className="text-xs text-[var(--cx-text-muted)]">
            {activeSides.length} côté{activeSides.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Chant sélectionné ou bouton d'ajout */}
      {hasChant ? (
        <div className="space-y-3">
          {/* Chant card */}
          <div className="flex items-center gap-3 p-2 bg-[var(--cx-surface-2)] rounded-lg">
            {chants.chant!.imageUrl && (
              <img
                src={chants.chant!.imageUrl}
                alt=""
                className="w-10 h-10 object-cover rounded-md flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--cx-text)] truncate">
                {chants.chant!.nom}
              </p>
              {chants.chant!.prixMl && (
                <p className="text-[10px] text-amber-500">
                  {chants.chant!.prixMl.toFixed(2)}€/mL
                </p>
              )}
            </div>
            <button
              onClick={retirerChant}
              className="p-1 text-[var(--cx-text-muted)] hover:text-red-500 transition-colors"
              title="Retirer le chant"
            >
              <X size={14} />
            </button>
          </div>

          {/* Côtés actifs */}
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--cx-text-muted)] uppercase tracking-wide">
              Côtés à chanter
            </p>
            <div className="grid grid-cols-4 gap-1">
              {(['A', 'B', 'C', 'D'] as const).map((cote) => (
                <button
                  key={cote}
                  onClick={() => toggleChantCote(cote)}
                  className={`
                    py-2 rounded text-xs font-medium transition-all duration-200
                    ${
                      chants.actifs[cote]
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                        : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-muted)] border border-transparent hover:border-[var(--cx-border)]'
                    }
                  `}
                >
                  {cote}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--cx-text-muted)]">
              A/C = longueurs, B/D = largeurs
            </p>
          </div>

          {/* Warning si aucun côté actif */}
          {activeSides.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-amber-500">
              <AlertCircle size={12} />
              <span>Sélectionnez au moins un côté</span>
            </div>
          )}

          {/* Changer de chant */}
          <button
            onClick={onSearchChant}
            className="w-full py-1.5 text-xs text-[var(--cx-text-muted)] hover:text-amber-500 transition-colors"
          >
            Changer de chant
          </button>
        </div>
      ) : (
        <button
          onClick={onSearchChant}
          className="
            w-full flex items-center justify-center gap-2
            py-3 rounded-lg border-2 border-dashed border-[var(--cx-border)]
            text-sm text-[var(--cx-text-muted)]
            hover:border-amber-500/50 hover:text-amber-500
            transition-all duration-200
          "
        >
          <Plus size={16} />
          <span>Ajouter un chant</span>
        </button>
      )}
    </div>
  );
}
