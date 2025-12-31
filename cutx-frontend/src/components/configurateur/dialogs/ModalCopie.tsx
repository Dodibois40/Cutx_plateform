'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Copy } from 'lucide-react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';

interface ModalCopieProps {
  open: boolean;
  ligneSource: LignePrestationV3 | null;
  nouvelleReference: string;
  onReferenceChange: (value: string) => void;
  onConfirmer: () => void;
  onAnnuler: () => void;
}

export default function ModalCopie({
  open,
  ligneSource,
  nouvelleReference,
  onReferenceChange,
  onConfirmer,
  onAnnuler,
}: ModalCopieProps) {
  const t = useTranslations('dialogs.copy');
  const tCommon = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus sur l'input quand le modal s'ouvre
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Gérer la touche Entrée
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && nouvelleReference.trim()) {
      onConfirmer();
    } else if (e.key === 'Escape') {
      onAnnuler();
    }
  };

  if (!open || !ligneSource) return null;

  return (
    <div className="modal-overlay" onClick={onAnnuler}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-title">
            <Copy size={20} style={{ color: 'var(--admin-olive)' }} />
            <h3>{t('title')}</h3>
          </div>
          <button className="btn-close" onClick={onAnnuler}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p className="source-info">
            {t('sourceLabel')}<strong>{ligneSource.reference || t('noReference')}</strong>
          </p>

          <div className="form-group">
            <label htmlFor="nouvelle-reference">
              {t('newReferenceLabel')} <span className="required">{t('required')}</span>
            </label>
            <input
              ref={inputRef}
              id="nouvelle-reference"
              type="text"
              value={nouvelleReference}
              onChange={(e) => onReferenceChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ref: Debit 1"
              className="admin-input"
            />
            <p className="hint">{t('hint')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onAnnuler}>
            {tCommon('actions.cancel')}
          </button>
          <button
            className="btn-confirm"
            onClick={onConfirmer}
            disabled={!nouvelleReference.trim()}
          >
            <Copy size={16} />
            <span>{tCommon('actions.duplicate')}</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
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

        .modal-content {
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          margin: 1rem;
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

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--admin-border-subtle);
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

        .modal-body {
          padding: 1.5rem;
        }

        .source-info {
          font-size: 0.875rem;
          color: var(--admin-text-secondary);
          margin: 0 0 1.25rem 0;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border-radius: 8px;
        }

        .source-info strong {
          color: var(--admin-sable);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
        }

        .required {
          color: var(--admin-status-danger);
        }

        .form-group input {
          font-size: 1rem;
        }

        .hint {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
          margin: 0;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--admin-border-subtle);
          background: var(--admin-bg-elevated);
          border-radius: 0 0 16px 16px;
        }

        .btn-cancel,
        .btn-confirm {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .btn-confirm:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--admin-olive-hover) 0%, var(--admin-olive) 100%);
          transform: translateY(-1px);
        }

        .btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
