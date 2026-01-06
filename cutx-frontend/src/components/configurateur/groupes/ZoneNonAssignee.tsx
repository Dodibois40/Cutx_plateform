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
import { ChevronDown, ChevronRight, AlertTriangle, Plus, ArrowDownToLine, CheckSquare, Square, MoveVertical, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LignePrestationV3, TypeFinition, Chants } from '@/lib/configurateur/types';
import type { ColonneDuplicableGroupe, FinitionApplyValue } from '@/contexts/GroupesContext';
import { LignePanneauSortable } from './LignePanneauSortable';
import { cn } from '@/lib/utils';

// Helper pour obtenir la première valeur d'une colonne
function getFirstValueForColumn(
  lignes: LignePrestationV3[],
  colonne: ColonneDuplicableGroupe,
  lignesFinition?: Map<string, LignePrestationV3>
): boolean | Chants | FinitionApplyValue | null {
  for (const ligne of lignes) {
    if (ligne.typeLigne !== 'panneau') continue;
    switch (colonne) {
      case 'chants':
        // Vérifier si au moins un chant est coché
        if (ligne.chants && (ligne.chants.A || ligne.chants.B || ligne.chants.C || ligne.chants.D)) {
          return ligne.chants;
        }
        break;
      case 'percage':
        if (ligne.percage !== undefined) return ligne.percage;
        break;
      case 'finition':
        // Vérifier si la ligne a une finition et récupérer les détails
        if (ligne.avecFinition && ligne.typeFinition && lignesFinition) {
          const ligneFinition = lignesFinition.get(ligne.id);
          if (ligneFinition) {
            return {
              avecFinition: true,
              typeFinition: ligne.typeFinition,
              finition: ligneFinition.finition,
              teinte: ligneFinition.teinte,
              codeCouleurLaque: ligneFinition.codeCouleurLaque,
              brillance: ligneFinition.brillance,
              nombreFaces: ligneFinition.nombreFaces,
            };
          }
        }
        break;
    }
  }
  return null;
}

interface ZoneNonAssigneeProps {
  lignes: LignePrestationV3[];
  lignesFinition: Map<string, LignePrestationV3>; // Map lignePanneauId -> ligneFinition
  isDragging?: boolean; // État global de drag en cours
  isHovered?: boolean; // Cette zone est survolée pendant un drag
  onAjouterLigne: () => void;
  onUpdateLigne: (ligneId: string, updates: Partial<LignePrestationV3>) => void;
  onSupprimerLigne: (ligneId: string) => void;
  onCopierLigne: (ligneId: string) => void;
  onCreerLigneFinition: (lignePanneauId: string, typeFinition: TypeFinition) => void;
  onSupprimerLigneFinition: (lignePanneauId: string) => void;
  onUpdateLigneFinition: (lignePanneauId: string, updates: Partial<LignePrestationV3>) => void;
  onApplyToColumn?: (colonne: ColonneDuplicableGroupe, valeur: boolean | Chants | FinitionApplyValue) => void;
  // Props de sélection
  selectedLigneIds?: Set<string>;
  onToggleLigneSelection?: (ligneId: string) => void;
  onSelectAllLignes?: (ligneIds: string[]) => void;
  onClearSelection?: () => void;
  onSupprimerSelection?: () => void;
}

export function ZoneNonAssignee({
  lignes,
  lignesFinition,
  isDragging = false,
  isHovered = false,
  onAjouterLigne,
  onUpdateLigne,
  onSupprimerLigne,
  onCopierLigne,
  onCreerLigneFinition,
  onSupprimerLigneFinition,
  onUpdateLigneFinition,
  onApplyToColumn,
  selectedLigneIds,
  onToggleLigneSelection,
  onSelectAllLignes,
  onClearSelection,
  onSupprimerSelection,
}: ZoneNonAssigneeProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);

  // Drop zone - utilisé uniquement sur les zones drop-zone
  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({
    id: 'non-assignees',
    data: {
      type: 'drop-zone',
      groupeId: null,
    },
  });

  const lignesPanneau = lignes.filter(l => l.typeLigne === 'panneau');
  const ligneIds = lignesPanneau.map(l => l.id);

  // Compter les lignes non vides
  const lignesNonVides = lignesPanneau.filter(l =>
    (l.reference?.trim() ?? '') !== '' ||
    (l.dimensions?.longueur ?? 0) > 0 ||
    (l.dimensions?.largeur ?? 0) > 0
  );
  const nbLignesNonVides = lignesNonVides.length;

  return (
    <div
      className={cn(
        'zone-non-assignee',
        nbLignesNonVides > 0 && 'has-lignes',
        isHovered && 'zone-non-assignee--drag-over'
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

        {/* Bouton Tout sélectionner / désélectionner - juste après le chevron */}
        {onSelectAllLignes && onClearSelection && lignesPanneau.length > 1 && (() => {
          // Vérifier si toutes les lignes de cette zone sont sélectionnées
          const allSelected = ligneIds.length > 0 && ligneIds.every(id => selectedLigneIds?.has(id));
          const someSelected = selectedLigneIds && selectedLigneIds.size > 0;

          return (
            <button
              className={`select-all-btn ${someSelected ? 'has-selection' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (allSelected) {
                  onClearSelection();
                } else {
                  onSelectAllLignes(ligneIds);
                }
              }}
              title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            >
              {allSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
              <span>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
            </button>
          );
        })()}

        {/* Bouton Supprimer la sélection */}
        {selectedLigneIds && selectedLigneIds.size > 0 && onSupprimerSelection && (
          <button
            className="delete-selection-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSupprimerSelection();
            }}
            title={`Supprimer ${selectedLigneIds.size} ligne${selectedLigneIds.size > 1 ? 's' : ''}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer ({selectedLigneIds.size})</span>
          </button>
        )}

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
              <div
                ref={setDropZoneRef}
                className={cn(
                  'drop-zone',
                  isDragging && 'drop-zone--active',
                  isOver && 'drop-zone--over'
                )}
              >
                <MoveVertical size={16} className="drop-zone-icon" />
                <span>{isOver ? 'Relâchez pour déposer' : 'Glissez des lignes ici'}</span>
              </div>
            ) : (
              <>
              <div className="cx-table-wrapper">
                <div className="cx-table-scroll">
                  <table className="cx-data-table">
                    <thead>
                      <tr>
                        <th className="cx-col-etat">{t('configurateur.columns.status')}</th>
                        <th className="cx-col-reference">{t('configurateur.columns.reference')}</th>
                        <th className="cx-col-forme">{t('configurateur.columns.shape')}</th>
                        <th className="cx-col-dimensions">{t('configurateur.columns.dimensions')}</th>
                        <th className="cx-col-chants">
                          <span className="th-with-apply">
                            {t('configurateur.columns.edges')}
                            {onApplyToColumn && lignesPanneau.length > 1 && (() => {
                              const firstValue = getFirstValueForColumn(lignesPanneau, 'chants');
                              if (firstValue === null) return null;
                              return (
                                <button
                                  type="button"
                                  className="apply-col-btn"
                                  onClick={() => onApplyToColumn('chants', firstValue)}
                                  title={t('configurateur.actions.applyToAll')}
                                >
                                  <ArrowDownToLine size={10} strokeWidth={2.5} />
                                </button>
                              );
                            })()}
                          </span>
                        </th>
                        <th className="cx-col-usinages">{t('configurateur.columns.machining')}</th>
                        <th className="cx-col-percage">
                          <span className="th-with-apply">
                            {t('configurateur.columns.drilling')}
                            {onApplyToColumn && lignesPanneau.length > 1 && (() => {
                              const firstValue = getFirstValueForColumn(lignesPanneau, 'percage');
                              if (firstValue === null) return null;
                              return (
                                <button
                                  type="button"
                                  className="apply-col-btn"
                                  onClick={() => onApplyToColumn('percage', firstValue)}
                                  title={t('configurateur.actions.applyToAll')}
                                >
                                  <ArrowDownToLine size={10} strokeWidth={2.5} />
                                </button>
                              );
                            })()}
                          </span>
                        </th>
                        <th className="cx-col-finition">
                          <span className="th-with-apply">
                            {t('configurateur.columns.finish')}
                            {onApplyToColumn && lignesPanneau.length > 1 && (() => {
                              const firstValue = getFirstValueForColumn(lignesPanneau, 'finition', lignesFinition);
                              if (firstValue === null) return null;
                              return (
                                <button
                                  type="button"
                                  className="apply-col-btn"
                                  onClick={() => onApplyToColumn('finition', firstValue)}
                                  title={t('configurateur.actions.applyToAll')}
                                >
                                  <ArrowDownToLine size={10} strokeWidth={2.5} />
                                </button>
                              );
                            })()}
                          </span>
                        </th>
                        <th className="cx-col-prix">{t('configurateur.columns.priceHT')}</th>
                        <th className="cx-col-actions">{t('configurateur.columns.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignesPanneau.map((ligne, index) => {
                        const ligneFinition = lignesFinition.get(ligne.id) || null;
                        const isSelected = selectedLigneIds?.has(ligne.id) ?? false;
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
                            // Props de sélection
                            isSelected={isSelected}
                            onToggleSelection={onToggleLigneSelection ? () => onToggleLigneSelection(ligne.id) : undefined}
                            selectedCount={selectedLigneIds?.size ?? 0}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div
                ref={setDropZoneRef}
                className={cn(
                  'drop-zone drop-zone--compact',
                  isDragging && 'drop-zone--active',
                  isOver && 'drop-zone--over'
                )}
              >
                <MoveVertical size={14} className="drop-zone-icon" />
                <span>{isOver ? 'Relâchez pour déposer' : 'Glissez des lignes ici'}</span>
              </div>
              </>
            )}
          </SortableContext>

          {/* Bouton ajouter ligne */}
          <button
            onClick={() => onAjouterLigne()}
            className="cx-add-ligne-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une ligne</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .zone-non-assignee {
          border: 2px solid var(--cx-border-subtle);
          border-radius: var(--cx-radius-xl);
          overflow: hidden;
          background: var(--cx-surface-0);
          transition: all 0.2s;
        }

        .zone-non-assignee.has-lignes {
          border-color: rgba(249, 115, 22, 0.3);
        }

        .zone-non-assignee--drag-over {
          border: 1px dashed rgba(251, 191, 36, 0.5);
          box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.1);
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
          font-family: var(--cx-font-sans);
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

        .select-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border: 1px solid var(--cx-border-default);
          border-radius: var(--cx-radius-md);
          background: var(--cx-surface-2);
          color: var(--cx-text-tertiary);
          font-size: var(--cx-text-xs);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .select-all-btn:hover {
          background: var(--cx-accent-muted);
          border-color: var(--cx-accent);
          color: var(--cx-accent);
        }

        .select-all-btn.has-selection {
          background: var(--cx-accent-muted);
          border-color: var(--cx-accent);
          color: var(--cx-accent);
        }

        .delete-selection-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: var(--cx-radius-md);
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          font-size: var(--cx-text-xs);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .delete-selection-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.6);
          color: #fca5a5;
        }

        /* Button styles now in cutx.css (cx-add-ligne-btn) */

        .zone-content {
          padding: 12px;
        }

        .drop-zone {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 25px;
          border: 1.5px dashed var(--cx-border-default);
          border-radius: var(--cx-radius-lg);
          color: var(--cx-text-muted);
          font-size: var(--cx-text-sm);
          font-weight: 500;
          letter-spacing: 0.01em;
          text-align: center;
          transition: all 0.2s ease;
        }

        .drop-zone :global(.drop-zone-icon) {
          opacity: 0.5;
          transition: all 0.3s ease;
        }

        .drop-zone--active :global(.drop-zone-icon) {
          opacity: 1;
          animation: bounce-subtle 2s ease-in-out infinite;
        }

        .drop-zone--over :global(.drop-zone-icon) {
          opacity: 1;
          animation: none;
          transform: scale(1.1);
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .drop-zone--compact {
          margin-top: 8px;
          padding: 20px;
        }

        /* État actif - drag en cours */
        .drop-zone--active {
          border-color: var(--cx-warning);
          border-style: dashed;
          color: var(--cx-warning);
          background: rgba(251, 191, 36, 0.03);
        }

        /* État hover - prêt à recevoir */
        .drop-zone--over {
          border-color: var(--cx-warning);
          color: var(--cx-warning);
          background: rgba(251, 191, 36, 0.08);
        }

        /* TABLE styles now in cutx.css (cx-table-*, cx-col-*) */

        .th-with-apply {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .apply-col-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          padding: 0;
          border: none;
          border-radius: 3px;
          background: var(--cx-accent-muted);
          color: var(--cx-accent);
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.15s;
        }

        .apply-col-btn:hover {
          opacity: 1;
          background: var(--cx-accent);
          color: var(--cx-surface-0);
        }
      `}</style>
    </div>
  );
}
