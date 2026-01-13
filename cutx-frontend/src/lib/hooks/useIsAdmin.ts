'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

/**
 * Hook to check if the current user is an admin (ADMIN or SUPER_ADMIN role)
 * Returns { isAdmin, isLoading } - isAdmin is false until confirmed
 */
export function useIsAdmin() {
  const { isSignedIn, getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!isSignedIn) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/catalogues/admin`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // If we get 200, user is admin. If 403, user is not admin.
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, [isSignedIn, getToken]);

  return { isAdmin, isLoading };
}
