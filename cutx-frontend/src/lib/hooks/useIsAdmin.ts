'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

/**
 * Hook to check if the current user is an admin (ADMIN or SUPER_ADMIN role)
 * Returns { isAdmin, isLoading } - isAdmin is false until confirmed
 */
export function useIsAdmin() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      // Wait for Clerk to be fully loaded
      if (!isLoaded) {
        console.log('[useIsAdmin] Clerk not loaded yet, waiting...');
        return;
      }

      if (!isSignedIn) {
        console.log('[useIsAdmin] Not signed in, skipping admin check');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        console.log('[useIsAdmin] Token obtained:', token ? `${token.substring(0, 20)}...` : 'NULL');

        if (!token) {
          console.warn('[useIsAdmin] No token available, cannot check admin status');
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        console.log('[useIsAdmin] Checking admin status at:', `${API_URL}/api/catalogues/admin`);
        const res = await fetch(`${API_URL}/api/catalogues/admin`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('[useIsAdmin] Response status:', res.status, res.ok ? '(admin)' : '(not admin)');
        // If we get 200, user is admin. If 403, user is not admin.
        setIsAdmin(res.ok);
      } catch (error) {
        console.error('[useIsAdmin] Error checking admin:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, [isLoaded, isSignedIn, getToken]);

  return { isAdmin, isLoading };
}
