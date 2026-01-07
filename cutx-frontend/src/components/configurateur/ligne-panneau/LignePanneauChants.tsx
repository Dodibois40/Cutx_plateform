'use client';

import { useTranslations } from 'next-intl';
import type { FormePanneau, ChantsConfig } from '@/lib/configurateur/types';

interface RectangleChants {
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}

interface LignePanneauChantsProps {
  forme: FormePanneau;
  chants: RectangleChants;
  chantsConfig: ChantsConfig | undefined;
  mlChants: number;
  onUpdate: (updates: { chants?: RectangleChants; chantsConfig?: ChantsConfig }) => void;
}

export default function LignePanneauChants({
  forme,
  chants,
  chantsConfig,
  mlChants,
  onUpdate,
}: LignePanneauChantsProps) {
  const t = useTranslations();
  const currentForme = forme || 'rectangle';

  // Affichage ml total (partagé)
  const renderMlTotal = () => (
    mlChants > 0 && (
      <span className="chants-ml-total">
        <span className="ml-value">{mlChants.toFixed(2)}</span>
        <span className="ml-unit">ml</span>
      </span>
    )
  );

  return (
    <>
      {/* RECTANGLE: 4 boutons A/B/C/D */}
      {currentForme === 'rectangle' && (
        <div className="chants-row">
          <span className="chant-label">L1</span>
          <button
            type="button"
            className={`chant-btn ${chants.A ? 'active' : ''}`}
            onClick={() => onUpdate({ chants: { ...chants, A: !chants.A } })}
          >
            <span className="chant-edge-top" />
            <span className="chant-letter">A</span>
          </button>
          <span className="chant-label">l1</span>
          <button
            type="button"
            className={`chant-btn ${chants.B ? 'active' : ''}`}
            onClick={() => onUpdate({ chants: { ...chants, B: !chants.B } })}
          >
            <span className="chant-edge-left" />
            <span className="chant-letter">B</span>
          </button>
          <span className="chant-label">L2</span>
          <button
            type="button"
            className={`chant-btn ${chants.C ? 'active' : ''}`}
            onClick={() => onUpdate({ chants: { ...chants, C: !chants.C } })}
          >
            <span className="chant-edge-bottom" />
            <span className="chant-letter">C</span>
          </button>
          <span className="chant-label">l2</span>
          <button
            type="button"
            className={`chant-btn ${chants.D ? 'active' : ''}`}
            onClick={() => onUpdate({ chants: { ...chants, D: !chants.D } })}
          >
            <span className="chant-edge-right" />
            <span className="chant-letter">D</span>
          </button>
          {renderMlTotal()}
        </div>
      )}

      {/* TRIANGLE: 3 boutons A/B/C */}
      {currentForme === 'triangle' && chantsConfig?.type === 'triangle' && (() => {
        const edges = chantsConfig.edges as { A: boolean; B: boolean; C: boolean };
        return (
          <div className="chants-row chants-triangle">
            <button
              type="button"
              className={`chant-btn chant-btn-small ${edges.A ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: {
                  type: 'triangle',
                  edges: { A: !edges.A, B: edges.B, C: edges.C }
                }
              })}
            >
              <span className="chant-letter">A</span>
            </button>
            <button
              type="button"
              className={`chant-btn chant-btn-small ${edges.B ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: {
                  type: 'triangle',
                  edges: { A: edges.A, B: !edges.B, C: edges.C }
                }
              })}
            >
              <span className="chant-letter">B</span>
            </button>
            <button
              type="button"
              className={`chant-btn chant-btn-small ${edges.C ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: {
                  type: 'triangle',
                  edges: { A: edges.A, B: edges.B, C: !edges.C }
                }
              })}
            >
              <span className="chant-letter">C</span>
            </button>
            {renderMlTotal()}
          </div>
        );
      })()}

      {/* PENTAGON (L-Shape): 5 boutons A/B/C/D/E */}
      {currentForme === 'pentagon' && chantsConfig?.type === 'pentagon' && (() => {
        const edges = chantsConfig.edges as { A: boolean; B: boolean; C: boolean; D: boolean; E: boolean };
        return (
          <div className="chants-row">
            <span className="chant-label">L1</span>
            <button
              type="button"
              className={`chant-btn ${edges.A ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: { type: 'pentagon', edges: { ...edges, A: !edges.A } }
              })}
            >
              <span className="chant-edge-top" />
              <span className="chant-letter">A</span>
            </button>
            <span className="chant-label">l1</span>
            <button
              type="button"
              className={`chant-btn ${edges.B ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: { type: 'pentagon', edges: { ...edges, B: !edges.B } }
              })}
            >
              <span className="chant-edge-left" />
              <span className="chant-letter">B</span>
            </button>
            <span className="chant-label">L2</span>
            <button
              type="button"
              className={`chant-btn ${edges.C ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: { type: 'pentagon', edges: { ...edges, C: !edges.C } }
              })}
            >
              <span className="chant-edge-bottom" />
              <span className="chant-letter">C</span>
            </button>
            <span className="chant-label">l2</span>
            <button
              type="button"
              className={`chant-btn ${edges.D ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: { type: 'pentagon', edges: { ...edges, D: !edges.D } }
              })}
            >
              <span className="chant-edge-right" />
              <span className="chant-letter">D</span>
            </button>
            <span className="chant-label">diag</span>
            <button
              type="button"
              className={`chant-btn ${edges.E ? 'active' : ''}`}
              onClick={() => onUpdate({
                chantsConfig: { type: 'pentagon', edges: { ...edges, E: !edges.E } }
              })}
            >
              <span className="chant-edge-diagonal" />
              <span className="chant-letter">E</span>
            </button>
            {renderMlTotal()}
          </div>
        );
      })()}

      {/* CIRCLE, ELLIPSE, CUSTOM: 1 toggle "Contour courbé" */}
      {(currentForme === 'circle' || currentForme === 'ellipse' || currentForme === 'custom') && (
        <div className="chants-curved">
          <button
            type="button"
            className={`chant-btn-curved ${chantsConfig?.type === 'curved' && chantsConfig.edges.contour ? 'active' : ''}`}
            onClick={() => onUpdate({
              chantsConfig: {
                type: 'curved',
                edges: { contour: !(chantsConfig?.type === 'curved' && chantsConfig.edges.contour) }
              }
            })}
          >
            <span className="curved-icon">⟳</span>
            <span className="curved-label">{t('configurateur.edges.contour')}</span>
          </button>
          {renderMlTotal()}
        </div>
      )}

      <style jsx>{`
        .chants-row {
          display: flex;
          align-items: center;
          gap: 0.125rem;
        }

        .chants-ml-total {
          display: inline-flex;
          align-items: baseline;
          gap: 0.125rem;
          margin-left: 0.5rem;
          padding-left: 0.5rem;
          border-left: 1px solid var(--admin-border-subtle, rgba(255,255,255,0.15));
        }

        .chants-ml-total .ml-value {
          font-family: 'JetBrains Mono', 'Space Grotesk', monospace;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--admin-olive, #a3b763);
        }

        .chants-ml-total .ml-unit {
          font-size: 0.5625rem;
          font-weight: 500;
          color: var(--admin-text-muted, #888);
          text-transform: lowercase;
        }

        .chant-label {
          font-size: 0.5rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          padding: 0 0.125rem;
        }

        .chant-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 28px;
          padding: 0;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.15s;
          overflow: hidden;
        }

        .chant-btn:hover {
          background: var(--admin-bg-hover);
        }

        .chant-btn.active {
          border-color: var(--admin-olive-border);
        }

        .chant-letter {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--admin-text-muted);
          z-index: 1;
        }

        .chant-btn.active .chant-letter {
          color: var(--admin-olive);
        }

        /* Edge indicators */
        .chant-edge-top,
        .chant-edge-bottom,
        .chant-edge-left,
        .chant-edge-right,
        .chant-edge-diagonal {
          position: absolute;
          background: transparent;
          transition: background 0.15s;
        }

        .chant-edge-top {
          top: -1px;
          left: -1px;
          right: -1px;
          height: 3px;
          border-radius: 3px 3px 0 0;
        }

        .chant-edge-left {
          top: -1px;
          bottom: -1px;
          left: -1px;
          width: 3px;
          border-radius: 3px 0 0 3px;
        }

        .chant-edge-bottom {
          bottom: -1px;
          left: -1px;
          right: -1px;
          height: 3px;
          border-radius: 0 0 3px 3px;
        }

        .chant-edge-right {
          top: -1px;
          bottom: -1px;
          right: -1px;
          width: 3px;
          border-radius: 0 3px 3px 0;
        }

        .chant-edge-diagonal {
          top: 10px;
          left: -1px;
          width: 16px;
          height: 3px;
          transform-origin: left center;
          transform: rotate(-50deg);
          border-radius: 2px;
        }

        .chant-btn.active .chant-edge-top,
        .chant-btn.active .chant-edge-bottom,
        .chant-btn.active .chant-edge-left,
        .chant-btn.active .chant-edge-right,
        .chant-btn.active .chant-edge-diagonal {
          background: var(--admin-olive);
        }

        /* Smaller buttons for Triangle */
        .chant-btn-small {
          width: 26px;
          height: 26px;
        }

        .chant-btn-small .chant-letter {
          font-size: 0.65rem;
        }

        .chants-triangle {
          gap: 0.25rem;
        }

        /* Curved contour (Circle, Ellipse, Custom) */
        .chants-curved {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .chant-btn-curved {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--admin-text-muted);
        }

        .chant-btn-curved:hover {
          background: var(--admin-bg-hover);
          border-color: var(--admin-olive-border);
        }

        .chant-btn-curved.active {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
        }

        .chant-btn-curved.active .curved-icon,
        .chant-btn-curved.active .curved-label {
          color: var(--admin-olive);
        }

        .curved-icon {
          font-size: 0.875rem;
        }

        .curved-label {
          font-size: 0.6875rem;
          font-weight: 500;
        }
      `}</style>
    </>
  );
}
