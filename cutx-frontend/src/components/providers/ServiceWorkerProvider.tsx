'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';

interface ServiceWorkerContextType {
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  updateServiceWorker: () => void;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  isInstalled: false,
  isUpdateAvailable: false,
  isOffline: false,
  updateServiceWorker: () => {},
});

export function useServiceWorker() {
  return useContext(ServiceWorkerContext);
}

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Vérifier le support Service Worker
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Détecter l'état offline
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    // Enregistrer le Service Worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[PWA] Service Worker registered:', registration.scope);
        setIsInstalled(true);

        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // Nouvelle version disponible
                console.log('[PWA] New version available');
                setIsUpdateAvailable(true);
                setWaitingWorker(newWorker);
              }
            });
          }
        });

        // Vérifier s'il y a déjà un SW en attente
        if (registration.waiting) {
          setIsUpdateAvailable(true);
          setWaitingWorker(registration.waiting);
        }
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    };

    // Enregistrer après le chargement de la page
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // Recharger la page quand le SW prend le contrôle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  const updateServiceWorker = () => {
    if (waitingWorker) {
      // Demander au SW en attente de prendre le contrôle
      waitingWorker.postMessage('skipWaiting');
    }
  };

  return (
    <ServiceWorkerContext.Provider
      value={{
        isInstalled,
        isUpdateAvailable,
        isOffline,
        updateServiceWorker,
      }}
    >
      {children}

      {/* Banner de mise à jour */}
      {isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-zinc-900 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">Mise à jour disponible</p>
            <p className="text-sm text-zinc-400">
              Une nouvelle version de CutX est prête
            </p>
          </div>
          <button
            onClick={updateServiceWorker}
            className="ml-4 px-4 py-2 bg-white text-zinc-900 rounded-md font-medium hover:bg-zinc-100 transition-colors"
          >
            Mettre à jour
          </button>
        </div>
      )}

      {/* Indicateur offline */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-amber-950 text-center py-2 text-sm font-medium z-50">
          Vous êtes hors ligne - Certaines fonctionnalités peuvent être limitées
        </div>
      )}
    </ServiceWorkerContext.Provider>
  );
}
