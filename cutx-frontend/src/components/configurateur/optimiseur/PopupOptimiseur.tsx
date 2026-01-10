'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronLeft, ChevronRight, Maximize2, AlertTriangle, Loader2, Zap, Info, FileText, FileDown, Settings2 } from 'lucide-react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauGroupe } from '@/lib/configurateur/groupes/types';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import { optimiserParPanneau, type ResultatOptimisation, type SplitStrategy } from '@/lib/configurateur/optimiseur';
import { optimiserParPanneauApi } from '@/lib/services/optimization-api';
import VisualisationPanneau from './VisualisationPanneau';
import InfoPanneauSelected from './InfoPanneauSelected';
import RecapDebits from './RecapDebits';

/**
 * Données d'un groupe pour l'optimisation
 */
export interface GroupeOptimisationData {
  groupeId: string;
  panneau: PanneauGroupe;
  lignes: LignePrestationV3[];
}

interface PopupOptimiseurProps {
  open: boolean;
  onClose: () => void;
  lignes: LignePrestationV3[];
  panneauxCatalogue: PanneauCatalogue[];
  panneauGlobal?: PanneauCatalogue | null; // V3: Panneau global sélectionné
  groupeData?: GroupeOptimisationData | null; // Optimisation par groupe spécifique
}

// Dimensions standard des panneaux bruts (mm) - fallback si non disponible
const DIMENSIONS_PANNEAU_BRUT_DEFAULT = {
  longueur: 2800,
  largeur: 2070,
} as const;

/**
 * Type guard pour vérifier si un PanneauGroupe est de type 'catalogue'
 */
function isPanneauGroupeCatalogue(panneau: PanneauGroupe): panneau is { type: 'catalogue'; panneau: PanneauCatalogue } {
  return panneau?.type === 'catalogue' && panneau.panneau != null;
}

/**
 * Type guard pour vérifier si un PanneauGroupe est de type 'multicouche'
 */
function isPanneauGroupeMulticouche(panneau: PanneauGroupe): panneau is { type: 'multicouche'; panneau: PanneauMulticouche } {
  return panneau?.type === 'multicouche' && panneau.panneau != null && Array.isArray(panneau.panneau.couches);
}

/**
 * Obtient les dimensions d'un panneau du catalogue
 */
function getPanneauDimensions(panneau: PanneauCatalogue): { longueur: number; largeur: number } {
  // Utiliser les dimensions du panneau si disponibles, sinon fallback
  return {
    longueur: panneau.longueur ?? DIMENSIONS_PANNEAU_BRUT_DEFAULT.longueur,
    largeur: panneau.largeur ?? DIMENSIONS_PANNEAU_BRUT_DEFAULT.largeur,
  };
}

export default function PopupOptimiseur({
  open,
  onClose,
  lignes,
  panneauxCatalogue,
  panneauGlobal,
  groupeData,
}: PopupOptimiseurProps) {
  const t = useTranslations('dialogs.optimizer');

  // Navigation entre panneaux
  const [currentPanneauIndex, setCurrentPanneauIndex] = useState(0);

  // État pour l'optimisation API
  const [useApiOptimization, setUseApiOptimization] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<Map<string, ResultatOptimisation>>(new Map());
  const [showFallbackNotice, setShowFallbackNotice] = useState(false);

  // Options d'optimisation
  const [splitStrategy, setSplitStrategy] = useState<SplitStrategy>('shorter_leftover');
  const [showOptions, setShowOptions] = useState(false);

  // Ref pour annuler les requêtes API en cours
  const abortControllerRef = useRef<AbortController | null>(null);

  // Préparer les données pour l'optimisation
  const prepareOptimizationData = useCallback(() => {
    // === Mode Groupe: Optimiser un groupe spécifique ===
    if (groupeData) {
      // Valider que le panneau existe et est d'un type connu
      const panneau = groupeData.panneau;
      if (!panneau || (!isPanneauGroupeCatalogue(panneau) && !isPanneauGroupeMulticouche(panneau))) {
        console.warn('[PopupOptimiseur] Type de panneau non reconnu:', panneau);
        return { lignesAvecPanneau: [], catalogueFormatted: [] };
      }

      // IMPORTANT: Utiliser les lignes live du prop `lignes`, pas le snapshot de groupeData.lignes
      // Cela permet de refléter les changements de sensDuFil faits pendant que le popup est ouvert
      const ligneIds = new Set(groupeData.lignes.map(l => l.id));
      const lignesLive = lignes.filter(l => ligneIds.has(l.id));

      // Filtrer les lignes panneau avec dimensions valides
      const lignesPanneau = lignesLive.filter(
        (l) =>
          l.typeLigne === 'panneau' &&
          l.dimensions.longueur > 0 &&
          l.dimensions.largeur > 0
      );

      if (lignesPanneau.length === 0) {
        return { lignesAvecPanneau: [], catalogueFormatted: [] };
      }

      // Extraire le panneau selon son type avec type guards
      let panneauInfo: {
        id: string;
        nom: string;
        epaisseurs: number[];
        categorie?: string;
        essence?: string | null;
        longueur: number;
        largeur: number;
      };

      if (isPanneauGroupeCatalogue(panneau)) {
        const dimensions = getPanneauDimensions(panneau.panneau);
        panneauInfo = {
          id: panneau.panneau.id,
          nom: panneau.panneau.nom,
          epaisseurs: panneau.panneau.epaisseurs,
          categorie: panneau.panneau.categorie,
          essence: panneau.panneau.essence,
          longueur: dimensions.longueur,
          largeur: dimensions.largeur,
        };
      } else if (isPanneauGroupeMulticouche(panneau)) {
        // Multicouche: utiliser un ID synthétique et dimensions par défaut
        panneauInfo = {
          id: `multicouche-${groupeData.groupeId}`,
          nom: `Panneau Multicouche (${panneau.panneau.couches.length} couches)`,
          epaisseurs: [panneau.panneau.epaisseurTotale],
          categorie: 'multicouche',
          essence: null,
          longueur: DIMENSIONS_PANNEAU_BRUT_DEFAULT.longueur,
          largeur: DIMENSIONS_PANNEAU_BRUT_DEFAULT.largeur,
        };
      } else {
        // Cas impossible après les type guards, mais TypeScript l'exige
        return { lignesAvecPanneau: [], catalogueFormatted: [] };
      }

      // Associer le panneau à toutes les lignes
      const lignesAvecPanneau = lignesPanneau.map((l) => ({
        ...l,
        panneauId: panneauInfo.id,
        panneauNom: panneauInfo.nom,
      }));

      const catalogueFormatted = [{
        id: panneauInfo.id,
        nom: panneauInfo.nom,
        longueur: panneauInfo.longueur,
        largeur: panneauInfo.largeur,
        epaisseurs: panneauInfo.epaisseurs,
        categorie: panneauInfo.categorie,
        essence: panneauInfo.essence,
      }];

      return { lignesAvecPanneau, catalogueFormatted };
    }

    // === Mode Global: Comportement existant ===
    // Filtrer les lignes panneau avec dimensions valides
    const lignesPanneau = lignes.filter(
      (l) =>
        l.typeLigne === 'panneau' &&
        l.dimensions.longueur > 0 &&
        l.dimensions.largeur > 0
    );

    if (lignesPanneau.length === 0) {
      return { lignesAvecPanneau: [], catalogueFormatted: [] };
    }

    // V3: Si panneau global est défini, assigner ce panneau à toutes les lignes
    const lignesAvecPanneau = panneauGlobal
      ? lignesPanneau.map((l) => ({
          ...l,
          panneauId: panneauGlobal.id,
          panneauNom: panneauGlobal.nom,
        }))
      : lignesPanneau.filter((l) => l.panneauId);

    // Convertir les panneaux catalogue au format attendu
    const catalogueFormatted = panneauGlobal
      ? [{
          id: panneauGlobal.id,
          nom: panneauGlobal.nom,
          longueur: getPanneauDimensions(panneauGlobal).longueur,
          largeur: getPanneauDimensions(panneauGlobal).largeur,
          epaisseurs: panneauGlobal.epaisseurs,
          categorie: panneauGlobal.categorie,
          essence: panneauGlobal.essence,
        }]
      : panneauxCatalogue.map((p) => {
          const dims = getPanneauDimensions(p);
          return {
            id: p.id,
            nom: p.nom,
            longueur: dims.longueur,
            largeur: dims.largeur,
            epaisseurs: p.epaisseurs,
            categorie: p.categorie,
            essence: p.essence,
          };
        });

    return { lignesAvecPanneau, catalogueFormatted };
  }, [lignes, panneauxCatalogue, panneauGlobal, groupeData]);

  // Optimisation locale (fallback synchrone)
  const resultatsLocaux = useMemo((): Map<string, ResultatOptimisation> => {
    if (!open || useApiOptimization) return new Map<string, ResultatOptimisation>();

    const { lignesAvecPanneau, catalogueFormatted } = prepareOptimizationData();
    if (lignesAvecPanneau.length === 0) {
      return new Map<string, ResultatOptimisation>();
    }

    return optimiserParPanneau(lignesAvecPanneau, catalogueFormatted);
  }, [open, useApiOptimization, prepareOptimizationData]);

  // Créer une signature des lignes pour détecter les changements de sensDuFil
  // IMPORTANT: Toujours utiliser le prop `lignes` (données live) pour la détection,
  // pas groupeData.lignes qui est un snapshot figé à l'ouverture du popup
  const lignesSignature = useMemo(() => {
    // Si on est en mode groupe, filtrer les lignes par les IDs du groupe
    const ligneIds = groupeData ? new Set(groupeData.lignes.map(l => l.id)) : null;
    const relevantLignes = ligneIds
      ? lignes.filter(l => ligneIds.has(l.id))
      : lignes;

    return relevantLignes
      .filter(l => l.typeLigne === 'panneau')
      .map(l => `${l.id}:${l.sensDuFil || 'default'}:${l.dimensions.longueur}x${l.dimensions.largeur}`)
      .join('|');
  }, [lignes, groupeData]);

  // Lancer l'optimisation API quand le popup s'ouvre ou quand les données changent
  useEffect(() => {
    if (!open || !useApiOptimization) return;

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController pour cette requête
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const runApiOptimization = async () => {
      const { lignesAvecPanneau, catalogueFormatted } = prepareOptimizationData();

      if (lignesAvecPanneau.length === 0) {
        setApiResults(new Map());
        return;
      }

      setIsLoading(true);
      setApiError(null);
      setShowFallbackNotice(false);

      try {
        // Passer le signal d'annulation et les options à l'API
        const results = await optimiserParPanneauApi(
          lignesAvecPanneau,
          catalogueFormatted,
          {
            signal: abortController.signal,
            splitStrategy,
          }
        );

        // Vérifier si la requête a été annulée
        if (abortController.signal.aborted) {
          return;
        }

        setApiResults(results);
      } catch (error) {
        // Ignorer les erreurs d'annulation
        if (abortController.signal.aborted) {
          return;
        }

        console.error('[PopupOptimiseur] API error:', error);
        setApiError(error instanceof Error ? error.message : 'Erreur d\'optimisation');
        // Fallback vers l'optimisation locale en cas d'erreur
        setUseApiOptimization(false);
        setShowFallbackNotice(true);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    runApiOptimization();

    // Cleanup: annuler la requête si le composant est démonté ou si les deps changent
    return () => {
      abortController.abort();
    };
  }, [open, useApiOptimization, prepareOptimizationData, lignesSignature, splitStrategy]);

  // Résultats finaux (API ou local)
  const resultatsOptimisation = useApiOptimization ? apiResults : resultatsLocaux;

  // Liste plate de tous les panneaux optimisés (pour la navigation)
  const tousLesPanneaux = useMemo(() => {
    const panneaux: Array<{
      panneauId: string;
      resultat: ResultatOptimisation;
      indexDansResultat: number;
    }> = [];

    // Convertir la Map en Array pour l'itération
    Array.from(resultatsOptimisation.entries()).forEach(([panneauId, resultat]) => {
      resultat.panneaux.forEach((_panneau, idx) => {
        panneaux.push({
          panneauId,
          resultat,
          indexDansResultat: idx,
        });
      });
    });

    return panneaux;
  }, [resultatsOptimisation]);

  // Panneau actuellement affiché
  const panneauActuel = tousLesPanneaux[currentPanneauIndex];
  const panneauOptimise = panneauActuel
    ? panneauActuel.resultat.panneaux[panneauActuel.indexDansResultat]
    : null;

  // Statistiques globales
  const statsGlobales = useMemo(() => {
    let totalDebits = 0;
    let surfaceUtilisee = 0;
    let surfacePanneaux = 0;
    let surfaceChutes = 0;

    Array.from(resultatsOptimisation.values()).forEach((resultat) => {
      resultat.panneaux.forEach((panneau) => {
        totalDebits += panneau.debitsPlaces.length;
        surfaceUtilisee += panneau.surfaceUtilisee;
        surfacePanneaux += panneau.surfaceTotale;
        surfaceChutes += panneau.chute;
      });
    });

    const tauxRemplissage = surfacePanneaux > 0
      ? (surfaceUtilisee / surfacePanneaux) * 100
      : 0;

    return {
      totalPanneaux: tousLesPanneaux.length,
      totalDebits,
      surfaceUtilisee,
      surfacePanneaux,
      surfaceChutes,
      tauxRemplissage,
    };
  }, [resultatsOptimisation, tousLesPanneaux.length]);

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setCurrentPanneauIndex(0);
    }
  }, [open]);

  // Navigation
  const goToPrevious = () => {
    setCurrentPanneauIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPanneauIndex((prev) =>
      Math.min(tousLesPanneaux.length - 1, prev + 1)
    );
  };

  // Pas de panneaux à afficher
  const hasNoPanneaux = tousLesPanneaux.length === 0;

  if (!open) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="header-left">
            <Maximize2 size={18} className="header-icon" />
            <h2 className="popup-title">{t('title')}</h2>
            {/* Badge API mode */}
            <span className={`api-badge ${useApiOptimization ? 'api-mode' : 'local-mode'}`}>
              <Zap size={12} />
              {useApiOptimization ? 'Smart' : 'Local'}
            </span>
          </div>

          {/* Navigation panneaux */}
          {!hasNoPanneaux && (
            <div className="navigation">
              <button
                className="nav-btn"
                onClick={goToPrevious}
                disabled={currentPanneauIndex === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="nav-label">
                {t('panelNav', { current: currentPanneauIndex + 1, total: tousLesPanneaux.length })}
              </span>
              <button
                className="nav-btn"
                onClick={goToNext}
                disabled={currentPanneauIndex === tousLesPanneaux.length - 1}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <div className="header-actions">
            {/* Sélecteur de stratégie d'optimisation */}
            {!hasNoPanneaux && (
              <div className="optimization-select">
                <Settings2 size={14} className="select-icon" />
                <select
                  value={splitStrategy}
                  onChange={(e) => setSplitStrategy(e.target.value as SplitStrategy)}
                  className="strategy-select"
                  title="Stratégie d'optimisation"
                >
                  <option value="shorter_leftover">Efficacité max</option>
                  <option value="longer_leftover">Grandes chutes</option>
                  <option value="horizontal_first">Coupes horizontales</option>
                  <option value="vertical_first">Coupes verticales</option>
                </select>
              </div>
            )}

            {/* Boutons export (placeholders) */}
            {!hasNoPanneaux && (
              <>
                <button
                  className="btn-export"
                  onClick={() => alert('Export PDF - Fonctionnalité à venir')}
                  title="Exporter en PDF"
                >
                  <FileText size={16} />
                  <span>PDF</span>
                </button>
                <button
                  className="btn-export"
                  onClick={() => alert('Export DXF - Fonctionnalité à venir')}
                  title="Exporter en DXF"
                >
                  <FileDown size={16} />
                  <span>DXF</span>
                </button>
              </>
            )}

            <button className="btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Bannière de fallback */}
        {showFallbackNotice && (
          <div className="fallback-notice">
            <Info size={16} />
            <span>
              L'optimisation intelligente n'est pas disponible. Résultats calculés localement.
            </span>
            <button
              className="dismiss-btn"
              onClick={() => setShowFallbackNotice(false)}
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Contenu */}
        <div className="popup-content">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 size={48} className="loading-icon" />
              <h3>Optimisation en cours...</h3>
              <p>Analyse des algorithmes pour trouver le meilleur plan de découpe</p>
            </div>
          ) : hasNoPanneaux ? (
            <div className="empty-state">
              <AlertTriangle size={48} className="empty-icon" />
              <h3>{t('emptyTitle')}</h3>
              <p>
                {t('emptyMessage')}
              </p>
              {apiError && (
                <p className="error-message">Erreur API: {apiError}</p>
              )}
            </div>
          ) : panneauOptimise ? (
            // Affichage normal
            <div className="content-grid">
              {/* Sidebar gauche - Info panneau */}
              <div className="sidebar-left">
                <InfoPanneauSelected
                  panneau={panneauOptimise}
                  // TODO: Récupérer les infos du chant depuis le catalogue
                  chantNom={t('matchingEdge')}
                  chantDimensions={t('edgeDimensions')}
                />
              </div>

              {/* Centre - Visualisation */}
              <div className="visualization-area">
                <VisualisationPanneau panneau={panneauOptimise} />
              </div>

              {/* Sidebar droite - Récap débits */}
              <div className="sidebar-right">
                <RecapDebits debits={panneauOptimise.debitsPlaces} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer avec stats globales */}
        {!hasNoPanneaux && (
          <div className="popup-footer">
            <div className="footer-stats">
              <div className="footer-stat">
                <span className="stat-value">{statsGlobales.totalPanneaux}</span>
                <span className="stat-label">
                  {t('panelsRequired', { count: statsGlobales.totalPanneaux })}
                </span>
              </div>
              <div className="footer-divider" />
              <div className="footer-stat">
                <span className="stat-value">{statsGlobales.totalDebits}</span>
                <span className="stat-label">{t('cuts')}</span>
              </div>
              <div className="footer-divider" />
              <div className="footer-stat">
                <span className="stat-value">{statsGlobales.surfaceUtilisee.toFixed(2)}</span>
                <span className="stat-label">m² utilisés</span>
              </div>
              <div className="footer-divider" />
              <div className="footer-stat chutes">
                <span className="stat-value">{statsGlobales.surfaceChutes.toFixed(2)}</span>
                <span className="stat-label">m² chutes</span>
              </div>
              <div className="footer-divider" />
              <div className="footer-stat taux">
                <span className="stat-value">{statsGlobales.tauxRemplissage.toFixed(1)}%</span>
                <span className="stat-label">remplissage</span>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.92);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 0;
            overflow-y: auto;
          }

          .popup-container {
            background: var(--admin-bg-primary);
            border: none;
            border-radius: 0;
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: visible;
            box-shadow: none;
          }

          .popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 24px;
            border-bottom: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-elevated);
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .header-left :global(.header-icon) {
            color: var(--admin-olive);
          }

          .popup-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--admin-text-primary);
            margin: 0;
          }

          .api-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .api-badge.api-mode {
            background: var(--admin-olive-bg);
            color: var(--admin-olive);
            border: 1px solid var(--admin-olive);
          }

          .api-badge.local-mode {
            background: var(--admin-bg-tertiary);
            color: var(--admin-text-muted);
            border: 1px solid var(--admin-border-default);
          }

          .fallback-notice {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--admin-status-warning-bg, #fef3c7);
            border-bottom: 1px solid var(--admin-status-warning-border, #fcd34d);
            color: var(--admin-status-warning, #b45309);
            font-size: 0.8125rem;
          }

          .fallback-notice span {
            flex: 1;
          }

          .dismiss-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background: transparent;
            border: none;
            border-radius: 4px;
            color: inherit;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
          }

          .dismiss-btn:hover {
            opacity: 1;
          }

          .navigation {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .nav-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-default);
            border-radius: 8px;
            color: var(--admin-text-secondary);
            cursor: pointer;
            transition: all 0.2s;
          }

          .nav-btn:hover:not(:disabled) {
            background: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
          }

          .nav-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .nav-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--admin-text-secondary);
            min-width: 120px;
            text-align: center;
          }

          .header-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .optimization-select {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.25rem 0.5rem;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
          }

          .optimization-select .select-icon {
            color: var(--admin-text-muted);
          }

          .strategy-select {
            background: transparent;
            border: none;
            color: var(--admin-text-secondary);
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
            outline: none;
            padding-right: 0.5rem;
          }

          .strategy-select:hover {
            color: var(--admin-olive);
          }

          .strategy-select option {
            background: var(--admin-bg-primary);
            color: var(--admin-text-primary);
          }

          .btn-export {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 0.75rem;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            color: var(--admin-text-secondary);
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-export:hover {
            background: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
          }

          .btn-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-close:hover {
            background: var(--admin-status-danger-bg);
            border-color: var(--admin-status-danger-border);
            color: var(--admin-status-danger);
          }

          .popup-content {
            flex: 1;
            overflow: hidden;
            padding: 16px 24px;
            display: flex;
            flex-direction: column;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 4rem 2rem;
            text-align: center;
          }

          .loading-state :global(.loading-icon) {
            color: var(--admin-olive);
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .loading-state h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--admin-text-primary);
            margin: 0;
          }

          .loading-state p {
            font-size: 0.875rem;
            color: var(--admin-text-muted);
            max-width: 400px;
            margin: 0;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 4rem 2rem;
            text-align: center;
          }

          .empty-state :global(.empty-icon) {
            color: var(--admin-sable);
            opacity: 0.5;
          }

          .empty-state h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--admin-text-primary);
            margin: 0;
          }

          .empty-state p {
            font-size: 0.875rem;
            color: var(--admin-text-muted);
            max-width: 400px;
            margin: 0;
          }

          .error-message {
            color: var(--admin-status-danger);
            font-size: 0.75rem;
            margin-top: 0.5rem;
          }

          .content-grid {
            display: grid;
            grid-template-columns: 280px 1fr 280px;
            gap: 1.5rem;
            align-items: stretch;
            height: 100%;
          }

          .sidebar-left,
          .sidebar-right {
            overflow-y: auto;
            max-height: 100%;
          }

          .visualization-area {
            display: flex;
            justify-content: center;
            align-items: center;
            background: var(--admin-bg-tertiary);
            border-radius: 12px;
            padding: 1rem;
            min-height: 500px;
            height: 100%;
          }

          .visualization-area :global(svg) {
            width: 100%;
            height: 100%;
          }

          .popup-footer {
            display: flex;
            justify-content: center;
            padding: 0.75rem 24px;
            border-top: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-elevated);
          }

          .footer-stats {
            display: flex;
            align-items: center;
            gap: 2rem;
          }

          .footer-stat {
            display: flex;
            align-items: baseline;
            gap: 0.375rem;
          }

          .stat-value {
            font-family: 'Space Grotesk', system-ui, sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--admin-olive);
          }

          .stat-label {
            font-size: 0.8125rem;
            color: var(--admin-text-muted);
          }

          .footer-stat.chutes .stat-value {
            color: var(--admin-sable);
          }

          .footer-stat.taux .stat-value {
            color: var(--admin-text-primary);
            background: var(--admin-olive-bg);
            padding: 0.125rem 0.5rem;
            border-radius: 4px;
            font-size: 1rem;
          }

          .footer-divider {
            width: 1px;
            height: 24px;
            background: var(--admin-border-subtle);
          }

          /* Responsive */
          @media (max-width: 1000px) {
            .content-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .sidebar-left,
            .sidebar-right {
              max-width: 100%;
            }

            .visualization-area {
              order: -1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
