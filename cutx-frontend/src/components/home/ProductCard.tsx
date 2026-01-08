'use client';

import Image from 'next/image';
import { ImageIcon, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SearchProduct } from './types';
import type { ViewMode } from './SearchResults';

interface ProductCardProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  isSponsored?: boolean;
  viewMode?: ViewMode;
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

// Supplier badge config - keys must match API catalogue.name values
const SUPPLIER_CONFIG: Record<string, { letter: string; color: string; title: string }> = {
  'Bouney': { letter: 'B', color: 'bg-sky-500/20 text-sky-400 border-sky-500/40', title: 'B comme Bois' },
  'Dispano': { letter: 'D', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', title: 'Dispano' },
};

export default function ProductCard({ product, onClick, isSponsored = false, viewMode = 'grid' }: ProductCardProps) {
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

  const typeConfig = productType ? PRODUCT_TYPE_CONFIG[productType] : null;
  const supplierConfig = fournisseur ? SUPPLIER_CONFIG[fournisseur] : null;
  const priceM2 = prixAchatM2 || prixMl;
  const priceUnit = prixAchatM2 ? 'm²' : prixMl ? 'ml' : '';
  const panelPrice = calculatePanelPrice(prixAchatM2, longueur, largeur);

  const dimensions = isVariableLength
    ? `Variable × ${largeur}`
    : `${longueur} × ${largeur}`;

  const isInStock = stock === 'EN STOCK';

  // ============ LIST VIEW (Compact) ============
  if (viewMode === 'list') {
    return (
      <button
        onClick={() => onClick(product)}
        className="group w-full text-left bg-[var(--cx-surface-1)]/30 border border-[var(--cx-border)] rounded-lg overflow-hidden transition-all duration-200 hover:bg-[var(--cx-surface-1)] hover:border-amber-500/50 focus:outline-none focus:border-amber-500"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          {/* Mini image - w-10 */}
          <div className="relative flex-shrink-0 w-10 h-10 bg-[var(--cx-surface-2)] rounded overflow-hidden">
            {imageUrl ? (
              <Image src={imageUrl} alt={nom} fill className="object-cover" sizes="40px" />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <ImageIcon className="w-4 h-4 text-[var(--cx-text-muted)]" />
              </div>
            )}
          </div>

          {/* Type badge - w-16 */}
          <div className="w-16 flex-shrink-0">
            {typeConfig && (
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold border rounded-full ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
            )}
          </div>

          {/* Name - flex-1 */}
          <span className="flex-1 min-w-0 text-sm font-medium text-[var(--cx-text)] truncate group-hover:text-amber-500 transition-colors">
            {nom}
          </span>

          {/* Ref - w-24 */}
          <span className="w-24 flex-shrink-0 font-mono text-xs text-[var(--cx-text-muted)] bg-white/5 px-1.5 py-0.5 rounded truncate">
            {refFabricant || reference}
          </span>

          {/* Dimensions - w-24 */}
          <span className="w-24 flex-shrink-0 text-xs text-[var(--cx-text-muted)]">
            {dimensions}
          </span>

          {/* Thickness - w-16 */}
          <span className="w-16 flex-shrink-0 text-xs font-bold text-[var(--cx-text)]">
            {epaisseur ? `${epaisseur}mm` : '-'}
          </span>

          {/* Price - w-24 */}
          <span className="w-24 flex-shrink-0 text-sm font-bold text-amber-500">
            {priceM2 ? `${priceM2.toFixed(2)} €/${priceUnit}` : '-'}
          </span>

          {/* Stock indicator - w-4 */}
          <Package className={`flex-shrink-0 w-4 h-4 ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`} />

          {/* Supplier badge - w-6 */}
          {supplierConfig && (
            <span
              className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-[10px] font-bold border rounded ${supplierConfig.color}`}
              title={supplierConfig.title}
            >
              {supplierConfig.letter}
            </span>
          )}
        </div>
      </button>
    );
  }

  // ============ DETAIL VIEW (Large) ============
  if (viewMode === 'detail') {
    return (
      <button
        onClick={() => onClick(product)}
        className="group w-full text-left bg-[var(--cx-surface-1)]/50 backdrop-blur-sm border border-[var(--cx-border)] rounded-2xl overflow-hidden transition-all duration-300 hover:bg-[var(--cx-surface-1)] hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 focus:outline-none focus:border-amber-500"
      >
        <div className="flex gap-6 p-6">
          {/* Large image */}
          <div className="relative flex-shrink-0 w-48 h-48 bg-[var(--cx-surface-2)] rounded-xl overflow-hidden">
            {imageUrl ? (
              <Image src={imageUrl} alt={nom} fill className="object-cover" sizes="192px" />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <ImageIcon className="w-16 h-16 text-[var(--cx-text-muted)]" />
              </div>
            )}
            {isSponsored && (
              <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-amber-500 text-black rounded-md">
                Sponsorisé
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Header row: Type + Supplier + Stock */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {typeConfig && (
                  <span className={`px-3 py-1.5 text-sm font-semibold border rounded-full ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                )}
                {supplierConfig && (
                  <span
                    className={`w-7 h-7 flex items-center justify-center text-xs font-bold border rounded ${supplierConfig.color}`}
                    title={supplierConfig.title}
                  >
                    {supplierConfig.letter}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Package className={`w-4 h-4 ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className={`text-sm font-medium ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {isInStock ? t('product.inStock') : t('product.onOrder')}
                </span>
              </div>
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

            {/* Category info */}
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
      </button>
    );
  }

  // ============ GRID VIEW (Default - 2 columns) ============
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
          {/* Header row: Type + Supplier + Stock */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {typeConfig && (
                <span className={`px-2.5 py-1 text-xs font-semibold border rounded-full ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
              )}
              {supplierConfig && (
                <span
                  className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold border rounded ${supplierConfig.color}`}
                  title={supplierConfig.title}
                >
                  {supplierConfig.letter}
                </span>
              )}
            </div>
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
