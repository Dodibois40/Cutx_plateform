'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, AlertTriangle } from 'lucide-react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import { optimiserParPanneau, type ResultatOptimisation } from '@/lib/configurateur/optimiseur';
import VisualisationPanneau from './VisualisationPanneau';
import InfoPanneauSelected from './InfoPanneauSelected';
import RecapDebits from './RecapDebits';

interface PopupOptimiseurProps {
  open: boolean;
  onClose: () => void;
  lignes: LignePrestationV3[];
  panneauxCatalogue: PanneauCatalogue[];
  panneauGlobal?: PanneauCatalogue | null; // V3: Panneau global sélectionné
}

export default function PopupOptimiseur({
  open,
  onClose,
  lignes,
  panneauxCatalogue,
  panneauGlobal,
}: PopupOptimiseurProps) {
  // Navigation entre panneaux
  const [currentPanneauIndex, setCurrentPanneauIndex] = useState(0);

  // Dimensions standard des panneaux bruts (mm)
  const DIMENSIONS_PANNEAU_BRUT = {
    longueur: 2800,
    largeur: 2070,
  };

  // Résultats d'optimisation
  const resultatsOptimisation = useMemo((): Map<string, ResultatOptimisation> => {
    if (!open) return new Map<string, ResultatOptimisation>();

    // Filtrer les lignes panneau avec dimensions valides
    const lignesPanneau = lignes.filter(
      (l) =>
        l.typeLigne === 'panneau' &&
        l.dimensions.longueur > 0 &&
        l.dimensions.largeur > 0
    );

    if (lignesPanneau.length === 0) {
      return new Map<string, ResultatOptimisation>();
    }

    // V3: Si panneau global est défini, assigner ce panneau à toutes les lignes
    const lignesAvecPanneau = panneauGlobal
      ? lignesPanneau.map((l) => ({
          ...l,
          panneauId: panneauGlobal.id,
          panneauNom: panneauGlobal.nom,
        }))
      : lignesPanneau.filter((l) => l.panneauId);

    if (lignesAvecPanneau.length === 0) {
      return new Map<string, ResultatOptimisation>();
    }

    // Convertir les panneaux catalogue au format attendu
    const catalogueFormatted = panneauGlobal
      ? [{
          id: panneauGlobal.id,
          nom: panneauGlobal.nom,
          longueur: DIMENSIONS_PANNEAU_BRUT.longueur,
          largeur: DIMENSIONS_PANNEAU_BRUT.largeur,
          epaisseurs: panneauGlobal.epaisseurs,
          categorie: panneauGlobal.categorie,
          essence: panneauGlobal.essence,
        }]
      : panneauxCatalogue.map((p) => ({
          id: p.id,
          nom: p.nom,
          longueur: DIMENSIONS_PANNEAU_BRUT.longueur,
          largeur: DIMENSIONS_PANNEAU_BRUT.largeur,
          epaisseurs: p.epaisseurs,
          categorie: p.categorie,
          essence: p.essence,
        }));

    return optimiserParPanneau(lignesAvecPanneau, catalogueFormatted);
  }, [open, lignes, panneauxCatalogue, panneauGlobal]);

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
            <h2 className="popup-title">Optimiseur de débit</h2>
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
                Panneau {currentPanneauIndex + 1} / {tousLesPanneaux.length}
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

          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="popup-content">
          {hasNoPanneaux ? (
            <div className="empty-state">
              <AlertTriangle size={48} className="empty-icon" />
              <h3>Aucun débit à optimiser</h3>
              <p>
                Ajoutez des débits avec un panneau sélectionné et des dimensions
                valides pour voir l'optimisation.
              </p>
            </div>
          ) : panneauOptimise ? (
            // Affichage normal
            <div className="content-grid">
              {/* Sidebar gauche - Info panneau */}
              <div className="sidebar-left">
                <InfoPanneauSelected
                  panneau={panneauOptimise}
                  // TODO: Récupérer les infos du chant depuis le catalogue
                  chantNom="Chant assorti"
                  chantDimensions="23 × EP 0.8"
                />
              </div>

              {/* Centre - Visualisation */}
              <div className="visualization-area">
                <VisualisationPanneau
                  panneau={panneauOptimise}
                  width={700}
                  height={450}
                />
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
                <span className="stat-value">{tousLesPanneaux.length}</span>
                <span className="stat-label">
                  panneau{tousLesPanneaux.length > 1 ? 'x' : ''} nécessaire
                  {tousLesPanneaux.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="footer-divider" />
              <div className="footer-stat">
                <span className="stat-value">
                  {lignes
                    .filter(
                      (l) =>
                        l.typeLigne === 'panneau' &&
                        l.dimensions.longueur > 0 &&
                        l.dimensions.largeur > 0
                    )
                    .length}
                </span>
                <span className="stat-label">débits</span>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .popup-container {
            background: var(--admin-bg-primary);
            border: 1px solid var(--admin-border-default);
            border-radius: 16px;
            width: 100%;
            max-width: 1200px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }

          .popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
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
            overflow-y: auto;
            padding: 1.5rem;
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

          .content-grid {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 1.5rem;
            align-items: start;
          }

          .sidebar-left,
          .sidebar-right {
            position: sticky;
            top: 0;
          }

          .visualization-area {
            display: flex;
            justify-content: center;
            align-items: center;
            background: var(--admin-bg-tertiary);
            border-radius: 12px;
            padding: 1rem;
            min-height: 400px;
          }

          .popup-footer {
            display: flex;
            justify-content: center;
            padding: 1rem 1.5rem;
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
