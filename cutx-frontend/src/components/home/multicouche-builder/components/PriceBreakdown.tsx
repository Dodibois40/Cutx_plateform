'use client';

/**
 * PriceBreakdown - Détail des prix du panneau multicouche
 *
 * Affiche:
 * - Prix par couche
 * - Prix du collage (si fournisseur)
 * - Prix total
 */

import { Euro, Package } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';

export default function PriceBreakdown() {
  const {
    couches,
    modeCollage,
    prixTotalCouches,
    prixCollage,
    prixTotal,
    dimensionsFinales,
  } = useMulticoucheBuilder();

  const hasAnyProduct = couches.some((c) => c.produit);

  if (!hasAnyProduct) {
    return null;
  }

  // Prix au m² global
  const surfaceM2 =
    (dimensionsFinales.longueur * dimensionsFinales.largeur) / 1_000_000;
  const prixM2 = surfaceM2 > 0 ? prixTotal / surfaceM2 : 0;

  return (
    <div className="p-3 border-b border-[var(--cx-border)]">
      <div className="flex items-center gap-2 mb-3">
        <Euro size={14} className="text-[var(--cx-text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--cx-text)]">
          Estimation du prix
        </h3>
      </div>

      <div className="space-y-2">
        {/* Prix par couche */}
        {couches.map(
          (couche) =>
            couche.produit && (
              <div
                key={couche.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package size={12} className="text-[var(--cx-text-muted)] flex-shrink-0" />
                  <span className="text-[var(--cx-text-muted)] truncate">
                    {couche.panneauNom}
                  </span>
                </div>
                <span className="text-[var(--cx-text)] font-medium flex-shrink-0 ml-2">
                  {couche.prixPanneauM2.toFixed(2)}€/m²
                </span>
              </div>
            )
        )}

        {/* Collage (si fournisseur) */}
        {modeCollage === 'fournisseur' && prixCollage > 0 && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--cx-border)]">
            <span className="text-[var(--cx-text-muted)]">
              Collage ({couches.length - 1} joint{couches.length > 2 ? 's' : ''})
            </span>
            <span className="text-[var(--cx-text)] font-medium">
              +{(prixCollage / surfaceM2).toFixed(2)}€/m²
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--cx-border)]">
          <span className="text-sm font-semibold text-[var(--cx-text)]">
            Total matière
          </span>
          <span className="text-sm font-bold text-amber-500">
            {prixM2.toFixed(2)}€/m²
          </span>
        </div>
      </div>

      {/* Note */}
      <p className="mt-2 text-[10px] text-[var(--cx-text-muted)]/60 text-center">
        Prix indicatif hors chants et finitions
      </p>
    </div>
  );
}
