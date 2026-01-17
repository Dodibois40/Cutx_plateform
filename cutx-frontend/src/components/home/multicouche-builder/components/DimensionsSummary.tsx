'use client';

/**
 * DimensionsSummary - Récapitulatif des dimensions du panneau multicouche
 *
 * Affiche:
 * - Dimensions finales (MIN de toutes les couches)
 * - Épaisseur totale (somme des épaisseurs)
 */

import { Ruler, Layers } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';

export default function DimensionsSummary() {
  const { dimensionsFinales, epaisseurTotale, couches } = useMulticoucheBuilder();

  const hasAllProducts = couches.every((c) => c.produit);
  const hasAnyProduct = couches.some((c) => c.produit);

  // Format dimension with thousands separator
  const formatDim = (value: number) => {
    return value.toLocaleString('fr-FR');
  };

  if (!hasAnyProduct) {
    return null;
  }

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      <h3 className="text-sm font-semibold text-[var(--cx-text)] mb-3">
        Dimensions finales
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Dimensions L × l */}
        <div className="p-3 bg-[var(--cx-surface-2)] rounded-lg">
          <div className="flex items-center gap-2 text-[var(--cx-text-muted)] mb-1">
            <Ruler size={14} />
            <span className="text-[10px] uppercase tracking-wide">Format</span>
          </div>
          {dimensionsFinales.longueur > 0 ? (
            <p className="text-lg font-bold text-[var(--cx-text)]">
              {formatDim(dimensionsFinales.longueur)}{' '}
              <span className="text-[var(--cx-text-muted)]">×</span>{' '}
              {formatDim(dimensionsFinales.largeur)}
              <span className="text-xs font-normal text-[var(--cx-text-muted)] ml-1">
                mm
              </span>
            </p>
          ) : (
            <p className="text-sm text-[var(--cx-text-muted)]">—</p>
          )}
        </div>

        {/* Épaisseur totale */}
        <div className="p-3 bg-[var(--cx-surface-2)] rounded-lg">
          <div className="flex items-center gap-2 text-[var(--cx-text-muted)] mb-1">
            <Layers size={14} />
            <span className="text-[10px] uppercase tracking-wide">Épaisseur</span>
          </div>
          {epaisseurTotale > 0 ? (
            <p className="text-lg font-bold text-[var(--cx-text)]">
              {epaisseurTotale.toFixed(1)}
              <span className="text-xs font-normal text-[var(--cx-text-muted)] ml-1">
                mm
              </span>
            </p>
          ) : (
            <p className="text-sm text-[var(--cx-text-muted)]">—</p>
          )}
        </div>
      </div>

      {/* Note about MIN dimensions */}
      {hasAnyProduct && !hasAllProducts && (
        <p className="mt-2 text-[10px] text-[var(--cx-text-muted)] text-center">
          Dimensions basées sur la plus petite couche
        </p>
      )}

      {/* Surface calculation */}
      {dimensionsFinales.longueur > 0 && dimensionsFinales.largeur > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--cx-border)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--cx-text-muted)]">Surface</span>
            <span className="font-medium text-[var(--cx-text)]">
              {(
                (dimensionsFinales.longueur * dimensionsFinales.largeur) /
                1_000_000
              ).toFixed(2)}{' '}
              m²
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
