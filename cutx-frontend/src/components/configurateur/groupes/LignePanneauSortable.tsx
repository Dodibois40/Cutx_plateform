'use client';

// components/configurateur/groupes/LignePanneauSortable.tsx
// Wrapper sortable pour LignePanneau dans les tables du mode groupes
// Utilise useSortable et passe les props de drag à LignePanneau

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LignePanneau from '../LignePanneau';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';

interface LignePanneauSortableProps {
  ligne: LignePrestationV3;
  ligneFinition: LignePrestationV3 | null;
  panneauGroupe: PanneauCatalogue | null;
  groupeId: string | null;
  index: number;
  onUpdate: (updates: Partial<LignePrestationV3>) => void;
  onUpdateFinition?: (updates: Partial<LignePrestationV3>) => void;
  onSupprimer: () => void;
  onCopier: () => void;
  onCreerFinition: (typeFinition: TypeFinition) => void;
  onSupprimerFinition: () => void;
  canDelete: boolean;
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

  return (
    <LignePanneau
      ligne={ligne}
      ligneFinition={ligneFinition}
      panneauGlobal={panneauGroupe}
      panneauMulticouche={null}
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
    />
  );
}
