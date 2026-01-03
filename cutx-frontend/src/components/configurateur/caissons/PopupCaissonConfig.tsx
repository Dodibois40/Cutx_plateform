'use client';

// components/configurateur/caissons/PopupCaissonConfig.tsx
// Popup principale de configuration d'un caisson - Design CutX

import { useState, useEffect, Suspense, useCallback } from 'react';
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
  Download,
  Loader2,
  Circle,
  Grid3X3,
  Box as BoxIcon,
} from 'lucide-react';
import { useCaissonCalculs } from '@/hooks/useCaissonCalculs';
import type { ResultatCalculCaisson } from '@/lib/caissons/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { ProduitCatalogue } from '@/lib/catalogues';
import dynamic from 'next/dynamic';
import styles from './styles/PopupCaisson.module.css';
import PopupSelectionPanneau from '../PopupSelectionPanneau';
import {
  calculateDrillings,
  exportDxf,
  downloadDxfFile,
  configToApiParams,
  type DrillingStatistics,
} from '@/lib/caissons/api';
import { generateCaissonDxf, downloadDxfZip } from '@/lib/caissons/dxf-generator';

// Import dynamique pour eviter SSR avec Three.js
const CaissonPreview3D = dynamic(() => import('./CaissonPreview3D'), {
  ssr: false,
  loading: () => (
    <div className={styles.previewLoading}>
      <div className={styles.previewSpinner} />
    </div>
  ),
});

// Import des vues techniques 2D (Maker.js - meme moteur que export DXF)
import MakerJsVuesTechniques from './MakerJsVuesTechniques';

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

// Types de selection de panneau
type PanelSelectionType = 'structure' | 'fond' | 'facade' | null;

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
  const [showDrillings, setShowDrillings] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [mounted, setMounted] = useState(false);

  // State pour le selecteur de panneau
  const [panelSelectorOpen, setPanelSelectorOpen] = useState<PanelSelectionType>(null);

  // State pour export DXF et statistiques percages
  const [drillingStats, setDrillingStats] = useState<DrillingStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isExportingDxf, setIsExportingDxf] = useState(false);
  const [isExportingMakerJs, setIsExportingMakerJs] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

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
    setPanneauStructure,
    setPanneauFond,
    setPanneauFacade,
  } = caisson;

  // Gerer la validation finale
  const handleValidate = () => {
    if (resultat) {
      onValidate(resultat);
      onClose();
    }
  };

  // Charger les statistiques de percages System 32
  const loadDrillingStats = useCallback(async () => {
    if (!config) return;

    setIsLoadingStats(true);
    setExportError(null);

    try {
      const params = configToApiParams(config);
      const response = await calculateDrillings(params);
      setDrillingStats(response.statistics);
    } catch (error) {
      console.error('Erreur chargement stats percages:', error);
      setExportError('Erreur lors du calcul des percages');
    } finally {
      setIsLoadingStats(false);
    }
  }, [config]);

  // Charger les stats quand on arrive a l'etape 4
  useEffect(() => {
    if (etapeActive === 4 && config && !drillingStats && !isLoadingStats) {
      loadDrillingStats();
    }
  }, [etapeActive, config, drillingStats, isLoadingStats, loadDrillingStats]);

  // Exporter en DXF (API backend)
  const handleExportDxf = async () => {
    if (!config) return;

    setIsExportingDxf(true);
    setExportError(null);

    try {
      const params = configToApiParams(config);
      const blob = await exportDxf(params);
      const filename = `caisson_${config.largeur}x${config.hauteur}x${config.profondeur}.dxf`;
      downloadDxfFile(blob, filename);
    } catch (error) {
      console.error('Erreur export DXF:', error);
      setExportError('Erreur lors de l\'export DXF');
    } finally {
      setIsExportingDxf(false);
    }
  };

  // Exporter en DXF avec Maker.js (local, tous panneaux dans ZIP)
  const handleExportMakerJs = async () => {
    if (!config || !resultat) return;

    setIsExportingMakerJs(true);
    setExportError(null);

    try {
      // Generer les DXF pour tous les panneaux
      const dxfFiles = generateCaissonDxf(config, resultat, {
        includeSystem32: true,
        includeAssemblage: true,
        includeRainure: config.typeFond === 'rainure' || config.typeFond === 'encastre',
        includeCotations: true,
        typeAssemblage: 'minifix',
        units: 'mm',
      });

      // Telecharger en ZIP
      const nomCaisson = `caisson_${config.largeur}x${config.hauteur}x${config.profondeur}`;
      await downloadDxfZip(dxfFiles, nomCaisson);
    } catch (error) {
      console.error('Erreur export Maker.js:', error);
      setExportError('Erreur lors de l\'export DXF');
    } finally {
      setIsExportingMakerJs(false);
    }
  };

  // Ouvrir le selecteur pour un type de panneau
  const openPanelSelector = (type: PanelSelectionType) => {
    setPanelSelectorOpen(type);
  };

  // Fermer le selecteur de panneau
  const closePanelSelector = () => {
    setPanelSelectorOpen(null);
  };

  // Gerer la selection d'un panneau depuis le catalogue
  const handleSelectCatalogue = (produit: ProduitCatalogue) => {
    // Transformer le produit catalogue en PanneauCatalogue
    const panneau: PanneauCatalogue = {
      id: produit.reference,
      nom: produit.nom,
      categorie: 'agglo_plaque',
      essence: null,
      epaisseurs: [produit.epaisseur],
      prixM2: { [produit.epaisseur]: produit.prixVenteM2 || 0 },
      fournisseur: produit.marque || null,
      disponible: produit.stock === 'EN STOCK',
      description: null,
      ordre: 0,
      imageUrl: produit.imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Affecter au bon element selon le type
    switch (panelSelectorOpen) {
      case 'structure':
        setPanneauStructure(panneau);
        break;
      case 'fond':
        setPanneauFond(panneau);
        break;
      case 'facade':
        setPanneauFacade(panneau);
        break;
    }

    closePanelSelector();
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
            onOpenPanelSelector={() => openPanelSelector('structure')}
          />
        );
      case 2:
        return (
          <EtapeFond
            config={config}
            caisson={caisson}
            panneauxCatalogue={panneauxCatalogue}
            validation={validerEtape(2)}
            onOpenPanelSelector={() => openPanelSelector('fond')}
          />
        );
      case 3:
        return (
          <EtapeFacade
            config={config}
            caisson={caisson}
            panneauxCatalogue={panneauxCatalogue}
            validation={validerEtape(3)}
            onOpenPanelSelector={() => openPanelSelector('facade')}
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

          {/* Right: Preview (3D or 2D) */}
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <span className={styles.previewTitle}>
                {viewMode === '3d' ? 'Previsualisation 3D' : 'Vues Techniques 2D'}
              </span>
              <div className={styles.previewControls}>
                {/* Toggle 3D / 2D */}
                <button
                  className={`${styles.previewToggle} ${styles.previewToggleMode}`}
                  onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
                  title={viewMode === '3d' ? 'Passer en vue 2D technique' : 'Passer en vue 3D'}
                >
                  {viewMode === '3d' ? <Grid3X3 size={12} /> : <BoxIcon size={12} />}
                  {viewMode === '3d' ? '2D Tech' : '3D'}
                </button>
                <button
                  className={`${styles.previewToggle} ${showDimensions ? styles.previewToggleActive : ''}`}
                  onClick={() => setShowDimensions(!showDimensions)}
                >
                  {showDimensions ? <Eye size={12} /> : <EyeOff size={12} />}
                  Cotes
                </button>
                {viewMode === '3d' && (
                  <button
                    className={`${styles.previewToggle} ${showFacade ? styles.previewToggleActive : ''}`}
                    onClick={() => setShowFacade(!showFacade)}
                  >
                    <DoorOpen size={12} />
                    Facade
                  </button>
                )}
                <button
                  className={`${styles.previewToggle} ${showDrillings ? styles.previewToggleActive : ''}`}
                  onClick={() => setShowDrillings(!showDrillings)}
                  title="Afficher les percages System 32"
                >
                  <Circle size={12} />
                  Percages
                </button>
              </div>
            </div>

            <div className={styles.previewCanvas}>
              {viewMode === '3d' ? (
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
                    showDrillings={showDrillings}
                  />
                </Suspense>
              ) : (
                <MakerJsVuesTechniques
                  config={config}
                  resultat={resultat}
                  showDimensions={showDimensions}
                  showDrillings={showDrillings}
                  showHinges={config.avecFacade}
                />
              )}
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
              {showDrillings && (
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendDotDrilling}`} />
                  Percages
                </div>
              )}
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

                {/* Statistiques percages System 32 */}
                {etapeActive === 4 && (
                  <div className={styles.drillingStats}>
                    <h5 className={styles.drillingStatsTitle}>
                      <Circle size={14} style={{ marginRight: 6 }} />
                      Percages CNC (System 32)
                    </h5>
                    {isLoadingStats ? (
                      <div className={styles.drillingStatsLoading}>
                        <Loader2 size={16} className={styles.spinIcon} />
                        Calcul en cours...
                      </div>
                    ) : drillingStats ? (
                      <div className={styles.drillingStatsList}>
                        <div className={styles.drillingStatRow}>
                          <span>Total trous</span>
                          <strong>{drillingStats.totalHoles}</strong>
                        </div>
                        {drillingStats.holesBySource && Object.entries(drillingStats.holesBySource).map(([source, count]) => (
                          <div key={source} className={styles.drillingStatRow}>
                            <span>
                              {source === 'system32' ? 'Etageres (System 32)' :
                               source === 'hinge' ? 'Charnieres' :
                               source === 'connector' ? 'Connecteurs' : source}
                            </span>
                            <span>{count}</span>
                          </div>
                        ))}
                        {drillingStats.holesByDiameter && Object.entries(drillingStats.holesByDiameter).length > 0 && (
                          <>
                            <div className={styles.drillingStatDivider} />
                            <div className={styles.drillingStatRow} style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              <span>Diametres</span>
                              <span>
                                {Object.entries(drillingStats.holesByDiameter)
                                  .map(([diam, count]) => `ø${diam}mm (${count})`)
                                  .join(', ')}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ) : exportError ? (
                      <div className={styles.drillingStatsError}>{exportError}</div>
                    ) : null}
                  </div>
                )}
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
              <>
                <button
                  className={styles.exportDxfBtn}
                  onClick={handleExportMakerJs}
                  disabled={isExportingMakerJs || !resultat}
                  title="Telecharger tous les panneaux en DXF (ZIP) - Maker.js"
                >
                  {isExportingMakerJs ? (
                    <Loader2 size={16} className={styles.spinIcon} />
                  ) : (
                    <Download size={16} />
                  )}
                  DXF Plans CNC
                </button>
                <button
                  className={styles.validateBtn}
                  onClick={handleValidate}
                  disabled={!resultat}
                >
                  <Check size={18} />
                  Valider et ajouter
                </button>
              </>
            )}
          </div>
        </footer>
      </div>

      {/* Popup Selection Panneau */}
      <PopupSelectionPanneau
        open={panelSelectorOpen !== null}
        panneauxCatalogue={panneauxCatalogue}
        selectedPanneauId={null}
        epaisseurActuelle={config.epaisseurStructure}
        onSelect={() => {}}
        onSelectCatalogue={handleSelectCatalogue}
        onClose={closePanelSelector}
      />
    </div>
  );

  return createPortal(popupContent, document.body);
}
