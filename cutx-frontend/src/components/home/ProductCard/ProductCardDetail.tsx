'use client';

import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SearchProduct } from '../types';
import ProductImage from './ProductImage';
import { TypeBadge, SupplierBadge, StockBadge } from './ProductBadges';
import { getTypeConfig, getSupplierConfig, calculatePanelPrice } from './config';

interface ProductCardDetailProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  isSponsored?: boolean;
  isDraggable?: boolean;
}

export default function ProductCardDetail({ product, onClick, isSponsored = false, isDraggable = false }: ProductCardDetailProps) {
  const t = useTranslations('home');

  const {
    nom,
    reference,
    refFabricant,
    marque,
    categorie,
    sousCategorie,
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
      className={`group relative w-full text-left bg-[var(--cx-surface-1)]/50 backdrop-blur-sm border border-[var(--cx-border)] rounded-2xl overflow-hidden transition-all duration-300 hover:bg-[var(--cx-surface-1)] hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 focus:outline-none focus:border-amber-500 cursor-pointer ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex gap-6 p-6">
        {/* Drag grip - before image when draggable */}
        {isDraggable && (
          <div className="flex-shrink-0 flex items-center justify-center w-6 text-neutral-500 hover:text-neutral-300 transition-colors self-center">
            <GripVertical className="w-6 h-6" />
          </div>
        )}
        <ProductImage imageUrl={imageUrl} alt={nom} size="lg" isSponsored={isSponsored} />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header: Type + Supplier + Stock */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <TypeBadge config={typeConfig} size="lg" />
              <SupplierBadge config={supplierConfig} size="lg" />
            </div>
            <StockBadge
              isInStock={isInStock}
              label={isInStock ? t('product.inStock') : t('product.onOrder')}
              size="lg"
            />
          </div>

          {/* Name */}
          <h3 className="text-xl font-bold text-[var(--cx-text)] mb-2 group-hover:text-amber-500 transition-colors">
            {nom}
          </h3>

          {/* Reference + Brand */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-sm bg-white/5 px-2 py-1 rounded">{refFabricant || reference}</span>
            {marque && <span className="text-sm text-[var(--cx-text-muted)]">• {marque}</span>}
          </div>

          {/* Category */}
          {(categorie || sousCategorie) && (
            <p className="text-sm text-[var(--cx-text-muted)] mb-4">
              {categorie}{sousCategorie ? ` › ${sousCategorie}` : ''}
            </p>
          )}

          {/* Specs grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {epaisseur && (
              <div className="flex flex-col px-3 py-2 bg-white/5 rounded-lg">
                <span className="text-xs text-[var(--cx-text-muted)]">{t('product.thickness')}</span>
                <span className="text-lg font-bold text-[var(--cx-text)]">{epaisseur}mm</span>
              </div>
            )}
            <div className="flex flex-col px-3 py-2 bg-white/5 rounded-lg">
              <span className="text-xs text-[var(--cx-text-muted)]">{t('product.dimensions')}</span>
              <span className="text-lg font-bold text-[var(--cx-text)]">{dimensions}</span>
            </div>
            {panelPrice && (
              <div className="flex flex-col px-3 py-2 bg-white/5 rounded-lg">
                <span className="text-xs text-[var(--cx-text-muted)]">Prix panneau</span>
                <span className="text-lg font-bold text-[var(--cx-text)]">{panelPrice.toFixed(0)} €</span>
              </div>
            )}
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--cx-border)]">
            {priceM2 && (
              <span className="text-2xl font-bold text-amber-500">
                {priceM2.toFixed(2)} €<span className="text-base font-normal text-[var(--cx-text-muted)]">/{priceUnit}</span>
              </span>
            )}
            <span className="text-sm text-[var(--cx-text-muted)] px-3 py-1.5 bg-amber-500/10 rounded-lg">
              Cliquer pour voir les options
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
