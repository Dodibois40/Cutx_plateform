'use client';

/**
 * LayersList - Liste des couches du panneau multicouche
 *
 * Affiche toutes les couches avec possibilité de:
 * - Ajouter une couche
 * - Supprimer une couche
 * - Réordonner via drag & drop (grip)
 * - Recevoir un produit via drop depuis search results
 */

import { Plus } from 'lucide-react';
import { useMulticoucheBuilder } from '../MulticoucheBuilderContext';
import LayerCard from './LayerCard';
import { REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';

export default function LayersList() {
  const {
    couches,
    activeCoucheId,
    setActiveCouche,
    ajouterCouche,
    supprimerCouche,
    updateCoucheType,
    retirerProduit,
    assignerProduit,
    reorderCouches,
  } = useMulticoucheBuilder();

  const canAddLayer = couches.length < REGLES_MULTICOUCHE.COUCHES_MAX;
  const canDeleteLayers = couches.length > REGLES_MULTICOUCHE.COUCHES_MIN;

  return (
    <div className="p-3 space-y-3" onDragOver={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cx-text)]">
          Composition
        </h3>
        <span className="text-xs text-[var(--cx-text-muted)]">
          {couches.filter((c) => c.produit).length}/{couches.length} couches
        </span>
      </div>

      {/* Layers - onDragOver allows drops on LayerCard children */}
      <div className="space-y-2" onDragOver={(e) => e.preventDefault()}>
        {couches.map((couche, index) => (
          <LayerCard
            key={couche.id}
            couche={couche}
            index={index}
            canDelete={canDeleteLayers}
            onSelect={() => {
              console.log('[LayersList] Selecting layer:', couche.id);
              setActiveCouche(couche.id);
            }}
            onDelete={() => supprimerCouche(couche.id)}
            onChangeType={(type) => {
              console.log('[LayersList] Changing type:', couche.id, '->', type);
              updateCoucheType(couche.id, type);
            }}
            onClearProduct={() => retirerProduit(couche.id)}
            onProductDrop={(product) => {
              console.log('[LayersList] Product dropped on layer:', couche.id, product.nom);
              assignerProduit(couche.id, product);
            }}
            onReorder={(from, to) => {
              console.log('[LayersList] Reordering:', from, '->', to);
              reorderCouches(from, to);
            }}
          />
        ))}
      </div>

      {/* Add layer button */}
      {canAddLayer && (
        <button
          onClick={ajouterCouche}
          className="
            w-full py-3 px-4 rounded-lg
            border border-dashed border-[var(--cx-border)]
            flex items-center justify-center gap-2
            text-sm text-[var(--cx-text-muted)]
            hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/5
            transition-all duration-200
          "
        >
          <Plus size={16} />
          <span>Ajouter une couche</span>
        </button>
      )}

      {/* Layer count info */}
      <p className="text-[10px] text-center text-[var(--cx-text-muted)]/60">
        {REGLES_MULTICOUCHE.COUCHES_MIN}-{REGLES_MULTICOUCHE.COUCHES_MAX} couches
        autorisées
      </p>
    </div>
  );
}
