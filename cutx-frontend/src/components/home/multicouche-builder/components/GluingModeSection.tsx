'use client';

/**
 * GluingModeSection - Sélection du mode de collage
 *
 * - Fournisseur: le fournisseur colle les couches (chants possibles)
 * - Artisan: l'utilisateur colle lui-même (option surcote, pas de chants)
 */

import { Factory, Wrench, Info } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';
import { REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';

export default function GluingModeSection() {
  const {
    modeCollage,
    setModeCollage,
    avecSurcote,
    surcoteMm,
    toggleSurcote,
    setSurcoteMm,
  } = useMulticoucheBuilder();

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      {/* Mode selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--cx-text)]">
          Mode de collage
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {/* Fournisseur */}
          <button
            onClick={() => setModeCollage('fournisseur')}
            className={`
              p-3 rounded-lg border text-left transition-all duration-200
              ${
                modeCollage === 'fournisseur'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-[var(--cx-border)] hover:border-amber-500/50'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <Factory
                size={16}
                className={
                  modeCollage === 'fournisseur'
                    ? 'text-amber-500'
                    : 'text-[var(--cx-text-muted)]'
                }
              />
              <span
                className={`text-sm font-medium ${
                  modeCollage === 'fournisseur'
                    ? 'text-amber-500'
                    : 'text-[var(--cx-text)]'
                }`}
              >
                Fournisseur
              </span>
            </div>
            <p className="text-[10px] text-[var(--cx-text-muted)] leading-tight">
              Collage pro + chants
            </p>
          </button>

          {/* Artisan */}
          <button
            onClick={() => setModeCollage('client')}
            className={`
              p-3 rounded-lg border text-left transition-all duration-200
              ${
                modeCollage === 'client'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-[var(--cx-border)] hover:border-amber-500/50'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <Wrench
                size={16}
                className={
                  modeCollage === 'client'
                    ? 'text-amber-500'
                    : 'text-[var(--cx-text-muted)]'
                }
              />
              <span
                className={`text-sm font-medium ${
                  modeCollage === 'client'
                    ? 'text-amber-500'
                    : 'text-[var(--cx-text)]'
                }`}
              >
                Artisan
              </span>
            </div>
            <p className="text-[10px] text-[var(--cx-text-muted)] leading-tight">
              Collage maison
            </p>
          </button>
        </div>
      </div>

      {/* Surcote option (artisan mode only) */}
      {modeCollage === 'client' && (
        <div className="mt-3 p-3 bg-[var(--cx-surface-2)] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-[var(--cx-text)]">
              <input
                type="checkbox"
                checked={avecSurcote}
                onChange={toggleSurcote}
                className="w-4 h-4 rounded border-[var(--cx-border)] text-amber-500 focus:ring-amber-500"
              />
              Ajouter une surcote
            </label>

            {avecSurcote && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={surcoteMm}
                  onChange={(e) => setSurcoteMm(parseInt(e.target.value) || 0)}
                  min={REGLES_MULTICOUCHE.SURCOTE_MIN}
                  max={REGLES_MULTICOUCHE.SURCOTE_MAX}
                  className="w-16 px-2 py-1 text-sm text-center bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded"
                />
                <span className="text-xs text-[var(--cx-text-muted)]">mm</span>
              </div>
            )}
          </div>

          {avecSurcote && (
            <div className="flex items-start gap-2 text-[10px] text-[var(--cx-text-muted)]">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                La surcote sera ajoutée à chaque pièce du débit pour permettre
                l&apos;ajustement après collage.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Info about mode differences */}
      {modeCollage === 'client' && (
        <p className="mt-2 text-[10px] text-amber-500/70 flex items-start gap-1">
          <Info size={10} className="flex-shrink-0 mt-0.5" />
          Mode artisan : pas de chants ni finitions disponibles
        </p>
      )}
    </div>
  );
}
