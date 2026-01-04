'use client';

// components/configurateur/groupes/ZoneNonAssignee.tsx
// Zone pour les lignes non assignées à un groupe
// UNE SEULE TABLE avec thead + tbody pour alignement parfait

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, AlertTriangle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import { LignePanneauSortable } from './LignePanneauSortable';
import { cn } from '@/lib/utils';

interface ZoneNonAssigneeProps {
  lignes: LignePrestationV3[];
  lignesFinition: Map<string, LignePrestationV3>; // Map lignePanneauId -> ligneFinition
  onAjouterLigne: () => void;
  onUpdateLigne: (ligneId: string, updates: Partial<LignePrestationV3>) => void;
  onSupprimerLigne: (ligneId: string) => void;
  onCopierLigne: (ligneId: string) => void;
  onCreerLigneFinition: (lignePanneauId: string, typeFinition: TypeFinition) => void;
  onSupprimerLigneFinition: (lignePanneauId: string) => void;
  onUpdateLigneFinition: (lignePanneauId: string, updates: Partial<LignePrestationV3>) => void;
}

export function ZoneNonAssignee({
  lignes,
  lignesFinition,
  onAjouterLigne,
  onUpdateLigne,
  onSupprimerLigne,
  onCopierLigne,
  onCreerLigneFinition,
  onSupprimerLigneFinition,
  onUpdateLigneFinition,
}: ZoneNonAssigneeProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);

  const { setNodeRef, isOver } = useDroppable({
    id: 'non-assignees',
    data: {
      type: 'zone-non-assignee',
      groupeId: null,
    },
  });

  const lignesPanneau = lignes.filter(l => l.typeLigne === 'panneau');
  const ligneIds = lignesPanneau.map(l => l.id);

  // Compter les lignes non vides
  const lignesNonVides = lignesPanneau.filter(l =>
    l.reference.trim() !== '' ||
    l.dimensions.longueur > 0 ||
    l.dimensions.largeur > 0
  );
  const nbLignesNonVides = lignesNonVides.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'zone-non-assignee',
        nbLignesNonVides > 0 && 'has-lignes',
        isOver && 'is-over'
      )}
    >
      {/* Header */}
      <div className="zone-header" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Chevron */}
        <button className="expand-btn">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {/* Icône warning si lignes non vides */}
        {nbLignesNonVides > 0 ? (
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        ) : (
          <div className="neutral-indicator" />
        )}

        {/* Label */}
        <div className="zone-label">
          <span className={cn(
            'zone-title',
            nbLignesNonVides > 0 && 'has-warning'
          )}>
            Non assigné
          </span>
          <span className="zone-count">
            ({lignesPanneau.length} ligne{lignesPanneau.length > 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {/* Contenu - UNE SEULE TABLE */}
      {isExpanded && (
        <div className="zone-content">
          <SortableContext
            items={ligneIds}
            strategy={verticalListSortingStrategy}
          >
            {lignesPanneau.length === 0 ? (
              <div className="empty-zone">
                <p>Aucune ligne non assignée</p>
                <p className="empty-hint">Ajoutez une ligne ou importez un fichier</p>
              </div>
            ) : (
              <div className="cx-table-wrapper">
                <div className="cx-table-scroll">
                  <table className="cx-data-table">
                    <thead>
                      <tr>
                        <th className="cx-col-etat">{t('configurateur.columns.status')}</th>
                        <th className="cx-col-reference">{t('configurateur.columns.reference')}</th>
                        <th className="cx-col-forme">{t('configurateur.columns.shape')}</th>
                        <th className="cx-col-dimensions">{t('configurateur.columns.dimensions')}</th>
                        <th className="cx-col-chants">{t('configurateur.columns.edges')}</th>
                        <th className="cx-col-usinages">{t('configurateur.columns.machining')}</th>
                        <th className="cx-col-percage">{t('configurateur.columns.drilling')}</th>
                        <th className="cx-col-finition">{t('configurateur.columns.finish')}</th>
                        <th className="cx-col-prix">{t('configurateur.columns.priceHT')}</th>
                        <th className="cx-col-actions">{t('configurateur.columns.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignesPanneau.map((ligne, index) => {
                        const ligneFinition = lignesFinition.get(ligne.id) || null;
                        return (
                          <LignePanneauSortable
                            key={ligne.id}
                            ligne={ligne}
                            ligneFinition={ligneFinition}
                            panneauGroupe={null}
                            groupeId={null}
                            index={index}
                            onUpdate={(updates) => onUpdateLigne(ligne.id, updates)}
                            onUpdateFinition={ligneFinition ? (updates) => onUpdateLigneFinition(ligne.id, updates) : undefined}
                            onSupprimer={() => onSupprimerLigne(ligne.id)}
                            onCopier={() => onCopierLigne(ligne.id)}
                            onCreerFinition={(typeFinition) => onCreerLigneFinition(ligne.id, typeFinition)}
                            onSupprimerFinition={() => onSupprimerLigneFinition(ligne.id)}
                            canDelete={lignesPanneau.length > 1}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SortableContext>

          {/* Message d'aide */}
          {nbLignesNonVides > 0 && (
            <div className="warning-message">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {nbLignesNonVides} ligne{nbLignesNonVides > 1 ? 's' : ''} non assignée{nbLignesNonVides > 1 ? 's' : ''}.
                Glissez-les vers un groupe de panneau.
              </span>
            </div>
          )}

          {/* Bouton ajouter ligne */}
          <button
            onClick={onAjouterLigne}
            className="cx-add-ligne-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une ligne</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .zone-non-assignee {
          border: 1px solid var(--cx-border-subtle);
          border-radius: var(--cx-radius-xl);
          overflow: hidden;
          background: var(--cx-surface-0);
          transition: all 0.2s;
        }

        .zone-non-assignee.has-lignes {
          border-color: rgba(249, 115, 22, 0.3);
        }

        .zone-non-assignee.is-over {
          border-color: var(--cx-accent);
          box-shadow: 0 0 0 2px var(--cx-accent-muted);
        }

        .zone-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--cx-surface-1);
          border-bottom: 1px solid var(--cx-border-subtle);
          cursor: pointer;
          transition: background 0.15s;
        }

        .zone-header:hover {
          background: var(--cx-surface-2);
        }

        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: var(--cx-text-muted);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .expand-btn:hover {
          color: var(--cx-text-primary);
          background: var(--cx-surface-3);
        }

        .neutral-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--cx-text-muted);
          opacity: 0.5;
          flex-shrink: 0;
        }

        .zone-label {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zone-title {
          font-weight: 500;
          font-size: var(--cx-text-sm);
          color: var(--cx-text-tertiary);
        }

        .zone-title.has-warning {
          color: #f97316;
        }

        .zone-count {
          font-size: var(--cx-text-xs);
          color: var(--cx-text-muted);
        }

        /* Button styles now in cutx.css (cx-add-ligne-btn) */

        .zone-content {
          padding: 12px;
        }

        .empty-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          border: 2px dashed var(--cx-border-default);
          border-radius: var(--cx-radius-lg);
          color: var(--cx-text-muted);
          text-align: center;
        }

        .empty-hint {
          font-size: var(--cx-text-xs);
          margin-top: 4px;
          opacity: 0.7;
        }

        /* TABLE styles now in cutx.css (cx-table-*, cx-col-*) */

        .warning-message {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 12px;
          background: rgba(249, 115, 22, 0.1);
          border: 1px solid rgba(249, 115, 22, 0.2);
          border-radius: var(--cx-radius-lg);
          font-size: var(--cx-text-sm);
          color: #f97316;
        }
      `}</style>
    </div>
  );
}
