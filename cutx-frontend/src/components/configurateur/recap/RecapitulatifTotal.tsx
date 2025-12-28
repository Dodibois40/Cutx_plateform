'use client';

import { ShoppingCart, Layers, Ruler, CheckCircle2, Minus, Package, PaintBucket, Maximize2 } from 'lucide-react';
import { formaterPrix } from '@/lib/configurateur/calculs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';

interface RecapitulatifTotalProps {
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  // V3: Sous-totaux fourniture et prestation
  totalFournitureHT?: number;
  totalPrestationHT?: number;
  isValid: boolean;
  onAjouterAuPanier: () => void;
  // Stats pour la section gauche
  nombrePieces: number;
  surfaceTotale: number;
  metresLineairesChants: number;
  lignesCompletes: number;
  totalLignes: number;
  // Mode édition (pour admin)
  isEditing?: boolean;
  // Optimiseur de débit
  onOpenOptimiseur?: () => void;
  // V3: Panneau global sélectionné (pour afficher l'image et infos)
  panneauGlobal?: PanneauCatalogue | null;
  // Rétrocompatibilité
  hasPanneauGlobal?: boolean;
}

export default function RecapitulatifTotal({
  totalHT,
  totalTVA,
  totalTTC,
  totalFournitureHT = 0,
  totalPrestationHT = 0,
  isValid,
  onAjouterAuPanier,
  nombrePieces,
  surfaceTotale,
  metresLineairesChants,
  lignesCompletes,
  totalLignes,
  isEditing = false,
  onOpenOptimiseur,
  panneauGlobal,
  hasPanneauGlobal = false,
}: RecapitulatifTotalProps) {
  // Afficher la décomposition fourniture/prestation seulement si fourniture > 0
  const showFournitureBreakdown = totalFournitureHT > 0;
  const isAllComplete = lignesCompletes === totalLignes && totalLignes > 0;
  // Utiliser panneauGlobal ou hasPanneauGlobal pour la rétrocompatibilité
  const showPanneauGlobal = panneauGlobal || hasPanneauGlobal;

  return (
    <div className="recap-container">
      <div className="recap-content">
        {/* Section Stats - Gauche */}
        <div className="recap-stats">
          {/* Panneau sélectionné avec image */}
          {panneauGlobal && (
            <>
              <div className="panneau-recap">
                {panneauGlobal.imageUrl ? (
                  <img
                    src={panneauGlobal.imageUrl}
                    alt={panneauGlobal.nom}
                    className="panneau-recap-img"
                  />
                ) : (
                  <div className="panneau-recap-placeholder" />
                )}
                <div className="panneau-recap-infos">
                  <span className="panneau-recap-nom" title={panneauGlobal.nom}>
                    {panneauGlobal.nom}
                  </span>
                  <span className="panneau-recap-details">
                    {panneauGlobal.epaisseurs.join('/')}mm • {panneauGlobal.fournisseur || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="stat-separator" />
            </>
          )}

          {/* Nombre de pièces */}
          <div className="stat-item">
            <Layers size={16} className="stat-icon" />
            <div className="stat-content">
              <span className="stat-value">{nombrePieces}</span>
              <span className="stat-label">{nombrePieces > 1 ? 'débits' : 'débit'}</span>
            </div>
          </div>

          {/* Séparateur */}
          <div className="stat-separator" />

          {/* Surface totale */}
          <div className="stat-item">
            <Ruler size={16} className="stat-icon" />
            <div className="stat-content">
              <span className="stat-value">{surfaceTotale.toFixed(2)}</span>
              <span className="stat-label">m²</span>
            </div>
          </div>

          {/* Séparateur */}
          <div className="stat-separator" />

          {/* Mètres linéaires chants */}
          <div className="stat-item">
            <Minus size={16} className="stat-icon" />
            <div className="stat-content">
              <span className="stat-value">{metresLineairesChants.toFixed(2)}</span>
              <span className="stat-label">mL chants</span>
            </div>
          </div>

          {/* Séparateur */}
          <div className="stat-separator" />

          {/* Progression */}
          <div className="stat-item">
            <CheckCircle2 size={16} className={`stat-icon ${isAllComplete ? 'complete' : ''}`} />
            <div className="stat-content">
              <span className={`stat-value ${isAllComplete ? 'complete' : ''}`}>{lignesCompletes}/{totalLignes}</span>
              <span className="stat-label">prêtes</span>
            </div>
          </div>

          {/* Bouton Optimiseur */}
          {onOpenOptimiseur && showPanneauGlobal && (
            <>
              <div className="stat-separator" />
              <button
                className="btn-optimiseur"
                onClick={onOpenOptimiseur}
                title="Visualiser l'optimisation des débits sur les panneaux"
              >
                <Maximize2 size={16} />
                <span>Optimiser les débits</span>
              </button>
            </>
          )}
        </div>

        {/* Section Totaux - Vertical comme devis/facture */}
        <div className="recap-totaux">
          {/* Sous-total Fourniture (V3) - si activé */}
          {showFournitureBreakdown && (
            <div className="total-row subtotal-row">
              <span className="total-label subtotal-label">
                <Package size={12} className="subtotal-icon" />
                Fourniture
              </span>
              <span className="total-value subtotal-value">{formaterPrix(totalFournitureHT)}</span>
            </div>
          )}

          {/* Sous-total Prestation (V3) - si fourniture activée */}
          {showFournitureBreakdown && (
            <div className="total-row subtotal-row">
              <span className="total-label subtotal-label">
                <PaintBucket size={12} className="subtotal-icon" />
                Prestation
              </span>
              <span className="total-value subtotal-value">{formaterPrix(totalPrestationHT)}</span>
            </div>
          )}

          {/* HT */}
          <div className={`total-row ${showFournitureBreakdown ? 'has-subtotals' : ''}`}>
            <span className="total-label">Total HT</span>
            <span className="total-value total-ht">{formaterPrix(totalHT)}</span>
          </div>

          {/* TVA */}
          <div className="total-row">
            <span className="total-label">TVA (20%)</span>
            <span className="total-value total-tva">{formaterPrix(totalTVA)}</span>
          </div>

          {/* TTC - Mis en avant */}
          <div className="total-row total-ttc-row">
            <span className="total-label">Total TTC</span>
            <span className="total-value total-ttc">{formaterPrix(totalTTC)}</span>
          </div>
        </div>

        {/* Bouton ajouter au panier / enregistrer */}
        <button
          className={`btn-panier ${isValid ? 'btn-active' : 'btn-disabled'}`}
          onClick={onAjouterAuPanier}
          disabled={!isValid}
        >
          <ShoppingCart size={18} />
          <span>{isEditing ? 'Enregistrer les modifications' : 'Commander ma finition'}</span>
        </button>
      </div>

      <style jsx>{`
        .recap-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(26, 26, 26, 0.98);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1rem 1.5rem;
          z-index: 100;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .recap-content {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        /* Section Stats - Gauche */
        .recap-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-item :global(.stat-icon) {
          color: var(--admin-text-muted);
          opacity: 0.7;
        }

        .stat-item :global(.stat-icon.complete) {
          color: var(--admin-olive);
          opacity: 1;
        }

        .stat-content {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .stat-value {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .stat-separator {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
        }

        .stat-value.complete {
          color: var(--admin-olive);
        }

        /* Panneau recap */
        .panneau-recap {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .panneau-recap-img {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid var(--admin-olive);
          flex-shrink: 0;
        }

        .panneau-recap-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: var(--admin-bg-tertiary);
          border: 2px dashed var(--admin-border-default);
          flex-shrink: 0;
        }

        .panneau-recap-infos {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          max-width: 200px;
        }

        .panneau-recap-nom {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .panneau-recap-details {
          font-size: 0.6875rem;
          color: var(--admin-text-muted);
        }

        /* Bouton Optimiseur */
        .btn-optimiseur {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--admin-olive-bg);
          border: 1px solid var(--admin-olive);
          border-radius: 8px;
          color: var(--admin-olive);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-optimiseur:hover {
          background: var(--admin-olive);
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 157, 81, 0.3);
        }

        /* Section droite (totaux + bouton) */
        .recap-right {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        /* Layout vertical des totaux */
        .recap-totaux {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          min-width: 200px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
        }

        .total-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--admin-text-muted);
        }

        .total-value {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-weight: 600;
          text-align: right;
        }

        /* Sous-totaux fourniture/prestation (V3) */
        .subtotal-row {
          opacity: 0.85;
        }

        .subtotal-label {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--admin-sable);
        }

        .subtotal-label :global(.subtotal-icon) {
          opacity: 0.8;
        }

        .subtotal-value {
          font-size: 0.8125rem;
          color: var(--admin-sable);
        }

        .has-subtotals {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 0.375rem;
          margin-top: 0.25rem;
        }

        .total-ht {
          font-size: 0.9375rem;
          color: var(--admin-text-secondary);
        }

        .total-tva {
          font-size: 0.875rem;
          color: var(--admin-text-muted);
        }

        /* TTC mis en avant */
        .total-ttc-row {
          border-top: 1px solid rgba(139, 157, 81, 0.3);
          padding-top: 0.5rem;
          margin-top: 0.25rem;
        }

        .total-ttc-row .total-label {
          color: var(--admin-olive);
          font-weight: 600;
        }

        .total-ttc {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-olive);
        }

        /* Bouton panier - Premium */
        .btn-panier {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          padding: 0 2rem;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #8b9d51 0%, #6d7a3f 100%);
          border: none;
          color: white;
          height: 110px;
          box-shadow: 0 4px 12px rgba(139, 157, 81, 0.25);
        }

        .btn-active:hover {
          background: linear-gradient(135deg, #9aad5e 0%, #7a894a 100%);
          box-shadow: 0 6px 20px rgba(139, 157, 81, 0.35);
          transform: translateY(-1px);
        }

        .btn-active:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(139, 157, 81, 0.2);
        }

        .btn-disabled {
          background: rgba(255, 255, 255, 0.05);
          color: var(--admin-text-muted);
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .recap-stats {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .recap-container {
            padding: 1rem;
          }

          .recap-content {
            flex-direction: column;
            gap: 1rem;
          }

          .recap-totaux {
            width: 100%;
            max-width: 280px;
          }

          .btn-panier {
            width: 100%;
            height: 56px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
