'use client';

/**
 * MulticoucheBuilder - Container principal pour la construction de panneaux multicouches
 *
 * Affiché dans la colonne de droite quand le mode "Multicouche" est sélectionné.
 * Permet de:
 * - Choisir le mode de collage (fournisseur / artisan)
 * - Configurer les couches (2-6)
 * - Voir les dimensions finales et le prix
 * - Passer au configurateur V3
 */

import { Layers } from 'lucide-react';
import { useMulticoucheBuilder } from './MulticoucheBuilderContext';
import {
  LayersList,
  GluingModeSection,
  ChantsSection,
  DimensionsSummary,
  ChutesPreview,
  PriceBreakdown,
  ActionButtons,
} from './components';

interface MulticoucheBuilderProps {
  /** Callback pour déclencher la recherche de chant */
  onSearchChant?: () => void;
}

export default function MulticoucheBuilder({ onSearchChant }: MulticoucheBuilderProps) {
  const { couches } = useMulticoucheBuilder();

  const assignedCount = couches.filter((c) => c.produit).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--cx-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-500/70" />
            <h2 className="text-base font-semibold text-[var(--cx-text)]">
              Panneau Multicouche
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`
                text-xs px-2 py-0.5 rounded-full
                ${
                  assignedCount === couches.length
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-amber-500/10 text-amber-500'
                }
              `}
            >
              {assignedCount}/{couches.length}
            </span>
          </div>
        </div>
        <p className="text-xs text-[var(--cx-text-muted)] mt-1">
          Composez votre panneau couche par couche
        </p>
      </div>

      {/* Scrollable content - onDragOver allows drops to propagate to LayerCard */}
      <div
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Gluing mode selection */}
        <GluingModeSection />

        {/* Layers list */}
        <LayersList />

        {/* Chants selection (fournisseur mode only) */}
        {onSearchChant && <ChantsSection onSearchChant={onSearchChant} />}

        {/* Dimensions summary */}
        <DimensionsSummary />

        {/* Chutes preview */}
        <ChutesPreview />

        {/* Price breakdown */}
        <PriceBreakdown />
      </div>

      {/* Action buttons */}
      <ActionButtons />
    </div>
  );
}
