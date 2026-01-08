'use client';

import Image from 'next/image';
import { ImageIcon, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SearchProduct } from './types';

interface ProductCardProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  isSponsored?: boolean;
}

// Product type labels with colors
const PRODUCT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  MELAMINE: { label: 'Mélaminé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  STRATIFIE: { label: 'Stratifié', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  MDF: { label: 'MDF', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  BANDE_DE_CHANT: { label: 'Chant', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  COMPACT: { label: 'Compact', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  CONTREPLAQUE: { label: 'CP', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  PARTICULE: { label: 'Agglo', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PLACAGE: { label: 'Placage', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  OSB: { label: 'OSB', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
  PANNEAU_MASSIF: { label: 'Massif', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

// Calculate panel price from m2 price and dimensions
function calculatePanelPrice(
  priceM2: number | null | undefined,
  length: number | string | undefined,
  width: number | undefined
): number | null {
  if (!priceM2 || !length || !width) return null;
  const l = typeof length === 'string' ? 0 : length;
  if (l === 0) return null;
  const surfaceM2 = (l * width) / 1_000_000;
  return Math.round(priceM2 * surfaceM2 * 100) / 100;
}

export default function ProductCard({ product, onClick, isSponsored = false }: ProductCardProps) {
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
  } = product;

  const typeConfig = productType ? PRODUCT_TYPE_CONFIG[productType] : null;
  const priceM2 = prixAchatM2 || prixMl;
  const priceUnit = prixAchatM2 ? 'm²' : prixMl ? 'ml' : '';
  const panelPrice = calculatePanelPrice(prixAchatM2, longueur, largeur);

  const dimensions = isVariableLength
    ? `Variable × ${largeur}`
    : `${longueur} × ${largeur}`;

  const isInStock = stock === 'EN STOCK';

  return (
    <button
      onClick={() => onClick(product)}
      className="group w-full text-left bg-[var(--cx-surface-1)]/50 backdrop-blur-sm border border-[var(--cx-border)] rounded-xl overflow-hidden transition-all duration-300 hover:bg-[var(--cx-surface-1)] hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 focus:outline-none focus:border-amber-500"
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="relative flex-shrink-0 w-24 h-24 bg-[var(--cx-surface-2)] rounded-lg overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={nom}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <ImageIcon className="w-8 h-8 text-[var(--cx-text-muted)]" />
            </div>
          )}
          {isSponsored && (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500 text-black rounded">
              Sponsorisé
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header row: Type + Stock */}
          <div className="flex items-center justify-between gap-2 mb-2">
            {typeConfig && (
              <span className={`px-2.5 py-1 text-xs font-semibold border rounded-full ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Package className={`w-3.5 h-3.5 ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className={`text-xs font-medium ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`}>
                {isInStock ? t('product.inStock') : t('product.onOrder')}
              </span>
            </div>
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
    </button>
  );
}
