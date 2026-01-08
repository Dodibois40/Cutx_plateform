'use client';

import { Package, GripVertical } from 'lucide-react';
import type { SearchProduct } from '../types';
import ProductImage from './ProductImage';
import { TypeBadge, SupplierBadge } from './ProductBadges';
import { getTypeConfig, getSupplierConfig } from './config';

interface ProductCardListProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  isDraggable?: boolean;
}

export default function ProductCardList({ product, onClick, isDraggable = false }: ProductCardListProps) {
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
      {/* Drag indicator when draggable */}
      {isDraggable && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-neutral-700/90 rounded text-neutral-300 text-[9px] font-medium border border-neutral-600">
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className="flex items-center gap-3 px-3 py-2">
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
      </div>
    </article>
  );
}
