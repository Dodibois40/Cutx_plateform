'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  ImageIcon,
  Droplets,
  Flame,
  Layers,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Ruler,
  Tag,
  Factory,
  Palette,
  Package,
  Grid3X3,
  Shield,
  PackageCheck,
  Square,
  Euro,
  Scale,
} from 'lucide-react';
import type { SearchProduct } from '../types';

// Full panel details from API
interface PanelDetails {
  id: string;
  reference: string;
  name: string;
  description?: string | null;
  manufacturerRef?: string | null;

  // Classification
  productType?: string | null;
  panelType?: string | null;
  panelSubType?: string | null;
  productCategory?: string | null;

  // Decor
  decorCode?: string | null;
  decorName?: string | null;
  decorCategory?: string | null;
  decorSubCategory?: string | null;
  decor?: string | null;

  // Finish
  finish?: string | null;
  finishCode?: string | null;
  finishName?: string | null;

  // Core
  coreType?: string | null;
  coreColor?: string | null;
  material?: string | null;

  // Wood specific
  grainDirection?: string | null;
  lamellaType?: string | null;

  // Technical
  isHydrofuge?: boolean;
  isIgnifuge?: boolean;
  isPreglued?: boolean;
  isSynchronized?: boolean;
  isFullRoll?: boolean;

  // Dimensions
  defaultLength?: number | null;
  defaultWidth?: number | null;
  defaultThickness?: number | null;
  thickness?: number[];
  isVariableLength?: boolean;

  // Pricing
  pricePerM2?: number | null;
  pricePerMl?: number | null;
  pricePerUnit?: number | null;
  pricePerPanel?: number | null;

  // Media & Stock
  imageUrl?: string | null;
  stockStatus?: string | null;

  // Brand
  manufacturer?: string | null;
  colorCode?: string | null;
  supportQuality?: string | null;
  certification?: string | null;

  // Relations
  catalogue?: { id: string; name: string; slug: string } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string } | null;
  } | null;
}

interface RelatedPanel {
  id: string;
  reference: string;
  name: string;
  panelType?: string | null;
  panelSubType?: string | null;
  defaultThickness?: number | null;
  pricePerM2?: number | null;
  pricePerMl?: number | null;
  imageUrl?: string | null;
  manufacturer?: string | null;
  catalogue?: { name: string } | null;
}

interface ProductDetailModalProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onSelectProduct?: (product: SearchProduct) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProductDetailModal({
  open,
  productId,
  onClose,
  onSelectProduct,
}: ProductDetailModalProps) {
  const [details, setDetails] = useState<PanelDetails | null>(null);
  const [related, setRelated] = useState<RelatedPanel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch panel details
  useEffect(() => {
    if (!open || !productId) {
      setDetails(null);
      setRelated([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_URL}/api/panels/${productId}`).then((r) => r.json()),
      fetch(`${API_URL}/api/panels/${productId}/related`).then((r) => r.json()),
    ])
      .then(([panelData, relatedData]) => {
        setDetails(panelData);
        setRelated(Array.isArray(relatedData) ? relatedData : []);
      })
      .catch((err) => {
        console.error('Error fetching panel details:', err);
        setError('Impossible de charger les détails du produit');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, productId]);

  // Get display reference - for stratifiés/panneaux, show decorCode first
  const getDisplayRef = (panel: PanelDetails) => {
    // If decorCode exists and is a valid code (like U9631, H1180), use it
    if (panel.decorCode && /^[A-Z]\d{3,4}/.test(panel.decorCode)) {
      return panel.decorCode;
    }
    // Otherwise use manufacturerRef if it's not generic like "PANNEAUX"
    if (panel.manufacturerRef && !['PANNEAUX', 'PANNEAU'].includes(panel.manufacturerRef.toUpperCase())) {
      return panel.manufacturerRef;
    }
    // Fallback to reference
    return panel.reference;
  };

  const handleCopyRef = () => {
    if (details) {
      const refToCopy = getDisplayRef(details);
      navigator.clipboard.writeText(refToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  // Format price
  const formatPrice = (panel: PanelDetails | RelatedPanel) => {
    if (panel.pricePerM2) return `${panel.pricePerM2.toFixed(2)} €/m²`;
    if (panel.pricePerMl) return `${panel.pricePerMl.toFixed(2)} €/ml`;
    return null;
  };

  // Format dimensions
  const formatDimensions = (panel: PanelDetails) => {
    const parts = [];
    if (panel.defaultLength) parts.push(`${panel.defaultLength}`);
    if (panel.defaultWidth) parts.push(`${panel.defaultWidth}`);
    if (parts.length === 0) return null;
    return parts.join(' × ') + ' mm';
  };

  // Get type label
  const getTypeLabel = (type?: string | null) => {
    const labels: Record<string, string> = {
      MELAMINE: 'Mélaminé',
      STRATIFIE: 'Stratifié',
      COMPACT: 'Compact',
      MDF: 'MDF',
      CONTREPLAQUE: 'Contreplaqué',
      OSB: 'OSB',
      MASSIF: 'Bois Massif',
      CHANT: 'Chant',
      PLACAGE: 'Placage',
      SOLID_SURFACE: 'Solid Surface',
      BANDE_DE_CHANT: 'Chant',
      PANNEAU_MASSIF: 'Massif',
    };
    return type ? labels[type] || type : null;
  };

  // Get decor category label
  const getDecorLabel = (cat?: string | null) => {
    const labels: Record<string, string> = {
      UNIS: 'Unis',
      BOIS: 'Bois',
      PIERRE: 'Pierre',
      BETON: 'Béton',
      METAL: 'Métal',
      TEXTILE: 'Textile',
      FANTAISIE: 'Fantaisie',
      SANS_DECOR: 'Sans décor',
    };
    return cat ? labels[cat] || cat : null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="relative w-full max-w-4xl max-h-full bg-[#1c1b1a] border border-neutral-700 rounded-xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">Fiche produit</h2>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-20 text-red-400">
                {error}
              </div>
            )}

            {details && !isLoading && (
              <div className="space-y-6">
                {/* Top section - Image + Info */}
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="flex-shrink-0 w-48 h-48 bg-neutral-800 rounded-xl overflow-hidden">
                    {details.imageUrl ? (
                      <Image
                        src={details.imageUrl}
                        alt={details.name}
                        width={192}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <ImageIcon className="w-12 h-12 text-neutral-600" />
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {details.name}
                    </h3>

                    {/* Reference with copy */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-mono text-amber-500">
                        {getDisplayRef(details)}
                      </span>
                      <button
                        onClick={handleCopyRef}
                        className="p-1 text-neutral-500 hover:text-amber-500 transition-colors"
                        title="Copier la référence"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Type badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getTypeLabel(details.panelType || details.productType) && (
                        <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                          {getTypeLabel(details.panelType || details.productType)}
                        </span>
                      )}
                      {details.panelSubType && (
                        <span className="px-2 py-1 text-xs font-medium bg-neutral-700 text-neutral-300 rounded">
                          {details.panelSubType}
                        </span>
                      )}
                      {getDecorLabel(details.decorCategory) && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                          {getDecorLabel(details.decorCategory)}
                        </span>
                      )}
                    </div>

                    {/* Technical badges */}
                    <div className="flex flex-wrap gap-2">
                      {details.isHydrofuge && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded">
                          <Droplets className="w-3 h-3" /> Hydrofuge
                        </span>
                      )}
                      {details.isIgnifuge && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded">
                          <Flame className="w-3 h-3" /> Ignifugé
                        </span>
                      )}
                      {details.isSynchronized && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/10 text-purple-400 rounded">
                          <Layers className="w-3 h-3" /> Synchronisé
                        </span>
                      )}
                      {details.isPreglued && (
                        <span className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded">
                          Pré-encollé
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price box */}
                  <div className="flex-shrink-0 text-right">
                    {formatPrice(details) && (
                      <div className="text-2xl font-bold text-amber-500">
                        {formatPrice(details)}
                      </div>
                    )}
                    {details.catalogue && (
                      <div className="text-sm text-neutral-500 mt-1">
                        {details.catalogue.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Dimensions */}
                  {formatDimensions(details) && (
                    <DetailCard
                      icon={<Ruler className="w-4 h-4" />}
                      label="Dimensions"
                      value={formatDimensions(details)!}
                    />
                  )}

                  {/* Thickness */}
                  {details.defaultThickness && (
                    <DetailCard
                      icon={<Layers className="w-4 h-4" />}
                      label="Épaisseur"
                      value={`${details.defaultThickness} mm`}
                      subValue={
                        details.thickness && details.thickness.length > 1
                          ? `Dispo: ${details.thickness.join(', ')} mm`
                          : undefined
                      }
                    />
                  )}

                  {/* Decor */}
                  {(details.decorCode || details.decorName) && (
                    <DetailCard
                      icon={<Palette className="w-4 h-4" />}
                      label="Décor"
                      value={details.decorName || details.decorCode || ''}
                      subValue={details.decorCode ? `Code: ${details.decorCode}` : undefined}
                    />
                  )}

                  {/* Finish */}
                  {(details.finishCode || details.finish) && (
                    <DetailCard
                      icon={<Grid3X3 className="w-4 h-4" />}
                      label="Finition"
                      value={details.finishName || details.finish || details.finishCode || ''}
                      subValue={details.finishCode ? `Code: ${details.finishCode}` : undefined}
                    />
                  )}

                  {/* Manufacturer */}
                  {details.manufacturer && (
                    <DetailCard
                      icon={<Factory className="w-4 h-4" />}
                      label="Fabricant"
                      value={details.manufacturer}
                    />
                  )}

                  {/* Core type */}
                  {details.coreType && (
                    <DetailCard
                      icon={<Package className="w-4 h-4" />}
                      label="Support"
                      value={details.coreType}
                    />
                  )}

                  {/* Category */}
                  {details.category && (
                    <DetailCard
                      icon={<Tag className="w-4 h-4" />}
                      label="Catégorie"
                      value={details.category.name}
                      subValue={details.category.parent?.name}
                    />
                  )}

                  {/* Grain direction */}
                  {details.grainDirection && details.grainDirection !== 'NONE' && (
                    <DetailCard
                      icon={<ArrowRight className="w-4 h-4" />}
                      label="Sens du fil"
                      value={details.grainDirection === 'LENGTH' ? 'Longueur' : 'Largeur'}
                    />
                  )}

                  {/* Support Quality */}
                  {details.supportQuality && (
                    <DetailCard
                      icon={<Shield className="w-4 h-4" />}
                      label="Qualité support"
                      value={details.supportQuality}
                    />
                  )}

                  {/* Stock Status */}
                  {details.stockStatus && (
                    <DetailCard
                      icon={<PackageCheck className="w-4 h-4" />}
                      label="Stock"
                      value={details.stockStatus}
                    />
                  )}

                  {/* Surface (m²) */}
                  {details.defaultLength && details.defaultWidth && details.defaultLength > 100 && (
                    <DetailCard
                      icon={<Square className="w-4 h-4" />}
                      label="Surface"
                      value={`${((details.defaultLength / 1000) * (details.defaultWidth / 1000)).toFixed(2)} m²`}
                    />
                  )}

                  {/* Panel Price */}
                  {(details.pricePerPanel || (details.pricePerM2 && details.defaultLength && details.defaultWidth)) && (
                    <DetailCard
                      icon={<Euro className="w-4 h-4" />}
                      label="Prix panneau"
                      value={
                        details.pricePerPanel
                          ? `${details.pricePerPanel.toFixed(2)} €`
                          : details.pricePerM2 && details.defaultLength && details.defaultWidth
                            ? `${(details.pricePerM2 * (details.defaultLength / 1000) * (details.defaultWidth / 1000)).toFixed(2)} €`
                            : ''
                      }
                    />
                  )}

                  {/* Weight (calculated) */}
                  {details.defaultLength && details.defaultWidth && details.defaultThickness && details.defaultLength > 100 && (() => {
                    // Densities by panel type (kg/m³)
                    const densities: Record<string, number> = {
                      COMPACT: 1350,           // HPL compact (corrigé de 1400)
                      STRATIFIE: 1400,
                      MDF: 750,
                      MELAMINE: 650,
                      AGGLO_BRUT: 650,
                      CONTREPLAQUE: 550,
                      OSB: 600,
                      MASSIF: 700,
                      PLACAGE: 600,
                      SOLID_SURFACE: 1680,     // Corian, Kerrock, HI-MACS
                      PLAN_DE_TRAVAIL: 1680,   // Plans de travail (souvent solid surface)
                    };
                    const density = densities[details.productType || ''] || 650;
                    const weight = (details.defaultLength / 1000) * (details.defaultWidth / 1000) * (details.defaultThickness / 1000) * density;
                    return weight > 0.5 ? (
                      <DetailCard
                        icon={<Scale className="w-4 h-4" />}
                        label="Poids estimé"
                        value={`${weight.toFixed(1)} kg`}
                      />
                    ) : null;
                  })()}
                </div>

                {/* Related products - grouped by type */}
                {related.length > 0 && (() => {
                  // Group products by category
                  const grouped = {
                    chants: related.filter(p =>
                      p.panelType === 'CHANT' ||
                      p.panelType === 'BANDE_DE_CHANT' ||
                      p.name?.toLowerCase().includes('chant')
                    ),
                    stratifies: related.filter(p =>
                      p.panelType === 'STRATIFIE' &&
                      !p.name?.toLowerCase().includes('chant')
                    ),
                    panneaux: related.filter(p =>
                      p.panelType !== 'CHANT' &&
                      p.panelType !== 'BANDE_DE_CHANT' &&
                      p.panelType !== 'STRATIFIE' &&
                      !p.name?.toLowerCase().includes('chant')
                    ),
                  };

                  const renderProductCard = (panel: RelatedPanel) => (
                    <button
                      key={panel.id}
                      onClick={() => {
                        onClose();
                      }}
                      className="flex items-center gap-2 p-2 bg-neutral-800/50 border border-neutral-700 rounded-lg hover:border-amber-500/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-neutral-700 rounded overflow-hidden flex-shrink-0">
                        {panel.imageUrl ? (
                          <Image
                            src={panel.imageUrl}
                            alt={panel.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ImageIcon className="w-4 h-4 text-neutral-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          {getTypeLabel(panel.panelType)}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {panel.defaultThickness}mm
                          {formatPrice(panel) && ` • ${formatPrice(panel)}`}
                        </div>
                      </div>
                    </button>
                  );

                  return (
                    <div className="pt-4 border-t border-neutral-700">
                      <h4 className="text-sm font-medium text-neutral-400 mb-3">
                        Produits coordonnés ({related.length})
                      </h4>

                      <div className="space-y-4">
                        {/* Chants */}
                        {grouped.chants.length > 0 && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">
                              Chants ({grouped.chants.length})
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {grouped.chants.map(renderProductCard)}
                            </div>
                          </div>
                        )}

                        {/* Panneaux */}
                        {grouped.panneaux.length > 0 && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">
                              Panneaux ({grouped.panneaux.length})
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {grouped.panneaux.map(renderProductCard)}
                            </div>
                          </div>
                        )}

                        {/* Stratifiés */}
                        {grouped.stratifies.length > 0 && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">
                              Stratifiés ({grouped.stratifies.length})
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {grouped.stratifies.map(renderProductCard)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Description */}
                {details.description && (
                  <div className="pt-4 border-t border-neutral-700">
                    <h4 className="text-sm font-medium text-neutral-400 mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-neutral-300">{details.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {details && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-700 bg-neutral-800/50 flex-shrink-0">
              <div className="text-xs text-neutral-500">
                Réf: {details.reference}
              </div>
              <div className="flex items-center gap-2">
                {details.catalogue?.slug && (
                  <a
                    href={`https://www.bcommebois.fr/catalogsearch/result/?q=${encodeURIComponent(details.manufacturerRef || details.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-white border border-neutral-600 rounded-lg hover:border-neutral-500 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir chez le fournisseur
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Detail card component
function DetailCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg">
      <div className="flex items-center gap-2 text-neutral-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-medium text-white">{value}</div>
      {subValue && <div className="text-xs text-neutral-500 mt-0.5">{subValue}</div>}
    </div>
  );
}
