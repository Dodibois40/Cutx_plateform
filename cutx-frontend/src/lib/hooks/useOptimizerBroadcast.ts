'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';

const CHANNEL_NAME = 'cutx-optimizer-sync';
const STORAGE_KEY = 'cutx-optimizer-data';

export interface OptimizerData {
  lignes: LignePrestationV3[];
  panneauxCatalogue: PanneauCatalogue[];
  panneauGlobal: PanneauCatalogue | null;
  timestamp: number;
}

interface BroadcastMessage {
  type: 'DATA_UPDATE' | 'REQUEST_DATA' | 'WINDOW_CLOSED';
  data?: OptimizerData;
}

/**
 * Hook pour la synchronisation des données entre le configurateur et l'optimiseur
 * Utilise BroadcastChannel pour la communication inter-fenêtres en temps réel
 */
export function useOptimizerBroadcast() {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    }
    return () => {
      channelRef.current?.close();
    };
  }, []);

  /**
   * Envoie les données à toutes les fenêtres écoutant le canal
   */
  const broadcastData = useCallback((data: OptimizerData) => {
    // Sauvegarder dans localStorage (fallback + données initiales)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[OptimizerBroadcast] Failed to save to localStorage:', e);
    }

    // Diffuser via BroadcastChannel
    if (channelRef.current) {
      const message: BroadcastMessage = { type: 'DATA_UPDATE', data };
      channelRef.current.postMessage(message);
    }
  }, []);

  /**
   * Ouvre l'optimiseur dans une nouvelle fenêtre
   */
  const openOptimizerWindow = useCallback((
    lignes: LignePrestationV3[],
    panneauxCatalogue: PanneauCatalogue[],
    panneauGlobal: PanneauCatalogue | null,
    locale: string = 'fr'
  ) => {
    const data: OptimizerData = {
      lignes,
      panneauxCatalogue,
      panneauGlobal,
      timestamp: Date.now(),
    };

    // Sauvegarder les données avant d'ouvrir
    broadcastData(data);

    // Ouvrir la nouvelle fenêtre
    const url = `/${locale}/configurateur/optimiseur`;
    const windowFeatures = 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no';
    window.open(url, 'cutx-optimizer', windowFeatures);
  }, [broadcastData]);

  return {
    broadcastData,
    openOptimizerWindow,
  };
}

/**
 * Hook pour l'optimiseur (fenêtre réceptrice)
 * Écoute les mises à jour du configurateur
 */
export function useOptimizerReceiver(
  onDataUpdate: (data: OptimizerData) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Charger les données initiales depuis localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as OptimizerData;
        onDataUpdate(data);
      }
    } catch (e) {
      console.warn('[OptimizerReceiver] Failed to load from localStorage:', e);
    }
  }, [onDataUpdate]);

  // Écouter les mises à jour via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, data } = event.data;

      if (type === 'DATA_UPDATE' && data) {
        onDataUpdate(data);
      }
    };

    // Demander les données actuelles au configurateur
    channel.postMessage({ type: 'REQUEST_DATA' });

    return () => {
      channel.close();
    };
  }, [onDataUpdate]);

  /**
   * Force un rechargement des données depuis localStorage
   */
  const refreshData = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as OptimizerData;
        onDataUpdate(data);
      }
    } catch (e) {
      console.warn('[OptimizerReceiver] Failed to refresh:', e);
    }
  }, [onDataUpdate]);

  return { refreshData };
}
