'use client';

// components/configurateur/groupes/GroupesContainer.tsx
// Container principal pour les groupes de panneaux avec drag & drop

import { useState, useCallback, useMemo } from 'react';
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
import { Plus, Package, Layers, ChevronDown } from 'lucide-react';
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
  } = useGroupes();

  // State pour le drag
  const [activeDragItem, setActiveDragItem] = useState<LignePrestationV3 | null>(null);
  const [activeGroupeId, setActiveGroupeId] = useState<string | null>(null);

  // State pour le warning épaisseur
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    warning: GroupeWarning | null;
    pendingResult: DragEndResult | null;
  }>({ open: false, warning: null, pendingResult: null });

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

    // Ne rien faire si même position
    if (sourceGroupeId === destinationGroupeId && active.id === over.id) {
      return;
    }

    const result: DragEndResult = {
      ligneId: active.id as string,
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
      });
    }
  }, [groupes, lignesNonAssignees, deplacerLigne]);

  // === HANDLERS GROUPES ===

  const handleAjouterGroupe = useCallback(() => {
    onSelectPanneau((panneau) => {
      creerGroupe({ panneau });
    });
  }, [onSelectPanneau, creerGroupe]);

  const handleSelectPanneauGroupe = useCallback((groupeId: string) => {
    onSelectPanneau((panneau) => {
      updatePanneauGroupe(groupeId, panneau);
    });
  }, [onSelectPanneau, updatePanneauGroupe]);

  // === HANDLER WARNING EPAISSEUR ===

  const handleAdapterEpaisseur = useCallback(() => {
    if (!warningDialog.pendingResult || !warningDialog.warning?.details) return;

    const { ligneId } = warningDialog.pendingResult;
    const { panneauEpaisseur } = warningDialog.warning.details;

    if (panneauEpaisseur) {
      adapterEpaisseurLigne(ligneId, panneauEpaisseur);
    }

    setWarningDialog({ open: false, warning: null, pendingResult: null });
  }, [warningDialog, adapterEpaisseurLigne]);

  const handleAnnulerDeplacement = useCallback(() => {
    // Le déplacement a déjà été fait, on le défait
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
    setWarningDialog({ open: false, warning: null, pendingResult: null });
  }, [warningDialog, deplacerLigne]);

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
          lignesFinition={(() => {
            // Filtrer les lignes de finition qui appartiennent aux lignes non assignées
            const ligneIdsNonAssignees = new Set(lignesNonAssignees.map(l => l.id));
            const lignesFinitionNonAssignees = new Map<string, LignePrestationV3>();
            lignesFinition.forEach((finition, panneauId) => {
              if (ligneIdsNonAssignees.has(panneauId)) {
                lignesFinitionNonAssignees.set(panneauId, finition);
              }
            });
            return lignesFinitionNonAssignees;
          })()}
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
              <span className="drag-ref">{activeDragItem.reference || 'Nouvelle ligne'}</span>
              <span className="drag-dims">
                {activeDragItem.dimensions.longueur} × {activeDragItem.dimensions.largeur} mm
              </span>
            </div>
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
                gap: 16px;
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
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-orange-400">
              Épaisseur différente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-zinc-300">
              {warningDialog.warning?.message}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleAnnulerDeplacement}
              className="border-zinc-600"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAdapterEpaisseur}
              className="bg-yellow-500 text-black hover:bg-yellow-400"
            >
              Adapter l&apos;épaisseur
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
