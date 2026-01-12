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
  // Store latest data to respond to REQUEST_DATA
  const latestDataRef = useRef<OptimizerData | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      // Listen for REQUEST_DATA from optimizer window
      channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        if (event.data.type === 'REQUEST_DATA') {
          // Send current data if available
          if (latestDataRef.current) {
            channel.postMessage({ type: 'DATA_UPDATE', data: latestDataRef.current });
          } else {
            // Try to get from localStorage as fallback
            try {
              const stored = localStorage.getItem(STORAGE_KEY);
              if (stored) {
                const data = JSON.parse(stored) as OptimizerData;
                channel.postMessage({ type: 'DATA_UPDATE', data });
              }
            } catch (e) {
              console.warn('[OptimizerBroadcast] Failed to respond to REQUEST_DATA:', e);
            }
          }
        }
      };
    }
    return () => {
      channelRef.current?.close();
    };
  }, []);

  /**
   * Envoie les données à toutes les fenêtres écoutant le canal
   */
  const broadcastData = useCallback((data: OptimizerData) => {
    // Store latest data for REQUEST_DATA responses
    latestDataRef.current = data;

    // Sauvegarder dans localStorage (fallback + données initiales)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore localStorage errors
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
  const onDataUpdateRef = useRef(onDataUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate;
  }, [onDataUpdate]);

  // Charger les données initiales depuis localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as OptimizerData;
        onDataUpdateRef.current(data);
      }
    } catch (e) {
      console.warn('[OptimizerReceiver] Failed to load from localStorage:', e);
    }
  }, []); // Run only on mount

  // Écouter les mises à jour via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { type, data } = event.data;
      if (type === 'DATA_UPDATE' && data) {
        onDataUpdateRef.current(data);
      }
    };

    // Demander les données actuelles au configurateur
    // Small delay to ensure sender has set up its listener
    const timeoutId = setTimeout(() => {
      channel.postMessage({ type: 'REQUEST_DATA' });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      channel.close();
    };
  }, []); // Run only on mount

  // Also listen for localStorage changes (cross-tab sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const data = JSON.parse(event.newValue) as OptimizerData;
          onDataUpdateRef.current(data);
        } catch (e) {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Polling fallback - check localStorage every 500ms for changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastTimestamp = 0;

    const checkForUpdates = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored) as OptimizerData;
          if (data.timestamp > lastTimestamp) {
            lastTimestamp = data.timestamp;
            onDataUpdateRef.current(data);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    // Initial check
    checkForUpdates();

    // Poll every 500ms
    const intervalId = setInterval(checkForUpdates, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  /**
   * Force un rechargement des données depuis localStorage
   */
  const refreshData = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as OptimizerData;
        onDataUpdateRef.current(data);
      }
    } catch (e) {
      console.warn('[OptimizerReceiver] Failed to refresh:', e);
    }

    // Also request via BroadcastChannel
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'REQUEST_DATA' });
    }
  }, []);

  return { refreshData };
}
