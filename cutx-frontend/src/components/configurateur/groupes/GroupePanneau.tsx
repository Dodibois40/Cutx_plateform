'use client';

// components/configurateur/groupes/GroupePanneau.tsx
// Composant pour afficher un groupe de panneau avec ses lignes complètes
// UNE SEULE TABLE avec thead + tbody pour alignement parfait

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Trash2, Package, Plus, ArrowDownToLine, Layers, MoveVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupePanneau as GroupePanneauType } from '@/lib/configurateur/groupes/types';
import type { LignePrestationV3, TypeFinition, Chants } from '@/lib/configurateur/types';
import type { ColonneDuplicableGroupe, FinitionApplyValue } from '@/contexts/GroupesContext';
import { getPanneauDisplayInfo, isPanneauCatalogue } from '@/lib/configurateur/groupes/helpers';
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
}

export function GroupePanneau({
  groupe,
  lignesFinition,
  totaux,
  isDragging = false,
  onToggleExpand,
  onSelectPanneau,
  onSelectMulticouche,
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
    <div className="groupe-panneau">

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

        {/* Info panneau - cliquable pour changer */}
        <div className="panneau-info">
          {groupe.panneau ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Si c'est un panneau multicouche et qu'on a le callback, ouvrir le popup multicouche
                if (groupe.panneau?.type === 'multicouche' && onSelectMulticouche) {
                  onSelectMulticouche();
                } else {
                  onSelectPanneau();
                }
              }}
              className="panneau-details panneau-details--clickable"
            >
              {(() => {
                const info = getPanneauDisplayInfo(groupe.panneau);
                if (!info) return null;

                // Pour multicouche, afficher en 2 colonnes alignées ligne par ligne
                if (info.isMulticouche && groupe.panneau?.type === 'multicouche') {
                  const couches = groupe.panneau.panneau.couches;
                  const prixTotalM2 = couches.reduce((sum, c) => sum + (c.prixPanneauM2 || 0), 0);
                  // Calculer le prix total de tous les panneaux
                  const prixTotalPanneaux = couches.reduce((sum, c) => {
                    if (c.panneauLongueur && c.panneauLargeur) {
                      return sum + (c.panneauLongueur * c.panneauLargeur / 1_000_000) * (c.prixPanneauM2 || 0);
                    }
                    return sum;
                  }, 0);

                  return (
                    <div className="multicouche-layout">
                      {/* Colonne gauche: Infos générales */}
                      <div className="multicouche-left">
                        {/* Ligne 1: Titre */}
                        <div className="multicouche-row">
                          <div className="multicouche-icon">
                            <Layers size={16} />
                          </div>
                          <div className="multicouche-row-content">
                            <span className="multicouche-title">Panneau multicouche</span>
                          </div>
                        </div>
                        {/* Ligne 2: Badges */}
                        <div className="multicouche-row">
                          <div className="multicouche-icon" />
                          <div className="multicouche-row-content">
                            <span className="badge-multicouche">{couches.length} couches</span>
                            <span className={cn(
                              'mode-badge',
                              info.modeCollage === 'client' && 'mode-badge--client'
                            )}>
                              Collage {info.modeCollage === 'fournisseur' ? 'fournisseur' : 'client'}
                            </span>
                          </div>
                        </div>
                        {/* Ligne 3: Prix */}
                        <div className="multicouche-row">
                          <div className="multicouche-icon" />
                          <div className="multicouche-row-content">
                            <span className="multicouche-epaisseur">Ép. totale: {info.epaisseur?.toFixed(1)}mm</span>
                            <span className="multicouche-prix-m2">Prix: {prixTotalM2.toFixed(2)}€/m²</span>
                          </div>
                        </div>
                      </div>
                      {/* Colonne droite: Liste des couches */}
                      <div className="multicouche-right">
                        {couches.map((couche, idx) => {
                          // Calculer prix panneau si dimensions disponibles
                          const prixPanneau = (couche.panneauLongueur && couche.panneauLargeur)
                            ? (couche.panneauLongueur * couche.panneauLargeur / 1_000_000) * (couche.prixPanneauM2 || 0)
                            : null;

                          return (
                            <div key={couche.id} className="couche-row">
                              <span className="couche-ordre">{idx + 1}</span>
                              <span className="couche-nom" title={couche.panneauNom || couche.materiau}>
                                {couche.panneauNom || couche.materiau}
                              </span>
                              <span className="couche-epaisseur">{couche.epaisseur}mm</span>
                              <span className="couche-prix-m2">{(couche.prixPanneauM2 || 0).toFixed(2)}€/m²</span>
                              <span className="couche-prix-panneau">
                                {prixPanneau !== null ? `${prixPanneau.toFixed(2)}€` : '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Affichage standard pour panneau catalogue
                return (
                  <>
                    {info.imageUrl ? (
                      <img
                        src={info.imageUrl}
                        alt={info.nomSansDimensions}
                        className="panneau-thumb"
                      />
                    ) : null}
                    <div className="panneau-text">
                      <span className="panneau-nom">
                        {info.nomSansDimensions}
                      </span>
                      <span className="panneau-meta">
                        {/* Dimensions brut du panneau */}
                        {info.longueur && info.largeur && (
                          <span className="panneau-dimensions">
                            {info.longueur} × {info.largeur} mm
                          </span>
                        )}
                        {info.epaisseurs.length > 0 && (
                          <span>ép. {info.epaisseurs.join(', ')}mm</span>
                        )}
                        {info.prixM2 != null && info.prixM2 > 0 && (
                          <span className="panneau-prix">
                            {info.prixM2.toFixed(2)}€/m²
                          </span>
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
              className="select-panneau-btn"
            >
              <Package className="w-4 h-4" />
              <span>Sélectionner un panneau...</span>
            </button>
          )}
        </div>

        {/* Stats et actions */}
        <div className="groupe-stats">
          {/* Prix du panneau brut - largeur fixe pour alignement */}
          <div className="prix-panneau-slot">
            {prixPanneauBrut !== null && (
              <span className="prix-panneau-brut">
                Tarif achat panneau: {prixPanneauBrut.toFixed(2)}€
              </span>
            )}
          </div>

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
          border-color: var(--cx-accent);
          box-shadow: 0 0 0 2px var(--cx-accent-muted);
        }

        .groupe-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
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

        .panneau-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--cx-accent);
          flex-shrink: 0;
        }

        .panneau-info {
          flex: 1;
          min-width: 0;
          display: flex;
          justify-content: flex-start;
        }

        .panneau-details {
          display: flex;
          align-items: center;
          gap: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        .panneau-details--clickable {
          padding: 6px 10px;
          border-radius: var(--cx-radius-md);
          transition: all 0.15s;
        }

        .panneau-details--clickable:hover {
          background: var(--cx-surface-3);
        }

        .panneau-thumb {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid var(--cx-border-subtle);
          flex-shrink: 0;
        }

        .panneau-thumb--multicouche {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--cx-surface-3), var(--cx-surface-2));
          color: var(--cx-warning);
        }

        .panneau-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .panneau-nom {
          font-weight: 600;
          font-size: var(--cx-text-sm);
          color: var(--cx-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .panneau-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--cx-text-xs);
          color: var(--cx-text-tertiary);
        }

        .panneau-prix {
          color: var(--cx-accent);
          font-weight: 600;
        }

        .panneau-dimensions {
          color: var(--cx-text-secondary);
          padding: 2px 6px;
          background: var(--cx-surface-3);
          border-radius: 4px;
        }

        .badge-multicouche {
          padding: 2px 6px;
          font-size: var(--cx-text-xs);
          font-weight: 500;
          background: var(--cx-warning-muted);
          color: var(--cx-warning);
          border-radius: 4px;
        }

        .mode-badge {
          padding: 2px 6px;
          font-size: var(--cx-text-xs);
          background: var(--cx-accent-muted);
          color: var(--cx-accent);
          border-radius: 4px;
        }

        .mode-badge--client {
          background: var(--cx-warning-muted);
          color: var(--cx-warning);
        }

        /* Multicouche layout 2 colonnes */
        .multicouche-layout {
          display: flex;
          gap: 24px;
          width: 100%;
          align-items: stretch;
        }

        .multicouche-left {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .multicouche-row {
          display: grid;
          grid-template-columns: 32px 1fr;
          align-items: center;
          gap: 8px;
          height: 20px; /* Même hauteur que couche-row */
        }

        .multicouche-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cx-warning);
        }

        .multicouche-row-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .multicouche-title {
          font-weight: 600;
          font-size: var(--cx-text-sm);
          color: var(--cx-text-primary);
          white-space: nowrap;
        }

        .multicouche-epaisseur {
          font-size: var(--cx-text-xs);
          color: var(--cx-text-secondary);
          white-space: nowrap;
        }

        .multicouche-prix-m2 {
          font-weight: 600;
          font-size: var(--cx-text-xs);
          color: var(--cx-accent);
          white-space: nowrap;
        }

        .multicouche-right {
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--cx-border-subtle);
          padding-left: 16px;
        }

        .couche-row {
          display: grid;
          grid-template-columns: 18px 200px 40px 65px 70px;
          align-items: center;
          gap: 6px;
          font-size: var(--cx-text-xs);
          height: 20px; /* Même hauteur que multicouche-row */
        }

        .couche-ordre {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          background: var(--cx-accent-muted);
          color: var(--cx-accent);
          border-radius: 50%;
          font-weight: 600;
          font-size: 9px;
          flex-shrink: 0;
        }

        .couche-nom {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--cx-text-primary);
        }

        .couche-epaisseur {
          color: var(--cx-text-tertiary);
          text-align: right;
        }

        .couche-prix-m2 {
          color: var(--cx-text-secondary);
          text-align: right;
        }

        .couche-prix-panneau {
          color: var(--cx-accent);
          font-weight: 600;
          text-align: right;
        }

        .select-panneau-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px dashed var(--cx-border-default);
          border-radius: 8px;
          background: transparent;
          color: var(--cx-text-muted);
          cursor: pointer;
          transition: all 0.15s;
          font-size: var(--cx-text-sm);
        }

        .select-panneau-btn:hover {
          border-color: var(--cx-accent);
          color: var(--cx-accent);
          background: var(--cx-accent-subtle);
        }

        .groupe-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }

        .prix-panneau-slot {
          position: absolute;
          left: 850px;
          display: flex;
        }

        .stats-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          margin-left: auto;
        }

        .prix-panneau-brut {
          font-size: var(--cx-text-sm);
          font-weight: 600;
          color: var(--cx-warning);
          padding: 4px 10px;
          background: var(--cx-warning-muted);
          border-radius: var(--cx-radius-md);
        }

        .lignes-count {
          font-size: var(--cx-text-sm);
          color: var(--cx-text-tertiary);
        }

        .surface-total {
          font-size: var(--cx-text-sm);
          color: var(--cx-text-secondary);
        }

        .prix-total {
          font-size: var(--cx-text-sm);
          font-weight: 600;
          color: var(--cx-accent);
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
