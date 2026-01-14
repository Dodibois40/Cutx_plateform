'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  Share2,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { ResultatOptimisation, PanneauOptimise } from '@/lib/configurateur/optimiseur';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// Detecter si on est en localhost
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

interface QrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tous les panneaux optimisés à partager */
  panneaux: PanneauOptimise[];
  /** Nom du projet (optionnel) */
  projectName?: string;
}

interface ShareResponse {
  shareId: string;
  shareUrl: string;
  expiresAt: string;
}

export function QrShareModal({ isOpen, onClose, panneaux, projectName }: QrShareModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Créer le partage quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && panneaux.length > 0 && !shareData) {
      createShare();
    }
  }, [isOpen, panneaux]);

  // Reset quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setShareData(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  async function createShare() {
    setIsLoading(true);
    setError(null);

    try {
      // Formater les données pour l'API
      const sheets = panneaux.map((p) => ({
        index: p.index,
        materialRef: p.panneauId,
        materialName: p.panneauNom,
        length: p.dimensions.longueur,
        width: p.dimensions.largeur,
        thickness: p.dimensions.epaisseur,
        placements: p.debitsPlaces.map((d) => ({
          pieceId: d.id,
          name: d.reference || `Pièce ${d.id}`,
          reference: d.reference,
          x: d.x,
          y: d.y,
          length: d.longueur,
          width: d.largeur,
          rotated: d.rotation,
          edging: d.chants ? {
            top: d.chants.A ? 'yes' : null,
            bottom: d.chants.C ? 'yes' : null,
            left: d.chants.D ? 'yes' : null,
            right: d.chants.B ? 'yes' : null,
          } : undefined,
        })),
        freeSpaces: p.zonesChute?.map((z) => ({
          id: z.id,
          x: z.x,
          y: z.y,
          length: z.longueur,
          width: z.largeur,
        })) || [],
        efficiency: p.tauxRemplissage,
        usedArea: p.surfaceUtilisee,
        wasteArea: p.chute,
      }));

      // Stats globales
      const totalPieces = panneaux.reduce((sum, p) => sum + p.debitsPlaces.length, 0);
      const totalEfficiency = panneaux.reduce((sum, p) => sum + p.tauxRemplissage, 0) / panneaux.length;

      const response = await fetch(`${API_URL}/api/optimization/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheets,
          projectName,
          stats: {
            totalPieces,
            totalSheets: panneaux.length,
            globalEfficiency: Math.round(totalEfficiency),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data: ShareResponse = await response.json();
      // Construire l'URL avec l'origine actuelle (fonctionne en local et en prod)
      const localShareUrl = `${window.location.origin}/fr/atelier/${data.shareId}`;
      setShareData({ ...data, shareUrl: localShareUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLink() {
    if (!shareData) return;

    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback pour les navigateurs sans clipboard API
      const input = document.createElement('input');
      input.value = shareData.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareNative() {
    if (!shareData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: projectName || 'Plan de découpe CutX',
          text: `${panneaux.length} panneau(x) - Voir le plan de découpe`,
          url: shareData.shareUrl,
        });
      } catch {
        // L'utilisateur a annulé ou erreur - on ne fait rien
      }
    } else {
      // Pas de Web Share API, on copie le lien
      copyLink();
    }
  }

  if (!isOpen) return null;

  const expiresAt = shareData ? new Date(shareData.expiresAt) : null;
  const hoursRemaining = expiresAt
    ? Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
    : 24;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-title">
            <Smartphone size={20} />
            <span>Envoyer sur mobile</span>
          </div>
          <button className="qr-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="qr-modal-content">
          {isLoading ? (
            <div className="qr-loading">
              <Loader2 size={48} className="qr-loading-icon" />
              <p>Génération du lien de partage...</p>
            </div>
          ) : error ? (
            <div className="qr-error">
              <AlertCircle size={48} />
              <p>Erreur: {error}</p>
              <button onClick={createShare} className="qr-retry-btn">
                Réessayer
              </button>
            </div>
          ) : shareData ? (
            <>
              {/* QR Code */}
              <div className="qr-code-container">
                <QRCodeSVG
                  value={shareData.shareUrl}
                  size={200}
                  level="M"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                />
              </div>

              {/* Instructions */}
              <p className="qr-instructions">
                Scannez ce QR code avec votre téléphone
              </p>

              {/* URL affichée */}
              <div className="qr-url-display">
                <code>{shareData.shareUrl}</code>
              </div>

              {/* Actions */}
              <div className="qr-actions">
                <button onClick={copyLink} className="qr-action-btn qr-copy-btn">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button onClick={shareNative} className="qr-action-btn qr-share-btn">
                    <Share2 size={18} />
                    <span>Partager</span>
                  </button>
                )}
              </div>

              {/* Warning localhost */}
              {isLocalhost() && (
                <div className="qr-localhost-warning">
                  <AlertCircle size={14} />
                  <span>
                    Mode dev: remplacez <code>localhost</code> par l'IP de votre PC
                    (ex: <code>192.168.x.x:3000</code>) pour accéder depuis un téléphone
                  </span>
                </div>
              )}

              {/* Expiration notice */}
              <div className="qr-expiry">
                <Clock size={14} />
                <span>Valide pendant {hoursRemaining}h</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer info */}
        <div className="qr-modal-footer">
          <p>
            <strong>{panneaux.length}</strong> panneau{panneaux.length > 1 ? 'x' : ''} &bull;
            <strong> {panneaux.reduce((sum, p) => sum + p.debitsPlaces.length, 0)}</strong> pièce(s)
          </p>
        </div>
      </div>

      <style jsx>{`
        .qr-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .qr-modal {
          background: #1a1a2e;
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .qr-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .qr-modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }

        .qr-modal-close {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .qr-modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .qr-modal-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .qr-loading,
        .qr-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #888;
          padding: 32px 0;
        }

        .qr-loading-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .qr-error {
          color: #ef4444;
        }

        .qr-retry-btn {
          margin-top: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }

        .qr-retry-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .qr-code-container {
          background: white;
          padding: 16px;
          border-radius: 12px;
        }

        .qr-instructions {
          color: #888;
          font-size: 14px;
          text-align: center;
        }

        .qr-url-display {
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 14px;
          border-radius: 8px;
          width: 100%;
          overflow: hidden;
        }

        .qr-url-display code {
          color: #10b981;
          font-size: 12px;
          word-break: break-all;
        }

        .qr-actions {
          display: flex;
          gap: 10px;
          width: 100%;
        }

        .qr-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .qr-copy-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .qr-copy-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .qr-share-btn {
          background: #3b82f6;
          color: white;
        }

        .qr-share-btn:hover {
          background: #2563eb;
        }

        .qr-expiry {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 12px;
        }

        .qr-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .qr-modal-footer p {
          color: #888;
          font-size: 13px;
          margin: 0;
        }

        .qr-modal-footer strong {
          color: #10b981;
        }
      `}</style>
    </div>
  );
}
