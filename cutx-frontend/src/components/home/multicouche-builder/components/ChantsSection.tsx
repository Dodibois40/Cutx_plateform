'use client';

/**
 * ChantsSection - Sélection du chant pour le panneau multicouche
 *
 * Affiché uniquement en mode "fournisseur" (le fournisseur peut coller les chants).
 * Permet de sélectionner la référence du chant à utiliser.
 * Note: L'affectation des côtés A/B/C/D se fait dans le configurateur V3.
 */

import { X, Plus } from 'lucide-react';
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
  } = useMulticoucheBuilder();

  // Pas de chants en mode artisan
  if (modeCollage === 'client') {
    return null;
  }

  const hasChant = !!chants.chant;

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      <h3 className="text-sm font-semibold text-[var(--cx-text)] mb-2">
        Chant
      </h3>

      {/* Chant sélectionné ou bouton d'ajout */}
      {hasChant ? (
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
            onClick={onSearchChant}
            className="p-1.5 text-[var(--cx-text-muted)] hover:text-amber-500 transition-colors"
            title="Changer de chant"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={retirerChant}
            className="p-1.5 text-[var(--cx-text-muted)] hover:text-red-500 transition-colors"
            title="Retirer le chant"
          >
            <X size={14} />
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

      {/* Info: les côtés seront configurés dans le configurateur */}
      {hasChant && (
        <p className="mt-2 text-[10px] text-[var(--cx-text-muted)]/60 text-center">
          Les côtés seront configurés dans le configurateur
        </p>
      )}
    </div>
  );
}
