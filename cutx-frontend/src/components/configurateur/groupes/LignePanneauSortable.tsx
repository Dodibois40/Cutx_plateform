'use client';

// components/configurateur/groupes/LignePanneauSortable.tsx
// Wrapper sortable pour LignePanneau dans les tables du mode groupes
// Utilise useSortable et passe les props de drag à LignePanneau

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LignePanneau from '../LignePanneau';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import type { PanneauGroupe } from '@/lib/configurateur/groupes/types';
import { isPanneauCatalogue, isPanneauMulticouche } from '@/lib/configurateur/groupes/helpers';

interface LignePanneauSortableProps {
  ligne: LignePrestationV3;
  ligneFinition: LignePrestationV3 | null;
  panneauGroupe: PanneauGroupe | null;
  groupeId: string | null;
  index: number;
  onUpdate: (updates: Partial<LignePrestationV3>) => void;
  onUpdateFinition?: (updates: Partial<LignePrestationV3>) => void;
  onSupprimer: () => void;
  onCopier: () => void;
  onCreerFinition: (typeFinition: TypeFinition) => void;
  onSupprimerFinition: () => void;
  canDelete: boolean;
  // Props de sélection
  isSelected?: boolean;
  onToggleSelection?: () => void;
  selectedCount?: number;
}

export function LignePanneauSortable({
  ligne,
  ligneFinition,
  panneauGroupe,
  groupeId,
  index,
  onUpdate,
  onUpdateFinition,
  onSupprimer,
  onCopier,
  onCreerFinition,
  onSupprimerFinition,
  canDelete,
  isSelected = false,
  onToggleSelection,
  selectedCount = 0,
}: LignePanneauSortableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ligne.id,
    data: {
      type: 'ligne',
      ligne,
      groupeId,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Extraire le panneau catalogue ou multicouche selon le type
  const panneauCatalogue = panneauGroupe && isPanneauCatalogue(panneauGroupe)
    ? panneauGroupe.panneau
    : null;
  const panneauMulticouche = panneauGroupe && isPanneauMulticouche(panneauGroupe)
    ? panneauGroupe.panneau
    : null;

  return (
    <LignePanneau
      ligne={ligne}
      ligneFinition={ligneFinition}
      panneauGlobal={panneauCatalogue}
      panneauMulticouche={panneauMulticouche}
      index={index}
      onUpdate={onUpdate}
      onUpdateFinition={onUpdateFinition}
      onSupprimer={onSupprimer}
      onCopier={onCopier}
      onCreerFinition={onCreerFinition}
      onSupprimerFinition={onSupprimerFinition}
      canDelete={canDelete}
      hidePanelColumn={true}
      // Props de drag
      dragRef={setNodeRef}
      dragStyle={style}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
      // Props de sélection
      isSelected={isSelected}
      onToggleSelection={onToggleSelection}
      selectedCount={selectedCount}
    />
  );
}
