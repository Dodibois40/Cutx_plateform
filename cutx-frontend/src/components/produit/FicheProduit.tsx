'use client';

import { useState } from 'react';
import {
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
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import styles from './FicheProduit.module.css';

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

interface FicheProduitProps {
  panel: PanelDetails;
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

export default function FicheProduit({ panel }: FicheProduitProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Formater le prix
  const formatPrice = () => {
    if (panel.pricePerM2) {
      return `${panel.pricePerM2.toFixed(2)} € / m²`;
    }
    if (panel.pricePerMl) {
      return `${panel.pricePerMl.toFixed(2)} € / ml`;
    }
    if (panel.pricePerUnit) {
      return `${panel.pricePerUnit.toFixed(2)} € / unité`;
    }
    return 'Sur devis';
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
      return panel.thickness.map(t => `${t} mm`).join(', ');
    }
    if (panel.defaultThickness) {
      return `${panel.defaultThickness} mm`;
    }
    return null;
  };

  // Déterminer le statut du stock
  const isInStock = panel.stockStatus?.toLowerCase().includes('stock');

  // Générer la description si manquante
  const getDescription = () => {
    if (panel.description) return panel.description;

    // Générer une description basique
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

  return (
    <div className={styles.container}>
      {/* Header avec retour */}
      <div className={styles.header}>
        <Link href="/configurateur" className={styles.backLink}>
          <ChevronLeft size={20} />
          Retour au configurateur
        </Link>
      </div>

      {/* Contenu principal */}
      <div className={styles.content}>
        {/* Colonne gauche - Image */}
        <div className={styles.imageSection}>
          <div className={styles.imageContainer}>
            {panel.imageUrl && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className={styles.imagePlaceholder}>
                    <Package size={48} />
                  </div>
                )}
                <img
                  src={panel.imageUrl}
                  alt={panel.name}
                  className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              </>
            ) : (
              <div className={styles.noImage}>
                <Package size={64} />
                <span>Image non disponible</span>
              </div>
            )}
          </div>

          {/* Badge catalogue */}
          <div className={styles.catalogueBadge}>
            <Factory size={14} />
            {panel.catalogue.name}
          </div>
        </div>

        {/* Colonne droite - Informations */}
        <div className={styles.infoSection}>
          {/* En-tête produit */}
          <div className={styles.productHeader}>
            <div className={styles.badges}>
              {panel.productType && (
                <span className={styles.typeBadge}>
                  {productTypeLabels[panel.productType] || panel.productType}
                </span>
              )}
              {getCategoryPath() && (
                <span className={styles.categoryBadge}>
                  {getCategoryPath()}
                </span>
              )}
            </div>

            <h1 className={styles.productName}>{panel.name}</h1>
            <p className={styles.reference}>Réf: {panel.reference}</p>

            <p className={styles.description}>{getDescription()}</p>
          </div>

          {/* Prix et stock */}
          <div className={styles.priceStock}>
            <div className={styles.priceBox}>
              <Euro size={24} />
              <div className={styles.priceInfo}>
                <span className={styles.priceLabel}>Prix</span>
                <span className={styles.priceValue}>{formatPrice()}</span>
              </div>
            </div>

            <div className={`${styles.stockBox} ${isInStock ? styles.inStock : styles.outOfStock}`}>
              {isInStock ? <CheckCircle2 size={24} /> : <Clock size={24} />}
              <div className={styles.stockInfo}>
                <span className={styles.stockLabel}>Disponibilité</span>
                <span className={styles.stockValue}>{panel.stockStatus || 'Non spécifié'}</span>
              </div>
            </div>
          </div>

          {/* Caractéristiques techniques */}
          <div className={styles.specifications}>
            <h2 className={styles.sectionTitle}>
              <Layers size={20} />
              Caractéristiques techniques
            </h2>

            <div className={styles.specGrid}>
              {panel.manufacturerRef && (
                <div className={styles.specItem}>
                  <Tag size={16} />
                  <div>
                    <span className={styles.specLabel}>Réf. fabricant</span>
                    <span className={styles.specValue}>{panel.manufacturerRef}</span>
                  </div>
                </div>
              )}

              {panel.decor && (
                <div className={styles.specItem}>
                  <Palette size={16} />
                  <div>
                    <span className={styles.specLabel}>Décor</span>
                    <span className={styles.specValue}>{panel.decor}</span>
                  </div>
                </div>
              )}

              {formatThicknesses() && (
                <div className={styles.specItem}>
                  <Ruler size={16} />
                  <div>
                    <span className={styles.specLabel}>Épaisseur(s)</span>
                    <span className={styles.specValue}>{formatThicknesses()}</span>
                  </div>
                </div>
              )}

              {formatDimensions() && (
                <div className={styles.specItem}>
                  <Ruler size={16} />
                  <div>
                    <span className={styles.specLabel}>Dimensions</span>
                    <span className={styles.specValue}>{formatDimensions()}</span>
                  </div>
                </div>
              )}

              {panel.material && (
                <div className={styles.specItem}>
                  <Package size={16} />
                  <div>
                    <span className={styles.specLabel}>Matériau</span>
                    <span className={styles.specValue}>{panel.material}</span>
                  </div>
                </div>
              )}

              {panel.finish && (
                <div className={styles.specItem}>
                  <Palette size={16} />
                  <div>
                    <span className={styles.specLabel}>Finition</span>
                    <span className={styles.specValue}>{panel.finish}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className={styles.primaryButton}>
              <ShoppingCart size={20} />
              Ajouter au configurateur
            </button>

            <a
              href={`https://www.bcommebois.fr/catalogsearch/result/?q=${panel.manufacturerRef || panel.reference}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryButton}
            >
              <ExternalLink size={20} />
              Voir sur le site fournisseur
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
