'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { AssignmentResult } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Hook for assigning panels to categories via the admin API
 */
export function usePanelAssignment() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      panelIds,
      categoryId,
    }: {
      panelIds: string[];
      categoryId: string;
    }): Promise<AssignmentResult> => {
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/catalogues/admin/panels/assign-category`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ panelIds, categoryId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de l\'assignation');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate category queries to refresh counts
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      // Also invalidate panel search to reflect new categories
      queryClient.invalidateQueries({ queryKey: ['catalogue-search'] });
    },
  });

  return {
    assignPanelsToCategory: mutation.mutateAsync,
    isAssigning: mutation.isPending,
    assignmentError: mutation.error,
  };
}
