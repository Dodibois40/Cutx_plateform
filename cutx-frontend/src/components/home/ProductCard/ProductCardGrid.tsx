'use client';

import { GripVertical, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SearchProduct } from '../types';
import ProductImage from './ProductImage';
import { TypeBadge, SupplierBadge, StockBadge } from './ProductBadges';
import { getTypeConfig, getSupplierConfig, calculatePanelPrice } from './config';

interface ProductCardGridProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  onViewDetails?: (productId: string) => void;
  isSponsored?: boolean;
  isDraggable?: boolean;
}

export default function ProductCardGrid({ product, onClick, onViewDetails, isSponsored = false, isDraggable = false }: ProductCardGridProps) {
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
      <div className="flex gap-4 p-4">
        {/* Drag grip - before image when draggable */}
        {isDraggable && (
          <div className="flex-shrink-0 flex items-center justify-center w-5 text-neutral-500 hover:text-neutral-300 transition-colors self-center">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
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
            {/* View details button */}
            {onViewDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(product.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--cx-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded-lg border border-transparent hover:border-amber-500/30 transition-all"
                title="Voir la fiche produit"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Détails</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
