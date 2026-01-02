'use client';

// Popup pour configurer un triangle rectangle
// Base, Hauteur, et Angles sont tous éditables
// L'hypoténuse est calculée automatiquement

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X, Check, RotateCcw } from 'lucide-react';
import type { DimensionsTriangle } from '@/lib/configurateur/types';

interface PopupFormeTriangleProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (dimensions: DimensionsTriangle) => void;
  initialDimensions?: DimensionsTriangle | null;
  epaisseur?: number;
}

// Calcul de l'hypoténuse (Pythagore)
function calculerHypotenuse(base: number, hauteur: number): number {
  if (base <= 0 || hauteur <= 0) return 0;
  return Math.sqrt(base * base + hauteur * hauteur);
}

// Calcul angle A depuis base et hauteur (en degrés)
function calculerAngleA(base: number, hauteur: number): number {
  if (base <= 0 || hauteur <= 0) return 0;
  return Math.atan(hauteur / base) * (180 / Math.PI);
}

// Calcul angle C (complémentaire de A)
function calculerAngleC(angleA: number): number {
  if (angleA <= 0 || angleA >= 90) return 0;
  return 90 - angleA;
}

// Calcul hauteur depuis base et angle A
function calculerHauteurDepuisAngle(base: number, angleA: number): number {
  if (base <= 0 || angleA <= 0 || angleA >= 90) return 0;
  return base * Math.tan(angleA * Math.PI / 180);
}

// Calcul base depuis hauteur et angle A
function calculerBaseDepuisAngle(hauteur: number, angleA: number): number {
  if (hauteur <= 0 || angleA <= 0 || angleA >= 90) return 0;
  return hauteur / Math.tan(angleA * Math.PI / 180);
}

export default function PopupFormeTriangle({
  isOpen,
  onClose,
  onValidate,
  initialDimensions,
  epaisseur = 0,
}: PopupFormeTriangleProps) {
  const t = useTranslations();

  // État local pour les dimensions
  const [base, setBase] = useState<number>(initialDimensions?.base || 0);
  const [hauteur, setHauteur] = useState<number>(initialDimensions?.hauteur || 0);
  const [angleA, setAngleA] = useState<number>(0);
  const [angleC, setAngleC] = useState<number>(0);

  // État pour savoir quel champ a le focus
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Hypoténuse calculée
  const hypotenuse = useMemo(
    () => calculerHypotenuse(base, hauteur),
    [base, hauteur]
  );

  // Surface calculée (base × hauteur / 2)
  const surfaceM2 = useMemo(() => {
    if (base <= 0 || hauteur <= 0) return 0;
    return (base * hauteur) / 2 / 1000000;
  }, [base, hauteur]);

  // Périmètre calculé
  const perimetreM = useMemo(() => {
    if (base <= 0 || hauteur <= 0) return 0;
    return (base + hauteur + hypotenuse) / 1000;
  }, [base, hauteur, hypotenuse]);

  // Mettre à jour les angles quand base/hauteur changent
  useEffect(() => {
    if (base > 0 && hauteur > 0) {
      const newAngleA = calculerAngleA(base, hauteur);
      setAngleA(Number(newAngleA.toFixed(2)));
      setAngleC(Number((90 - newAngleA).toFixed(2)));
    }
  }, [base, hauteur]);

  // Reset quand on ouvre
  useEffect(() => {
    if (isOpen) {
      if (initialDimensions) {
        setBase(initialDimensions.base || 0);
        setHauteur(initialDimensions.hauteur || 0);
      } else {
        setBase(0);
        setHauteur(0);
        setAngleA(0);
        setAngleC(0);
      }
    }
  }, [isOpen, initialDimensions]);

  // Handler pour changement de base
  const handleBaseChange = useCallback((value: number) => {
    setBase(value);
    // Si on a un angle valide, recalculer la hauteur
    if (angleA > 0 && angleA < 90 && value > 0) {
      const newHauteur = calculerHauteurDepuisAngle(value, angleA);
      if (newHauteur > 0) {
        setHauteur(Number(newHauteur.toFixed(1)));
      }
    }
  }, [angleA]);

  // Handler pour changement de hauteur
  const handleHauteurChange = useCallback((value: number) => {
    setHauteur(value);
    // Si on a un angle valide, recalculer la base
    if (angleA > 0 && angleA < 90 && value > 0) {
      const newBase = calculerBaseDepuisAngle(value, angleA);
      if (newBase > 0) {
        setBase(Number(newBase.toFixed(1)));
      }
    }
  }, [angleA]);

  // Handler pour changement d'angle A
  const handleAngleAChange = useCallback((value: number) => {
    if (value <= 0 || value >= 90) {
      setAngleA(value);
      setAngleC(value > 0 ? 90 - value : 0);
      return;
    }
    setAngleA(value);
    setAngleC(90 - value);

    // Recalculer dimensions si on a une base
    if (base > 0) {
      const newHauteur = calculerHauteurDepuisAngle(base, value);
      if (newHauteur > 0) {
        setHauteur(Number(newHauteur.toFixed(1)));
      }
    } else if (hauteur > 0) {
      const newBase = calculerBaseDepuisAngle(hauteur, value);
      if (newBase > 0) {
        setBase(Number(newBase.toFixed(1)));
      }
    }
  }, [base, hauteur]);

  // Handler pour changement d'angle C
  const handleAngleCChange = useCallback((value: number) => {
    if (value <= 0 || value >= 90) {
      setAngleC(value);
      setAngleA(value > 0 ? 90 - value : 0);
      return;
    }
    setAngleC(value);
    const newAngleA = 90 - value;
    setAngleA(newAngleA);

    // Recalculer dimensions
    if (base > 0) {
      const newHauteur = calculerHauteurDepuisAngle(base, newAngleA);
      if (newHauteur > 0) {
        setHauteur(Number(newHauteur.toFixed(1)));
      }
    } else if (hauteur > 0) {
      const newBase = calculerBaseDepuisAngle(hauteur, newAngleA);
      if (newBase > 0) {
        setBase(Number(newBase.toFixed(1)));
      }
    }
  }, [base, hauteur]);

  const handleValidate = () => {
    const dimensions: DimensionsTriangle = {
      base,
      hauteur,
      hypotenuse,
      epaisseur: epaisseur || initialDimensions?.epaisseur || 0,
    };
    onValidate(dimensions);
    onClose();
  };

  const handleReset = () => {
    setBase(0);
    setHauteur(0);
    setAngleA(0);
    setAngleC(0);
  };

  const isValid = base > 0 && hauteur > 0;

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <h3>{t('dialogs.triangle.title')}</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="popup-content">
          {/* SVG à gauche */}
          <div className="shape-preview">
            <svg viewBox="0 0 340 280" className="shape-svg">
              {/* Triangle: sommets fixes */}
              {/* P1 = bas-gauche (angle droit 90°) */}
              {/* P2 = haut-gauche (angle C) */}
              {/* P3 = bas-droite (angle A) */}

              {/* Remplissage triangle */}
              <polygon
                points="50,230 50,50 300,230"
                fill="rgba(163, 183, 99, 0.12)"
              />

              {/* Côté vertical (hauteur b) */}
              <line x1="50" y1="230" x2="50" y2="50" stroke="#a3b763" strokeWidth="3" strokeLinecap="round" />

              {/* Côté horizontal (base a) */}
              <line x1="50" y1="230" x2="300" y2="230" stroke="#a3b763" strokeWidth="3" strokeLinecap="round" />

              {/* Hypoténuse (c) - en rouge */}
              <line x1="50" y1="50" x2="300" y2="230" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />

              {/* Carré angle droit (90°) en bas-gauche */}
              <rect x="50" y="210" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

              {/* === ANGLE A (en bas-droite, entre base et hypoténuse) === */}
              {/* Arc bleu */}
              <path
                d={`M 260,230 A 40,40 0 0,0 ${300 - 40 * Math.cos((angleA || 45) * Math.PI / 180)},${230 - 40 * Math.sin((angleA || 45) * Math.PI / 180)}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Valeur angle A */}
              <text x="235" y="210" className="angle-val blue">{angleA > 0 ? `${angleA.toFixed(1)}°` : '?'}</text>
              <text x="235" y="195" className="angle-lbl blue">Angle A</text>

              {/* === ANGLE C (en haut-gauche, entre hauteur et hypoténuse) === */}
              {/* Arc violet */}
              <path
                d={`M 50,90 A 40,40 0 0,0 ${50 + 40 * Math.sin((angleC || 45) * Math.PI / 180)},${50 + 40 * Math.cos((angleC || 45) * Math.PI / 180)}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Valeur angle C */}
              <text x="75" y="95" className="angle-val purple">{angleC > 0 ? `${angleC.toFixed(1)}°` : '?'}</text>
              <text x="75" y="80" className="angle-lbl purple">Angle C</text>

              {/* Label 90° */}
              <text x="78" y="222" className="label-90">90°</text>

              {/* Labels des côtés */}
              {/* Base (a) - horizontal en bas */}
              <text x="175" y="260" textAnchor="middle" className="side-lbl">
                <tspan className="letter">a</tspan>
                <tspan className="value"> = {base || '?'} mm</tspan>
              </text>

              {/* Hauteur (b) - vertical à gauche */}
              <text x="30" y="140" textAnchor="middle" transform="rotate(-90, 30, 140)" className="side-lbl">
                <tspan className="letter">b</tspan>
                <tspan className="value"> = {hauteur || '?'} mm</tspan>
              </text>

              {/* Hypoténuse (c) - sur la diagonale */}
              <text x="200" y="120" textAnchor="middle" transform="rotate(-36, 200, 120)" className="side-lbl hypo">
                <tspan className="letter">c</tspan>
                <tspan className="value"> = {hypotenuse > 0 ? Math.round(hypotenuse) : '?'} mm</tspan>
              </text>
            </svg>
          </div>

          {/* Formulaire à droite */}
          <div className="form-section">
            <div className="form-title">Dimensions</div>

            {/* Base */}
            <div className="form-row">
              <label>Base (a)</label>
              <div className={`input-group ${focusedField === 'base' ? 'focused' : ''}`}>
                <input
                  type="number"
                  value={base || ''}
                  onChange={(e) => setBase(Number(e.target.value) || 0)}
                  onFocus={() => setFocusedField('base')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0"
                  min="0"
                />
                <span className="unit">mm</span>
              </div>
            </div>

            {/* Hauteur */}
            <div className="form-row">
              <label>Hauteur (b)</label>
              <div className={`input-group ${focusedField === 'hauteur' ? 'focused' : ''}`}>
                <input
                  type="number"
                  value={hauteur || ''}
                  onChange={(e) => setHauteur(Number(e.target.value) || 0)}
                  onFocus={() => setFocusedField('hauteur')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0"
                  min="0"
                />
                <span className="unit">mm</span>
              </div>
            </div>

            <div className="form-title">Angles</div>

            {/* Angle A */}
            <div className="form-row">
              <label className="label-angle-a">Angle A</label>
              <div className={`input-group ${focusedField === 'angleA' ? 'focused' : ''}`}>
                <input
                  type="number"
                  value={angleA || ''}
                  onChange={(e) => handleAngleAChange(Number(e.target.value) || 0)}
                  onFocus={() => setFocusedField('angleA')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0"
                  min="0.1"
                  max="89.9"
                  step="0.1"
                />
                <span className="unit">°</span>
              </div>
            </div>

            {/* Angle C */}
            <div className="form-row">
              <label className="label-angle-c">Angle C</label>
              <div className={`input-group ${focusedField === 'angleC' ? 'focused' : ''}`}>
                <input
                  type="number"
                  value={angleC || ''}
                  onChange={(e) => handleAngleCChange(Number(e.target.value) || 0)}
                  onFocus={() => setFocusedField('angleC')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0"
                  min="0.1"
                  max="89.9"
                  step="0.1"
                />
                <span className="unit">°</span>
              </div>
            </div>

            {/* Valeurs calculées */}
            <div className="calculated-box">
              <div className="calc-item">
                <span>Hypoténuse (c)</span>
                <span className="hypo-value">{hypotenuse > 0 ? `${hypotenuse.toFixed(1)} mm` : '—'}</span>
              </div>
              <div className="calc-divider" />
              <div className="calc-item">
                <span>Surface</span>
                <span>{surfaceM2 > 0 ? `${surfaceM2.toFixed(4)} m²` : '—'}</span>
              </div>
              <div className="calc-item">
                <span>Périmètre</span>
                <span>{perimetreM > 0 ? `${perimetreM.toFixed(3)} m` : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="popup-footer">
          <button type="button" className="btn-secondary" onClick={handleReset}>
            <RotateCcw size={16} />
            {t('dialogs.triangle.reset')}
          </button>
          <div className="footer-right">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {t('dialogs.triangle.cancel')}
            </button>
            <button
              type="button"
              className="btn-validate"
              onClick={handleValidate}
              disabled={!isValid}
            >
              <Check size={16} />
              {t('dialogs.triangle.validate')}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
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
          max-width: 820px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--admin-border-default);
        }

        .popup-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--admin-text-primary, white);
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
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 1.5rem;
          padding: 1.25rem 1.5rem;
        }

        /* SVG Preview */
        .shape-preview {
          background: #0d0d0d;
          border-radius: 0.75rem;
          padding: 0.5rem;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .shape-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Labels des côtés */
        .shape-svg .side-lbl {
          font-family: 'Space Grotesk', sans-serif;
        }

        .shape-svg .side-lbl .letter {
          font-size: 15px;
          font-weight: 700;
          fill: #a3b763;
        }

        .shape-svg .side-lbl .value {
          font-size: 12px;
          font-weight: 500;
          fill: rgba(255,255,255,0.6);
        }

        .shape-svg .side-lbl.hypo .letter,
        .shape-svg .side-lbl.hypo .value {
          fill: #ef4444;
        }

        /* Angle 90° */
        .shape-svg .label-90 {
          font-size: 11px;
          font-weight: 500;
          fill: rgba(255,255,255,0.4);
          font-family: 'Space Grotesk', sans-serif;
        }

        /* Valeurs des angles */
        .shape-svg .angle-val {
          font-size: 16px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .shape-svg .angle-val.blue { fill: #3b82f6; }
        .shape-svg .angle-val.purple { fill: #8b5cf6; }

        /* Labels "Angle A" / "Angle C" */
        .shape-svg .angle-lbl {
          font-size: 9px;
          font-weight: 600;
          font-family: 'Space Grotesk', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .shape-svg .angle-lbl.blue { fill: #3b82f6; }
        .shape-svg .angle-lbl.purple { fill: #8b5cf6; }

        /* Form */
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .form-title {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--admin-text-muted);
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .form-title:first-child {
          margin-top: 0;
        }

        .form-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .form-row label {
          flex: 0 0 80px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--admin-text-secondary);
        }

        .form-row .label-angle-a {
          color: #3b82f6;
        }

        .form-row .label-angle-c {
          color: #8b5cf6;
        }

        .input-group {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          overflow: hidden;
          transition: all 0.15s;
        }

        .input-group.focused {
          border-color: var(--admin-olive);
          box-shadow: 0 0 0 2px rgba(163, 183, 99, 0.2);
        }

        .input-group input {
          flex: 1;
          padding: 0.5rem 0.625rem;
          background: transparent;
          border: none;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          text-align: right;
          font-family: 'JetBrains Mono', 'Space Grotesk', monospace;
        }

        .input-group input:focus {
          outline: none;
        }

        .input-group input::placeholder {
          color: var(--admin-text-muted);
          opacity: 0.5;
        }

        .input-group .unit {
          padding: 0 0.625rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          background: var(--admin-bg-secondary);
          border-left: 1px solid var(--admin-border-default);
          height: 36px;
          display: flex;
          align-items: center;
        }

        /* Remove spinners */
        .input-group input::-webkit-outer-spin-button,
        .input-group input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-group input[type=number] {
          -moz-appearance: textfield;
        }

        /* Calculated box */
        .calculated-box {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: var(--admin-bg-tertiary);
          border-radius: 8px;
          border: 1px solid var(--admin-border-subtle);
        }

        .calc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8125rem;
          padding: 0.25rem 0;
        }

        .calc-item span:first-child {
          color: var(--admin-text-muted);
        }

        .calc-item span:last-child {
          font-weight: 600;
          color: var(--admin-text-primary);
          font-family: 'JetBrains Mono', 'Space Grotesk', monospace;
        }

        .calc-item .hypo-value {
          color: #e74c3c;
        }

        .calc-divider {
          height: 1px;
          background: var(--admin-border-subtle);
          margin: 0.5rem 0;
        }

        /* Footer */
        .popup-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--admin-border-default);
          background: var(--admin-bg-secondary);
          border-radius: 0 0 1rem 1rem;
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
          padding: 0.5rem 1rem;
          border-radius: 6px;
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
