'use client';

import { useState, useCallback } from 'react';
import { usePanelAssignment } from '@/components/admin/arborescence/panel-manager';

export function usePanelDropHandler(onSuccess: () => void) {
  const { assignPanelsToCategory, isAssigning } = usePanelAssignment();
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0);

  const handlePanelsDropped = useCallback(
    async (panelIds: string[], categoryId: string) => {
      try {
        const result = await assignPanelsToCategory({ panelIds, categoryId });
        if (result.success > 0) {
          // Refresh to update panel counts
          await onSuccess();
          // Clear selection in PanelManager to prevent re-dropping same panels
          setClearSelectionTrigger((prev) => prev + 1);
        }
      } catch (err) {
        console.error('Error assigning panels:', err);
        alert(err instanceof Error ? err.message : "Erreur lors de l'assignation");
      }
    },
    [assignPanelsToCategory, onSuccess]
  );

  return {
    handlePanelsDropped,
    isAssigning,
    clearSelectionTrigger,
  };
}
