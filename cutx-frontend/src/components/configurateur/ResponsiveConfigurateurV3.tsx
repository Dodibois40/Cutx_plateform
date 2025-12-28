'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Import dynamique pour éviter les problèmes de SSR
const ConfigurateurV3Desktop = dynamic(
  () => import('./ConfigurateurV3'),
  {
    ssr: false,
    loading: () => <LoadingScreen />
  }
);

const MobileConfigurateurV3 = dynamic(
  () => import('./mobile/MobileConfigurateurV3'),
  {
    ssr: false,
    loading: () => <LoadingScreen />
  }
);

// Breakpoint mobile
const MOBILE_BREAKPOINT = 768;

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <Loader2 className="loading-spinner" size={40} />
        <p>Chargement du configurateur...</p>
      </div>
      <style jsx>{`
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-bg-default);
        }
        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--admin-text-secondary);
        }
        .loading-content :global(.loading-spinner) {
          animation: spin 1s linear infinite;
          color: var(--admin-olive);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function ResponsiveConfigurateurV3() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Marquer comme hydraté
    setIsHydrated(true);

    // Détection initiale
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();

    // Listener pour les changements de taille
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Avant l'hydratation, afficher le loading
  if (!isHydrated || isMobile === null) {
    return <LoadingScreen />;
  }

  // Afficher le bon configurateur selon la taille d'écran
  return isMobile ? <MobileConfigurateurV3 /> : <ConfigurateurV3Desktop />;
}
