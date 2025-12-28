'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, RefreshCw } from 'lucide-react';

// Polices de signature stylisées
const SIGNATURE_FONTS = [
  { name: 'Brush Script MT', fallback: 'cursive' },
  { name: 'Segoe Script', fallback: 'cursive' },
  { name: 'Lucida Handwriting', fallback: 'cursive' },
  { name: 'Comic Sans MS', fallback: 'cursive' },
];

interface SignaturePadProps {
  clientName: string;
  onSignatureChange: (signatureData: string | null) => void;
  disabled?: boolean;
}

export default function SignaturePad({
  clientName,
  onSignatureChange,
  disabled = false
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);
  const [signatureGenerated, setSignatureGenerated] = useState(false);

  // Générer la signature sur le canvas
  const generateSignature = (fontIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !clientName) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configurer la police
    const font = SIGNATURE_FONTS[fontIndex];
    ctx.font = `italic 42px "${font.name}", ${font.fallback}`;
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dessiner le nom
    ctx.fillText(clientName, canvas.width / 2, canvas.height / 2);

    // Ajouter une ligne sous la signature
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 30);
    ctx.lineTo(canvas.width - 40, canvas.height - 30);
    ctx.stroke();

    setSignatureGenerated(true);

    // Retourner l'image en base64
    const signatureData = canvas.toDataURL('image/png');
    onSignatureChange(signatureData);
  };

  // Générer la signature au chargement
  useEffect(() => {
    if (clientName) {
      generateSignature(selectedFontIndex);
    }
  }, [clientName]);

  // Changer de style de signature
  const cycleFont = () => {
    const nextIndex = (selectedFontIndex + 1) % SIGNATURE_FONTS.length;
    setSelectedFontIndex(nextIndex);
    generateSignature(nextIndex);
  };

  return (
    <div className="signature-pad-container">
      <div className="signature-preview">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className={`signature-canvas ${disabled ? 'disabled' : ''}`}
        />

        {signatureGenerated && (
          <div className="signature-badge">
            <Check className="h-3 w-3" />
            <span>Signature générée</span>
          </div>
        )}
      </div>

      <div className="signature-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={cycleFont}
          disabled={disabled}
          className="btn-style"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Changer le style
        </Button>

        <span className="style-info">
          Style {selectedFontIndex + 1}/{SIGNATURE_FONTS.length}
        </span>
      </div>

      <style jsx>{`
        .signature-pad-container {
          width: 100%;
        }

        .signature-preview {
          position: relative;
          background: white;
          border: 2px solid var(--border, #2a2a2e);
          border-radius: 8px;
          overflow: hidden;
        }

        .signature-canvas {
          display: block;
          width: 100%;
          height: auto;
        }

        .signature-canvas.disabled {
          opacity: 0.6;
        }

        .signature-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 4px;
          color: #22c55e;
          font-size: 11px;
          font-weight: 500;
        }

        .signature-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          padding: 0 4px;
        }

        .btn-style {
          background: transparent;
          border-color: var(--border, #2a2a2e);
          color: var(--text-secondary, #9a9aa0);
        }

        .btn-style:hover:not(:disabled) {
          background: var(--bg-elevated, #252529);
          border-color: var(--border-light, #3a3a3e);
          color: var(--text-primary, #f0f0f2);
        }

        .style-info {
          font-size: 12px;
          color: var(--text-muted, #6a6a70);
        }
      `}</style>
    </div>
  );
}
