'use client';

/**
 * LayerCard - Carte représentant une couche du panneau multicouche
 *
 * Affiche:
 * - Numéro d'ordre et type de couche
 * - Panneau assigné (ou zone d'assignation)
 * - Dimensions et prix
 * - Actions (supprimer, changer type)
 *
 * Drag & Drop:
 * - Drop zone pour recevoir un panneau depuis les résultats de recherche
 * - Grip draggable pour réorganiser l'ordre des couches
 */

import { useState } from 'react';
import { X, ChevronDown, GripVertical, Search, ArrowDown } from 'lucide-react';
import type { BuilderCouche } from '../types';
import type { SearchProduct } from '../../types';
import type { TypeCouche } from '@/lib/configurateur-multicouche/types';

interface LayerCardProps {
  couche: BuilderCouche;
  /** Index dans la liste (pour réorganisation) */
  index: number;
  /** Peut supprimer cette couche */
  canDelete: boolean;
  /** Callback pour sélectionner cette couche (pour assignation) */
  onSelect: () => void;
  /** Callback pour supprimer la couche */
  onDelete: () => void;
  /** Callback pour changer le type */
  onChangeType: (type: TypeCouche) => void;
  /** Callback pour retirer le produit assigné */
  onClearProduct: () => void;
  /** Callback quand un produit est droppé sur cette couche */
  onProductDrop?: (product: SearchProduct) => void;
  /** Callback pour réorganiser les couches */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

// Bordures colorées uniquement (design sobre, pas de fond)
// Face A et Face B = amber, Âme = marron (stone), Autre = violet
const TYPE_COLORS: Record<TypeCouche, string> = {
  parement: 'border-l-amber-500',
  ame: 'border-l-stone-500',
  contrebalancement: 'border-l-amber-500',
  autre: 'border-l-violet-500',
};

const TYPE_BADGES: Record<TypeCouche, string> = {
  parement: 'bg-amber-500/20 text-amber-500',
  ame: 'bg-stone-500/20 text-stone-400',
  contrebalancement: 'bg-amber-500/20 text-amber-500',
  autre: 'bg-violet-500/20 text-violet-500',
};

// Ring colors for active state (matches type colors)
const TYPE_RING_ACTIVE: Record<TypeCouche, string> = {
  parement: 'ring-2 ring-amber-500/50',
  ame: 'ring-2 ring-stone-500/50',
  contrebalancement: 'ring-2 ring-amber-500/50',
  autre: 'ring-2 ring-violet-500/50',
};

// Selection button styles (active state)
const TYPE_BUTTON_ACTIVE: Record<TypeCouche, string> = {
  parement: 'border-amber-500 bg-amber-500/10 text-amber-500',
  ame: 'border-stone-500 bg-stone-500/10 text-stone-400',
  contrebalancement: 'border-amber-500 bg-amber-500/10 text-amber-500',
  autre: 'border-violet-500 bg-violet-500/10 text-violet-500',
};

// Selection button styles (hover state)
const TYPE_BUTTON_HOVER: Record<TypeCouche, string> = {
  parement: 'hover:border-amber-500/50 hover:text-amber-500',
  ame: 'hover:border-stone-500/50 hover:text-stone-400',
  contrebalancement: 'hover:border-amber-500/50 hover:text-amber-500',
  autre: 'hover:border-violet-500/50 hover:text-violet-500',
};

export default function LayerCard({
  couche,
  index,
  canDelete,
  onSelect,
  onDelete,
  onChangeType,
  onClearProduct,
  onProductDrop,
  onReorder,
}: LayerCardProps) {
  const hasProduct = !!couche.produit;

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLayerDragOver, setIsLayerDragOver] = useState(false);

  // Helper to check drag types (DOMStringList compatibility)
  const hasType = (types: readonly string[] | DOMStringList, type: string): boolean => {
    if ('includes' in types) return types.includes(type);
    if ('contains' in types) return types.contains(type);
    return Array.from(types).includes(type);
  };

  // Handle product drop from search results
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const types = e.dataTransfer.types;
    // Accept JSON (product from search) or plain text (layer reorder)
    if (hasType(types, 'application/json')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
      setIsLayerDragOver(false);
    } else if (hasType(types, 'text/plain')) {
      e.dataTransfer.dropEffect = 'move';
      setIsLayerDragOver(true);
      setIsDragOver(false);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsLayerDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsLayerDragOver(false);

    // Try product drop first (from search results)
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const product = JSON.parse(jsonData) as SearchProduct;
        console.log('[LayerCard] Drop product:', product.nom, 'type:', product.productType);
        // Only accept PANNEAU products
        if (product.productType === 'PANNEAU') {
          onProductDrop?.(product);
          return;
        }
      } catch (err) {
        console.error('[LayerCard] Failed to parse product JSON:', err);
      }
    }

    // Try layer reorder (from grip)
    const textData = e.dataTransfer.getData('text/plain');
    if (textData) {
      const fromIndex = parseInt(textData, 10);
      console.log('[LayerCard] Drop layer reorder from:', fromIndex, 'to:', index);
      if (!isNaN(fromIndex) && fromIndex !== index) {
        onReorder?.(fromIndex, index);
      }
    }
  };

  // Handle layer reorder via grip drag
  const handleGripDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-l-4 rounded-lg border transition-all duration-200
        bg-white/[0.03]
        ${TYPE_COLORS[couche.type]}
        ${couche.isActive ? TYPE_RING_ACTIVE[couche.type] : ''}
        ${isDragOver ? 'ring-2 ring-amber-500 ring-dashed border-amber-500 scale-[1.02]' : 'border-[var(--cx-border)]'}
        ${isLayerDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''}
      `}
    >
      {/* Drag over indicator */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-500/10 rounded-lg z-10 pointer-events-none">
          <div className="flex items-center gap-2 text-amber-500">
            <ArrowDown size={18} className="animate-bounce" />
            <span className="text-xs font-medium">Déposer ici</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--cx-border)]">
        <div className="flex items-center gap-2">
          {/* Grip pour réorganiser les couches */}
          <div
            draggable
            onDragStart={handleGripDragStart}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-[var(--cx-surface-2)]"
            title="Glisser pour réorganiser"
          >
            <GripVertical
              size={14}
              className="text-[var(--cx-text-muted)]/50"
            />
          </div>

          {/* Numéro d'ordre */}
          <span className="text-xs font-bold text-[var(--cx-text-muted)]">
            #{couche.ordre}
          </span>

          {/* Type dropdown */}
          <div className="relative">
            <select
              value={couche.type}
              onChange={(e) => onChangeType(e.target.value as TypeCouche)}
              className={`
                appearance-none cursor-pointer
                text-xs font-medium px-2 py-1 pr-6 rounded-full
                border-0 outline-none
                ${TYPE_BADGES[couche.type]}
              `}
            >
              <option value="parement">Face A (Parement)</option>
              <option value="ame">Âme</option>
              <option value="contrebalancement">Face B (Contrebal.)</option>
              <option value="autre">Autre</option>
            </select>
            <ChevronDown
              size={12}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
            />
          </div>
        </div>

        {/* Delete button */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1 text-[var(--cx-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
            title="Supprimer cette couche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {hasProduct ? (
          /* Produit assigné */
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              {/* Image */}
              {couche.panneauImageUrl ? (
                <img
                  src={couche.panneauImageUrl}
                  alt=""
                  className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-[var(--cx-surface-2)] rounded-md flex-shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--cx-text)] truncate">
                  {couche.panneauNom}
                </p>
                <p className="text-xs text-[var(--cx-text-muted)] mt-0.5">
                  {couche.panneauReference}
                </p>
              </div>

              {/* Clear button */}
              <button
                onClick={onClearProduct}
                className="p-1 text-[var(--cx-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                title="Retirer ce panneau"
              >
                <X size={14} />
              </button>
            </div>

            {/* Dimensions et prix */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-[var(--cx-text-muted)]">
                <span>{couche.panneauLongueur} × {couche.panneauLargeur} mm</span>
                <span>ép. {couche.epaisseur}mm</span>
              </div>
              <span className="text-amber-500 font-medium">
                {couche.prixPanneauM2.toFixed(2)}€/m²
              </span>
            </div>
          </div>
        ) : (
          /* Zone d'assignation */
          <button
            onClick={onSelect}
            className={`
              w-full py-4 px-3 rounded-lg border-2 border-dashed
              flex flex-col items-center justify-center gap-2
              transition-all duration-200
              ${
                couche.isActive
                  ? TYPE_BUTTON_ACTIVE[couche.type]
                  : `border-[var(--cx-border)] text-[var(--cx-text-muted)] ${TYPE_BUTTON_HOVER[couche.type]}`
              }
            `}
          >
            <Search size={18} />
            <span className="text-xs font-medium">
              {couche.isActive
                ? 'Cliquez sur un panneau...'
                : 'Sélectionner un panneau'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
