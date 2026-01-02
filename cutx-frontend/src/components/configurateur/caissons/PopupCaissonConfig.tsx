'use client';

// components/configurateur/caissons/PopupCaissonConfig.tsx
// Popup principale de configuration d'un caisson - Design CutX

import { useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Box,
  Layers,
  DoorOpen,
  Settings2,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useCaissonCalculs } from '@/hooks/useCaissonCalculs';
import type { ResultatCalculCaisson } from '@/lib/caissons/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import dynamic from 'next/dynamic';
import styles from './styles/PopupCaisson.module.css';

// Import dynamique pour eviter SSR avec Three.js
const CaissonPreview3D = dynamic(() => import('./CaissonPreview3D'), {
  ssr: false,
  loading: () => (
    <div className={styles.previewLoading}>
      <div className={styles.previewSpinner} />
    </div>
  ),
});

// Import des etapes
import EtapeStructure from './etapes/EtapeStructure';
import EtapeFond from './etapes/EtapeFond';
import EtapeFacade from './etapes/EtapeFacade';
import EtapeCharnieres from './etapes/EtapeCharnieres';

// Configuration des etapes
const ETAPES = [
  { numero: 1, nom: 'Structure', icon: Box, description: 'Dimensions et panneau' },
  { numero: 2, nom: 'Fond', icon: Layers, description: 'Type et panneau' },
  { numero: 3, nom: 'Facade', icon: DoorOpen, description: 'Porte et jeu' },
  { numero: 4, nom: 'Charnieres', icon: Settings2, description: 'Position et type' },
];

interface PopupCaissonConfigProps {
  open: boolean;
  onClose: () => void;
  onValidate: (resultat: ResultatCalculCaisson) => void;
  templateId?: string;
  panneauxCatalogue: PanneauCatalogue[];
}

export default function PopupCaissonConfig({
  open,
  onClose,
  onValidate,
  templateId,
  panneauxCatalogue,
}: PopupCaissonConfigProps) {
  const [showFacade, setShowFacade] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useState(() => {
    setMounted(true);
  });

  const caisson = useCaissonCalculs(templateId);
  const {
    config,
    resultat,
    templates,
    etapeActive,
    setEtapeActive,
    etapeSuivante,
    etapePrecedente,
    peutAllerSuivante,
    peutAllerPrecedente,
    reinitialiser,
    validerEtape,
  } = caisson;

  // Gerer la validation finale
  const handleValidate = () => {
    if (resultat) {
      onValidate(resultat);
      onClose();
    }
  };

  // Affichage de l'etape courante
  const renderEtape = () => {
    switch (etapeActive) {
      case 1:
        return (
          <EtapeStructure
            config={config}
            caisson={caisson}
            panneauxCatalogue={panneauxCatalogue}
            validation={validerEtape(1)}
          />
        );
      case 2:
        return (
          <EtapeFond
            config={config}
            caisson={caisson}
            panneauxCatalogue={panneauxCatalogue}
            validation={validerEtape(2)}
          />
        );
      case 3:
        return (
          <EtapeFacade
            config={config}
            caisson={caisson}
            panneauxCatalogue={panneauxCatalogue}
            validation={validerEtape(3)}
          />
        );
      case 4:
        return (
          <EtapeCharnieres
            config={config}
            caisson={caisson}
            validation={validerEtape(4)}
          />
        );
      default:
        return null;
    }
  };

  if (!open || !mounted) return null;

  const popupContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Box size={22} />
            </div>
            <div className={styles.headerTitle}>
              <h2 className={styles.title}>Configuration du caisson</h2>
              <span className={styles.subtitle}>
                {config.templateId
                  ? templates.find(t => t.id === config.templateId)?.nom
                  : 'Caisson personnalise'}
              </span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.resetBtn} onClick={reinitialiser}>
              <RotateCcw size={14} />
              Reinitialiser
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Stepper */}
        <nav className={styles.stepper}>
          {ETAPES.map((etape, index) => {
            const Icon = etape.icon;
            const isActive = etapeActive === etape.numero;
            const isCompleted = etapeActive > etape.numero;

            return (
              <div key={etape.numero} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setEtapeActive(etape.numero as 1 | 2 | 3 | 4)}
                  className={`${styles.stepItem} ${isActive ? styles.stepItemActive : ''} ${isCompleted ? styles.stepItemCompleted : ''}`}
                >
                  <div className={styles.stepNumber}>
                    {isCompleted ? <Check size={14} /> : etape.numero}
                  </div>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>
                      <Icon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                      {etape.nom}
                    </span>
                  </div>
                </button>
                {index < ETAPES.length - 1 && <div className={styles.stepSeparator} />}
              </div>
            );
          })}
        </nav>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Left: Configuration */}
          <div className={styles.configPanel}>
            <div className={styles.configContent}>
              <p className={styles.stepTitle}>
                {ETAPES[etapeActive - 1].description}
              </p>
              {renderEtape()}
            </div>
          </div>

          {/* Right: 3D Preview */}
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <span className={styles.previewTitle}>Previsualisation 3D</span>
              <div className={styles.previewControls}>
                <button
                  className={`${styles.previewToggle} ${showDimensions ? styles.previewToggleActive : ''}`}
                  onClick={() => setShowDimensions(!showDimensions)}
                >
                  {showDimensions ? <Eye size={12} /> : <EyeOff size={12} />}
                  Cotes
                </button>
                <button
                  className={`${styles.previewToggle} ${showFacade ? styles.previewToggleActive : ''}`}
                  onClick={() => setShowFacade(!showFacade)}
                >
                  <DoorOpen size={12} />
                  Facade
                </button>
              </div>
            </div>

            <div className={styles.previewCanvas}>
              <Suspense fallback={
                <div className={styles.previewLoading}>
                  <div className={styles.previewSpinner} />
                </div>
              }>
                <CaissonPreview3D
                  config={config}
                  panneaux={resultat?.panneaux || []}
                  showDimensions={showDimensions}
                  showFacade={showFacade}
                />
              </Suspense>
            </div>

            <div className={styles.previewLegend}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotStructure}`} />
                Structure
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotFond}`} />
                Fond
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotFacade}`} />
                Facade
              </div>
            </div>

            {/* Summary */}
            {resultat && (
              <div className={styles.previewSummary}>
                <h4 className={styles.summaryTitle}>Recapitulatif</h4>
                <div className={styles.summaryList}>
                  {resultat.panneaux.map((panneau, index) => (
                    <div key={index} className={styles.summaryRow}>
                      <span className={styles.summaryName}>{panneau.nom}</span>
                      <span className={styles.summaryDims}>
                        {panneau.longueur} x {panneau.largeur} x {panneau.epaisseur}mm
                      </span>
                      <span className={styles.summarySurface}>
                        {panneau.surfaceM2.toFixed(3)} m2
                      </span>
                    </div>
                  ))}
                  <div className={styles.summaryTotal}>
                    <span className={styles.summaryTotalLabel}>Total</span>
                    <span className={styles.summaryTotalValue}>
                      {resultat.nombrePanneaux} panneaux
                    </span>
                    <span className={styles.summaryTotalValue}>
                      {resultat.surfaceTotaleM2.toFixed(3)} m2
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <button
              className={styles.navBtn}
              onClick={etapePrecedente}
              disabled={!peutAllerPrecedente}
            >
              <ChevronLeft size={16} />
              Precedent
            </button>
          </div>

          <div className={styles.footerCenter}>
            Etape {etapeActive} sur 4
          </div>

          <div className={styles.footerRight}>
            {etapeActive < 4 ? (
              <button
                className={styles.navBtn}
                onClick={etapeSuivante}
                disabled={!peutAllerSuivante}
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className={styles.validateBtn}
                onClick={handleValidate}
                disabled={!resultat}
              >
                <Check size={18} />
                Valider et ajouter
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}
