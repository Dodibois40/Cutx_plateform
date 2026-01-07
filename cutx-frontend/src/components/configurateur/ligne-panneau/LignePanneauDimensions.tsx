'use client';

import { useTranslations } from 'next-intl';
import type { FormePanneau, DimensionsLShape } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';

interface Dimensions {
  longueur: number;
  largeur: number;
  epaisseur: number;
}

interface FormeCustom {
  surfaceM2: number;
  perimetreM: number;
}

interface LignePanneauDimensionsProps {
  forme: FormePanneau;
  dimensions: Dimensions;
  dimensionsLShape?: DimensionsLShape | null;
  formeCustom?: FormeCustom | null;
  sensDuFil: 'longueur' | 'largeur';
  panneauGlobal: PanneauCatalogue | null;
  panneauMulticouche: PanneauMulticouche | null;
  onUpdate: (updates: {
    dimensions?: Dimensions;
    dimensionsLShape?: DimensionsLShape;
    sensDuFil?: 'longueur' | 'largeur';
  }) => void;
}

// Icon for grain direction
function GrainDirectionIcon({ isVertical }: { isVertical: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {!isVertical ? (
        <>
          {/* Flèche horizontale en haut */}
          <line x1="4" y1="7" x2="24" y2="7" />
          <polyline points="20,3 28,7 20,11" />
          {/* Vagues horizontales en dessous */}
          <path d="M4 17 Q8 14 12 17 T20 17 T28 17" />
          <path d="M4 25 Q8 22 12 25 T20 25 T28 25" />
        </>
      ) : (
        <>
          {/* Flèche verticale à gauche */}
          <line x1="7" y1="4" x2="7" y2="24" />
          <polyline points="3,20 7,28 11,20" />
          {/* Vagues verticales à droite */}
          <path d="M17 4 Q14 8 17 12 T17 20 T17 28" />
          <path d="M25 4 Q22 8 25 12 T25 20 T25 28" />
        </>
      )}
    </svg>
  );
}

export default function LignePanneauDimensions({
  forme,
  dimensions,
  dimensionsLShape,
  formeCustom,
  sensDuFil,
  panneauGlobal,
  panneauMulticouche,
  onUpdate,
}: LignePanneauDimensionsProps) {
  const t = useTranslations();
  const currentForme = forme || 'rectangle';

  // Get current thickness (from panel or manual)
  const getEpaisseur = () => {
    if (panneauMulticouche) return panneauMulticouche.epaisseurTotale;
    if (panneauGlobal) return panneauGlobal.epaisseurs[0];
    return currentForme === 'pentagon'
      ? (dimensionsLShape?.epaisseur || '')
      : (dimensions.epaisseur || '');
  };

  const isThicknessLocked = !!(panneauGlobal || panneauMulticouche);

  // Grain direction button
  const renderGrainButton = () => (
    <button
      type="button"
      className={`btn-fil-icon ${sensDuFil === 'largeur' ? 'vertical' : ''}`}
      onClick={() => onUpdate({
        sensDuFil: sensDuFil === 'longueur' ? 'largeur' : 'longueur'
      })}
      title={t('configurateur.grainDirection.label', {
        direction: sensDuFil === 'longueur'
          ? t('configurateur.grainDirection.length')
          : t('configurateur.grainDirection.width')
      })}
    >
      <GrainDirectionIcon isVertical={sensDuFil === 'largeur'} />
    </button>
  );

  // Default L-Shape dimensions
  const defaultLShape: DimensionsLShape = {
    longueurTotale: 0,
    largeurTotale: 0,
    longueurEncoche: 0,
    largeurEncoche: 0,
    epaisseur: 0,
  };

  return (
    <>
      {currentForme === 'pentagon' ? (
        /* L-SHAPE: 5 champs (L1 × W1 | L2 × W2 × Ép) */
        <div className="dimensions-compact">
          <input
            type="number"
            value={dimensionsLShape?.longueurTotale || ''}
            onChange={(e) => onUpdate({
              dimensionsLShape: {
                ...(dimensionsLShape || defaultLShape),
                longueurTotale: Number(e.target.value) || 0
              }
            })}
            onFocus={(e) => e.target.select()}
            placeholder="L1"
            className={`input-dim input-dim-lshape ${!dimensionsLShape?.longueurTotale ? 'empty' : ''}`}
            min="0"
            title={t('configurateur.lshape.totalLength')}
          />
          <span className="dim-x">x</span>
          <input
            type="number"
            value={dimensionsLShape?.largeurTotale || ''}
            onChange={(e) => onUpdate({
              dimensionsLShape: {
                ...(dimensionsLShape || defaultLShape),
                largeurTotale: Number(e.target.value) || 0
              }
            })}
            onFocus={(e) => e.target.select()}
            placeholder="W1"
            className={`input-dim input-dim-lshape ${!dimensionsLShape?.largeurTotale ? 'empty' : ''}`}
            min="0"
            title={t('configurateur.lshape.totalWidth')}
          />
          <span className="dim-separator">|</span>
          <input
            type="number"
            value={dimensionsLShape?.longueurEncoche || ''}
            onChange={(e) => onUpdate({
              dimensionsLShape: {
                ...(dimensionsLShape || defaultLShape),
                longueurEncoche: Number(e.target.value) || 0
              }
            })}
            onFocus={(e) => e.target.select()}
            placeholder="L2"
            className={`input-dim input-dim-lshape ${!dimensionsLShape?.longueurEncoche ? 'empty' : ''}`}
            min="0"
            title={t('configurateur.lshape.notchLength')}
          />
          <span className="dim-x">x</span>
          <input
            type="number"
            value={dimensionsLShape?.largeurEncoche || ''}
            onChange={(e) => onUpdate({
              dimensionsLShape: {
                ...(dimensionsLShape || defaultLShape),
                largeurEncoche: Number(e.target.value) || 0
              }
            })}
            onFocus={(e) => e.target.select()}
            placeholder="W2"
            className={`input-dim input-dim-lshape ${!dimensionsLShape?.largeurEncoche ? 'empty' : ''}`}
            min="0"
            title={t('configurateur.lshape.notchWidth')}
          />
          <span className="dim-x">x</span>
          <input
            type="number"
            value={getEpaisseur()}
            onChange={(e) => {
              if (!isThicknessLocked) {
                onUpdate({
                  dimensionsLShape: {
                    ...(dimensionsLShape || defaultLShape),
                    epaisseur: Number(e.target.value) || 0
                  }
                });
              }
            }}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.thickness')}
            className={`input-dim input-ep ${isThicknessLocked ? 'input-locked' : ''}`}
            min="0"
            readOnly={isThicknessLocked}
          />
          {renderGrainButton()}
        </div>
      ) : currentForme === 'circle' ? (
        /* CERCLE: 1 champ (diamètre) */
        <div className="dimensions-circle">
          <span className="diameter-symbol">Ø</span>
          <input
            type="number"
            value={dimensions.longueur || ''}
            onChange={(e) => onUpdate({
              dimensions: {
                ...dimensions,
                longueur: Number(e.target.value) || 0,
                largeur: Number(e.target.value) || 0
              }
            })}
            onFocus={(e) => e.target.select()}
            placeholder="Diamètre"
            className={`input-dim input-dim-diameter ${!dimensions.longueur ? 'empty' : ''}`}
            min="0"
          />
          <span className="dim-x">x</span>
          <input
            type="number"
            value={getEpaisseur()}
            onChange={(e) => {
              if (!isThicknessLocked) {
                onUpdate({ dimensions: { ...dimensions, epaisseur: Number(e.target.value) || 0 } });
              }
            }}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.thickness')}
            className={`input-dim input-ep ${isThicknessLocked ? 'input-locked' : ''}`}
            min="0"
            readOnly={isThicknessLocked}
          />
        </div>
      ) : currentForme === 'custom' ? (
        /* CUSTOM DXF: Affichage read-only */
        <div className="dimensions-custom">
          {formeCustom ? (
            <>
              <span className="custom-surface">{formeCustom.surfaceM2.toFixed(3)} m²</span>
              <span className="custom-perimetre">{formeCustom.perimetreM.toFixed(2)} m</span>
            </>
          ) : (
            <span className="custom-empty">Import DXF requis</span>
          )}
        </div>
      ) : (
        /* RECTANGLE, ELLIPSE, TRIANGLE: 2 champs (L × l) */
        <div className="dimensions-compact">
          <input
            type="number"
            value={dimensions.longueur || ''}
            onChange={(e) => onUpdate({
              dimensions: { ...dimensions, longueur: Number(e.target.value) || 0 }
            })}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.length')}
            className={`input-dim input-dim-large ${!dimensions.longueur ? 'empty' : ''}`}
            min="0"
          />
          <span className="dim-x">x</span>
          <input
            type="number"
            value={dimensions.largeur || ''}
            onChange={(e) => onUpdate({
              dimensions: { ...dimensions, largeur: Number(e.target.value) || 0 }
            })}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.width')}
            className={`input-dim input-dim-large ${!dimensions.largeur ? 'empty' : ''}`}
            min="0"
          />
          <span className="dim-x">x</span>
          <input
            type="number"
            value={getEpaisseur()}
            onChange={(e) => {
              if (!isThicknessLocked) {
                onUpdate({ dimensions: { ...dimensions, epaisseur: Number(e.target.value) || 0 } });
              }
            }}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.thickness')}
            className={`input-dim input-ep ${isThicknessLocked ? 'input-locked' : ''}`}
            min="0"
            readOnly={isThicknessLocked}
            title={
              panneauMulticouche
                ? `${t('configurateur.multilayer.totalThickness')}: ${panneauMulticouche.epaisseurTotale}mm`
                : panneauGlobal
                  ? `${t('configurateur.placeholders.thickness')}: ${panneauGlobal.epaisseurs[0]}mm`
                  : t('configurateur.placeholders.thickness')
            }
          />
          {renderGrainButton()}
        </div>
      )}

      <style jsx>{`
        .dimensions-compact {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .input-dim {
          width: 54px;
          padding: 0.375rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          text-align: center;
          transition: all 0.2s;
          font-family: 'Space Grotesk', system-ui, sans-serif;
        }

        .input-dim-large {
          width: 90px;
        }

        .input-dim-lshape {
          width: 55px;
        }

        .input-dim-diameter {
          width: 100px;
        }

        .input-dim:focus {
          outline: none;
          border-color: var(--admin-olive);
          background: var(--admin-bg-card);
          box-shadow: 0 0 0 2px var(--admin-olive-bg);
        }

        .input-dim.empty {
          color: var(--admin-text-muted);
          border-style: dashed;
        }

        .input-dim.empty::placeholder {
          color: var(--admin-text-muted);
          opacity: 0.6;
          font-weight: 400;
        }

        .input-ep {
          width: 48px;
        }

        .input-locked {
          background: var(--admin-bg-tertiary) !important;
          border-color: var(--admin-border-default) !important;
          color: var(--admin-text-primary) !important;
          cursor: not-allowed;
          font-weight: 600;
          opacity: 0.8;
        }

        .dim-x {
          color: var(--admin-text-tertiary);
          font-size: 0.875rem;
          font-weight: 400;
        }

        .dim-separator {
          color: var(--admin-olive);
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0.25rem;
        }

        /* Circle dimensions */
        .dimensions-circle {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .diameter-symbol {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--admin-olive);
        }

        /* Custom DXF dimensions */
        .dimensions-custom {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .custom-surface {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
        }

        .custom-perimetre {
          font-size: 0.6875rem;
          color: var(--admin-text-muted);
        }

        .custom-empty {
          font-size: 0.75rem;
          font-style: italic;
          color: var(--admin-sable);
        }

        /* Grain direction button */
        .btn-fil-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          margin-left: 0.25rem;
          padding: 2px;
          background: var(--admin-olive-bg);
          border: 1px solid var(--admin-olive-border);
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          color: var(--admin-olive);
        }

        .btn-fil-icon svg {
          width: 20px;
          height: 20px;
        }

        .btn-fil-icon:hover {
          background: var(--admin-olive);
          border-color: var(--admin-olive);
          color: white;
        }

        .btn-fil-icon.vertical {
          background: var(--admin-sable-bg);
          border-color: var(--admin-sable-border);
          color: var(--admin-sable);
        }

        .btn-fil-icon.vertical:hover {
          background: var(--admin-sable);
          border-color: var(--admin-sable);
          color: white;
        }

        /* Remove spinners */
        .input-dim::-webkit-outer-spin-button,
        .input-dim::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-dim[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </>
  );
}
