'use client';

import { Package, GripVertical, Eye } from 'lucide-react';
import type { SearchProduct } from '../types';
import ProductImage from './ProductImage';
import { TypeBadge, SupplierBadge } from './ProductBadges';
import { getTypeConfig, getSupplierConfig } from './config';

interface ProductCardListProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  onViewDetails?: (productId: string) => void;
  isDraggable?: boolean;
}

export default function ProductCardList({ product, onClick, onViewDetails, isDraggable = false }: ProductCardListProps) {
  const {
    nom,
    reference,
    refFabricant,
    productType,
    epaisseur,
    longueur,
    largeur,
    prixAchatM2,
    prixMl,
    imageUrl,
    stock,
    isVariableLength,
    fournisseur,
  } = product;

  const typeConfig = getTypeConfig(productType);
  const supplierConfig = getSupplierConfig(fournisseur);
  const priceM2 = prixAchatM2 || prixMl;
  const priceUnit = prixAchatM2 ? 'm²' : prixMl ? 'ml' : '';
  const dimensions = isVariableLength ? `Variable × ${largeur}` : `${longueur} × ${largeur}`;
  const isInStock = stock === 'EN STOCK';

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.setData('application/json', JSON.stringify(product));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(product)}
      aria-label={`${nom} - ${typeConfig?.label || productType} - ${epaisseur}mm - ${dimensions}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      className={`group relative w-full text-left bg-[var(--cx-surface-1)]/30 border border-[var(--cx-border)] rounded-lg overflow-hidden transition-all duration-200 hover:bg-[var(--cx-surface-1)] hover:border-amber-500/50 focus:outline-none focus:border-amber-500 cursor-pointer ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Drag grip - only shown when draggable */}
        {isDraggable && (
          <div className="flex-shrink-0 flex items-center justify-center w-5 text-neutral-500 hover:text-neutral-300 transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <ProductImage imageUrl={imageUrl} alt={nom} size="sm" />

        <div className="w-16 flex-shrink-0">
          <TypeBadge config={typeConfig} size="sm" />
        </div>

        <span className="flex-1 min-w-0 text-sm font-medium text-[var(--cx-text)] truncate group-hover:text-amber-500 transition-colors">
          {nom}
        </span>

        <span className="w-24 flex-shrink-0 font-mono text-xs text-[var(--cx-text-muted)] bg-white/5 px-1.5 py-0.5 rounded truncate">
          {refFabricant || reference}
        </span>

        <span className="w-24 flex-shrink-0 text-xs text-[var(--cx-text-muted)]">
          {dimensions}
        </span>

        <span className="w-16 flex-shrink-0 text-xs font-bold text-[var(--cx-text)]">
          {epaisseur ? `${epaisseur}mm` : '-'}
        </span>

        <span className="w-24 flex-shrink-0 text-sm font-bold text-amber-500">
          {priceM2 ? `${priceM2.toFixed(2)} €/${priceUnit}` : '-'}
        </span>

        <Package className={`flex-shrink-0 w-4 h-4 ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`} aria-hidden="true" />

        <SupplierBadge config={supplierConfig} size="sm" />

        {/* View details button */}
        {onViewDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(product.id);
            }}
            className="flex-shrink-0 p-1.5 text-[var(--cx-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded transition-all"
            title="Voir la fiche produit"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  );
}
