'use client';

import { useState, useRef } from 'react';
import { ChevronRight, Copy, Trash2, GripVertical, MoreVertical } from 'lucide-react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import { ETAT_INDICATEURS, FINITIONS, BRILLANCES } from '@/lib/configurateur/constants';
import { getEtatLigne, formaterPrix, getNombreChampsRemplis } from '@/lib/configurateur/calculs';

interface MobileLineCardProps {
  ligne: LignePrestationV3;
  index: number;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export default function MobileLineCard({
  ligne,
  index,
  onEdit,
  onCopy,
  onDelete,
  canDelete,
}: MobileLineCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const etat = getEtatLigne(ligne);
  const indicateur = ETAT_INDICATEURS[etat];
  const progression = getNombreChampsRemplis(ligne);

  // Labels pour l'affichage
  const finitionLabel = ligne.finition ? FINITIONS.find(f => f.value === ligne.finition)?.label : null;
  const brillanceLabel = ligne.brillance ? BRILLANCES.find(b => b.value === ligne.brillance)?.label : null;

  // Couleur à afficher
  const couleurDisplay = ligne.finition === 'laque'
    ? ligne.codeCouleurLaque
    : ligne.teinte;

  // Dimensions formatées
  const dimensionsDisplay = ligne.dimensions.longueur > 0 && ligne.dimensions.largeur > 0
    ? `${ligne.dimensions.longueur} × ${ligne.dimensions.largeur} mm`
    : null;

  // Résumé inline des caractéristiques
  const resumeParts = [
    ligne.materiau,
    finitionLabel,
    brillanceLabel,
  ].filter(Boolean);

  // Gestion du swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    // Limiter le swipe entre 0 et 100px
    const newSwipeX = Math.max(0, Math.min(100, diff));
    setSwipeX(newSwipeX);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // Si swipe > 50px, montrer les actions
    if (swipeX > 50) {
      setSwipeX(100);
      setShowActions(true);
    } else {
      setSwipeX(0);
      setShowActions(false);
    }
  };

  const resetSwipe = () => {
    setSwipeX(0);
    setShowActions(false);
  };

  return (
    <div className="mobile-card-wrapper">
      {/* Actions révélées par swipe */}
      <div className="swipe-actions">
        <button
          className="swipe-action action-copy"
          onClick={() => { onCopy(); resetSwipe(); }}
        >
          <Copy size={20} />
          <span>Copier</span>
        </button>
        <button
          className="swipe-action action-delete"
          onClick={() => { if (canDelete) { onDelete(); resetSwipe(); } }}
          disabled={!canDelete}
        >
          <Trash2 size={20} />
          <span>Suppr.</span>
        </button>
      </div>

      {/* Carte principale */}
      <div
        ref={cardRef}
        className={`mobile-card ${etat === 'complete' ? 'card-complete' : ''} ${etat === 'erreur' ? 'card-error' : ''}`}
        style={{ transform: `translateX(-${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !showActions && onEdit()}
      >
        {/* Header de la carte */}
        <div className="card-header">
          <div className="card-left">
            <span className="card-index">#{index + 1}</span>
            <span className="etat-indicator" style={{ color: indicateur.couleur }}>
              {indicateur.icone}
            </span>
            <div className="card-reference">
              {ligne.reference || <span className="placeholder">Sans référence</span>}
            </div>
          </div>
          <div className="card-right">
            <span className="card-price">{formaterPrix(ligne.prixTTC)}</span>
            <ChevronRight size={20} className="chevron" />
          </div>
        </div>

        {/* Corps de la carte - Résumé */}
        <div className="card-body">
          {resumeParts.length > 0 ? (
            <div className="card-tags">
              {resumeParts.map((part, i) => (
                <span key={i} className="tag">{part}</span>
              ))}
              {couleurDisplay && (
                <span className="tag tag-color">{couleurDisplay}</span>
              )}
            </div>
          ) : (
            <span className="empty-hint">Tap pour configurer</span>
          )}

          {/* Dimensions si présentes */}
          {dimensionsDisplay && (
            <div className="card-dimensions">{dimensionsDisplay}</div>
          )}
        </div>

        {/* Footer - Progression */}
        <div className="card-footer">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(progression.remplis / progression.total) * 100}%`,
                backgroundColor: indicateur.couleur,
              }}
            />
          </div>
          <span className="progress-text">{progression.remplis}/{progression.total}</span>
        </div>
      </div>

      {/* Overlay pour reset le swipe */}
      {showActions && (
        <div className="swipe-overlay" onClick={resetSwipe} />
      )}

      <style jsx>{`
        .mobile-card-wrapper {
          position: relative;
          margin-bottom: 0.75rem;
          overflow: hidden;
          border-radius: 16px;
        }

        /* Actions révélées par swipe */
        .swipe-actions {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          display: flex;
          z-index: 1;
        }

        .swipe-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 50px;
          padding: 0.5rem;
          border: none;
          font-size: 0.625rem;
          font-weight: 600;
          gap: 0.25rem;
          cursor: pointer;
        }

        .action-copy {
          background: var(--admin-ardoise);
          color: white;
        }

        .action-delete {
          background: var(--admin-status-danger);
          color: white;
        }

        .action-delete:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Carte principale */
        .mobile-card {
          position: relative;
          z-index: 2;
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 16px;
          padding: 1rem;
          transition: transform 0.15s ease-out, box-shadow 0.2s;
          cursor: pointer;
        }

        .mobile-card:active {
          transform: scale(0.98) translateX(-${swipeX}px);
        }

        .card-complete {
          border-color: var(--admin-olive-border);
          background: linear-gradient(135deg, var(--admin-bg-card) 0%, var(--admin-olive-bg) 100%);
        }

        .card-error {
          border-color: var(--admin-status-danger-border);
        }

        /* Header */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .card-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          min-width: 0;
        }

        .card-index {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--admin-text-muted);
          background: var(--admin-bg-tertiary);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .etat-indicator {
          font-size: 1rem;
        }

        .card-reference {
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--admin-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .placeholder {
          color: var(--admin-text-muted);
          font-style: italic;
          font-weight: 400;
        }

        .card-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-price {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-sable);
        }

        .chevron {
          color: var(--admin-text-muted);
          transition: transform 0.2s;
        }

        .mobile-card:hover .chevron {
          transform: translateX(2px);
          color: var(--admin-olive);
        }

        /* Body */
        .card-body {
          margin-bottom: 0.75rem;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .tag {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border-radius: 6px;
          color: var(--admin-text-secondary);
        }

        .tag-color {
          background: var(--admin-olive-bg);
          color: var(--admin-olive);
          font-weight: 600;
        }

        .empty-hint {
          font-size: 0.8125rem;
          color: var(--admin-text-muted);
          font-style: italic;
        }

        .card-dimensions {
          font-size: 0.75rem;
          color: var(--admin-text-tertiary);
          margin-top: 0.5rem;
          font-family: 'Space Grotesk', monospace;
        }

        /* Footer */
        .card-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .progress-bar {
          flex: 1;
          height: 4px;
          background: var(--admin-bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--admin-text-muted);
        }

        /* Overlay pour reset swipe */
        .swipe-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
