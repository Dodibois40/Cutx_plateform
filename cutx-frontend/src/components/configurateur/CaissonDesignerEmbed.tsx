'use client';

import { useEffect, useRef, useCallback } from 'react';

interface CaissonData {
  id: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    thickness: number;
  };
  panels: Array<{
    name: string;
    width: number;
    height: number;
    thickness: number;
    quantity: number;
  }>;
}

interface CaissonDesignerMessage {
  type: 'CAISSON_RESULT' | 'CAISSON_READY' | 'CAISSON_ERROR';
  caissons?: CaissonData[];
  error?: string;
}

interface CaissonDesignerEmbedProps {
  onCaissonsChange?: (caissons: CaissonData[]) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Wrapper iframe pour le configurateur de caissons standalone
 * Communique avec le configurateur via postMessage
 */
export function CaissonDesignerEmbed({
  onCaissonsChange,
  onReady,
  onError,
  className = '',
}: CaissonDesignerEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Gérer les messages du configurateur
  const handleMessage = useCallback(
    (event: MessageEvent<CaissonDesignerMessage>) => {
      // Vérifier l'origine (sécurité)
      if (event.origin !== window.location.origin) return;

      const { type, caissons, error } = event.data;

      switch (type) {
        case 'CAISSON_READY':
          onReady?.();
          break;
        case 'CAISSON_RESULT':
          if (caissons) {
            onCaissonsChange?.(caissons);
          }
          break;
        case 'CAISSON_ERROR':
          if (error) {
            onError?.(error);
          }
          break;
      }
    },
    [onCaissonsChange, onReady, onError]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Envoyer un message au configurateur
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, window.location.origin);
    }
  }, []);

  // Demander les données actuelles
  const requestCaissons = useCallback(() => {
    sendMessage({ type: 'REQUEST_CAISSONS' });
  }, [sendMessage]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        ref={iframeRef}
        src="/caisson-designer/index.html"
        className="w-full h-full border-0 rounded-lg"
        title="Configurateur de Caissons 3D"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />

      {/* Bouton pour récupérer les données (optionnel, pour debug) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={requestCaissons}
          className="absolute bottom-4 right-4 px-4 py-2 bg-primary text-white rounded-md text-sm opacity-50 hover:opacity-100 transition-opacity"
        >
          Debug: Get Caissons
        </button>
      )}
    </div>
  );
}

export default CaissonDesignerEmbed;
