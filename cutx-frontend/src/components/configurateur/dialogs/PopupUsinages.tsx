'use client';

import { useState } from 'react';
import { X, Wrench, Plus, Minus, Trash2 } from 'lucide-react';
import type { Usinage } from '@/lib/configurateur/types';
import { USINAGES_OPTIONS } from '@/lib/configurateur/constants';
import { formaterPrix } from '@/lib/configurateur/calculs';

interface PopupUsinagesProps {
  open: boolean;
  usinages: Usinage[];
  onUpdate: (usinages: Usinage[]) => void;
  onClose: () => void;
}

export default function PopupUsinages({
  open,
  usinages,
  onUpdate,
  onClose,
}: PopupUsinagesProps) {
  const [localUsinages, setLocalUsinages] = useState<Usinage[]>(usinages);

  const handleAjouterUsinage = (option: typeof USINAGES_OPTIONS[number]) => {
    const existing = localUsinages.find(u => u.type === option.type);
    if (existing) {
      // Incrémenter la quantité
      setLocalUsinages(prev =>
        prev.map(u =>
          u.type === option.type ? { ...u, quantite: u.quantite + 1 } : u
        )
      );
    } else {
      // Ajouter un nouvel usinage
      setLocalUsinages(prev => [
        ...prev,
        {
          type: option.type,
          description: option.label,
          prixUnitaire: option.prix,
          quantite: 1,
        },
      ]);
    }
  };

  const handleModifierQuantite = (type: string, delta: number) => {
    setLocalUsinages(prev =>
      prev.map(u => {
        if (u.type !== type) return u;
        const newQte = Math.max(0, u.quantite + delta);
        return { ...u, quantite: newQte };
      }).filter(u => u.quantite > 0)
    );
  };

  const handleSupprimerUsinage = (type: string) => {
    setLocalUsinages(prev => prev.filter(u => u.type !== type));
  };

  const handleValider = () => {
    onUpdate(localUsinages);
    onClose();
  };

  const handleAnnuler = () => {
    setLocalUsinages(usinages);
    onClose();
  };

  const totalUsinages = localUsinages.reduce(
    (sum, u) => sum + u.prixUnitaire * u.quantite,
    0
  );

  if (!open) return null;

  return (
    <div className="popup-overlay" onClick={handleAnnuler}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="header-title">
            <Wrench size={20} style={{ color: 'var(--admin-ardoise)' }} />
            <h3>Usinages</h3>
          </div>
          <button className="btn-close" onClick={handleAnnuler}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="popup-body">
          {/* Liste des options disponibles */}
          <div className="options-section">
            <h4>Options disponibles</h4>
            <div className="options-list">
              {USINAGES_OPTIONS.map(option => {
                const current = localUsinages.find(u => u.type === option.type);
                return (
                  <div key={option.type} className="option-item">
                    <div className="option-info">
                      <span className="option-label">{option.label}</span>
                      <span className="option-prix">
                        {option.prix}€ / {option.unite}
                      </span>
                    </div>
                    <button
                      className="btn-ajouter"
                      onClick={() => handleAjouterUsinage(option)}
                    >
                      <Plus size={16} />
                      {current && <span className="current-qty">{current.quantite}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Usinages sélectionnés */}
          {localUsinages.length > 0 && (
            <div className="selection-section">
              <h4>Sélection actuelle</h4>
              <div className="selection-list">
                {localUsinages.map(usinage => (
                  <div key={usinage.type} className="selection-item">
                    <div className="selection-info">
                      <span className="selection-label">{usinage.description}</span>
                      <span className="selection-detail">
                        {usinage.prixUnitaire}€ × {usinage.quantite} = {formaterPrix(usinage.prixUnitaire * usinage.quantite)}
                      </span>
                    </div>
                    <div className="selection-controls">
                      <button
                        className="btn-qty"
                        onClick={() => handleModifierQuantite(usinage.type, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="qty-value">{usinage.quantite}</span>
                      <button
                        className="btn-qty"
                        onClick={() => handleModifierQuantite(usinage.type, 1)}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleSupprimerUsinage(usinage.type)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="selection-total">
                <span>Total usinages</span>
                <span className="total-value">{formaterPrix(totalUsinages)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="popup-footer">
          <button className="btn-cancel" onClick={handleAnnuler}>
            Annuler
          </button>
          <button className="btn-confirm" onClick={handleValider}>
            Valider
          </button>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .popup-content {
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          max-height: 80vh;
          margin: 1rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          flex-shrink: 0;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .header-title h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-text-primary);
          margin: 0;
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
          color: var(--admin-text-tertiary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        .popup-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .options-section,
        .selection-section {
          margin-bottom: 1.5rem;
        }

        .options-section h4,
        .selection-section h4 {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--admin-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.75rem 0;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .option-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .option-item:hover {
          border-color: var(--admin-ardoise-border);
        }

        .option-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .option-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-primary);
        }

        .option-prix {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .btn-ajouter {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          background: var(--admin-ardoise-bg);
          border: 1px solid var(--admin-ardoise-border);
          border-radius: 6px;
          color: var(--admin-ardoise);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-ajouter:hover {
          background: var(--admin-ardoise);
          color: white;
        }

        .current-qty {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .selection-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .selection-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--admin-olive-bg);
          border: 1px solid var(--admin-olive-border);
          border-radius: 8px;
        }

        .selection-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .selection-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-primary);
        }

        .selection-detail {
          font-size: 0.75rem;
          color: var(--admin-olive);
        }

        .selection-controls {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .btn-qty {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          color: var(--admin-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-qty:hover {
          background: var(--admin-bg-hover);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .qty-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--admin-text-primary);
          min-width: 24px;
          text-align: center;
        }

        .btn-delete {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 0.5rem;
        }

        .btn-delete:hover {
          background: var(--admin-status-danger-bg);
          border-color: var(--admin-status-danger-border);
          color: var(--admin-status-danger);
        }

        .selection-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          margin-top: 0.75rem;
          background: var(--admin-bg-elevated);
          border-radius: 8px;
        }

        .selection-total span {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
        }

        .total-value {
          color: var(--admin-sable) !important;
          font-size: 1rem !important;
        }

        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--admin-border-subtle);
          background: var(--admin-bg-elevated);
          border-radius: 0 0 16px 16px;
          flex-shrink: 0;
        }

        .btn-cancel,
        .btn-confirm {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--admin-border-default);
          color: var(--admin-text-secondary);
        }

        .btn-cancel:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        .btn-confirm {
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          border: none;
          color: white;
        }

        .btn-confirm:hover {
          background: linear-gradient(135deg, var(--admin-olive-hover) 0%, var(--admin-olive) 100%);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
