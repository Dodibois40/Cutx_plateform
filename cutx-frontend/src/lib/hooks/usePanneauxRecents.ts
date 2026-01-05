'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CatalogueProduit } from '@/lib/services/catalogue-api';

const STORAGE_KEY = 'cutx-panneaux-recents';
const DEFAULT_MAX_ITEMS = 10;

/**
 * Hook pour gérer l'historique des panneaux récemment sélectionnés
 * - Stockage persistant via localStorage
 * - Évite les doublons (déplace en tête si déjà présent)
 * - Limite configurable (10 par défaut)
 */
export function usePanneauxRecents(maxItems = DEFAULT_MAX_ITEMS) {
  const [recents, setRecents] = useState<CatalogueProduit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecents(parsed.slice(0, maxItems));
        }
      }
    } catch (error) {
      console.warn('Erreur chargement panneaux récents:', error);
    }
    setIsLoaded(true);
  }, [maxItems]);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
    } catch (error) {
      console.warn('Erreur sauvegarde panneaux récents:', error);
    }
  }, [recents, isLoaded]);

  // Ajouter un panneau à l'historique (en tête)
  const addRecent = useCallback((produit: CatalogueProduit) => {
    setRecents(prev => {
      // Retirer si déjà présent (pour le remettre en tête)
      const filtered = prev.filter(p => p.reference !== produit.reference);
      // Ajouter en tête et limiter la taille
      return [produit, ...filtered].slice(0, maxItems);
    });
  }, [maxItems]);

  // Supprimer un panneau de l'historique
  const removeRecent = useCallback((reference: string) => {
    setRecents(prev => prev.filter(p => p.reference !== reference));
  }, []);

  // Vider l'historique
  const clearRecents = useCallback(() => {
    setRecents([]);
  }, []);

  return {
    recents,
    addRecent,
    removeRecent,
    clearRecents,
    isLoaded,
  };
}
