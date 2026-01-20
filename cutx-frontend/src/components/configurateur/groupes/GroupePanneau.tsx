'use client';

// components/configurateur/groupes/GroupePanneau.tsx
// Composant pour afficher un groupe de panneau avec ses lignes complètes
// UNE SEULE TABLE avec thead + tbody pour alignement parfait

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Trash2, Package, Plus, ArrowDownToLine, Layers, MoveVertical, Scissors } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupePanneau as GroupePanneauType } from '@/lib/configurateur/groupes/types';
import type { LignePrestationV3, TypeFinition, Chants } from '@/lib/configurateur/types';
import type { ColonneDuplicableGroupe, FinitionApplyValue } from '@/contexts/GroupesContext';
import { getPanneauDisplayInfo, isPanneauCatalogue } from '@/lib/configurateur/groupes/helpers';
import { LignePanneauSortable } from './LignePanneauSortable';
import { ChantGroupeDisplay } from './ChantGroupeDisplay';
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

interface GroupePanneauProps {
  groupe: GroupePanneauType;
  lignesFinition: Map<string, LignePrestationV3>; // Map lignePanneauId -> ligneFinition
  totaux: {
    nbLignes: number;
    surfaceTotaleM2: number;
    prixTotalHT: number;
  };
  isDragging?: boolean; // État global de drag en cours
  onToggleExpand: () => void;
  onSelectPanneau: () => void;
  onSelectMulticouche?: () => void; // Callback pour ouvrir le popup multicouche
  onSelectChant: () => void;        // Callback pour sélectionner un chant
  onClearChant: () => void;         // Callback pour supprimer le chant
  onSupprimer: () => void;
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
  // Optimiseur
  onOptimiserGroupe?: () => void;
}

export function GroupePanneau({
  groupe,
  lignesFinition,
  totaux,
  isDragging = false,
  onToggleExpand,
  onSelectPanneau,
  onSelectMulticouche,
  onSelectChant,
  onClearChant,
  onSupprimer,
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
  onOptimiserGroupe,
}: GroupePanneauProps) {
  const t = useTranslations();

  // Drop zone pour ce groupe - utilisé uniquement sur les zones drop-zone
  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({
    id: groupe.id,
    data: {
      type: 'drop-zone',
      groupeId: groupe.id,
    },
  });

  const ligneIds = groupe.lignes.map(l => l.id);
  const lignesPanneau = groupe.lignes.filter(l => l.typeLigne === 'panneau');

  // Calculer le prix du panneau brut pour l'afficher dans les stats
  const prixPanneauBrut = (() => {
    if (!groupe.panneau) return null;
    const info = getPanneauDisplayInfo(groupe.panneau);
    if (!info) return null;

    // Multicouche: prix total des panneaux
    if (info.isMulticouche && groupe.panneau.type === 'multicouche') {
      const couches = groupe.panneau.panneau.couches;
      const total = couches.reduce((sum, c) => {
        if (c.panneauLongueur && c.panneauLargeur) {
          return sum + (c.panneauLongueur * c.panneauLargeur / 1_000_000) * (c.prixPanneauM2 || 0);
        }
        return sum;
      }, 0);
      return total > 0 ? total : null;
    }

    // Catalogue: prix du panneau
    if (info.prixM2 != null && info.prixM2 > 0 && info.longueur && info.largeur) {
      return (info.longueur * info.largeur / 1_000_000) * info.prixM2;
    }

    return null;
  })();

  return (
    <div className={`groupe-panneau ${isOver ? 'is-over' : ''}`}>

      {/* Header du groupe */}
      <div className="groupe-header" onClick={onToggleExpand}>
        {/* Chevron expand/collapse */}
        <button className="expand-btn">
          {groupe.isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {/* Indicateur panneau */}
        <div className="panneau-indicator" />

        {/* Panneau et Chant côte à côte */}
        <div className="panneau-chant-row">
          {/* Card Panneau */}
          <div className="panneau-card">
            {groupe.panneau ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (groupe.panneau?.type === 'multicouche' && onSelectMulticouche) {
                    onSelectMulticouche();
                  } else {
                    onSelectPanneau();
                  }
                }}
                className="panneau-card-btn"
              >
                {(() => {
                  const info = getPanneauDisplayInfo(groupe.panneau);
                  if (!info) return null;

                  // Pour multicouche
                  if (info.isMulticouche && groupe.panneau?.type === 'multicouche') {
                    const couches = groupe.panneau.panneau.couches;
                    return (
                      <>
                        <div className="card-thumb card-thumb--multicouche">
                          <Layers size={18} />
                        </div>
                        <div className="card-info">
                          <span className="card-label">PANNEAU</span>
                          <span className="card-nom">Multicouche ({couches.length} couches)</span>
                          <span className="card-meta">
                            <span>ép. {info.epaisseur?.toFixed(1)}mm</span>
                            <span className={cn('mode-badge-mini', info.modeCollage === 'client' && 'mode-badge-mini--client')}>
                              {info.modeCollage === 'fournisseur' ? 'Fournisseur' : 'Client'}
                            </span>
                          </span>
                        </div>
                      </>
                    );
                  }

                  // Affichage standard
                  return (
                    <>
                      {info.imageUrl ? (
                        <img src={info.imageUrl} alt="" className="card-thumb" />
                      ) : (
                        <div className="card-thumb card-thumb--empty">
                          <Package size={16} />
                        </div>
                      )}
                      <div className="card-info">
                        <span className="card-label">PANNEAU</span>
                        <span className="card-nom" title={info.nomSansDimensions}>
                          {info.nomSansDimensions}
                        </span>
                        <span className="card-meta">
                          {info.longueur && info.largeur && (
                            <span>{info.longueur} × {info.largeur} mm</span>
                          )}
                          {info.epaisseurs.length > 0 && (
                            <span>ép. {info.epaisseurs.join(', ')}mm</span>
                          )}
                          {info.prixM2 != null && info.prixM2 > 0 && (
                            <span className="card-prix">{info.prixM2.toFixed(2)}€/m²</span>
                          )}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPanneau();
                }}
                className="card-add-btn"
              >
                <Package className="w-4 h-4" />
                <span>Sélectionner panneau...</span>
              </button>
            )}
          </div>

          {/* Card Chant */}
          <div className="chant-card">
            <ChantGroupeDisplay
              chant={groupe.chant}
              onSelectChant={onSelectChant}
              onClearChant={onClearChant}
            />
          </div>
        </div>

        {/* Stats et actions - à droite */}
        <div className="groupe-stats">
          {/* Prix du panneau brut */}
          {prixPanneauBrut !== null && (
            <span className="prix-panneau-brut">
              Tarif achat panneau: {prixPanneauBrut.toFixed(2)}€
            </span>
          )}

          {/* Stats lignes/surface/prix */}
          <div className="stats-right">
            <span className="lignes-count">
              {totaux.nbLignes} ligne{totaux.nbLignes > 1 ? 's' : ''}
            </span>

            {totaux.surfaceTotaleM2 > 0 && (
              <span className="surface-total">
                {totaux.surfaceTotaleM2.toFixed(2)}m²
              </span>
            )}

            {totaux.prixTotalHT > 0 && (
              <span className="prix-total">
                {totaux.prixTotalHT.toFixed(2)}€
              </span>
            )}

            {/* Bouton optimiseur - visible dès qu'un panneau est sélectionné */}
            {/* DEBUG: onOptimiserGroupe={!!onOptimiserGroupe}, groupe.panneau={!!groupe.panneau} */}
            {groupe.panneau && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOptimiserGroupe) {
                    onOptimiserGroupe();
                  } else {
                    console.warn('onOptimiserGroupe not provided');
                  }
                }}
                className="optimize-btn"
                title="Optimiser la découpe"
              >
                <Scissors className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onSupprimer();
              }}
              className="delete-btn"
              title="Supprimer le groupe"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu du groupe (lignes) - UNE SEULE TABLE */}
      {groupe.isExpanded && (
        <div className="groupe-content">
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
                            panneauGroupe={groupe.panneau}
                            groupeId={groupe.id}
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

          {/* Sous-total du groupe */}
          {lignesPanneau.length > 0 && totaux.prixTotalHT > 0 && (
            <div className="groupe-subtotal">
              <span className="subtotal-label">Sous-total:</span>
              <span className="subtotal-value">
                {totaux.prixTotalHT.toFixed(2)}€ HT
              </span>
            </div>
          )}

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
        .groupe-panneau {
          border: 1px solid var(--cx-border-subtle);
          border-radius: var(--cx-radius-xl);
          overflow: hidden;
          background: var(--cx-surface-1);
          transition: all 0.2s;
        }

        .groupe-panneau.is-over {
          border: 2px dashed var(--cx-accent);
          box-shadow: 0 0 0 2px var(--cx-accent-muted);
        }

        .groupe-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px; /* Augmenté de 12px à 16px vertical */
          background: var(--cx-surface-2);
          border-bottom: 1px solid var(--cx-border-subtle);
          cursor: pointer;
          transition: background 0.15s;
          position: relative;
          font-family: var(--cx-font-sans);
        }

        .groupe-header:hover {
          background: var(--cx-surface-3);
        }

        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
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

        .panneau-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--cx-accent);
          flex-shrink: 0;
        }

        /* Row contenant Panneau et Chant côte à côte */
        .panneau-chant-row {
          display: flex;
          align-items: stretch;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        /* Card Panneau */
        .panneau-card {
          flex-shrink: 0;
        }

        .panneau-card-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border: 1px solid var(--cx-accent-subtle);
          border-radius: var(--cx-radius-lg);
          background: var(--cx-accent-muted);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .panneau-card-btn:hover {
          background: var(--cx-surface-3);
          border-color: var(--cx-accent);
        }

        .card-thumb {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid var(--cx-border-subtle);
          flex-shrink: 0;
        }

        .card-thumb--multicouche {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--cx-warning-muted), var(--cx-surface-3));
          color: var(--cx-warning);
          border-color: var(--cx-warning-subtle);
        }

        .card-thumb--empty {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cx-surface-3);
          color: var(--cx-text-muted);
        }

        .card-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .card-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--cx-accent);
          font-weight: 600;
        }

        .card-nom {
          font-weight: 600;
          font-size: 13px; /* Augmenté pour meilleure lisibilité */
          color: var(--cx-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px; /* Augmenté pour meilleure lisibilité */
          color: var(--cx-text-tertiary);
        }

        .card-prix {
          color: var(--cx-accent);
          font-weight: 600;
        }

        .mode-badge-mini {
          padding: 1px 5px;
          font-size: 10px;
          background: var(--cx-accent-muted);
          color: var(--cx-accent);
          border-radius: 3px;
          font-weight: 500;
        }

        .mode-badge-mini--client {
          background: var(--cx-warning-muted);
          color: var(--cx-warning);
        }

        .card-add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: 1px dashed var(--cx-border-default);
          border-radius: var(--cx-radius-lg);
          background: transparent;
          color: var(--cx-text-muted);
          cursor: pointer;
          transition: all 0.15s;
          font-size: 13px;
          font-weight: 500;
        }

        .card-add-btn:hover {
          border-color: var(--cx-accent);
          color: var(--cx-accent);
          background: var(--cx-accent-subtle);
        }

        /* Card Chant */
        .chant-card {
          flex-shrink: 0;
        }

        .groupe-stats {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
          margin-left: auto;
        }

        .stats-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
        }

        .prix-panneau-brut {
          font-size: 13px; /* Augmenté */
          font-weight: 600;
          color: var(--cx-warning);
          padding: 6px 12px;
          background: var(--cx-warning-muted);
          border-radius: var(--cx-radius-md);
          white-space: nowrap;
        }

        .lignes-count {
          font-size: 13px;
          color: var(--cx-text-tertiary);
        }

        .surface-total {
          font-size: 13px;
          font-weight: 500;
          color: var(--cx-text-secondary);
        }

        .prix-total {
          font-size: 13px;
          font-weight: 600;
          color: var(--cx-accent);
        }

        .optimize-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--cx-radius-md);
          color: var(--cx-accent);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .optimize-btn:hover {
          color: var(--cx-accent);
          background: var(--cx-accent-muted);
        }

        .delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--cx-radius-md);
          color: var(--cx-text-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .delete-btn:hover {
          color: var(--cx-error);
          background: var(--cx-error-muted);
        }

        .groupe-content {
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

        /* TABLE styles now in cutx.css (cx-table-*, cx-col-*, cx-add-ligne-btn) */

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

        .groupe-subtotal {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--cx-border-subtle);
        }

        .subtotal-label {
          font-size: var(--cx-text-sm);
          color: var(--cx-text-tertiary);
        }

        .subtotal-value {
          font-size: var(--cx-text-sm);
          font-weight: 600;
          color: var(--cx-accent);
        }
      `}</style>
    </div>
  );
}
