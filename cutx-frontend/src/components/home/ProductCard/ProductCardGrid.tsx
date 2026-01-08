'use client';

import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SearchProduct } from '../types';
import ProductImage from './ProductImage';
import { TypeBadge, SupplierBadge, StockBadge } from './ProductBadges';
import { getTypeConfig, getSupplierConfig, calculatePanelPrice } from './config';

interface ProductCardGridProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  isSponsored?: boolean;
  isDraggable?: boolean;
}

export default function ProductCardGrid({ product, onClick, isSponsored = false, isDraggable = false }: ProductCardGridProps) {
  const t = useTranslations('home');

  const {
    nom,
    reference,
    refFabricant,
    marque,
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
  const panelPrice = calculatePanelPrice(prixAchatM2, longueur, largeur);
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
      className={`group relative w-full text-left bg-[var(--cx-surface-1)]/50 backdrop-blur-sm border border-[var(--cx-border)] rounded-xl overflow-hidden transition-all duration-300 hover:bg-[var(--cx-surface-1)] hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 focus:outline-none focus:border-amber-500 cursor-pointer ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Drag indicator when draggable */}
      {isDraggable && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-neutral-700/90 rounded text-neutral-300 text-[10px] font-medium border border-neutral-600">
          <GripVertical className="w-3 h-3" />
          <span>Glisser</span>
        </div>
      )}
      <div className="flex gap-4 p-4">
        <ProductImage imageUrl={imageUrl} alt={nom} size="md" isSponsored={isSponsored} />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header: Type + Supplier + Stock */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <TypeBadge config={typeConfig} size="md" />
              <SupplierBadge config={supplierConfig} size="md" />
            </div>
            <StockBadge
              isInStock={isInStock}
              label={isInStock ? t('product.inStock') : t('product.onOrder')}
              size="md"
            />
          </div>

          {/* Name */}
          <h3 className="text-base font-semibold text-[var(--cx-text)] truncate mb-1 group-hover:text-amber-500 transition-colors">
            {nom}
          </h3>

          {/* Reference */}
          <p className="text-sm text-[var(--cx-text-muted)] mb-3">
            <span className="font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">{refFabricant || reference}</span>
            {marque && <span className="ml-2 text-[var(--cx-text-muted)]/70">• {marque}</span>}
          </p>

          {/* Specs row */}
          <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
            {epaisseur && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md">
                <span className="text-[var(--cx-text-muted)] text-xs">{t('product.thickness')}</span>
                <span className="font-bold text-[var(--cx-text)]">{epaisseur}mm</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md">
              <span className="text-[var(--cx-text-muted)] text-xs">{t('product.dimensions')}</span>
              <span className="font-bold text-[var(--cx-text)]">{dimensions}</span>
            </div>
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--cx-border)]">
            <div className="flex items-baseline gap-3">
              {priceM2 && (
                <span className="text-lg font-bold text-amber-500">
                  {priceM2.toFixed(2)} €<span className="text-sm font-normal text-[var(--cx-text-muted)]">/{priceUnit}</span>
                </span>
              )}
              {panelPrice && (
                <span className="text-sm text-[var(--cx-text-muted)]">
                  ({panelPrice.toFixed(0)} €/panneau)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
