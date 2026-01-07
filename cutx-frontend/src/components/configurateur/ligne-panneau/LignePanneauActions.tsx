'use client';

import { Copy, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LignePanneauActionsProps {
  onCopier: () => void;
  onSupprimer: () => void;
  canDelete: boolean;
  canCopier?: boolean; // true si la ligne a une référence
  onHighlightReference?: () => void; // Callback pour highlight le champ référence
}

export default function LignePanneauActions({
  onCopier,
  onSupprimer,
  canDelete,
  canCopier = true,
  onHighlightReference,
}: LignePanneauActionsProps) {
  const t = useTranslations();

  const handleCopierClick = () => {
    if (canCopier) {
      onCopier();
    } else {
      // Si pas de référence, highlight le champ
      onHighlightReference?.();
    }
  };

  return (
    <>
      <div className="actions-group">
        <button
          className="btn-action"
          onClick={handleCopierClick}
          title={canCopier ? t('common.actions.duplicate') : t('configurateur.lines.referenceRequired')}
        >
          <Copy size={14} />
        </button>
        <button
          className="btn-action btn-delete"
          onClick={onSupprimer}
          disabled={!canDelete}
          title={t('common.actions.delete')}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <style jsx>{`
        .actions-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        .btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .btn-action:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
