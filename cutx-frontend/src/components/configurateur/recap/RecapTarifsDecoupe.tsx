'use client';

import { useState } from 'react';
import {
  Scissors,
  Minus,
  Package,
  ChevronDown,
  ChevronUp,
  Info,
  Ruler,
  AlertCircle,
} from 'lucide-react';
import { formaterPrix } from '@/lib/configurateur/calculs';
import type { ResultatTraitsScie, TraitsSciePanneau } from '@/lib/configurateur/tarif-decoupe';
import type { ResultatCalculChants, CalculChantsPanneau } from '@/lib/configurateur/tarif-chants';
import { TARIF_DECOUPE, TARIF_CHANTS } from '@/lib/configurateur';

interface RecapTarifsDecoupeProps {
  // Données de découpe (traits de scie)
  traitsScie?: ResultatTraitsScie | null;
  // Données de chants (placage + fourniture)
  chants?: ResultatCalculChants | null;
  // Affichage compact ou détaillé
  mode?: 'compact' | 'detail';
  // Callback optionnel
  onDetailClick?: () => void;
}

export default function RecapTarifsDecoupe({
  traitsScie,
  chants,
  mode = 'compact',
  onDetailClick,
}: RecapTarifsDecoupeProps) {
  const [expanded, setExpanded] = useState(mode === 'detail');

  // Calculs des totaux
  const totalDecoupe = traitsScie?.totalPrixDecoupe ?? 0;
  const totalPlacageChants = chants?.totalPrixPlacage ?? 0;
  const totalFournitureChants = chants?.totalPrixFourniture ?? 0;
  const totalChants = totalPlacageChants + totalFournitureChants;
  const totalHT = totalDecoupe + totalChants;

  // Stats
  const mlTraitsScie = traitsScie?.totalMetresLineaires ?? 0;
  const mlChants = chants?.totalMetresLineaires ?? 0;
  const nombrePanneaux = traitsScie?.nombrePanneaux ?? 0;

  // Pas de données
  if (!traitsScie && !chants) {
    return null;
  }

  return (
    <div className="tarifs-container">
      {/* Header avec toggle */}
      <div className="tarifs-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          <Scissors size={18} className="header-icon" />
          <h3>Tarifs Découpe & Chants</h3>
          {!expanded && (
            <span className="header-total">{formaterPrix(totalHT)}</span>
          )}
        </div>
        <button className="btn-toggle">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Contenu détaillé */}
      {expanded && (
        <div className="tarifs-content">
          {/* Section Découpe (traits de scie) */}
          {traitsScie && traitsScie.nombrePanneaux > 0 && (
            <div className="section">
              <div className="section-header">
                <Scissors size={14} />
                <span>Découpe panneaux</span>
                <span className="section-info">
                  {TARIF_DECOUPE.PRIX_ML_TRAIT_SCIE}€/ml • min {TARIF_DECOUPE.MINIMUM_DECOUPE}€/panneau
                </span>
              </div>

              <div className="section-content">
                {/* Stats globales */}
                <div className="stats-row">
                  <div className="stat">
                    <Package size={14} />
                    <span className="stat-value">{nombrePanneaux}</span>
                    <span className="stat-label">panneau{nombrePanneaux > 1 ? 'x' : ''}</span>
                  </div>
                  <div className="stat">
                    <Ruler size={14} />
                    <span className="stat-value">{mlTraitsScie.toFixed(2)}</span>
                    <span className="stat-label">ml traits</span>
                  </div>
                </div>

                {/* Détail par panneau */}
                {traitsScie.panneaux.length > 0 && (
                  <div className="details-list">
                    {traitsScie.panneaux.map((p, idx) => (
                      <DetailPanneauDecoupe key={idx} panneau={p} />
                    ))}
                  </div>
                )}

                {/* Sous-total découpe */}
                <div className="subtotal-row">
                  <span>Sous-total découpe</span>
                  <span className="subtotal-value">{formaterPrix(totalDecoupe)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section Chants (placage + fourniture) */}
          {chants && chants.totalMetresLineaires > 0 && (
            <div className="section">
              <div className="section-header">
                <Minus size={14} />
                <span>Placage de chants</span>
                <span className="section-info">
                  {TARIF_CHANTS.PRIX_ML_PLACAGE}€/ml placage • min {TARIF_CHANTS.MINIMUM_PLACAGE_PANNEAU}€/panneau
                </span>
              </div>

              <div className="section-content">
                {/* Stats globales */}
                <div className="stats-row">
                  <div className="stat">
                    <Ruler size={14} />
                    <span className="stat-value">{mlChants.toFixed(2)}</span>
                    <span className="stat-label">ml chants</span>
                  </div>
                </div>

                {/* Détail par panneau */}
                {chants.panneaux.length > 0 && (
                  <div className="details-list">
                    {chants.panneaux.map((p, idx) => (
                      <DetailPanneauChants key={idx} panneau={p} />
                    ))}
                  </div>
                )}

                {/* Sous-totaux chants */}
                <div className="subtotal-row light">
                  <span>Placage (main d'oeuvre)</span>
                  <span className="subtotal-value">{formaterPrix(totalPlacageChants)}</span>
                </div>
                {totalFournitureChants > 0 && (
                  <div className="subtotal-row light">
                    <span>Fourniture chants</span>
                    <span className="subtotal-value">{formaterPrix(totalFournitureChants)}</span>
                  </div>
                )}
                <div className="subtotal-row">
                  <span>Sous-total chants</span>
                  <span className="subtotal-value">{formaterPrix(totalChants)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total général */}
          <div className="total-section">
            <div className="total-row">
              <span className="total-label">Total Découpe & Chants HT</span>
              <span className="total-value">{formaterPrix(totalHT)}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tarifs-container {
          background: var(--admin-bg-card, #1a1a1a);
          border: 1px solid var(--admin-border-default, #333);
          border-radius: 12px;
          overflow: hidden;
        }

        /* Header */
        .tarifs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: var(--admin-bg-tertiary, #252525);
          cursor: pointer;
          transition: background 0.15s;
        }

        .tarifs-header:hover {
          background: var(--admin-bg-hover, #2a2a2a);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-left :global(.header-icon) {
          color: var(--admin-olive, #8b9d51);
        }

        .header-left h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--admin-text-primary, #fff);
          margin: 0;
        }

        .header-total {
          font-family: 'Space Grotesk', monospace;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--admin-olive, #8b9d51);
          margin-left: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: var(--admin-olive-bg, rgba(139, 157, 81, 0.1));
          border-radius: 6px;
        }

        .btn-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--admin-text-muted, #888);
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-toggle:hover {
          background: var(--admin-bg-hover, #2a2a2a);
          color: var(--admin-text-primary, #fff);
        }

        /* Contenu */
        .tarifs-content {
          padding: 0.5rem;
        }

        /* Section */
        .section {
          margin-bottom: 0.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-secondary, #1f1f1f);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .section-header :global(svg) {
          color: var(--admin-sable, #c9a86c);
        }

        .section-header span:first-of-type {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-primary, #fff);
        }

        .section-info {
          margin-left: auto;
          font-size: 0.6875rem;
          color: var(--admin-text-muted, #888);
          font-weight: 500;
        }

        .section-content {
          padding: 0 0.5rem;
        }

        /* Stats row */
        .stats-row {
          display: flex;
          gap: 1.5rem;
          padding: 0.75rem 0.5rem;
          border-bottom: 1px solid var(--admin-border-subtle, #2a2a2a);
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .stat :global(svg) {
          color: var(--admin-text-muted, #888);
          opacity: 0.7;
        }

        .stat-value {
          font-family: 'Space Grotesk', monospace;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--admin-text-primary, #fff);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--admin-text-muted, #888);
        }

        /* Details list */
        .details-list {
          padding: 0.5rem 0;
        }

        /* Subtotal */
        .subtotal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0.5rem;
          border-top: 1px solid var(--admin-border-subtle, #2a2a2a);
          margin-top: 0.5rem;
        }

        .subtotal-row span:first-child {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--admin-text-secondary, #ccc);
        }

        .subtotal-row.light {
          border-top: none;
          margin-top: 0;
          padding: 0.375rem 0.5rem;
          opacity: 0.8;
        }

        .subtotal-row.light span:first-child {
          font-size: 0.75rem;
          color: var(--admin-text-muted, #888);
        }

        .subtotal-value {
          font-family: 'Space Grotesk', monospace;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-sable, #c9a86c);
        }

        /* Total section */
        .total-section {
          background: var(--admin-olive-bg, rgba(139, 157, 81, 0.1));
          border-radius: 8px;
          padding: 1rem;
          margin-top: 0.5rem;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-olive, #8b9d51);
        }

        .total-value {
          font-family: 'Space Grotesk', monospace;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-olive, #8b9d51);
        }
      `}</style>
    </div>
  );
}

/**
 * Composant détail pour un panneau (découpe)
 */
function DetailPanneauDecoupe({ panneau }: { panneau: TraitsSciePanneau }) {
  return (
    <div className="detail-item">
      <div className="detail-left">
        <span className="detail-index">P{panneau.panneauIndex}</span>
        <span className="detail-nom">{panneau.panneauNom}</span>
      </div>
      <div className="detail-right">
        <span className="detail-ml">{panneau.totalMetresLineaires.toFixed(2)} ml</span>
        <span className="detail-traits">
          ({panneau.totalTraits} traits)
        </span>
        <span className="detail-prix">
          {formaterPrix(panneau.prixDecoupe)}
          {panneau.minimumApplique && (
            <span className="minimum-badge" title="Minimum appliqué">min</span>
          )}
        </span>
      </div>

      <style jsx>{`
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.5rem;
          border-radius: 6px;
          transition: background 0.1s;
        }

        .detail-item:hover {
          background: var(--admin-bg-hover, #2a2a2a);
        }

        .detail-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .detail-index {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--admin-olive, #8b9d51);
          background: var(--admin-olive-bg, rgba(139, 157, 81, 0.1));
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .detail-nom {
          font-size: 0.8125rem;
          color: var(--admin-text-primary, #fff);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .detail-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .detail-ml {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--admin-text-secondary, #ccc);
        }

        .detail-traits {
          font-size: 0.6875rem;
          color: var(--admin-text-muted, #888);
        }

        .detail-prix {
          font-family: 'Space Grotesk', monospace;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-sable, #c9a86c);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .minimum-badge {
          font-size: 0.5625rem;
          font-weight: 600;
          color: var(--admin-status-warning, #f97316);
          background: rgba(249, 115, 22, 0.1);
          padding: 0.0625rem 0.25rem;
          border-radius: 3px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

/**
 * Composant détail pour un panneau (chants)
 */
function DetailPanneauChants({ panneau }: { panneau: CalculChantsPanneau }) {
  return (
    <div className="detail-item">
      <div className="detail-left">
        <span className="detail-nom">{panneau.panneauNom}</span>
        {panneau.chantAssocie && (
          <span className="chant-info" title={panneau.chantAssocie.nom}>
            {panneau.chantAssocie.type} {panneau.chantAssocie.epaisseur}mm
          </span>
        )}
      </div>
      <div className="detail-right">
        <span className="detail-ml">{panneau.totalMetresLineaires.toFixed(2)} ml</span>
        <span className="detail-prix">
          {formaterPrix(panneau.prixTotalHT)}
          {panneau.minimumPlacageApplique && (
            <span className="minimum-badge" title="Minimum placage appliqué">min</span>
          )}
        </span>
      </div>

      <style jsx>{`
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.5rem;
          border-radius: 6px;
          transition: background 0.1s;
        }

        .detail-item:hover {
          background: var(--admin-bg-hover, #2a2a2a);
        }

        .detail-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .detail-nom {
          font-size: 0.8125rem;
          color: var(--admin-text-primary, #fff);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chant-info {
          font-size: 0.6875rem;
          color: var(--admin-text-muted, #888);
          background: var(--admin-bg-tertiary, #252525);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .detail-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .detail-ml {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--admin-text-secondary, #ccc);
        }

        .detail-prix {
          font-family: 'Space Grotesk', monospace;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-sable, #c9a86c);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .minimum-badge {
          font-size: 0.5625rem;
          font-weight: 600;
          color: var(--admin-status-warning, #f97316);
          background: rgba(249, 115, 22, 0.1);
          padding: 0.0625rem 0.25rem;
          border-radius: 3px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
