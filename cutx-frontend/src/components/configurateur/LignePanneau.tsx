'use client';

import { useState, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Copy, Trash2, Wrench, Paintbrush, X, Pipette, Layers } from 'lucide-react';
import { getRALByCode } from '@/lib/configurateur/ral-colors';
import type { LignePrestationV3, TypeFinition, Brillance, FormePanneau, ChantsConfig, DimensionsLShape } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import {
  ETAT_INDICATEURS,
  TYPES_FINITION_VALUES,
  TYPES_FINITION_TRANSLATION_KEYS,
  BRILLANCES_PRICING,
  BRILLANCES_TRANSLATION_KEYS,
  DEFAULT_CHANTS_BY_SHAPE,
} from '@/lib/configurateur/constants';
import SelecteurForme from './SelecteurForme';
import { getEtatLigne, getChampsManquants, formaterPrix } from '@/lib/configurateur/calculs';
import PopupLaque from './dialogs/PopupLaque';
import PopupEnConstruction from './dialogs/PopupEnConstruction';
import PopupFormePentagon from './dialogs/PopupFormePentagon';

interface LignePanneauProps {
  ligne: LignePrestationV3;
  ligneFinition: LignePrestationV3 | null;
  panneauGlobal: PanneauCatalogue | null;
  panneauMulticouche: PanneauMulticouche | null;
  index: number;
  onUpdate: (updates: Partial<LignePrestationV3>) => void;
  onUpdateFinition?: (updates: Partial<LignePrestationV3>) => void;
  onSupprimer: () => void;
  onCopier: () => void;
  onCreerFinition: (typeFinition: TypeFinition) => void;
  onSupprimerFinition: () => void;
  canDelete: boolean;
}

export default function LignePanneau({
  ligne,
  ligneFinition,
  panneauGlobal,
  panneauMulticouche,
  index,
  onUpdate,
  onUpdateFinition,
  onSupprimer,
  onCopier,
  onCreerFinition,
  onSupprimerFinition,
  canDelete,
}: LignePanneauProps) {
  const t = useTranslations();
  const [showEnConstruction, setShowEnConstruction] = useState<'usinages' | 'percage' | null>(null);
  const [showLaque, setShowLaque] = useState(false);
  const [showPentagon, setShowPentagon] = useState(false);
  const [showEtatTooltip, setShowEtatTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const etatRef = useRef<HTMLSpanElement>(null);

  // État de la ligne
  const etat = getEtatLigne(ligne);
  const indicateur = ETAT_INDICATEURS[etat];
  const champsManquants = getChampsManquants(ligne);

  // Position du tooltip
  const handleEtatMouseEnter = () => {
    if (etatRef.current) {
      const rect = etatRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    }
    setShowEtatTooltip(true);
  };

  // Tooltip état
  const etatTooltip = showEtatTooltip && typeof document !== 'undefined' && createPortal(
    <div
      className="etat-tooltip"
      style={{
        position: 'fixed',
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
    >
      <div className="etat-tooltip-content">
        <strong>{t(indicateur.labelKey)}</strong>
        {champsManquants.length > 0 && (
          <div className="champs-manquants">
            {t('configurateur.status.missing', { fields: champsManquants.join(', ') })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  // Brillances disponibles pour la finition
  const brillancesDisponibles = BRILLANCES_PRICING.filter(b => {
    if (!ligneFinition?.finition) return true;
    if (ligneFinition.finition === 'laque') return b.prixLaque !== null;
    return b.prixVernis !== null;
  });

  // Prix total de la ligne (panneau + finition si existe)
  const prixTotal = ligne.prixHT + (ligneFinition?.prixHT || 0);

  return (
    <Fragment>
      {/* === LIGNE PANNEAU === */}
      <tr className="ligne-panneau">
        {/* État */}
        <td className="cell-etat cell-group-id">
          <span
            ref={etatRef}
            className="etat-indicateur"
            style={{ color: indicateur.couleur }}
            onMouseEnter={handleEtatMouseEnter}
            onMouseLeave={() => setShowEtatTooltip(false)}
          >
            {indicateur.icone}
          </span>
          {etatTooltip}
        </td>

        {/* Panneau - rappel visuel */}
        <td className="cell-panneau cell-group-id">
          {panneauMulticouche ? (
            // Affichage Panneau Multicouche
            <div className="panneau-rappel panneau-multicouche">
              <div className="panneau-thumb-multicouche">
                <Layers size={16} />
              </div>
              <div className="panneau-infos">
                <span className="panneau-nom panneau-nom--multicouche">
                  {t('configurateur.multilayer.layers', { count: panneauMulticouche.couches.length })}
                </span>
                <span className="panneau-details">
                  {panneauMulticouche.epaisseurTotale.toFixed(1)}mm • {panneauMulticouche.modeCollage === 'fournisseur' ? t('configurateur.multilayer.supplier') : t('configurateur.multilayer.client')}
                </span>
                <span className="panneau-couches">
                  {panneauMulticouche.couches.map((c, i) => (
                    <span key={c.id} className="panneau-couche-mini" title={c.panneauNom || c.type}>
                      {c.epaisseur}mm
                      {i < panneauMulticouche.couches.length - 1 && ' + '}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          ) : panneauGlobal ? (
            // Affichage Panneau Classique
            <div className="panneau-rappel">
              {panneauGlobal.imageUrl ? (
                <img
                  src={panneauGlobal.imageUrl}
                  alt={panneauGlobal.nom}
                  className="panneau-thumb"
                />
              ) : (
                <div className="panneau-thumb-placeholder" />
              )}
              <div className="panneau-infos">
                <span className="panneau-nom" title={panneauGlobal.nom}>
                  {panneauGlobal.nom}
                </span>
                <span className="panneau-details">
                  {panneauGlobal.epaisseurs.join(', ')}mm{panneauGlobal.fournisseur ? ` • ${panneauGlobal.fournisseur}` : ''}
                </span>
              </div>
            </div>
          ) : (
            <span className="panneau-vide">{t('configurateur.lines.noPanel')}</span>
          )}
        </td>

        {/* Référence */}
        <td className="cell-reference cell-group-id cell-group-end-sticky" title={t('configurateur.tooltips.reference')}>
          <input
            type="text"
            value={ligne.reference}
            onChange={(e) => onUpdate({ reference: e.target.value })}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.reference')}
            className="input-compact"
          />
        </td>

        {/* Forme */}
        <td className="cell-forme cell-group-panneau">
          <SelecteurForme
            forme={ligne.forme || 'rectangle'}
            onChange={(forme: FormePanneau, chantsConfig: ChantsConfig) => {
              // Pour pentagon, ouvrir le popup au lieu de changer directement
              if (forme === 'pentagon') {
                setShowPentagon(true);
              } else {
                onUpdate({ forme, chantsConfig });
              }
            }}
            onCustomSelect={() => {
              // TODO: Ouvrir popup import DXF
              console.log('Open DXF import popup');
            }}
          />
        </td>

        {/* Dimensions - Adaptatives selon forme */}
        <td className="cell-dimensions cell-group-panneau" title={t('configurateur.tooltips.dimensions')}>
          {(ligne.forme || 'rectangle') === 'pentagon' ? (
            /* L-SHAPE: 5 champs sur une ligne (L1 × W1 | L2 × W2 × Ép) */
            <div className="dimensions-compact">
              <input
                type="number"
                value={ligne.dimensionsLShape?.longueurTotale || ''}
                onChange={(e) => onUpdate({
                  dimensionsLShape: {
                    ...(ligne.dimensionsLShape || { longueurTotale: 0, largeurTotale: 0, longueurEncoche: 0, largeurEncoche: 0, epaisseur: 0 }),
                    longueurTotale: Number(e.target.value) || 0
                  }
                })}
                onFocus={(e) => e.target.select()}
                placeholder="L1"
                className={`input-dim input-dim-lshape ${!ligne.dimensionsLShape?.longueurTotale ? 'empty' : ''}`}
                min="0"
                title={t('configurateur.lshape.totalLength')}
              />
              <span className="dim-x">x</span>
              <input
                type="number"
                value={ligne.dimensionsLShape?.largeurTotale || ''}
                onChange={(e) => onUpdate({
                  dimensionsLShape: {
                    ...(ligne.dimensionsLShape || { longueurTotale: 0, largeurTotale: 0, longueurEncoche: 0, largeurEncoche: 0, epaisseur: 0 }),
                    largeurTotale: Number(e.target.value) || 0
                  }
                })}
                onFocus={(e) => e.target.select()}
                placeholder="W1"
                className={`input-dim input-dim-lshape ${!ligne.dimensionsLShape?.largeurTotale ? 'empty' : ''}`}
                min="0"
                title={t('configurateur.lshape.totalWidth')}
              />
              <span className="dim-separator">|</span>
              <input
                type="number"
                value={ligne.dimensionsLShape?.longueurEncoche || ''}
                onChange={(e) => onUpdate({
                  dimensionsLShape: {
                    ...(ligne.dimensionsLShape || { longueurTotale: 0, largeurTotale: 0, longueurEncoche: 0, largeurEncoche: 0, epaisseur: 0 }),
                    longueurEncoche: Number(e.target.value) || 0
                  }
                })}
                onFocus={(e) => e.target.select()}
                placeholder="L2"
                className={`input-dim input-dim-lshape ${!ligne.dimensionsLShape?.longueurEncoche ? 'empty' : ''}`}
                min="0"
                title={t('configurateur.lshape.notchLength')}
              />
              <span className="dim-x">x</span>
              <input
                type="number"
                value={ligne.dimensionsLShape?.largeurEncoche || ''}
                onChange={(e) => onUpdate({
                  dimensionsLShape: {
                    ...(ligne.dimensionsLShape || { longueurTotale: 0, largeurTotale: 0, longueurEncoche: 0, largeurEncoche: 0, epaisseur: 0 }),
                    largeurEncoche: Number(e.target.value) || 0
                  }
                })}
                onFocus={(e) => e.target.select()}
                placeholder="W2"
                className={`input-dim input-dim-lshape ${!ligne.dimensionsLShape?.largeurEncoche ? 'empty' : ''}`}
                min="0"
                title={t('configurateur.lshape.notchWidth')}
              />
              <span className="dim-x">x</span>
              <input
                type="number"
                value={
                  panneauMulticouche
                    ? panneauMulticouche.epaisseurTotale
                    : panneauGlobal
                      ? panneauGlobal.epaisseurs[0]
                      : (ligne.dimensionsLShape?.epaisseur || '')
                }
                onChange={(e) => {
                  if (!panneauGlobal && !panneauMulticouche) {
                    onUpdate({
                      dimensionsLShape: {
                        ...(ligne.dimensionsLShape || { longueurTotale: 0, largeurTotale: 0, longueurEncoche: 0, largeurEncoche: 0, epaisseur: 0 }),
                        epaisseur: Number(e.target.value) || 0
                      }
                    });
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder={t('configurateur.placeholders.thickness')}
                className={`input-dim input-ep ${(panneauGlobal || panneauMulticouche) ? 'input-locked' : ''}`}
                min="0"
                readOnly={!!(panneauGlobal || panneauMulticouche)}
              />
            </div>
          ) : (ligne.forme || 'rectangle') === 'circle' ? (
            /* CERCLE: 1 champ (diamètre) */
            <div className="dimensions-circle">
              <span className="diameter-symbol">Ø</span>
              <input
                type="number"
                value={ligne.dimensions.longueur || ''}
                onChange={(e) => onUpdate({
                  dimensions: { ...ligne.dimensions, longueur: Number(e.target.value) || 0, largeur: Number(e.target.value) || 0 }
                })}
                onFocus={(e) => e.target.select()}
                placeholder="Diamètre"
                className={`input-dim input-dim-diameter ${!ligne.dimensions.longueur ? 'empty' : ''}`}
                min="0"
              />
              <span className="dim-x">x</span>
              <input
                type="number"
                value={
                  panneauMulticouche
                    ? panneauMulticouche.epaisseurTotale
                    : panneauGlobal
                      ? panneauGlobal.epaisseurs[0]
                      : (ligne.dimensions.epaisseur || '')
                }
                onChange={(e) => {
                  if (!panneauGlobal && !panneauMulticouche) {
                    onUpdate({
                      dimensions: { ...ligne.dimensions, epaisseur: Number(e.target.value) || 0 }
                    });
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder={t('configurateur.placeholders.thickness')}
                className={`input-dim input-ep ${(panneauGlobal || panneauMulticouche) ? 'input-locked' : ''}`}
                min="0"
                readOnly={!!(panneauGlobal || panneauMulticouche)}
              />
            </div>
          ) : (ligne.forme || 'rectangle') === 'custom' ? (
            /* CUSTOM DXF: Affichage read-only */
            <div className="dimensions-custom">
              {ligne.formeCustom ? (
                <>
                  <span className="custom-surface">{ligne.formeCustom.surfaceM2.toFixed(3)} m²</span>
                  <span className="custom-perimetre">{ligne.formeCustom.perimetreM.toFixed(2)} m</span>
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
                value={ligne.dimensions.longueur || ''}
                onChange={(e) => onUpdate({
                  dimensions: { ...ligne.dimensions, longueur: Number(e.target.value) || 0 }
                })}
                onFocus={(e) => e.target.select()}
                placeholder={t('configurateur.placeholders.length')}
                className={`input-dim input-dim-large ${!ligne.dimensions.longueur ? 'empty' : ''}`}
                min="0"
              />
              <span className="dim-x">x</span>
              <input
                type="number"
                value={ligne.dimensions.largeur || ''}
                onChange={(e) => onUpdate({
                  dimensions: { ...ligne.dimensions, largeur: Number(e.target.value) || 0 }
                })}
                onFocus={(e) => e.target.select()}
                placeholder={t('configurateur.placeholders.width')}
                className={`input-dim input-dim-large ${!ligne.dimensions.largeur ? 'empty' : ''}`}
                min="0"
              />
              <span className="dim-x">x</span>
              <input
                type="number"
                value={
                  panneauMulticouche
                    ? panneauMulticouche.epaisseurTotale
                    : panneauGlobal
                      ? panneauGlobal.epaisseurs[0]
                      : (ligne.dimensions.epaisseur || '')
                }
                onChange={(e) => {
                  if (!panneauGlobal && !panneauMulticouche) {
                    onUpdate({
                      dimensions: { ...ligne.dimensions, epaisseur: Number(e.target.value) || 0 }
                    });
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder={t('configurateur.placeholders.thickness')}
                className={`input-dim input-ep ${(panneauGlobal || panneauMulticouche) ? 'input-locked' : ''}`}
                min="0"
                readOnly={!!(panneauGlobal || panneauMulticouche)}
                title={
                  panneauMulticouche
                    ? `${t('configurateur.multilayer.totalThickness')}: ${panneauMulticouche.epaisseurTotale}mm`
                    : panneauGlobal
                      ? `${t('configurateur.placeholders.thickness')}: ${panneauGlobal.epaisseurs[0]}mm`
                      : t('configurateur.placeholders.thickness')
                }
              />
              <button
                type="button"
                className={`btn-fil ${ligne.sensDuFil === 'largeur' ? 'vertical' : ''}`}
                onClick={() => onUpdate({
                  sensDuFil: ligne.sensDuFil === 'longueur' ? 'largeur' : 'longueur'
                })}
                title={t('configurateur.grainDirection.clickToChange')}
              >
                <span className="fil-icon">{ligne.sensDuFil === 'longueur' ? '\u2194' : '\u2195'}</span>
                <span className="fil-text">{t('configurateur.grainDirection.label', { direction: ligne.sensDuFil === 'longueur' ? t('configurateur.grainDirection.length') : t('configurateur.grainDirection.width') })}</span>
              </button>
            </div>
          )}
        </td>

        {/* Chants - Dynamiques selon forme */}
        <td className="cell-chants cell-group-panneau" title={t('configurateur.tooltips.edges')}>
          {/* RECTANGLE: 4 boutons A/B/C/D */}
          {(ligne.forme || 'rectangle') === 'rectangle' && (
            <div className="chants-row">
              <span className="chant-label">L1</span>
              <button
                type="button"
                className={`chant-btn ${ligne.chants.A ? 'active' : ''}`}
                onClick={() => onUpdate({ chants: { ...ligne.chants, A: !ligne.chants.A } })}
              >
                <span className="chant-edge-top" />
                <span className="chant-letter">A</span>
              </button>
              <span className="chant-label">l1</span>
              <button
                type="button"
                className={`chant-btn ${ligne.chants.B ? 'active' : ''}`}
                onClick={() => onUpdate({ chants: { ...ligne.chants, B: !ligne.chants.B } })}
              >
                <span className="chant-edge-left" />
                <span className="chant-letter">B</span>
              </button>
              <span className="chant-label">L2</span>
              <button
                type="button"
                className={`chant-btn ${ligne.chants.C ? 'active' : ''}`}
                onClick={() => onUpdate({ chants: { ...ligne.chants, C: !ligne.chants.C } })}
              >
                <span className="chant-edge-bottom" />
                <span className="chant-letter">C</span>
              </button>
              <span className="chant-label">l2</span>
              <button
                type="button"
                className={`chant-btn ${ligne.chants.D ? 'active' : ''}`}
                onClick={() => onUpdate({ chants: { ...ligne.chants, D: !ligne.chants.D } })}
              >
                <span className="chant-edge-right" />
                <span className="chant-letter">D</span>
              </button>
            </div>
          )}

          {/* TRIANGLE: 3 boutons A/B/C */}
          {ligne.forme === 'triangle' && ligne.chantsConfig?.type === 'triangle' && (() => {
            const edges = ligne.chantsConfig.edges as { A: boolean; B: boolean; C: boolean };
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
              </div>
            );
          })()}

          {/* PENTAGON (L-Shape): 5 boutons A/B/C/D/E - même style que rectangle */}
          {ligne.forme === 'pentagon' && ligne.chantsConfig?.type === 'pentagon' && (() => {
            const edges = ligne.chantsConfig.edges as { A: boolean; B: boolean; C: boolean; D: boolean; E: boolean };
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
              </div>
            );
          })()}

          {/* CIRCLE, ELLIPSE, CUSTOM: 1 toggle "Contour courbé" */}
          {(ligne.forme === 'circle' || ligne.forme === 'ellipse' || ligne.forme === 'custom') && (
            <div className="chants-curved">
              <button
                type="button"
                className={`chant-btn-curved ${ligne.chantsConfig?.type === 'curved' && ligne.chantsConfig.edges.contour ? 'active' : ''}`}
                onClick={() => onUpdate({
                  chantsConfig: {
                    type: 'curved',
                    edges: { contour: !(ligne.chantsConfig?.type === 'curved' && ligne.chantsConfig.edges.contour) }
                  }
                })}
              >
                <span className="curved-icon">⟳</span>
                <span className="curved-label">{t('configurateur.edges.contour')}</span>
              </button>
            </div>
          )}
        </td>

        {/* Usinages - En construction */}
        <td className="cell-group-panneau cell-center" title={t('configurateur.tooltips.machining')}>
          <button
            className="btn-usinages btn-construction"
            onClick={() => setShowEnConstruction('usinages')}
          >
            <Wrench size={14} />
          </button>
        </td>

        {/* Perçage - En construction */}
        <td className="cell-group-panneau cell-group-end cell-center">
          <button
            className="btn-percage-construction"
            onClick={() => setShowEnConstruction('percage')}
            title={t('configurateur.columns.drilling')}
          >
            <span className="toggle-empty">–</span>
          </button>
        </td>

        {/* Popup En construction */}
        <PopupEnConstruction
          open={showEnConstruction !== null}
          onClose={() => setShowEnConstruction(null)}
          titre={showEnConstruction === 'usinages' ? t('configurateur.columns.machining') : t('configurateur.columns.drilling')}
        />

        {/* Popup Pentagon (Rectangle 5 côtés) */}
        <PopupFormePentagon
          isOpen={showPentagon}
          onClose={() => setShowPentagon(false)}
          onValidate={(dimensions) => {
            // Mettre à jour avec les dimensions du pentagon (coinCoupe inclus dans dimensions)
            onUpdate({
              forme: 'pentagon',
              chantsConfig: DEFAULT_CHANTS_BY_SHAPE['pentagon'],
              dimensionsLShape: dimensions,
            });
            setShowPentagon(false);
          }}
          initialDimensions={ligne.dimensionsLShape}
        />

        {/* Finition optionnelle */}
        <td className="cell-group-finition cell-group-end">
          <div className="finition-opt-wrapper">
            {!ligneFinition ? (
              // Pas de finition - afficher le sélecteur
              <div className="finition-selector">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onCreerFinition(e.target.value as TypeFinition);
                    }
                  }}
                  className="select-compact select-finition"
                >
                  <option value="">{t('configurateur.finish.addFinish')}</option>
                  {TYPES_FINITION_VALUES.map(value => (
                    <option key={value} value={value}>{t(TYPES_FINITION_TRANSLATION_KEYS[value])}</option>
                  ))}
                </select>
              </div>
            ) : (
              // Finition existe - afficher résumé
              <div className="finition-resume">
                <span className="finition-type">
                  <Paintbrush size={12} />
                  {ligneFinition.typeFinition ? t(TYPES_FINITION_TRANSLATION_KEYS[ligneFinition.typeFinition]) : t('configurateur.columns.finish')}
                </span>
                <button
                  className="btn-remove-finition"
                  onClick={onSupprimerFinition}
                  title={t('configurateur.finish.removeFinish')}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </td>

        {/* Prix */}
        <td className="cell-group-prix cell-prix">
          <span className="prix-value">{formaterPrix(prixTotal)}</span>
        </td>

        {/* Actions */}
        <td className="cell-group-prix cell-actions">
          <div className="actions-group">
            <button className="btn-action" onClick={onCopier} title={t('common.actions.duplicate')}>
              <Copy size={14} />
            </button>
            <button
              className="btn-action btn-delete"
              onClick={onSupprimer}
              disabled={!canDelete}
              title={t('common.actions.delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* === SOUS-LIGNE FINITION === */}
      {ligneFinition && onUpdateFinition && (
        <tr className="ligne-finition">
          {/* Cellules vides pour alignement */}
          <td className="cell-empty cell-group-id"></td>
          <td className="cell-empty cell-group-id"></td>
          <td className="cell-empty cell-group-id cell-group-end-sticky">
            <span className="finition-indent">{'\u21B3'} {t('configurateur.columns.finish')}</span>
          </td>
          <td className="cell-empty cell-group-panneau"></td>

          {/* Teinte/RAL - couvre Dimensions + Chants */}
          <td className="cell-finition-detail" colSpan={2}>
            <div className="finition-field">
              <label>
                {ligneFinition.finition === 'laque' ? t('configurateur.finish.ralCode') : t('configurateur.finish.tint')}
              </label>
              {ligneFinition.finition === 'laque' ? (
                <div className="color-picker-wrapper">
                  <input
                    type="text"
                    value={ligneFinition.codeCouleurLaque?.replace(/\s*\(#[0-9a-fA-F]+\)/, '') || ''}
                    readOnly
                    onClick={() => setShowLaque(true)}
                    placeholder={t('configurateur.placeholders.chooseRAL')}
                    className={`input-compact input-with-picker ${!ligneFinition.codeCouleurLaque ? 'field-missing' : ''}`}
                    style={{ cursor: 'pointer' }}
                  />
                  <button
                    className="btn-color-picker"
                    onClick={() => setShowLaque(true)}
                    style={ligneFinition.codeCouleurLaque ? {
                      backgroundColor: ligneFinition.codeCouleurLaque.match(/#[0-9a-fA-F]{6}/)?.[0] || getRALByCode(ligneFinition.codeCouleurLaque)?.hex || '#888',
                    } : undefined}
                  >
                    {!ligneFinition.codeCouleurLaque && <Pipette size={14} />}
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={ligneFinition.teinte || ''}
                  onChange={(e) => onUpdateFinition({ teinte: e.target.value || null })}
                  placeholder={ligneFinition.typeFinition === 'teinte_vernis' ? t('configurateur.placeholders.tint') : t('common.misc.optional')}
                  className={`input-compact ${ligneFinition.typeFinition === 'teinte_vernis' && !ligneFinition.teinte ? 'field-missing' : ''}`}
                />
              )}
              <PopupLaque
                open={showLaque}
                codeCouleurActuel={ligneFinition.codeCouleurLaque}
                onUpdate={(codeCouleur) => onUpdateFinition?.({ codeCouleurLaque: codeCouleur })}
                onClose={() => setShowLaque(false)}
              />
            </div>
          </td>

          {/* Brillance - couvre Usinages + Perçage */}
          <td className="cell-finition-detail cell-group-end" colSpan={2}>
            <div className="finition-field">
              <label>{t('configurateur.finish.gloss')}</label>
              <select
                value={ligneFinition.brillance || ''}
                onChange={(e) => onUpdateFinition({ brillance: e.target.value as Brillance || null })}
                className={`select-compact ${!ligneFinition.brillance ? 'field-missing' : ''}`}
              >
                <option value="">{t('configurateur.placeholders.choose')}</option>
                {brillancesDisponibles.map(b => {
                  const prix = ligneFinition.finition === 'laque' ? b.prixLaque : b.prixVernis;
                  return (
                    <option key={b.value} value={b.value}>
                      {t(BRILLANCES_TRANSLATION_KEYS[b.value])} ({prix}{t('configurateur.units.euroPerM2')})
                    </option>
                  );
                })}
              </select>
            </div>
          </td>

          {/* Faces - colonne Finition seule */}
          <td className="cell-finition-detail cell-group-end">
            <div className="finition-field">
              <label>{t('configurateur.finish.faces')}</label>
              <div className="faces-toggle">
                <button
                  className={`btn-face ${ligneFinition.nombreFaces === 1 ? 'active' : ''}`}
                  onClick={() => onUpdateFinition({ nombreFaces: 1 })}
                >
                  1
                </button>
                <button
                  className={`btn-face ${ligneFinition.nombreFaces === 2 ? 'active' : ''}`}
                  onClick={() => onUpdateFinition({ nombreFaces: 2 })}
                >
                  2
                </button>
              </div>
            </div>
          </td>

          {/* Prix finition */}
          <td className="cell-group-prix cell-prix">
            <span className="prix-finition">{formaterPrix(ligneFinition.prixHT)}</span>
          </td>
          <td className="cell-group-prix cell-actions"></td>
        </tr>
      )}

      <style jsx>{`
        .ligne-panneau {
          background: var(--admin-bg-card);
        }

        .ligne-panneau:hover {
          background: var(--admin-bg-hover);
        }

        .ligne-panneau td {
          padding: 0.625rem 0.5rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          border-right: 1px solid var(--admin-border-default);
          vertical-align: middle;
        }

        .ligne-panneau td:last-child {
          border-right: none;
        }

        .ligne-finition {
          background: linear-gradient(90deg, var(--admin-bg-tertiary) 0%, var(--admin-ardoise-bg) 100%);
        }

        .ligne-finition td {
          padding: 0.5rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          border-right: 1px solid var(--admin-border-default);
          vertical-align: middle;
        }

        .ligne-finition td:last-child {
          border-right: none;
        }

        .cell-empty {
          background: var(--admin-bg-tertiary) !important;
        }

        .finition-indent {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--admin-ardoise);
          font-weight: 500;
        }

        /* Cellules sticky */
        .cell-etat, .cell-reference {
          position: sticky;
          background: inherit;
        }

        .cell-etat {
          left: 0;
          z-index: 5;
          text-align: center;
        }

        .cell-reference {
          left: 50px;
          z-index: 5;
        }

        .cell-actions {
          position: sticky;
          right: 0;
          z-index: 5;
          background: inherit;
        }

        .cell-center {
          text-align: center;
        }

        /* Cellule Panneau */
        .cell-panneau {
          min-width: 200px;
        }

        .panneau-rappel {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .panneau-thumb {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid var(--admin-border-default);
          flex-shrink: 0;
        }

        .panneau-thumb-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: var(--admin-bg-tertiary);
          border: 1px dashed var(--admin-border-default);
          flex-shrink: 0;
        }

        .panneau-thumb-multicouche {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: linear-gradient(135deg, var(--cx-accent-subtle), var(--cx-surface-3));
          border: 1px solid var(--cx-accent-muted);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cx-accent);
        }

        .panneau-multicouche {
          background: var(--cx-accent-subtle);
          border-radius: 6px;
          padding: 4px 8px;
        }

        .panneau-nom--multicouche {
          color: var(--cx-accent);
        }

        .panneau-couches {
          font-size: 10px;
          color: var(--cx-text-muted);
          font-family: var(--cx-font-mono);
        }

        .panneau-couche-mini {
          white-space: nowrap;
        }

        .panneau-infos {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }

        .panneau-nom {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .panneau-details {
          font-size: 0.6875rem;
          color: var(--admin-text-muted);
        }

        .panneau-vide {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
          font-style: italic;
        }

        /* État indicateur */
        .etat-indicateur {
          cursor: help;
          font-size: 1rem;
        }

        /* Inputs */
        .input-compact {
          width: 100%;
          padding: 0.375rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--admin-text-primary);
          transition: all 0.2s;
        }

        .input-compact:focus {
          outline: none;
          border-color: var(--admin-olive);
          background: var(--admin-bg-card);
        }

        .input-compact::placeholder {
          color: var(--admin-text-muted);
          opacity: 0.5;
          font-style: italic;
          font-weight: 400;
        }

        .input-compact.field-missing {
          border-color: var(--admin-sable);
          background: var(--admin-sable-bg);
        }

        .select-compact {
          width: 100%;
          padding: 0.375rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--admin-text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .select-compact.field-missing {
          border-color: var(--admin-sable);
          background: var(--admin-sable-bg);
        }

        .select-compact option {
          background: var(--admin-bg-elevated);
          color: var(--admin-text-primary);
          padding: 0.5rem;
        }

        /* Panneau wrapper */
        .panneau-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .btn-select-panneau {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.625rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
          font-size: 0.8125rem;
          color: var(--admin-text-secondary);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .btn-select-panneau:hover {
          border-color: var(--admin-olive);
          background: var(--admin-bg-hover);
        }

        .btn-select-panneau.field-missing {
          border-color: var(--admin-sable);
          background: var(--admin-sable-bg);
        }

        .btn-select-panneau.has-selection {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-text-primary);
        }

        .btn-select-panneau .icon-package {
          color: var(--admin-olive);
          flex-shrink: 0;
        }

        .btn-select-panneau .panneau-thumbnail {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid var(--admin-border-default);
        }

        .btn-select-panneau .panneau-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .btn-select-panneau .icon-chevron {
          color: var(--admin-text-muted);
          flex-shrink: 0;
          transition: transform 0.2s;
        }

        .btn-select-panneau:hover .icon-chevron {
          transform: translateY(2px);
        }

        /* Fourniture toggle */
        .fourniture-toggle-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .fourniture-toggle-buttons {
          display: flex;
          gap: 0;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--admin-border-default);
        }

        .fourniture-btn {
          padding: 0.375rem 0.625rem;
          border: none;
          background: var(--admin-bg-tertiary);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .fourniture-btn:first-child {
          border-right: 1px solid var(--admin-border-default);
        }

        .fourniture-btn:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        .fourniture-btn.active {
          background: var(--admin-olive-bg);
          color: var(--admin-olive);
        }

        .fourniture-btn.active.sans {
          background: var(--admin-sable-bg);
          color: var(--admin-sable);
        }

        .fourniture-prix {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--admin-sable);
        }

        /* ====================== */
        /* DIMENSIONS - Compact   */
        /* ====================== */
        .cell-dimensions {
          min-width: 380px;
        }

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

        /* Inputs plus grands pour Longueur et Largeur */
        .input-dim-large {
          width: 140px;
        }

        /* L-Shape dimensions (6 champs) */
        .input-dim-lshape {
          width: 90px;
        }

        .input-dim-encoche {
          width: 70px;
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

        /* Champ épaisseur verrouillé quand panneau sélectionné */
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

        /* L-Shape dimensions layout */
        .dimensions-lshape {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .dims-row {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .dims-encoche {
          padding-left: 0.5rem;
          border-left: 2px solid var(--admin-olive);
        }

        .encoche-label {
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          margin-right: 0.25rem;
        }

        .dims-common {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.25rem;
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

        /* Bouton sens du fil - explicite avec texte complet */
        .btn-fil {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          min-width: 140px;
          margin-left: 0.5rem;
          padding: 0.375rem 0.625rem;
          background: var(--admin-olive-bg);
          border: 1px solid var(--admin-olive-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .fil-icon {
          font-size: 1rem;
          line-height: 1;
          color: var(--admin-olive);
        }

        .fil-text {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--admin-olive);
          white-space: nowrap;
        }

        .btn-fil:hover {
          background: var(--admin-olive);
          border-color: var(--admin-olive);
        }

        .btn-fil:hover .fil-icon,
        .btn-fil:hover .fil-text {
          color: white;
        }

        .btn-fil.vertical {
          background: var(--admin-sable-bg);
          border-color: var(--admin-sable-border);
        }

        .btn-fil.vertical .fil-icon,
        .btn-fil.vertical .fil-text {
          color: var(--admin-sable);
        }

        .btn-fil.vertical:hover {
          background: var(--admin-sable);
          border-color: var(--admin-sable);
        }

        .btn-fil.vertical:hover .fil-icon,
        .btn-fil.vertical:hover .fil-text {
          color: white;
        }

        /* ====================== */
        /* CHANTS - Labels + Boutons */
        /* ====================== */
        .cell-chants {
          min-width: 220px;
        }

        .chants-row {
          display: flex;
          align-items: center;
          gap: 0.125rem;
        }

        /* Labels séparés (L1, l1, L2, l2) */
        .chant-label {
          font-size: 0.5rem;
          font-weight: 500;
          color: var(--admin-text-muted);
          padding: 0 0.125rem;
        }

        /* Boutons RECTANGLES (plus larges que hauts) */
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

        /* Actif = PAS de fond vert, juste la bordure olive */
        .chant-btn.active {
          border-color: var(--admin-olive-border);
        }

        /* Lettre dans le bouton */
        .chant-letter {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--admin-text-muted);
          z-index: 1;
        }

        .chant-btn.active .chant-letter {
          color: var(--admin-olive);
        }

        /* Bords colorés - position absolue, GRIS par défaut */
        .chant-edge-top,
        .chant-edge-bottom,
        .chant-edge-left,
        .chant-edge-right {
          position: absolute;
          background: transparent;
          transition: background 0.15s;
        }

        /* Bord HAUT (chant A) */
        .chant-edge-top {
          top: -1px;
          left: -1px;
          right: -1px;
          height: 3px;
          border-radius: 3px 3px 0 0;
        }

        /* Bord GAUCHE (chant B) */
        .chant-edge-left {
          top: -1px;
          bottom: -1px;
          left: -1px;
          width: 3px;
          border-radius: 3px 0 0 3px;
        }

        /* Bord BAS (chant C) */
        .chant-edge-bottom {
          bottom: -1px;
          left: -1px;
          right: -1px;
          height: 3px;
          border-radius: 0 0 3px 3px;
        }

        /* Bord DROITE (chant D) */
        .chant-edge-right {
          top: -1px;
          bottom: -1px;
          right: -1px;
          width: 3px;
          border-radius: 0 3px 3px 0;
        }

        /* Bord DIAGONAL (chant E) - ligne diagonale coin coupé haut-gauche */
        .chant-edge-diagonal {
          position: absolute;
          top: 10px;
          left: -1px;
          width: 16px;
          height: 3px;
          background: transparent;
          transform-origin: left center;
          transform: rotate(-50deg);
          border-radius: 2px;
          transition: background 0.15s;
        }

        /* Actif = SEULEMENT le bord en vert (pas le fond) */
        .chant-btn.active .chant-edge-top,
        .chant-btn.active .chant-edge-bottom,
        .chant-btn.active .chant-edge-left,
        .chant-btn.active .chant-edge-right,
        .chant-btn.active .chant-edge-diagonal {
          background: var(--admin-olive);
        }

        /* Boutons plus petits pour Triangle/Pentagon */
        .chant-btn-small {
          width: 26px;
          height: 26px;
        }

        .chant-btn-small .chant-letter {
          font-size: 0.65rem;
        }

        /* Triangle: 3 boutons */
        .chants-triangle {
          gap: 0.25rem;
        }

        /* Pentagon: 5 boutons */
        .chants-pentagon {
          gap: 0.125rem;
        }

        /* Contour courbé (Circle, Ellipse, Custom) */
        .chants-curved {
          display: flex;
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

        /* Cellule forme */
        .cell-forme {
          min-width: 130px;
        }

        /* Retirer spinners des inputs number */
        .input-dim::-webkit-outer-spin-button,
        .input-dim::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-dim[type=number] {
          -moz-appearance: textfield;
        }

        /* Usinages */
        .btn-usinages {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.375rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-usinages:hover {
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .btn-usinages.has-usinages {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .btn-usinages .badge {
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.125rem 0.25rem;
          background: var(--admin-olive);
          color: white;
          border-radius: 4px;
        }

        /* Perçage toggle */
        .toggle-percage {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          cursor: pointer;
          color: var(--admin-text-muted);
          transition: all 0.2s;
          margin: 0 auto;
        }

        .toggle-percage:hover {
          border-color: var(--admin-olive);
        }

        .toggle-percage.active {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .toggle-percage input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-empty {
          font-size: 0.875rem;
        }

        /* Boutons "En construction" */
        .btn-construction {
          opacity: 0.6;
        }

        .btn-construction:hover {
          opacity: 1;
          border-color: #ffc107 !important;
          color: #ffc107 !important;
        }

        .btn-percage-construction {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          cursor: pointer;
          color: var(--admin-text-muted);
          transition: all 0.2s;
          margin: 0 auto;
          opacity: 0.6;
        }

        .btn-percage-construction:hover {
          opacity: 1;
          border-color: #ffc107;
          color: #ffc107;
        }

        /* Finition optionnelle */
        .finition-opt-wrapper {
          min-width: 140px;
        }

        .select-finition {
          border-color: var(--admin-ardoise-border);
          color: var(--admin-ardoise);
        }

        .finition-resume {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.375rem 0.5rem;
          background: var(--admin-ardoise-bg);
          border: 1px solid var(--admin-ardoise-border);
          border-radius: 6px;
        }

        .finition-type {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--admin-ardoise);
        }

        .btn-remove-finition {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-remove-finition:hover {
          background: var(--admin-status-danger-bg);
          color: var(--admin-status-danger);
        }

        /* Finition detail fields */
        .cell-finition-detail {
          background: var(--admin-bg-tertiary) !important;
        }

        .finition-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .finition-field label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--admin-text-muted);
        }

        .color-picker-wrapper {
          display: flex;
          gap: 0.25rem;
        }

        .input-with-picker {
          flex: 1;
        }

        .btn-color-picker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: var(--admin-bg-tertiary);
          border: 2px solid var(--admin-border-default);
          border-radius: 6px;
          cursor: pointer;
          color: var(--admin-text-muted);
          transition: all 0.2s;
        }

        .btn-color-picker:hover {
          border-color: var(--admin-sable);
        }

        .faces-toggle {
          display: flex;
          gap: 0.25rem;
        }

        .btn-face {
          flex: 1;
          padding: 0.375rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-face:hover {
          border-color: var(--admin-olive);
        }

        .btn-face.active {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        /* Prix */
        .cell-prix {
          text-align: right !important;
        }

        .prix-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-text-primary);
        }

        .prix-finition {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--admin-ardoise);
        }

        /* Actions */
        .actions-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        .btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .btn-delete:hover {
          background: var(--admin-status-danger-bg);
          border-color: var(--admin-status-danger-border);
          color: var(--admin-status-danger);
        }

        .btn-action:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Tooltip */
        :global(.etat-tooltip) {
          background: var(--admin-bg-elevated);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          font-size: 0.75rem;
        }

        :global(.etat-tooltip-content) {
          color: var(--admin-text-primary);
        }

        :global(.champs-manquants) {
          margin-top: 0.25rem;
          color: var(--admin-sable);
          font-size: 0.6875rem;
        }

        /* Retirer spinners des inputs number */
        .input-dimension::-webkit-outer-spin-button,
        .input-dimension::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-dimension[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </Fragment>
  );
}
