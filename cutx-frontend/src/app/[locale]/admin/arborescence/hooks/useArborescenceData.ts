'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { AdminCategory } from '@/components/admin/arborescence';
import { SUPPLIERS, type SupplierSlug } from '@/components/home/SupplierSelector';
import { addAggregatedCounts } from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useArborescenceData() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSuppliers, setActiveSuppliers] = useState<SupplierSlug[]>(
    SUPPLIERS.map((s) => s.slug)
  );

  const fetchCategories = useCallback(
    async (supplierSlugs?: SupplierSlug[]) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();

        // Construire l'URL avec le paramètre catalogues si pas tous sélectionnés
        const slugsToUse = supplierSlugs ?? activeSuppliers;
        const params = new URLSearchParams();
        if (slugsToUse.length > 0 && slugsToUse.length < SUPPLIERS.length) {
          params.set('catalogues', slugsToUse.join(','));
        }
        const queryString = params.toString();
        const url = `${API_URL}/api/catalogues/admin/categories${queryString ? `?${queryString}` : ''}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 403) {
            setError('admin');
            return;
          }
          throw new Error('Erreur lors du chargement');
        }

        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    },
    [getToken, activeSuppliers]
  );

  // Fetch initial
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch quand les fournisseurs changent
  const handleSupplierToggle = useCallback(
    (slug: SupplierSlug) => {
      setActiveSuppliers((prev) => {
        // Empêcher de tout désélectionner
        if (prev.length === 1 && prev.includes(slug)) {
          return prev;
        }
        const newSuppliers = prev.includes(slug)
          ? prev.filter((s) => s !== slug)
          : [...prev, slug];
        // Fetch avec les nouveaux fournisseurs
        fetchCategories(newSuppliers);
        return newSuppliers;
      });
    },
    [fetchCategories]
  );

  // Categories avec compteurs agrégés pour l'affichage
  const categoriesWithAggregated = useMemo(() => {
    return addAggregatedCounts(categories);
  }, [categories]);

  return {
    categories: categoriesWithAggregated,
    rawCategories: categories,
    loading,
    error,
    activeSuppliers,
    fetchCategories,
    handleSupplierToggle,
  };
}
