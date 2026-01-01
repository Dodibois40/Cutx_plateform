'use client';

// Popup pour configurer un rectangle à 5 côtés (L-shape avec coin coupé)
// Affiche une visualisation de la forme et permet de saisir les 4 dimensions
// Le 5ème côté (diagonale) est calculé automatiquement

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X, Check, RotateCcw } from 'lucide-react';
import type { DimensionsLShape, CoinCoupe } from '@/lib/configurateur/types';

interface PopupFormePentagonProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (dimensions: DimensionsLShape) => void;
  initialDimensions?: DimensionsLShape | null;
}

// Calcul du 5ème côté (diagonale/hypoténuse)
function calculerCinquiemeCote(encocheLongueur: number, encocheLargeur: number): number {
  if (encocheLongueur <= 0 || encocheLargeur <= 0) return 0;
  return Math.sqrt(encocheLongueur * encocheLongueur + encocheLargeur * encocheLargeur);
}

export default function PopupFormePentagon({
  isOpen,
  onClose,
  onValidate,
  initialDimensions,
}: PopupFormePentagonProps) {
  const t = useTranslations();

  // État local pour les dimensions
  const [L1, setL1] = useState<number>(initialDimensions?.longueurTotale || 0);
  const [L2, setL2] = useState<number>(0); // Calculé ou saisi
  const [l1, setl1] = useState<number>(initialDimensions?.largeurTotale || 0);
  const [l2, setl2] = useState<number>(0); // Calculé ou saisi
  const [coinCoupe, setCoinCoupe] = useState<CoinCoupe>(initialDimensions?.coinCoupe || 'E1');

  // État pour highlight visuel lors du focus sur un input
  const [focusedDim, setFocusedDim] = useState<'L1' | 'L2' | 'l1' | 'l2' | null>(null);

  // Dimensions de l'encoche (différence entre les côtés)
  const encocheLongueur = useMemo(() => Math.abs(L1 - L2), [L1, L2]);
  const encocheLargeur = useMemo(() => Math.abs(l1 - l2), [l1, l2]);

  // 5ème côté calculé (diagonale)
  const cinquiemeCote = useMemo(
    () => calculerCinquiemeCote(encocheLongueur, encocheLargeur),
    [encocheLongueur, encocheLargeur]
  );

  // Surface calculée
  const surfaceM2 = useMemo(() => {
    // Surface = Rectangle total - triangle coupé
    const surfaceRectangle = (Math.max(L1, L2) * Math.max(l1, l2)) / 1000000;
    const surfaceTriangle = (encocheLongueur * encocheLargeur) / 2 / 1000000;
    return surfaceRectangle - surfaceTriangle;
  }, [L1, L2, l1, l2, encocheLongueur, encocheLargeur]);

  // Reset quand on ouvre
  useEffect(() => {
    if (isOpen && initialDimensions) {
      setL1(initialDimensions.longueurTotale || 0);
      setL2(initialDimensions.longueurTotale - initialDimensions.longueurEncoche || 0);
      setl1(initialDimensions.largeurTotale || 0);
      setl2(initialDimensions.largeurTotale - initialDimensions.largeurEncoche || 0);
    }
  }, [isOpen, initialDimensions]);

  const handleValidate = () => {
    // Convertir en format DimensionsLShape avec coinCoupe inclus
    const dimensions: DimensionsLShape = {
      longueurTotale: Math.max(L1, L2),
      largeurTotale: Math.max(l1, l2),
      longueurEncoche: encocheLongueur,
      largeurEncoche: encocheLargeur,
      epaisseur: initialDimensions?.epaisseur || 0,
      coinCoupe,
    };
    onValidate(dimensions);
    onClose();
  };

  const handleReset = () => {
    setL1(0);
    setL2(0);
    setl1(0);
    setl2(0);
    setCoinCoupe('E1');
  };

  const isValid = L1 > 0 && L2 > 0 && l1 > 0 && l2 > 0 && (L1 !== L2 || l1 !== l2);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <h3>{t('dialogs.pentagon.title')}</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content - pas de scroll */}
        <div className="popup-content">
          {/* Visualisation de la forme */}
          <div className="shape-preview">
            <svg viewBox="0 0 300 200" className="shape-svg">
              {/* Fond de référence (rectangle complet en pointillés) */}
              <rect
                x="30"
                y="20"
                width="240"
                height="160"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
              />

              {/* Forme L-shape selon le coin coupé */}
              {coinCoupe === 'E1' && (
                <path
                  d="M 80 20 L 270 20 L 270 180 L 30 180 L 30 70 L 80 20"
                  fill="rgba(212, 168, 75, 0.15)"
                  stroke="var(--admin-olive)"
                  strokeWidth="2"
                />
              )}
              {coinCoupe === 'E2' && (
                <path
                  d="M 30 20 L 220 20 L 270 70 L 270 180 L 30 180 L 30 20"
                  fill="rgba(212, 168, 75, 0.15)"
                  stroke="var(--admin-olive)"
                  strokeWidth="2"
                />
              )}
              {coinCoupe === 'E3' && (
                <path
                  d="M 30 20 L 270 20 L 270 130 L 220 180 L 30 180 L 30 20"
                  fill="rgba(212, 168, 75, 0.15)"
                  stroke="var(--admin-olive)"
                  strokeWidth="2"
                />
              )}
              {coinCoupe === 'E4' && (
                <path
                  d="M 30 20 L 270 20 L 270 180 L 80 180 L 30 130 L 30 20"
                  fill="rgba(212, 168, 75, 0.15)"
                  stroke="var(--admin-olive)"
                  strokeWidth="2"
                />
              )}

              {/* Diagonale (5ème côté) en rouge */}
              {coinCoupe === 'E1' && <line x1="30" y1="70" x2="80" y2="20" stroke="#e74c3c" strokeWidth="2" />}
              {coinCoupe === 'E2' && <line x1="220" y1="20" x2="270" y2="70" stroke="#e74c3c" strokeWidth="2" />}
              {coinCoupe === 'E3' && <line x1="270" y1="130" x2="220" y2="180" stroke="#e74c3c" strokeWidth="2" />}
              {coinCoupe === 'E4' && <line x1="80" y1="180" x2="30" y2="130" stroke="#e74c3c" strokeWidth="2" />}


              {/* Labels des dimensions - L1 en haut, L2 en bas */}
              <text x="150" y="12" textAnchor="middle" className={`dim-label ${focusedDim === 'L1' ? 'dim-focused' : ''}`}>
                L1 = {L1 || '?'} mm
              </text>
              <text x="150" y="198" textAnchor="middle" className={`dim-label ${focusedDim === 'L2' ? 'dim-focused' : ''}`}>
                L2 = {L2 || '?'} mm
              </text>

              {/* Labels l1 et l2 - rotation pour lecture verticale */}
              <text
                x="12"
                y="100"
                textAnchor="middle"
                transform="rotate(-90, 12, 100)"
                className={`dim-label ${focusedDim === 'l1' ? 'dim-focused' : ''}`}
              >
                <tspan className="dim-italic">ℓ</tspan><tspan>1 = {l1 || '?'} mm</tspan>
              </text>
              <text
                x="288"
                y="100"
                textAnchor="middle"
                transform="rotate(90, 288, 100)"
                className={`dim-label ${focusedDim === 'l2' ? 'dim-focused' : ''}`}
              >
                <tspan className="dim-italic">ℓ</tspan><tspan>2 = {l2 || '?'} mm</tspan>
              </text>

              {/* Labels des coins E1-E4 - positionnés dans les triangles de coupe */}
              <text x="46" y="40" className={`corner-label ${coinCoupe === 'E1' ? 'active' : ''}`}>E1</text>
              <text x="248" y="42" className={`corner-label ${coinCoupe === 'E2' ? 'active' : ''}`}>E2</text>
              <text x="248" y="168" className={`corner-label ${coinCoupe === 'E3' ? 'active' : ''}`}>E3</text>
              <text x="46" y="165" className={`corner-label ${coinCoupe === 'E4' ? 'active' : ''}`}>E4</text>
            </svg>

            {/* Info 5ème côté */}
            <div className="fifth-side-info">
              <span className="fifth-label">5ème côté (diagonale):</span>
              <span className="fifth-value">{cinquiemeCote > 0 ? `${cinquiemeCote.toFixed(1)} mm` : '—'}</span>
            </div>
          </div>

          {/* Formulaire */}
          <div className="form-section">
            {/* Sélection du coin coupé */}
            <div className="form-group">
              <label>{t('dialogs.pentagon.cornerLabel')}</label>
              <div className="corner-selector">
                {(['E1', 'E2', 'E3', 'E4'] as CoinCoupe[]).map((coin) => (
                  <button
                    key={coin}
                    type="button"
                    className={`corner-btn ${coinCoupe === coin ? 'active' : ''}`}
                    onClick={() => setCoinCoupe(coin)}
                  >
                    {coin}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions */}
            <div className="dimensions-grid">
              <div className="form-group">
                <label>L1 <span className="label-hint">(haut)</span></label>
                <div className={`input-with-unit ${focusedDim === 'L1' ? 'input-focused' : ''}`}>
                  <input
                    type="number"
                    value={L1 || ''}
                    onChange={(e) => setL1(Number(e.target.value) || 0)}
                    onFocus={(e) => { e.target.select(); setFocusedDim('L1'); }}
                    onBlur={() => setFocusedDim(null)}
                    placeholder="0"
                    min="0"
                  />
                  <span className="unit">mm</span>
                </div>
              </div>

              <div className="form-group">
                <label>L2 <span className="label-hint">(bas)</span></label>
                <div className={`input-with-unit ${focusedDim === 'L2' ? 'input-focused' : ''}`}>
                  <input
                    type="number"
                    value={L2 || ''}
                    onChange={(e) => setL2(Number(e.target.value) || 0)}
                    onFocus={(e) => { e.target.select(); setFocusedDim('L2'); }}
                    onBlur={() => setFocusedDim(null)}
                    placeholder="0"
                    min="0"
                  />
                  <span className="unit">mm</span>
                </div>
              </div>

              <div className="form-group">
                <label><span className="label-italic">ℓ</span>1 <span className="label-hint">(gauche)</span></label>
                <div className={`input-with-unit ${focusedDim === 'l1' ? 'input-focused' : ''}`}>
                  <input
                    type="number"
                    value={l1 || ''}
                    onChange={(e) => setl1(Number(e.target.value) || 0)}
                    onFocus={(e) => { e.target.select(); setFocusedDim('l1'); }}
                    onBlur={() => setFocusedDim(null)}
                    placeholder="0"
                    min="0"
                  />
                  <span className="unit">mm</span>
                </div>
              </div>

              <div className="form-group">
                <label><span className="label-italic">ℓ</span>2 <span className="label-hint">(droite)</span></label>
                <div className={`input-with-unit ${focusedDim === 'l2' ? 'input-focused' : ''}`}>
                  <input
                    type="number"
                    value={l2 || ''}
                    onChange={(e) => setl2(Number(e.target.value) || 0)}
                    onFocus={(e) => { e.target.select(); setFocusedDim('l2'); }}
                    onBlur={() => setFocusedDim(null)}
                    placeholder="0"
                    min="0"
                  />
                  <span className="unit">mm</span>
                </div>
              </div>
            </div>

            {/* Résumé calculé */}
            <div className="calculated-summary">
              <div className="summary-item">
                <span>Encoche:</span>
                <span>{encocheLongueur} × {encocheLargeur} mm</span>
              </div>
              <div className="summary-item">
                <span>Surface:</span>
                <span>{surfaceM2.toFixed(4)} m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="popup-footer">
          <button type="button" className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={16} />
            {t('dialogs.pentagon.reset')}
          </button>
          <div className="footer-right">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {t('dialogs.pentagon.cancel')}
            </button>
            <button
              type="button"
              className="btn-validate"
              onClick={handleValidate}
              disabled={!isValid}
            >
              <Check size={16} />
              {t('dialogs.pentagon.validate')}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .popup-container {
          background: var(--admin-bg-card, #1a1a1a);
          border: 1px solid var(--admin-border-default, rgba(255,255,255,0.1));
          border-radius: 1rem;
          width: 100%;
          max-width: 780px;
          display: flex;
          flex-direction: column;
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.125rem 1.5rem;
          border-bottom: 1px solid var(--admin-border-default);
        }

        .popup-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--admin-text-primary, white);
          font-family: 'Space Grotesk', system-ui, sans-serif;
        }

        .btn-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--admin-text-primary);
        }

        .popup-content {
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Preview de la forme */
        .shape-preview {
          background: var(--admin-bg-tertiary, #0d0d0d);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
        }

        .shape-svg {
          width: 100%;
          height: auto;
          max-height: 280px;
        }

        .shape-svg .dim-label {
          font-size: 11px;
          fill: var(--admin-text-muted);
          font-family: 'Space Grotesk', sans-serif;
          transition: fill 0.15s ease;
        }

        .shape-svg .dim-label.dim-focused {
          fill: #3b82f6;
          font-weight: 600;
        }

        .shape-svg .dim-italic,
        .shape-svg tspan.dim-italic {
          font-style: italic;
          font-family: 'Times New Roman', Georgia, serif;
        }

        .shape-svg .corner-label {
          font-size: 13px;
          font-weight: 600;
          fill: var(--admin-text-tertiary);
        }

        .shape-svg .corner-label.active {
          fill: var(--admin-olive);
        }

        .fifth-side-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--admin-border-subtle);
        }

        .fifth-label {
          font-size: 0.875rem;
          color: var(--admin-text-muted);
        }

        .fifth-value {
          font-size: 1rem;
          font-weight: 600;
          color: #e74c3c;
        }

        /* Formulaire */
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .label-italic {
          font-style: italic;
          font-family: 'Times New Roman', serif;
          text-transform: none;
        }

        .label-hint {
          font-weight: 400;
          text-transform: none;
          opacity: 0.7;
        }

        .corner-selector {
          display: flex;
          gap: 0.5rem;
        }

        .corner-btn {
          width: 44px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .corner-btn:hover {
          background: var(--admin-bg-hover);
          border-color: var(--admin-olive-border);
        }

        .corner-btn.active {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .dimensions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .input-with-unit {
          display: flex;
          align-items: center;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
          overflow: hidden;
        }

        .input-with-unit input {
          flex: 1;
          padding: 0.5rem 0.625rem;
          background: transparent;
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          text-align: center;
        }

        .input-with-unit input:focus {
          outline: none;
        }

        .input-with-unit:focus-within,
        .input-with-unit.input-focused {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .input-with-unit .unit {
          padding: 0 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          background: var(--admin-bg-secondary);
          border-left: 1px solid var(--admin-border-default);
          height: 100%;
          display: flex;
          align-items: center;
        }

        /* Retirer spinners */
        .input-with-unit input::-webkit-outer-spin-button,
        .input-with-unit input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-with-unit input[type=number] {
          -moz-appearance: textfield;
        }

        .calculated-summary {
          display: flex;
          gap: 1.5rem;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
        }

        .summary-item span:first-child {
          color: var(--admin-text-muted);
        }

        .summary-item span:last-child {
          font-weight: 600;
          color: var(--admin-text-primary);
        }

        /* Footer */
        .popup-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--admin-border-default);
          background: var(--admin-bg-secondary);
        }

        .footer-right {
          display: flex;
          gap: 0.75rem;
        }

        .btn-secondary,
        .btn-cancel,
        .btn-validate {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid var(--admin-border-default);
          color: var(--admin-text-muted);
        }

        .btn-secondary:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--admin-border-default);
          color: var(--admin-text-secondary);
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .btn-validate {
          background: var(--admin-olive);
          border: none;
          color: #000;
        }

        .btn-validate:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .btn-validate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>,
    document.body
  );
}
