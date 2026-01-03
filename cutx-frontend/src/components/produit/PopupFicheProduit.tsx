'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Package,
  Ruler,
  Euro,
  CheckCircle2,
  Clock,
  Tag,
  Layers,
  Palette,
  Factory,
  ExternalLink,
  ShoppingCart,
  ImageIcon,
  Copy,
  Check,
} from 'lucide-react';

export interface PanelDetails {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  productType: string | null;
  material: string | null;
  finish: string | null;
  decor: string | null;
  colorCode: string | null;
  manufacturerRef: string | null;
  thickness: number[];
  defaultThickness: number | null;
  defaultWidth: number | null;
  defaultLength: number | null;
  isVariableLength: boolean;
  pricePerM2: number | null;
  pricePerMl: number | null;
  pricePerUnit: number | null;
  stockStatus: string | null;
  imageUrl: string | null;
  catalogue: {
    name: string;
    slug: string;
  };
  category: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
    };
  } | null;
}

interface PopupFicheProduitProps {
  open: boolean;
  panel: PanelDetails | null;
  onClose: () => void;
  onAddToConfigurator?: (panel: PanelDetails) => void;
}

// Mapping des types de produits vers des labels français
const productTypeLabels: Record<string, string> = {
  MELAMINE: 'Mélaminé',
  STRATIFIE: 'Stratifié',
  MDF: 'MDF',
  CONTREPLAQUE: 'Contreplaqué',
  PANNEAU_MASSIF: 'Panneau massif',
  BANDE_DE_CHANT: 'Bande de chant',
  COMPACT: 'Compact',
  OSB: 'OSB',
  PARTICULE: 'Panneau de particule',
  PLACAGE: 'Placage',
  PLAN_DE_TRAVAIL: 'Plan de travail',
  PANNEAU_DECORATIF: 'Panneau décoratif',
  PANNEAU_3_PLIS: 'Panneau 3 plis',
  SOLID_SURFACE: 'Solid Surface',
};

// Composant Image avec état de chargement
function ProductImage({ src, alt, size = 'large' }: { src: string | undefined; alt: string; size?: 'large' | 'small' }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const dimensions = size === 'large' ? { width: '100%', height: '280px' } : { width: '48px', height: '48px' };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: size === 'large' ? '12px' : '6px',
    overflow: 'hidden',
    border: '1px solid var(--admin-border-subtle)',
    background: 'var(--admin-bg-tertiary)',
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    opacity: isLoading ? 0 : 1,
    transition: 'opacity 0.3s ease',
  };

  const noImageStyle: React.CSSProperties = {
    ...containerStyle,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: 'var(--admin-text-muted)',
  };

  if (!src || hasError) {
    return (
      <div style={noImageStyle}>
        <ImageIcon size={size === 'large' ? 48 : 16} />
        {size === 'large' && <span style={{ fontSize: '0.875rem' }}>Image non disponible</span>}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--admin-bg-tertiary)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid var(--admin-border-subtle)',
            borderTopColor: 'var(--admin-olive)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        style={imageStyle}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

export default function PopupFicheProduit({
  open,
  panel,
  onClose,
  onAddToConfigurator,
}: PopupFicheProduitProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset copied state when panel changes
  useEffect(() => {
    setCopiedRef(false);
  }, [panel?.reference]);

  if (!open || !mounted || !panel) return null;

  // Formater le prix
  const formatPrice = () => {
    if (panel.pricePerM2) {
      return { value: `${panel.pricePerM2.toFixed(2)} €`, unit: '/ m²' };
    }
    if (panel.pricePerMl) {
      return { value: `${panel.pricePerMl.toFixed(2)} €`, unit: '/ ml' };
    }
    if (panel.pricePerUnit) {
      return { value: `${panel.pricePerUnit.toFixed(2)} €`, unit: '/ unité' };
    }
    return { value: 'Sur devis', unit: '' };
  };

  // Formater les dimensions
  const formatDimensions = () => {
    if (panel.defaultWidth && panel.defaultLength) {
      return `${panel.defaultWidth} × ${panel.defaultLength} mm`;
    }
    if (panel.defaultWidth) {
      return `Largeur: ${panel.defaultWidth} mm`;
    }
    return null;
  };

  // Formater les épaisseurs
  const formatThicknesses = () => {
    if (panel.thickness && panel.thickness.length > 0) {
      return panel.thickness.map(t => `${t}mm`).join(', ');
    }
    if (panel.defaultThickness) {
      return `${panel.defaultThickness}mm`;
    }
    return null;
  };

  // Déterminer le statut du stock
  const isInStock = panel.stockStatus?.toLowerCase().includes('stock');

  // Générer la description si manquante
  const getDescription = () => {
    if (panel.description) return panel.description;

    const type = productTypeLabels[panel.productType || ''] || panel.productType;
    const parts: string[] = [];

    if (type) parts.push(type);
    if (panel.decor) parts.push(`décor ${panel.decor}`);
    if (panel.manufacturerRef) parts.push(`(${panel.manufacturerRef})`);
    if (panel.defaultThickness) parts.push(`épaisseur ${panel.defaultThickness}mm`);
    if (panel.defaultWidth && panel.defaultLength) {
      parts.push(`format ${panel.defaultWidth}×${panel.defaultLength}mm`);
    }

    return parts.join(', ') || 'Panneau de qualité professionnelle';
  };

  // Breadcrumb / catégorie
  const getCategoryPath = () => {
    if (!panel.category) return null;
    if (panel.category.parent) {
      return `${panel.category.parent.name} > ${panel.category.name}`;
    }
    return panel.category.name;
  };

  const price = formatPrice();

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(panel.reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return createPortal(
    <div
      className="popup-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="popup-container"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--admin-bg-card, #1a1a1a)',
          border: '1px solid var(--admin-border-default, #333)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="popup-header">
          <div className="header-left">
            <div className="catalogue-badge">
              <Factory size={14} />
              <span>{panel.catalogue.name}</span>
            </div>
            {panel.productType && (
              <span className="type-badge">
                {productTypeLabels[panel.productType] || panel.productType}
              </span>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="popup-content">
          <div className="content-grid">
            {/* Left: Image */}
            <div className="image-section">
              <ProductImage src={panel.imageUrl || undefined} alt={panel.name} size="large" />
            </div>

            {/* Right: Info */}
            <div className="info-section">
              {/* Product Header */}
              <div className="product-header">
                <h2 className="product-name">{panel.name}</h2>
                <div className="reference-row">
                  <span className="reference-label">Réf:</span>
                  <span className="reference-value">{panel.reference}</span>
                  <button className="btn-copy" onClick={copyReference} title="Copier la référence">
                    {copiedRef ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                {getCategoryPath() && (
                  <span className="category-path">{getCategoryPath()}</span>
                )}
                <p className="description">{getDescription()}</p>
              </div>

              {/* Price & Stock */}
              <div className="price-stock-row">
                <div className="price-box">
                  <Euro size={20} />
                  <div className="price-info">
                    <span className="price-label">Prix</span>
                    <span className="price-value">
                      {price.value}
                      <span className="price-unit">{price.unit}</span>
                    </span>
                  </div>
                </div>

                <div className={`stock-box ${isInStock ? 'in-stock' : 'out-of-stock'}`}>
                  {isInStock ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  <div className="stock-info">
                    <span className="stock-label">Stock</span>
                    <span className="stock-value">{panel.stockStatus || 'Non spécifié'}</span>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div className="specifications">
                <h3 className="spec-title">
                  <Layers size={16} />
                  Caractéristiques
                </h3>
                <div className="spec-grid">
                  {panel.manufacturerRef && (
                    <div className="spec-item">
                      <Tag size={14} />
                      <div>
                        <span className="spec-label">Réf. fabricant</span>
                        <span className="spec-value">{panel.manufacturerRef}</span>
                      </div>
                    </div>
                  )}

                  {panel.decor && (
                    <div className="spec-item">
                      <Palette size={14} />
                      <div>
                        <span className="spec-label">Décor</span>
                        <span className="spec-value">{panel.decor}</span>
                      </div>
                    </div>
                  )}

                  {formatThicknesses() && (
                    <div className="spec-item">
                      <Ruler size={14} />
                      <div>
                        <span className="spec-label">Épaisseur(s)</span>
                        <span className="spec-value">{formatThicknesses()}</span>
                      </div>
                    </div>
                  )}

                  {formatDimensions() && (
                    <div className="spec-item">
                      <Ruler size={14} />
                      <div>
                        <span className="spec-label">Dimensions</span>
                        <span className="spec-value">{formatDimensions()}</span>
                      </div>
                    </div>
                  )}

                  {panel.material && (
                    <div className="spec-item">
                      <Package size={14} />
                      <div>
                        <span className="spec-label">Matériau</span>
                        <span className="spec-value">{panel.material}</span>
                      </div>
                    </div>
                  )}

                  {panel.finish && (
                    <div className="spec-item">
                      <Palette size={14} />
                      <div>
                        <span className="spec-label">Finition</span>
                        <span className="spec-value">{panel.finish}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="popup-footer">
          {onAddToConfigurator && (
            <button className="btn-primary" onClick={() => onAddToConfigurator(panel)}>
              <ShoppingCart size={18} />
              Utiliser ce panneau
            </button>
          )}

          <a
            href={`https://www.bcommebois.fr/catalogsearch/result/?q=${panel.manufacturerRef || panel.reference}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <ExternalLink size={18} />
            Voir sur B comme Bois
          </a>
        </div>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-tertiary);
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .catalogue-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0.375rem 0.75rem;
            background: var(--admin-bg-card);
            border: 1px solid var(--admin-border-default);
            border-radius: 20px;
            font-size: 0.8125rem;
            color: var(--admin-text-secondary);
          }

          .type-badge {
            display: inline-flex;
            padding: 0.25rem 0.625rem;
            background: var(--admin-olive-bg);
            border: 1px solid var(--admin-olive);
            color: var(--admin-olive);
            font-size: 0.6875rem;
            font-weight: 600;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .btn-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: transparent;
            border: none;
            border-radius: 8px;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-close:hover {
            background: var(--admin-status-danger-bg);
            color: var(--admin-status-danger);
          }

          .popup-content {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
          }

          .content-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 1.5rem;
          }

          @media (max-width: 700px) {
            .content-grid {
              grid-template-columns: 1fr;
            }
          }

          .image-section {
            position: relative;
          }

          .info-section {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .product-header {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .product-name {
            font-size: 1.375rem;
            font-weight: 700;
            color: var(--admin-text-primary);
            margin: 0;
            line-height: 1.3;
            font-family: 'Space Grotesk', var(--font-sans), sans-serif;
          }

          .reference-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .reference-label {
            font-size: 0.8125rem;
            color: var(--admin-text-muted);
          }

          .reference-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: var(--admin-olive);
            font-weight: 600;
          }

          .btn-copy {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: transparent;
            border: 1px solid var(--admin-border-default);
            border-radius: 4px;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-copy:hover {
            background: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
          }

          .category-path {
            font-size: 0.75rem;
            color: var(--admin-text-muted);
          }

          .description {
            font-size: 0.875rem;
            color: var(--admin-text-secondary);
            line-height: 1.5;
            margin: 0.5rem 0 0 0;
          }

          .price-stock-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }

          .price-box,
          .stock-box {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1rem;
            border-radius: 10px;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-subtle);
          }

          .price-box {
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
            border-color: rgba(212, 175, 55, 0.3);
          }

          .price-box :global(svg) {
            color: var(--admin-sable);
          }

          .stock-box.in-stock {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
            border-color: rgba(34, 197, 94, 0.3);
          }

          .stock-box.in-stock :global(svg) {
            color: #22c55e;
          }

          .stock-box.out-of-stock {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05));
            border-color: rgba(249, 115, 22, 0.3);
          }

          .stock-box.out-of-stock :global(svg) {
            color: #f97316;
          }

          .price-info,
          .stock-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .price-label,
          .stock-label {
            font-size: 0.6875rem;
            color: var(--admin-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .price-value {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--admin-sable);
            font-family: 'JetBrains Mono', monospace;
          }

          .price-unit {
            font-size: 0.75rem;
            font-weight: 400;
            margin-left: 2px;
            opacity: 0.8;
          }

          .stock-value {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--admin-text-primary);
          }

          .specifications {
            padding: 1rem;
            background: var(--admin-bg-tertiary);
            border-radius: 10px;
            border: 1px solid var(--admin-border-subtle);
          }

          .spec-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--admin-text-primary);
            margin: 0 0 0.875rem 0;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .spec-title :global(svg) {
            color: var(--admin-olive);
          }

          .spec-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
          }

          @media (max-width: 500px) {
            .spec-grid {
              grid-template-columns: 1fr;
            }
            .price-stock-row {
              grid-template-columns: 1fr;
            }
          }

          .spec-item {
            display: flex;
            align-items: flex-start;
            gap: 0.625rem;
            padding: 0.625rem;
            background: var(--admin-bg-card);
            border-radius: 6px;
            border: 1px solid var(--admin-border-subtle);
          }

          .spec-item :global(svg) {
            color: var(--admin-olive);
            flex-shrink: 0;
            margin-top: 2px;
          }

          .spec-item > div {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .spec-label {
            font-size: 0.6875rem;
            color: var(--admin-text-muted);
          }

          .spec-value {
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--admin-text-primary);
          }

          .popup-footer {
            display: flex;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
            border-top: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-tertiary);
          }

          @media (max-width: 500px) {
            .popup-footer {
              flex-direction: column;
            }
          }

          .btn-primary,
          .btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0.75rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            flex: 1;
          }

          .btn-primary {
            background: var(--admin-olive);
            color: white;
            border: none;
            box-shadow: 0 2px 8px rgba(128, 128, 0, 0.3);
          }

          .btn-primary:hover {
            background: var(--admin-olive-hover, #6b6b00);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(128, 128, 0, 0.4);
          }

          .btn-secondary {
            background: transparent;
            color: var(--admin-text-secondary);
            border: 1px solid var(--admin-border-default);
          }

          .btn-secondary:hover {
            background: var(--admin-bg-hover);
            border-color: var(--admin-border-hover);
            color: var(--admin-text-primary);
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
