'use client';

import { useTranslations } from 'next-intl';
import { Package, ArrowLeft } from 'lucide-react';
import type { PanneauOptimise } from '@/lib/configurateur/optimiseur/types';

interface InfoPanneauSelectedProps {
  panneau: PanneauOptimise;
  chantNom?: string;       // Nom du chant associé (ex: "Egger U311 Bordeaux Rouge chants ABS")
  chantDimensions?: string; // Dimensions du chant (ex: "23 x EP 0.8")
  thumbnailUrl?: string;    // URL de l'image du panneau
  thumbnailColor?: string;  // Couleur de fallback si pas d'image
  onBackToConfig?: () => void; // Callback pour revenir au configurateur
}

export default function InfoPanneauSelected({
  panneau,
  chantNom,
  chantDimensions,
  thumbnailUrl,
  thumbnailColor = '#8b4513', // Marron par défaut
  onBackToConfig,
}: InfoPanneauSelectedProps) {
  const t = useTranslations('dialogs.optimizer');

  return (
    <div className="info-panneau-container">
      {/* Header */}
      <div className="info-header">
        <span className="info-label">{t('selectedPanel')}</span>
      </div>

      {/* Nom du panneau */}
      <h3 className="panneau-nom">{panneau.panneauNom}</h3>

      {/* Dimensions dans un cadre */}
      <div className="dimensions-box">
        <span className="dimensions-value">
          {panneau.dimensions.longueur} x {panneau.dimensions.largeur} x {panneau.dimensions.epaisseur}
        </span>
      </div>

      {/* Thumbnail / Couleur - Cliquable pour revenir au configurateur */}
      <button
        className={`thumbnail-button ${onBackToConfig ? 'clickable' : ''}`}
        onClick={onBackToConfig}
        disabled={!onBackToConfig}
        title={onBackToConfig ? 'Retour au configurateur' : undefined}
      >
        <div className="thumbnail-wrapper">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={panneau.panneauNom}
              className="thumbnail-img"
            />
          ) : (
            <div
              className="thumbnail-color"
              style={{ backgroundColor: thumbnailColor }}
            >
              <Package size={24} className="thumbnail-icon" />
            </div>
          )}
          {onBackToConfig && (
            <div className="thumbnail-overlay">
              <ArrowLeft size={20} />
              <span>Retour</span>
            </div>
          )}
        </div>
      </button>

      {/* Chant sélectionné */}
      {chantNom && (
        <div className="chant-section">
          <span className="chant-label">{t('matchingEdge')}</span>
          <p className="chant-nom">{chantNom}</p>
          {chantDimensions && (
            <div className="chant-dimensions-box">
              <span className="chant-dimensions">{chantDimensions}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="stats-section">
        <div className="stat-row">
          <span className="stat-label">{t('cutsPlaced')}</span>
          <span className="stat-value">{panneau.debitsPlaces.length}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">{t('usedSurface')}</span>
          <span className="stat-value">{panneau.surfaceUtilisee.toFixed(2)} m2</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">{t('waste')}</span>
          <span className="stat-value chute">{panneau.chute.toFixed(2)} m2</span>
        </div>
        <div className="stat-row highlight">
          <span className="stat-label">{t('fillRate')}</span>
          <span className="stat-value">{panneau.tauxRemplissage.toFixed(1)}%</span>
        </div>
      </div>

      <style jsx>{`
        .info-panneau-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 12px;
          min-width: 240px;
          max-width: 280px;
        }

        .info-header {
          text-align: center;
        }

        .info-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--admin-sable);
        }

        .panneau-nom {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--admin-sable);
          text-align: center;
          margin: 0;
          line-height: 1.4;
        }

        .dimensions-box {
          display: flex;
          justify-content: center;
          padding: 0.625rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
        }

        .dimensions-value {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          letter-spacing: 0.02em;
        }

        .thumbnail-button {
          display: flex;
          justify-content: center;
          background: none;
          border: none;
          padding: 0;
          cursor: default;
        }

        .thumbnail-button.clickable {
          cursor: pointer;
        }

        .thumbnail-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .thumbnail-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid var(--admin-border-default);
          transition: all 0.2s ease;
        }

        .thumbnail-color {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          border: 2px solid var(--admin-border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .thumbnail-color :global(.thumbnail-icon) {
          color: rgba(255, 255, 255, 0.5);
        }

        .thumbnail-overlay {
          position: absolute;
          inset: 0;
          background: rgba(139, 157, 81, 0.9);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s ease;
          color: white;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .thumbnail-button.clickable:hover .thumbnail-overlay {
          opacity: 1;
        }

        .thumbnail-button.clickable:hover .thumbnail-img,
        .thumbnail-button.clickable:hover .thumbnail-color {
          border-color: var(--admin-olive);
        }

        .chant-section {
          text-align: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--admin-border-subtle);
        }

        .chant-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--admin-text-muted);
        }

        .chant-nom {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--admin-sable);
          margin: 0.375rem 0;
          line-height: 1.3;
        }

        .chant-dimensions-box {
          display: inline-flex;
          padding: 0.375rem 0.75rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
        }

        .chant-dimensions {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--admin-text-secondary);
        }

        .stats-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--admin-border-subtle);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-row.highlight {
          padding-top: 0.5rem;
          border-top: 1px solid var(--admin-border-subtle);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .stat-value {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-text-primary);
        }

        .stat-value.chute {
          color: var(--admin-sable);
        }

        .stat-row.highlight .stat-value {
          color: var(--admin-olive);
        }
      `}</style>
    </div>
  );
}
