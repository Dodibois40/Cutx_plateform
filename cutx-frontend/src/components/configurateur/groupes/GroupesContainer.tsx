'use client';

// components/configurateur/groupes/GroupesContainer.tsx
// Container principal pour les groupes de panneaux avec drag & drop

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Plus, Package, Layers, ChevronDown, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGroupes } from '@/contexts/GroupesContext';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { DragEndResult, GroupeWarning } from '@/lib/configurateur/groupes/types';
import { GroupePanneau } from './GroupePanneau';
import { ZoneNonAssignee } from './ZoneNonAssignee';

interface GroupesContainerProps {
  panneauxCatalogue: PanneauCatalogue[];
  onSelectPanneau: (callback: (panneau: PanneauCatalogue) => void) => void;
  onOpenMulticouche?: () => void;
  onCopierLigne: (ligneId: string) => void;
}

export function GroupesContainer({
  panneauxCatalogue,
  onSelectPanneau,
  onOpenMulticouche,
  onCopierLigne,
}: GroupesContainerProps) {
  const {
    groupes,
    lignesNonAssignees,
    lignesFinition,
    totauxParGroupe,
    totauxGlobaux,
    creerGroupe,
    supprimerGroupe,
    updatePanneauGroupe,
    toggleExpandGroupe,
    ajouterLigneNonAssignee,
    ajouterLigneGroupe,
    supprimerLigne,
    updateLigne,
    deplacerLigne,
    adapterEpaisseurLigne,
    creerLigneFinitionGroupe,
    supprimerLigneFinitionGroupe,
    updateLigneFinition,
    applyToColumnGroupe,
    // Multi-sélection
    selectedLigneIds,
    toggleLigneSelection,
    clearSelection,
    isLigneSelected,
    deplacerLignesMultiples,
    executerDeplacementMultiple,
  } = useGroupes();

  // Mémoriser les lignes de finition pour les non assignées (stabilité des refs)
  const lignesFinitionNonAssignees = useMemo(() => {
    const ligneIdsNonAssignees = new Set(lignesNonAssignees.map(l => l.id));
    const result = new Map<string, LignePrestationV3>();
    lignesFinition.forEach((finition, panneauId) => {
      if (ligneIdsNonAssignees.has(panneauId)) {
        result.set(panneauId, finition);
      }
    });
    return result;
  }, [lignesNonAssignees, lignesFinition]);

  // State pour éviter les erreurs d'hydratation avec dnd-kit
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // State pour le drag
  const [activeDragItem, setActiveDragItem] = useState<LignePrestationV3 | null>(null);
  const [activeGroupeId, setActiveGroupeId] = useState<string | null>(null);

  // State pour le warning épaisseur (single et multi-select)
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    warning: GroupeWarning | null;
    pendingResult: DragEndResult | null;
    isMultiSelect: boolean;
  }>({ open: false, warning: null, pendingResult: null, isMultiSelect: false });

  // Sensors pour le drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // === HANDLERS DND ===

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'ligne') {
      setActiveDragItem(data.ligne);
      setActiveGroupeId(data.groupeId);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragItem(null);
    setActiveGroupeId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== 'ligne') return;

    // Déterminer la destination
    let destinationGroupeId: string | null = null;
    let destinationIndex = 0;

    if (overData?.type === 'groupe') {
      destinationGroupeId = overData.groupeId;
      const groupe = groupes.find(g => g.id === destinationGroupeId);
      destinationIndex = groupe?.lignes.length ?? 0;
    } else if (overData?.type === 'zone-non-assignee') {
      destinationGroupeId = null;
      destinationIndex = lignesNonAssignees.length;
    } else if (overData?.type === 'ligne') {
      // Dropped sur une autre ligne
      destinationGroupeId = overData.groupeId;
      if (destinationGroupeId) {
        const groupe = groupes.find(g => g.id === destinationGroupeId);
        destinationIndex = groupe?.lignes.findIndex(l => l.id === over.id) ?? 0;
      } else {
        destinationIndex = lignesNonAssignees.findIndex(l => l.id === over.id);
      }
    }

    const sourceGroupeId = activeData.groupeId;
    const draggedLigneId = active.id as string;

    // Ne rien faire si même position
    if (sourceGroupeId === destinationGroupeId && active.id === over.id) {
      return;
    }

    // Vérifier si c'est un déplacement multi-sélection
    if (selectedLigneIds.size > 1 && selectedLigneIds.has(draggedLigneId)) {
      // Vérifier les épaisseurs et afficher un warning si nécessaire
      const multiWarning = deplacerLignesMultiples(destinationGroupeId, destinationIndex);
      if (multiWarning?.type === 'epaisseur_mismatch_multi') {
        setWarningDialog({
          open: true,
          warning: multiWarning,
          pendingResult: null,
          isMultiSelect: true,
        });
      }
      return;
    }

    // Déplacement simple (une seule ligne)
    const result: DragEndResult = {
      ligneId: draggedLigneId,
      sourceGroupeId,
      destinationGroupeId,
      sourceIndex: 0, // Calculé par deplacerLigne
      destinationIndex,
    };

    // Effectuer le déplacement et vérifier les warnings
    const warning = deplacerLigne(result);

    if (warning?.type === 'epaisseur_mismatch') {
      setWarningDialog({
        open: true,
        warning,
        pendingResult: result,
        isMultiSelect: false,
      });
    }

    // Vider la sélection après un déplacement simple
    clearSelection();
  }, [groupes, lignesNonAssignees, deplacerLigne, selectedLigneIds, deplacerLignesMultiples, clearSelection]);

  // === HANDLERS GROUPES ===

  const handleAjouterGroupe = useCallback(() => {
    onSelectPanneau((panneau) => {
      // Wrapper le panneau catalogue dans le nouveau format PanneauGroupe
      creerGroupe({ panneau: { type: 'catalogue', panneau } });
    });
  }, [onSelectPanneau, creerGroupe]);

  const handleSelectPanneauGroupe = useCallback((groupeId: string) => {
    onSelectPanneau((panneau) => {
      // Wrapper le panneau catalogue dans le nouveau format PanneauGroupe
      updatePanneauGroupe(groupeId, { type: 'catalogue', panneau });
    });
  }, [onSelectPanneau, updatePanneauGroupe]);

  // === HANDLER WARNING EPAISSEUR ===

  // Handler pour le déplacement simple (une seule ligne)
  const handleAdapterEpaisseur = useCallback(() => {
    if (!warningDialog.pendingResult || !warningDialog.warning?.details) return;

    const { ligneId } = warningDialog.pendingResult;
    const { panneauEpaisseur } = warningDialog.warning.details;

    if (panneauEpaisseur) {
      adapterEpaisseurLigne(ligneId, panneauEpaisseur);
    }

    setWarningDialog({ open: false, warning: null, pendingResult: null, isMultiSelect: false });
  }, [warningDialog, adapterEpaisseurLigne]);

  const handleAnnulerDeplacement = useCallback(() => {
    // Pour multi-select, rien à annuler (le déplacement n'a pas encore été fait)
    if (warningDialog.isMultiSelect) {
      clearSelection();
      setWarningDialog({ open: false, warning: null, pendingResult: null, isMultiSelect: false });
      return;
    }

    // Pour déplacement simple, le déplacement a déjà été fait, on le défait
    if (warningDialog.pendingResult) {
      const { ligneId, sourceGroupeId, destinationGroupeId, sourceIndex } = warningDialog.pendingResult;
      // Remettre la ligne à sa place originale
      deplacerLigne({
        ligneId,
        sourceGroupeId: destinationGroupeId,
        destinationGroupeId: sourceGroupeId,
        sourceIndex: 0,
        destinationIndex: sourceIndex,
      });
    }
    setWarningDialog({ open: false, warning: null, pendingResult: null, isMultiSelect: false });
  }, [warningDialog, deplacerLigne, clearSelection]);

  // Handler pour déplacer seulement les lignes compatibles (multi-select)
  const handleDeplacerCompatiblesUniquement = useCallback(() => {
    if (!warningDialog.warning?.details) return;

    const { lignesCompatibles, destinationGroupeId, destinationIndex } = warningDialog.warning.details;

    if (lignesCompatibles && lignesCompatibles.length > 0) {
      executerDeplacementMultiple(
        lignesCompatibles,
        destinationGroupeId ?? null,
        destinationIndex ?? 0,
        false
      );
    }

    setWarningDialog({ open: false, warning: null, pendingResult: null, isMultiSelect: false });
  }, [warningDialog, executerDeplacementMultiple]);

  // Handler pour adapter toutes les épaisseurs et déplacer (multi-select)
  const handleAdapterToutesEpaisseurs = useCallback(() => {
    if (!warningDialog.warning?.details) return;

    const { lignesCompatibles, lignesIncompatibles, destinationGroupeId, destinationIndex } = warningDialog.warning.details;

    // Combiner toutes les lignes
    const toutesLignes = [
      ...(lignesCompatibles || []),
      ...(lignesIncompatibles || []),
    ];

    if (toutesLignes.length > 0) {
      executerDeplacementMultiple(
        toutesLignes,
        destinationGroupeId ?? null,
        destinationIndex ?? 0,
        true // Adapter les épaisseurs
      );
    }

    setWarningDialog({ open: false, warning: null, pendingResult: null, isMultiSelect: false });
  }, [warningDialog, executerDeplacementMultiple]);

  // Éviter l'erreur d'hydratation avec dnd-kit (IDs différents serveur/client)
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="text-center text-sm text-zinc-500 py-8">Chargement...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Liste des groupes */}
        {groupes.map((groupe) => {
          const totaux = totauxParGroupe.find(t => t.groupeId === groupe.id) ?? {
            nbLignes: groupe.lignes.length,
            surfaceTotaleM2: 0,
            prixTotalHT: 0,
          };

          // Filtrer les lignes de finition qui appartiennent aux lignes de ce groupe
          const ligneIdsGroupe = new Set(groupe.lignes.map(l => l.id));
          const lignesFinitionGroupe = new Map<string, LignePrestationV3>();
          lignesFinition.forEach((finition, panneauId) => {
            if (ligneIdsGroupe.has(panneauId)) {
              lignesFinitionGroupe.set(panneauId, finition);
            }
          });

          return (
            <GroupePanneau
              key={groupe.id}
              groupe={groupe}
              lignesFinition={lignesFinitionGroupe}
              totaux={totaux}
              onToggleExpand={() => toggleExpandGroupe(groupe.id)}
              onSelectPanneau={() => handleSelectPanneauGroupe(groupe.id)}
              onSupprimer={() => supprimerGroupe(groupe.id)}
              onAjouterLigne={() => ajouterLigneGroupe(groupe.id)}
              onUpdateLigne={(ligneId, updates) => updateLigne(ligneId, updates as Partial<LignePrestationV3>)}
              onSupprimerLigne={supprimerLigne}
              onCopierLigne={onCopierLigne}
              onCreerLigneFinition={(lignePanneauId, typeFinition) => {
                creerLigneFinitionGroupe(lignePanneauId, typeFinition);
              }}
              onSupprimerLigneFinition={(lignePanneauId) => {
                supprimerLigneFinitionGroupe(lignePanneauId);
              }}
              onUpdateLigneFinition={updateLigneFinition}
              onApplyToColumn={(colonne, valeur) => applyToColumnGroupe(colonne, valeur, groupe.id)}
              // Props de sélection
              selectedLigneIds={selectedLigneIds}
              onToggleLigneSelection={toggleLigneSelection}
            />
          );
        })}

        {/* Boutons de création de groupe - sous les groupes existants */}
        <div className="panel-selection-buttons">
          {/* Sélectionner un panneau */}
          <button onClick={handleAjouterGroupe} className="panel-selector panel-selector--empty">
            <div className="panel-selector-placeholder">
              <Package size={16} />
            </div>
            <span className="panel-selector-name">Sélectionner un panneau</span>
            <ChevronDown size={14} className="panel-selector-chevron" />
          </button>

          {/* Créer un panneau multicouche */}
          {onOpenMulticouche && (
            <button onClick={onOpenMulticouche} className="panel-selector panel-selector--empty panel-selector--multicouche">
              <div className="panel-selector-placeholder panel-selector-placeholder--multicouche">
                <Layers size={16} />
              </div>
              <span className="panel-selector-name">Créer un panneau multicouche</span>
              <ChevronDown size={14} className="panel-selector-chevron" />
            </button>
          )}
        </div>

        {/* Zone non assignée */}
        <ZoneNonAssignee
          lignes={lignesNonAssignees}
          lignesFinition={lignesFinitionNonAssignees}
          onAjouterLigne={ajouterLigneNonAssignee}
          onUpdateLigne={(ligneId, updates) => updateLigne(ligneId, updates as Partial<LignePrestationV3>)}
          onSupprimerLigne={supprimerLigne}
          onCopierLigne={onCopierLigne}
          onCreerLigneFinition={(lignePanneauId, typeFinition) => {
            creerLigneFinitionGroupe(lignePanneauId, typeFinition);
          }}
          onSupprimerLigneFinition={(lignePanneauId) => {
            supprimerLigneFinitionGroupe(lignePanneauId);
          }}
          onUpdateLigneFinition={updateLigneFinition}
          onApplyToColumn={(colonne, valeur) => applyToColumnGroupe(colonne, valeur, null)}
          // Props de sélection
          selectedLigneIds={selectedLigneIds}
          onToggleLigneSelection={toggleLigneSelection}
        />

        <style jsx>{`
          .panel-selection-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
          }

          .panel-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 12px 6px 6px;
            min-width: 260px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-lg);
            cursor: pointer;
            transition: all var(--cx-transition-fast);
          }

          .panel-selector:hover {
            border-color: var(--cx-border-strong);
            background: var(--cx-surface-3);
          }

          .panel-selector--empty {
            border-style: dashed;
            border-color: var(--cx-warning);
            background: var(--cx-warning-muted);
          }

          .panel-selector-placeholder {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--cx-surface-3);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-muted);
          }

          .panel-selector-placeholder--multicouche {
            background: linear-gradient(135deg, var(--cx-surface-3), var(--cx-surface-2));
            color: var(--cx-text-tertiary);
          }

          .panel-selector-name {
            font-size: var(--cx-text-sm);
            font-weight: 500;
            color: var(--cx-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .panel-selector-chevron {
            color: var(--cx-text-muted);
            flex-shrink: 0;
          }
        `}</style>

        {/* Total global */}
        {totauxGlobaux.prixTotalHT > 0 && (
          <div className="flex justify-end pt-4 border-t border-zinc-700">
            <div className="text-right">
              <div className="text-sm text-zinc-400">
                {totauxGlobaux.nbLignesTotal} ligne{totauxGlobaux.nbLignesTotal > 1 ? 's' : ''} •{' '}
                {totauxGlobaux.surfaceTotaleM2.toFixed(2)}m²
              </div>
              <div className="text-xl font-bold text-yellow-500">
                {totauxGlobaux.prixTotalHT.toFixed(2)}€ HT
              </div>
              <div className="text-sm text-zinc-400">
                {totauxGlobaux.prixTotalTTC.toFixed(2)}€ TTC
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drag overlay - affiche un aperçu simplifié pendant le drag */}
      <DragOverlay>
        {activeDragItem && (
          <div className="drag-overlay-item">
            <div className="drag-preview">
              {/* Badge avec nombre d'éléments si multi-sélection */}
              {selectedLigneIds.size > 1 && selectedLigneIds.has(activeDragItem.id) && (
                <span className="drag-count-badge">{selectedLigneIds.size}</span>
              )}
              <span className="drag-ref">{activeDragItem.reference || 'Nouvelle ligne'}</span>
              <span className="drag-dims">
                {activeDragItem.dimensions.longueur} × {activeDragItem.dimensions.largeur} mm
              </span>
            </div>
            {/* Indicateur multi-sélection */}
            {selectedLigneIds.size > 1 && selectedLigneIds.has(activeDragItem.id) && (
              <div className="drag-multi-hint">
                + {selectedLigneIds.size - 1} autre{selectedLigneIds.size > 2 ? 's' : ''} ligne{selectedLigneIds.size > 2 ? 's' : ''}
              </div>
            )}
            <style jsx>{`
              .drag-overlay-item {
                opacity: 0.9;
                background: var(--cx-surface-2);
                border: 2px solid var(--cx-accent);
                border-radius: var(--cx-radius-lg);
                padding: 12px 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
              }
              .drag-preview {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .drag-count-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background: var(--cx-accent);
                color: white;
                border-radius: 50%;
                font-size: 0.75rem;
                font-weight: 700;
                flex-shrink: 0;
              }
              .drag-ref {
                font-weight: 600;
                color: var(--cx-text-primary);
              }
              .drag-dims {
                font-size: 0.875rem;
                color: var(--cx-text-tertiary);
                font-family: var(--cx-font-mono);
              }
              .drag-multi-hint {
                margin-top: 8px;
                font-size: 0.75rem;
                color: var(--cx-text-muted);
                font-style: italic;
              }
            `}</style>
          </div>
        )}
      </DragOverlay>

      {/* Dialog warning épaisseur */}
      <Dialog
        open={warningDialog.open}
        onOpenChange={(open) => {
          if (!open) handleAnnulerDeplacement();
        }}
      >
        <DialogContent className="!p-0 !gap-0 bg-zinc-900 border-zinc-700 max-w-sm">
          <DialogTitle className="sr-only">
            {warningDialog.isMultiSelect ? 'Épaisseurs incompatibles' : 'Épaisseur différente'}
          </DialogTitle>
          {warningDialog.isMultiSelect ? (
            /* === DIALOG MULTI-SELECT === */
            <>
              <div className="p-5 pb-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-yellow-500 mb-1" aria-hidden="true">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  Épaisseurs incompatibles
                </h3>
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-300">{warningDialog.warning?.details?.lignesIncompatibles?.length}</span> ligne{(warningDialog.warning?.details?.lignesIncompatibles?.length || 0) > 1 ? 's' : ''} sur <span className="text-zinc-300">{((warningDialog.warning?.details?.lignesCompatibles?.length || 0) + (warningDialog.warning?.details?.lignesIncompatibles?.length || 0))}</span> avec une épaisseur différente du panneau (<span className="text-zinc-300">{warningDialog.warning?.details?.panneauEpaisseur}mm</span>).
                </p>
              </div>

              <div className="px-5 pb-4 space-y-2">
                {(warningDialog.warning?.details?.lignesCompatibles?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleDeplacerCompatiblesUniquement}
                    className="w-full p-3 rounded border-l-2 border-l-yellow-500 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <div className="text-sm text-zinc-200">Déplacer les compatibles uniquement</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      <span className="text-yellow-500/80">{warningDialog.warning?.details?.lignesCompatibles?.length}</span> déplacée{(warningDialog.warning?.details?.lignesCompatibles?.length || 0) > 1 ? 's' : ''}, créez un nouveau groupe avec un panneau adapté pour les autres
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAdapterToutesEpaisseurs}
                  className="w-full p-3 rounded border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="text-sm text-zinc-200">Adapter toutes les épaisseurs</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Toutes passent à <span className="text-zinc-400">{warningDialog.warning?.details?.panneauEpaisseur}mm</span>
                  </div>
                </button>
              </div>

              <div className="px-5 pb-4">
                <div className="flex items-start gap-2 text-xs text-zinc-500">
                  <Info size={14} className="text-yellow-500/70 flex-shrink-0 mt-0.5" />
                  <p>Pour conserver les épaisseurs d&apos;origine, créez un nouveau groupe avec un panneau adapté à chaque épaisseur.</p>
                </div>
              </div>

              <div className="border-t border-zinc-800 p-3">
                <button
                  type="button"
                  onClick={handleAnnulerDeplacement}
                  className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            /* === DIALOG SIMPLE === */
            <>
              <div className="p-5 pb-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-yellow-500 mb-1" aria-hidden="true">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  Épaisseur différente
                </h3>
                <p className="text-xs text-zinc-400">
                  L&apos;épaisseur de la ligne (<span className="text-zinc-300">{warningDialog.warning?.details?.ligneEpaisseur}mm</span>) n&apos;est pas disponible pour ce panneau (<span className="text-zinc-300">{warningDialog.warning?.details?.panneauEpaisseur}mm</span>).
                </p>
              </div>

              <div className="px-5 pb-4 space-y-2">
                <button
                  type="button"
                  onClick={handleAdapterEpaisseur}
                  className="w-full p-3 rounded border-l-2 border-l-yellow-500 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="text-sm text-zinc-200">Adapter l&apos;épaisseur</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Passer à <span className="text-yellow-500/80">{warningDialog.warning?.details?.panneauEpaisseur}mm</span>
                  </div>
                </button>
              </div>

              <div className="px-5 pb-4">
                <div className="flex items-start gap-2 text-xs text-zinc-500">
                  <Info size={14} className="text-yellow-500/70 flex-shrink-0 mt-0.5" />
                  <p>Pour conserver l&apos;épaisseur d&apos;origine, créez un nouveau groupe avec un panneau adapté.</p>
                </div>
              </div>

              <div className="border-t border-zinc-800 p-3">
                <button
                  type="button"
                  onClick={handleAnnulerDeplacement}
                  className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
