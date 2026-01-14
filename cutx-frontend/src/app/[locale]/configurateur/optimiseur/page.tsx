'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  AlertTriangle,
  Loader2,
  Zap,
  Info,
  FileText,
  FileDown,
  Settings2,
  RefreshCw,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import { optimiserParPanneau, type ResultatOptimisation, type SplitStrategy } from '@/lib/configurateur/optimiseur';
import { optimiserParPanneauApi } from '@/lib/services/optimization-api';
import VisualisationPanneau from '@/components/configurateur/optimiseur/VisualisationPanneau';
import InfoPanneauSelected from '@/components/configurateur/optimiseur/InfoPanneauSelected';
import RecapDebits from '@/components/configurateur/optimiseur/RecapDebits';
import { ExportPdfModal } from '@/components/configurateur/optimiseur/ExportPdfModal';
import { QrShareModal } from '@/components/configurateur/optimiseur/QrShareModal';
import { useOptimizerReceiver, type OptimizerData } from '@/lib/hooks/useOptimizerBroadcast';

// Dimensions standard des panneaux bruts (mm) - fallback
const DIMENSIONS_PANNEAU_BRUT_DEFAULT = {
  longueur: 2800,
  largeur: 2070,
} as const;

function getPanneauDimensions(panneau: PanneauCatalogue): { longueur: number; largeur: number } {
  // Gérer le cas où longueur pourrait être 'Variable' (string) au lieu d'un nombre
  // Ce cas ne devrait pas arriver avec PanneauCatalogue mais on sécurise
  const longueur = typeof panneau.longueur === 'number' && panneau.longueur > 0
    ? panneau.longueur
    : DIMENSIONS_PANNEAU_BRUT_DEFAULT.longueur;
  const largeur = typeof panneau.largeur === 'number' && panneau.largeur > 0
    ? panneau.largeur
    : DIMENSIONS_PANNEAU_BRUT_DEFAULT.largeur;
  return { longueur, largeur };
}

export default function OptimiseurPage() {
  const t = useTranslations('dialogs.optimizer');

  // Données reçues du configurateur
  const [lignes, setLignes] = useState<LignePrestationV3[]>([]);
  const [panneauxCatalogue, setPanneauxCatalogue] = useState<PanneauCatalogue[]>([]);
  const [panneauGlobal, setPanneauGlobal] = useState<PanneauCatalogue | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [hasData, setHasData] = useState(false);

  // Navigation entre panneaux
  const [currentPanneauIndex, setCurrentPanneauIndex] = useState(0);

  // État pour l'optimisation API
  const [useApiOptimization, setUseApiOptimization] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<Map<string, ResultatOptimisation>>(new Map());
  const [showFallbackNotice, setShowFallbackNotice] = useState(false);
  const [optimizationWarnings, setOptimizationWarnings] = useState<string[]>([]);

  // Options d'optimisation
  const [splitStrategy, setSplitStrategy] = useState<SplitStrategy>('vertical_first');

  // Export PDF
  const [showExportModal, setShowExportModal] = useState(false);

  // Partage mobile
  const [showShareModal, setShowShareModal] = useState(false);

  // Ref pour annuler les requêtes API
  const abortControllerRef = useRef<AbortController | null>(null);

  // Callback pour recevoir les données
  const handleDataUpdate = useCallback((data: OptimizerData) => {
    setLignes(data.lignes);
    setPanneauxCatalogue(data.panneauxCatalogue);
    setPanneauGlobal(data.panneauGlobal);
    setLastUpdate(data.timestamp);
    setHasData(true);
    // Don't reset navigation on every update - only on initial load
  }, []);

  // Hook pour recevoir les données
  const { refreshData } = useOptimizerReceiver(handleDataUpdate);

  // Préparer les données pour l'optimisation
  const prepareOptimizationData = useCallback(() => {
    const lignesPanneau = lignes.filter(
      (l) =>
        l.typeLigne === 'panneau' &&
        l.dimensions.longueur > 0 &&
        l.dimensions.largeur > 0
    );

    if (lignesPanneau.length === 0) {
      return { lignesAvecPanneau: [], catalogueFormatted: [] };
    }

    const lignesAvecPanneau = panneauGlobal
      ? lignesPanneau.map((l) => ({
          ...l,
          panneauId: panneauGlobal.id,
          panneauNom: panneauGlobal.nom,
        }))
      : lignesPanneau.filter((l) => l.panneauId);

    // Helper pour extraire le prix au m² depuis le dictionnaire prixM2
    // Le dictionnaire est indexé par épaisseur (ex: {"12": 137.01, "6": 96.00})
    const getPrixM2 = (prixM2: Record<string, number> | undefined, epaisseur?: number): number | undefined => {
      if (!prixM2) return undefined;
      // Chercher le prix pour l'épaisseur spécifique
      if (epaisseur !== undefined) {
        const key = String(epaisseur);
        if (prixM2[key] !== undefined) {
          return prixM2[key];
        }
      }
      // Fallback: prendre la première valeur si l'épaisseur n'est pas trouvée
      const values = Object.values(prixM2);
      return values.length > 0 ? values[0] : undefined;
    };

    // Trouver l'épaisseur utilisée dans le projet
    const epaisseurProjet = lignesPanneau[0]?.dimensions.epaisseur;

    const catalogueFormatted = panneauGlobal
      ? [{
          id: panneauGlobal.id,
          nom: panneauGlobal.nom,
          longueur: getPanneauDimensions(panneauGlobal).longueur,
          largeur: getPanneauDimensions(panneauGlobal).largeur,
          epaisseurs: panneauGlobal.epaisseurs,
          categorie: panneauGlobal.categorie,
          essence: panneauGlobal.essence,
          prixM2: getPrixM2(panneauGlobal.prixM2, epaisseurProjet),
        }]
      : panneauxCatalogue.map((p) => {
          const dims = getPanneauDimensions(p);
          // Trouver l'épaisseur utilisée pour ce panneau spécifique
          const lignesPourPanneau = lignesPanneau.filter(l => l.panneauId === p.id);
          const epaisseurPanneau = lignesPourPanneau[0]?.dimensions.epaisseur;
          return {
            id: p.id,
            nom: p.nom,
            longueur: dims.longueur,
            largeur: dims.largeur,
            epaisseurs: p.epaisseurs,
            categorie: p.categorie,
            essence: p.essence,
            prixM2: getPrixM2(p.prixM2, epaisseurPanneau),
          };
        });

    return { lignesAvecPanneau, catalogueFormatted };
  }, [lignes, panneauxCatalogue, panneauGlobal]);

  // Optimisation locale (fallback)
  const resultatsLocaux = useMemo((): Map<string, ResultatOptimisation> => {
    if (!hasData || useApiOptimization) return new Map();

    const { lignesAvecPanneau, catalogueFormatted } = prepareOptimizationData();
    if (lignesAvecPanneau.length === 0) {
      return new Map();
    }

    return optimiserParPanneau(lignesAvecPanneau, catalogueFormatted);
  }, [hasData, useApiOptimization, prepareOptimizationData]);

  // Signature pour détecter les changements
  const lignesSignature = useMemo(() => {
    return lignes
      .filter(l => l.typeLigne === 'panneau')
      .map(l => `${l.id}:${l.sensDuFil || 'default'}:${l.dimensions.longueur}x${l.dimensions.largeur}`)
      .join('|');
  }, [lignes]);

  // Reset API optimization mode when data changes after an error
  // This allows retry after fixing invalid dimensions
  const prevSignatureRef = useRef<string>('');
  useEffect(() => {
    if (lignesSignature && lignesSignature !== prevSignatureRef.current) {
      prevSignatureRef.current = lignesSignature;
      // If we had an error before, reset to try API again
      if (apiError && !useApiOptimization) {
        setApiError(null);
        setUseApiOptimization(true);
        setShowFallbackNotice(false);
      }
    }
  }, [lignesSignature, apiError, useApiOptimization]);

  // Lancer l'optimisation API
  useEffect(() => {
    if (!hasData || !useApiOptimization) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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
      setOptimizationWarnings([]);

      try {
        const results = await optimiserParPanneauApi(
          lignesAvecPanneau,
          catalogueFormatted,
          {
            signal: abortController.signal,
            splitStrategy,
          }
        );

        if (abortController.signal.aborted) return;
        setApiResults(results);

        // Collecter les warnings de tous les résultats
        const allWarnings: string[] = [];
        results.forEach((result) => {
          if (result.warnings && result.warnings.length > 0) {
            allWarnings.push(...result.warnings);
          }
        });
        setOptimizationWarnings(allWarnings);
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('[OptimiseurPage] API error:', error);
        setApiError(error instanceof Error ? error.message : 'Erreur d\'optimisation');
        setUseApiOptimization(false);
        setShowFallbackNotice(true);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    runApiOptimization();

    return () => {
      abortController.abort();
    };
  }, [hasData, useApiOptimization, prepareOptimizationData, lignesSignature, splitStrategy]);

  // Résultats finaux
  const resultatsOptimisation = useApiOptimization ? apiResults : resultatsLocaux;

  // Liste des panneaux optimisés
  const tousLesPanneaux = useMemo(() => {
    const panneaux: Array<{
      panneauId: string;
      resultat: ResultatOptimisation;
      indexDansResultat: number;
    }> = [];

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

  // Navigation
  const goToPrevious = () => {
    setCurrentPanneauIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPanneauIndex((prev) =>
      Math.min(tousLesPanneaux.length - 1, prev + 1)
    );
  };

  const hasNoPanneaux = tousLesPanneaux.length === 0;

  // Pas de données reçues
  if (!hasData) {
    return (
      <div className="optimizer-page no-data">
        <div className="no-data-content">
          <ExternalLink size={64} className="no-data-icon" />
          <h1>Optimiseur de Débit</h1>
          <p>
            Cette fenêtre doit être ouverte depuis le configurateur.
            <br />
            Les données seront synchronisées automatiquement.
          </p>
          <button onClick={refreshData} className="btn-refresh">
            <RefreshCw size={18} />
            Vérifier les données
          </button>
        </div>
        <style jsx>{`
          .optimizer-page.no-data {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--admin-bg-primary);
            font-family: var(--cx-font-sans);
          }
          .no-data-content {
            text-align: center;
            padding: 2rem;
          }
          .no-data-content :global(.no-data-icon) {
            color: var(--admin-text-muted);
            margin-bottom: 1.5rem;
          }
          .no-data-content h1 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--admin-text-primary);
            margin: 0 0 1rem;
          }
          .no-data-content p {
            color: var(--admin-text-muted);
            font-size: 0.9375rem;
            line-height: 1.6;
            max-width: 400px;
            margin: 0 auto 1.5rem;
          }
          .btn-refresh {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: var(--admin-olive-bg);
            border: 1px solid var(--admin-olive);
            border-radius: 8px;
            color: var(--admin-olive);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-refresh:hover {
            background: var(--admin-olive);
            color: white;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="optimizer-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <Maximize2 size={20} className="header-icon" />
          <h1 className="page-title">{t('title')}</h1>
          <span className={`api-badge ${useApiOptimization ? 'api-mode' : 'local-mode'}`}>
            <Zap size={12} />
            {useApiOptimization ? 'Smart' : 'Local'}
          </span>
          <span className="sync-status">
            <RefreshCw size={12} />
            Sync auto
          </span>
        </div>

        {/* Navigation panneaux */}
        {!hasNoPanneaux && (
          <nav className="navigation">
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
          </nav>
        )}

        <div className="header-actions">
          <button onClick={refreshData} className="btn-refresh-small" title="Rafraîchir les données">
            <RefreshCw size={16} />
          </button>
          {!hasNoPanneaux && (
            <>
              <button
                className="btn-export"
                onClick={() => setShowExportModal(true)}
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
              <button
                className="btn-export btn-share"
                onClick={() => setShowShareModal(true)}
                title="Envoyer sur mobile"
              >
                <Smartphone size={16} />
                <span>Mobile</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Bannière de fallback */}
      {showFallbackNotice && (
        <div className="fallback-notice">
          <Info size={16} />
          <span>
            L'optimisation intelligente n'est pas disponible. Résultats calculés localement.
          </span>
          <button onClick={() => setShowFallbackNotice(false)}>
            &times;
          </button>
        </div>
      )}

      {/* Bannière d'avertissement pour pièces trop grandes */}
      {optimizationWarnings.length > 0 && (
        <div className="warning-notice">
          <AlertTriangle size={16} />
          <div className="warning-content">
            <span className="warning-title">
              {optimizationWarnings.length} pièce(s) non placée(s)
            </span>
            <ul className="warning-list">
              {optimizationWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setOptimizationWarnings([])}>
            &times;
          </button>
        </div>
      )}

      {/* Contenu principal */}
      <main className="page-content">
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
            <p>{t('emptyMessage')}</p>
            {apiError && (
              <p className="error-message">Erreur API: {apiError}</p>
            )}
          </div>
        ) : panneauOptimise ? (
          <div className="content-grid">
            {/* Sidebar gauche */}
            <aside className="sidebar-left">
              <div className="strategy-selector">
                <div className="strategy-header">
                  <Settings2 size={14} />
                  <span>Optimisation</span>
                </div>
                <div className="strategy-chips">
                  <button
                    className={`strategy-chip ${splitStrategy === 'vertical_first' ? 'active' : ''}`}
                    onClick={() => setSplitStrategy('vertical_first')}
                  >
                    <span className="cut-icon">━</span>
                    <span>Horizontal</span>
                  </button>
                  <button
                    className={`strategy-chip ${splitStrategy === 'horizontal_first' ? 'active' : ''}`}
                    onClick={() => setSplitStrategy('horizontal_first')}
                  >
                    <span className="cut-icon">┃</span>
                    <span>Vertical</span>
                  </button>
                  <div className="strategy-separator" />
                  <button
                    className={`strategy-chip ${splitStrategy === 'shorter_leftover' ? 'active' : ''}`}
                    onClick={() => setSplitStrategy('shorter_leftover')}
                  >
                    <Zap size={14} />
                    <span>Efficacité max</span>
                  </button>
                  <button
                    className={`strategy-chip ${splitStrategy === 'longer_leftover' ? 'active' : ''}`}
                    onClick={() => setSplitStrategy('longer_leftover')}
                  >
                    <Maximize2 size={14} />
                    <span>Grandes chutes</span>
                  </button>
                </div>
              </div>

              <InfoPanneauSelected
                panneau={panneauOptimise}
                chantNom={t('matchingEdge')}
                chantDimensions={t('edgeDimensions')}
                onBackToConfig={() => window.close()}
              />
            </aside>

            {/* Centre - Visualisation */}
            <div className="visualization-area">
              <VisualisationPanneau panneau={panneauOptimise} />
            </div>

            {/* Sidebar droite */}
            <aside className="sidebar-right">
              <RecapDebits debits={panneauOptimise.debitsPlaces} />
            </aside>
          </div>
        ) : null}
      </main>

      {/* Footer avec stats */}
      {!hasNoPanneaux && (
        <footer className="page-footer">
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
        </footer>
      )}

      {/* Modal Export PDF */}
      {showExportModal && (
        <ExportPdfModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          panneaux={tousLesPanneaux.map(p => p.resultat.panneaux[p.indexDansResultat]).filter(Boolean)}
          currentPanneauIndex={currentPanneauIndex}
        />
      )}

      {/* Modal Partage Mobile */}
      <QrShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        panneaux={tousLesPanneaux.map(p => p.resultat.panneaux[p.indexDansResultat]).filter(Boolean)}
      />

      <style jsx>{`
        .optimizer-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--admin-bg-primary);
          font-family: var(--cx-font-sans);
        }

        .page-header {
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

        .page-title {
          font-size: 1.125rem;
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

        .sync-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          background: var(--admin-status-success-bg, #d1fae5);
          color: var(--admin-status-success, #059669);
          border: 1px solid var(--admin-status-success-border, #6ee7b7);
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

        .btn-refresh-small {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: transparent;
          border: 1px solid var(--admin-border-default);
          border-radius: 6px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refresh-small:hover {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
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

        .btn-share {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .btn-share:hover {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
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

        .fallback-notice button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
          line-height: 1;
        }

        .warning-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--admin-status-error-bg, #fef2f2);
          border-bottom: 1px solid var(--admin-status-error-border, #fecaca);
          color: var(--admin-status-error, #dc2626);
          font-size: 0.8125rem;
        }

        .warning-notice .warning-content {
          flex: 1;
        }

        .warning-notice .warning-title {
          font-weight: 600;
          display: block;
          margin-bottom: 0.25rem;
        }

        .warning-notice .warning-list {
          margin: 0;
          padding-left: 1rem;
          font-size: 0.75rem;
          opacity: 0.9;
        }

        .warning-notice .warning-list li {
          margin-bottom: 0.125rem;
        }

        .warning-notice button {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
          line-height: 1;
          padding: 0;
        }

        .page-content {
          flex: 1;
          overflow: hidden;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
        }

        .loading-state,
        .empty-state {
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

        .loading-state h3,
        .empty-state h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          margin: 0;
        }

        .loading-state p,
        .empty-state p {
          font-size: 0.875rem;
          color: var(--admin-text-muted);
          max-width: 400px;
          margin: 0;
        }

        .empty-state :global(.empty-icon) {
          color: var(--admin-sable);
          opacity: 0.5;
        }

        .error-message {
          color: var(--admin-status-danger);
          font-size: 0.75rem;
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

        .strategy-selector {
          background: var(--admin-bg-elevated);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .strategy-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--admin-text-muted);
          margin-bottom: 0.75rem;
        }

        .strategy-chips {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .strategy-separator {
          grid-column: 1 / -1;
          height: 1px;
          background: var(--admin-border-subtle);
          margin: 0.25rem 0;
        }

        .strategy-chip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.625rem 0.5rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
          color: var(--admin-text-secondary);
          font-size: 0.6875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .strategy-chip:hover {
          background: var(--admin-bg-secondary);
          border-color: var(--admin-border-strong);
        }

        .strategy-chip.active {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
          color: var(--admin-olive);
        }

        .visualization-area {
          display: flex;
          justify-content: center;
          align-items: center;
          background: var(--admin-bg-tertiary);
          border-radius: 12px;
          padding: 1rem;
          height: 720px;
        }

        .visualization-area :global(svg) {
          width: 100%;
          height: 100%;
        }

        .page-footer {
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

        @media (max-width: 1000px) {
          .content-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .visualization-area {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
