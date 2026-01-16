'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Wrench, Paintbrush, X, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { LignePrestationV3, TypeFinition, Brillance, FormePanneau, ChantsConfig } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import {
  ETAT_INDICATEURS,
  TYPES_FINITION_TRANSLATION_KEYS,
  BRILLANCES_PRICING,
  BRILLANCES_TRANSLATION_KEYS,
  DEFAULT_CHANTS_BY_SHAPE,
} from '@/lib/configurateur/constants';
import SelecteurForme from './SelecteurForme';
import SelecteurFinition from './SelecteurFinition';
import { getEtatLigne, getChampsManquants, formaterPrix, calculerMetresLineairesParForme } from '@/lib/configurateur/calculs';
import PopupEnConstruction from './dialogs/PopupEnConstruction';
import PopupFormePentagon from './dialogs/PopupFormePentagon';
import PopupFormeTriangle from './dialogs/PopupFormeTriangle';
import PopupUsinages from './dialogs/PopupUsinages';
// Composants modulaires refactorisés
import {
  LignePanneauGrip,
  LignePanneauDimensions,
  LignePanneauChants,
  LignePanneauActions,
  LigneFinitionRow,
} from './ligne-panneau';
import './ligne-panneau/styles.css';

// Props pour le drag & drop (optionnelles)
interface DragProps {
  dragRef?: (node: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
  isDragging?: boolean;
}

// Props pour la multi-sélection
interface SelectionProps {
  isSelected?: boolean;
  onToggleSelection?: () => void;
  selectedCount?: number; // Nombre total de lignes sélectionnées
}

interface LignePanneauProps extends DragProps, SelectionProps {
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
  hidePanelColumn?: boolean; // Masquer la colonne panneau (mode groupes)
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
  hidePanelColumn = false,
  // Props de drag optionnelles
  dragRef,
  dragStyle,
  dragAttributes,
  dragListeners,
  isDragging = false,
  // Props de sélection optionnelles
  isSelected = false,
  onToggleSelection,
  selectedCount = 0,
}: LignePanneauProps) {
  const t = useTranslations();
  const [showEnConstruction, setShowEnConstruction] = useState<'percage' | null>(null);
  const [showUsinages, setShowUsinages] = useState(false);
  const [showPentagon, setShowPentagon] = useState(false);
  const [showTriangle, setShowTriangle] = useState(false);
  const [showEtatTooltip, setShowEtatTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isFinitionExpanded, setIsFinitionExpanded] = useState(false); // Collapsed by default, expanded when user manually creates
  const [isReferenceShaking, setIsReferenceShaking] = useState(false);
  const etatRef = useRef<HTMLSpanElement>(null);
  const finitionRowRef = useRef<HTMLTableRowElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Handler pour highlight le champ référence quand on essaie de dupliquer sans ref
  const handleHighlightReference = () => {
    setIsReferenceShaking(true);
    referenceInputRef.current?.focus();
    setTimeout(() => setIsReferenceShaking(false), 600);
  };

  // Helper: Check if finition has required details filled
  const isFinitionComplete = (lf: LignePrestationV3 | null): boolean => {
    if (!lf) return false;
    // Laque needs RAL code + brillance
    if (lf.finition === 'laque') {
      return !!(lf.codeCouleurLaque && lf.brillance);
    }
    // Teinte+vernis needs teinte + brillance
    if (lf.typeFinition === 'teinte_vernis') {
      return !!(lf.teinte && lf.brillance);
    }
    // Vernis only needs brillance
    return !!lf.brillance;
  };

  // Helper: Generate finition summary text
  const getFinitionSummary = (lf: LignePrestationV3 | null): string | null => {
    if (!lf || !lf.typeFinition) return null;

    const parts: string[] = [];

    // Type (use existing translation keys)
    if (lf.typeFinition) {
      parts.push(t(TYPES_FINITION_TRANSLATION_KEYS[lf.typeFinition]));
    }

    // Color/Tint
    if (lf.finition === 'laque' && lf.codeCouleurLaque) {
      // Extract just the RAL code (without hex)
      const ralCode = lf.codeCouleurLaque.replace(/\s*\(#[0-9a-fA-F]+\)/, '');
      parts.push(ralCode);
    } else if (lf.teinte) {
      parts.push(lf.teinte);
    }

    // Brillance (use existing translation keys)
    if (lf.brillance) {
      parts.push(t(BRILLANCES_TRANSLATION_KEYS[lf.brillance]));
    }

    // Faces
    if (lf.nombreFaces) {
      parts.push(`${lf.nombreFaces}F`);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  // Click outside to collapse finition row (only if finition is complete)
  useEffect(() => {
    if (!ligneFinition || !isFinitionExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't collapse if clicking inside the finition row
      if (finitionRowRef.current?.contains(target)) return;

      // Don't collapse if clicking on a popup (PopupLaque, etc.)
      const popupElements = document.querySelectorAll('[role="dialog"], .popup-overlay, [data-radix-portal]');
      for (const popup of popupElements) {
        if (popup.contains(target)) return;
      }

      // Only collapse if finition details are filled
      if (isFinitionComplete(ligneFinition)) {
        setIsFinitionExpanded(false);
      }
    };

    // Use mousedown to capture before other handlers
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ligneFinition, isFinitionExpanded]);

  // État de la ligne
  const etat = getEtatLigne(ligne);
  const indicateur = ETAT_INDICATEURS[etat];
  const champsManquants = getChampsManquants(ligne);

  // Calcul des ml de chants selon la forme
  // Pour rectangle, toujours utiliser ligne.chants (qui est synchronisé avec les boutons)
  const chantsConfigPourCalcul = (ligne.forme || 'rectangle') === 'rectangle'
    ? { type: 'rectangle' as const, edges: ligne.chants }
    : ligne.chantsConfig || { type: 'rectangle' as const, edges: ligne.chants };

  const mlChants = calculerMetresLineairesParForme(
    ligne.forme,
    ligne.dimensions,
    chantsConfigPourCalcul,
    ligne.dimensionsLShape,
    ligne.formeCustom
  );

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
      <tr
        ref={dragRef}
        style={dragStyle}
        className={`ligne-panneau ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''}`}
      >
        {/* État + Grip de drag combinés */}
        <td className="cx-col-etat cell-etat cell-group-id">
          <LignePanneauGrip
            indicateurCouleur={indicateur.couleur}
            indicateurIcone={indicateur.icone}
            isSelected={isSelected}
            selectedCount={selectedCount}
            onToggleSelection={onToggleSelection}
            dragAttributes={dragAttributes}
            dragListeners={dragListeners}
            onMouseEnter={handleEtatMouseEnter}
            onMouseLeave={() => setShowEtatTooltip(false)}
            etatRef={etatRef}
          />
          {etatTooltip}
        </td>

        {/* Panneau - rappel visuel (masqué en mode groupes) */}
        {!hidePanelColumn && (
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
        )}

        {/* Référence */}
        <td className="cx-col-reference cell-reference cell-group-id cell-group-end-sticky" title={t('configurateur.tooltips.reference')}>
          <input
            ref={referenceInputRef}
            type="text"
            value={ligne.reference}
            onChange={(e) => onUpdate({ reference: e.target.value })}
            onFocus={(e) => e.target.select()}
            placeholder={t('configurateur.placeholders.reference')}
            className={`input-compact ${isReferenceShaking ? 'shake-highlight' : ''}`}
          />
        </td>

        {/* Forme */}
        <td className="cx-col-forme cell-forme cell-group-panneau">
          <SelecteurForme
            forme={ligne.forme || 'rectangle'}
            onChange={(forme: FormePanneau, chantsConfig: ChantsConfig) => {
              // Pour pentagon et triangle, ouvrir le popup au lieu de changer directement
              if (forme === 'pentagon') {
                setShowPentagon(true);
              } else if (forme === 'triangle') {
                setShowTriangle(true);
              } else {
                onUpdate({ forme, chantsConfig });
              }
            }}
            onCustomSelect={() => {
              // DXF import not yet implemented - no-op
            }}
          />
        </td>

        {/* Dimensions - Adaptatives selon forme */}
        <td className="cx-col-dimensions cell-dimensions cell-group-panneau" title={t('configurateur.tooltips.dimensions')}>
          <LignePanneauDimensions
            forme={ligne.forme || 'rectangle'}
            dimensions={ligne.dimensions}
            dimensionsLShape={ligne.dimensionsLShape}
            formeCustom={ligne.formeCustom}
            sensDuFil={ligne.sensDuFil}
            panneauGlobal={panneauGlobal}
            panneauMulticouche={panneauMulticouche}
            onUpdate={onUpdate}
          />
        </td>

        {/* Chants - Dynamiques selon forme */}
        <td className="cx-col-chants cell-chants cell-group-panneau" title={t('configurateur.tooltips.edges')}>
          <LignePanneauChants
            forme={ligne.forme || 'rectangle'}
            chants={ligne.chants}
            chantsConfig={ligne.chantsConfig}
            mlChants={mlChants}
            onUpdate={onUpdate}
          />
        </td>

        {/* Usinages */}
        <td className="cx-col-usinages cell-group-panneau cell-center" title={t('configurateur.tooltips.machining')}>
          <button
            className={`btn-usinages ${ligne.usinages.length > 0 ? 'has-usinages' : ''}`}
            onClick={() => setShowUsinages(true)}
          >
            <Wrench size={14} />
            {ligne.usinages.length > 0 && (
              <span className="badge">{ligne.usinages.length}</span>
            )}
          </button>
        </td>

        {/* Perçage - En construction */}
        <td className="cx-col-percage cell-group-panneau cell-group-end cell-center">
          <button
            className="btn-percage-construction"
            onClick={() => setShowEnConstruction('percage')}
            title={t('configurateur.columns.drilling')}
          >
            <span className="toggle-empty">–</span>
          </button>
        </td>

        {/* Popup En construction (Percage) */}
        <PopupEnConstruction
          open={showEnConstruction !== null}
          onClose={() => setShowEnConstruction(null)}
          titre={t('configurateur.columns.drilling')}
        />

        {/* Popup Usinages */}
        <PopupUsinages
          open={showUsinages}
          usinages={ligne.usinages}
          onUpdate={(newUsinages) => onUpdate({ usinages: newUsinages })}
          onClose={() => setShowUsinages(false)}
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

        {/* Popup Triangle (Triangle rectangle) */}
        <PopupFormeTriangle
          isOpen={showTriangle}
          onClose={() => setShowTriangle(false)}
          onValidate={(dimensions) => {
            // Mettre à jour avec les dimensions du triangle
            onUpdate({
              forme: 'triangle',
              chantsConfig: DEFAULT_CHANTS_BY_SHAPE['triangle'],
              dimensionsTriangle: dimensions,
              // Mettre à jour aussi les dimensions classiques pour la compatibilité
              dimensions: {
                longueur: dimensions.base,
                largeur: dimensions.hauteur,
                epaisseur: dimensions.epaisseur,
              },
            });
            setShowTriangle(false);
          }}
          initialDimensions={ligne.dimensionsTriangle}
          epaisseur={
            panneauMulticouche
              ? panneauMulticouche.epaisseurTotale
              : panneauGlobal
                ? panneauGlobal.epaisseurs[0]
                : undefined
          }
        />

        {/* Finition optionnelle */}
        <td className="cx-col-finition cell-group-finition cell-group-end">
          <div className="finition-opt-wrapper">
            {!ligneFinition ? (
              // Pas de finition - afficher le sélecteur custom
              <SelecteurFinition
                onSelect={(typeFinition) => {
                  onCreerFinition(typeFinition);
                  setIsFinitionExpanded(true);
                }}
              />
            ) : (
              // Finition existe - afficher résumé avec accordion
              <div
                className={`finition-resume ${isFinitionExpanded ? 'expanded' : 'collapsed'} ${isFinitionComplete(ligneFinition) ? 'complete' : ''}`}
                onClick={() => setIsFinitionExpanded(!isFinitionExpanded)}
              >
                <span className="finition-expand-indicator">
                  {isFinitionExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                {isFinitionExpanded || !isFinitionComplete(ligneFinition) ? (
                  // Mode expanded ou incomplet: juste le type
                  <span className="finition-type">
                    <Paintbrush size={12} />
                    {ligneFinition.typeFinition ? t(TYPES_FINITION_TRANSLATION_KEYS[ligneFinition.typeFinition]) : t('configurateur.columns.finish')}
                  </span>
                ) : (
                  // Mode collapsed avec finition complète: résumé complet
                  <span className="finition-summary">
                    <Paintbrush size={12} />
                    <span className="summary-text">{getFinitionSummary(ligneFinition)}</span>
                  </span>
                )}
                <button
                  className="btn-remove-finition"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSupprimerFinition();
                  }}
                  title={t('configurateur.finish.removeFinish')}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </td>

        {/* Prix */}
        <td className="cx-col-prix cell-group-prix cell-prix">
          <span className="prix-value">{formaterPrix(prixTotal)}</span>
        </td>

        {/* Actions */}
        <td className="cx-col-actions cell-group-prix cell-actions">
          <LignePanneauActions
            onCopier={onCopier}
            onSupprimer={onSupprimer}
            canDelete={canDelete}
            canCopier={!!ligne.reference?.trim()}
            onHighlightReference={handleHighlightReference}
          />
        </td>
      </tr>

      {/* === SOUS-LIGNE FINITION === (Accordion: only show when expanded) */}
      {ligneFinition && onUpdateFinition && isFinitionExpanded && (
        <LigneFinitionRow
          ligneFinition={ligneFinition}
          onUpdateFinition={onUpdateFinition}
          hidePanelColumn={hidePanelColumn}
          brillancesDisponibles={brillancesDisponibles}
          finitionRowRef={finitionRowRef}
        />
      )}

    </Fragment>
  );
}
