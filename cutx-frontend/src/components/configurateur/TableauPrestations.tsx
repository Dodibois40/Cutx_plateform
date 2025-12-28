'use client';

import { ArrowDownToLine, Paintbrush } from 'lucide-react';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import LignePanneau from './LignePanneau';
import InfoBulle, { INFOBULLES_CONTENU } from './InfoBulle';

// Colonnes qu'on peut dupliquer sur toutes les lignes
export type ColonneDuplicable = 'percage';

interface TableauPrestationsProps {
  lignes: LignePrestationV3[];
  panneauGlobal: PanneauCatalogue | null;
  onUpdateLigne: (id: string, updates: Partial<LignePrestationV3>) => void;
  onSupprimerLigne: (id: string) => void;
  onCopierLigne: (id: string) => void;
  onCreerLigneFinition: (lignePanneauId: string, typeFinition: TypeFinition) => void;
  onSupprimerLigneFinition: (lignePanneauId: string) => void;
  onApplyToColumn?: (colonne: ColonneDuplicable, valeur: string | boolean | null) => void;
  highlightedColumn?: ColonneDuplicable | null;
}

// Récupère la première valeur non vide d'une colonne
function getFirstValueForColumn(lignes: LignePrestationV3[], colonne: ColonneDuplicable): string | boolean | null {
  for (const ligne of lignes) {
    if (ligne.typeLigne !== 'panneau') continue;
    switch (colonne) {
      case 'percage':
        if (ligne.percage) return true;
        break;
    }
  }
  return null;
}

// Bouton pour appliquer une valeur à toute la colonne
function ApplyColumnButton({
  colonne,
  lignes,
  onApply,
  isHighlighted,
}: {
  colonne: ColonneDuplicable;
  lignes: LignePrestationV3[];
  onApply?: (colonne: ColonneDuplicable, valeur: string | boolean | null) => void;
  isHighlighted?: boolean;
}) {
  const firstValue = getFirstValueForColumn(lignes, colonne);

  if (firstValue === null || firstValue === undefined || !onApply) return null;

  return (
    <button
      type="button"
      className={`btn-apply-col ${isHighlighted ? 'highlighted' : ''}`}
      onClick={() => onApply(colonne, firstValue)}
      title="Appliquer à toutes les lignes"
    >
      <ArrowDownToLine size={10} strokeWidth={2.5} />
    </button>
  );
}

export default function TableauPrestations({
  lignes,
  panneauGlobal,
  onUpdateLigne,
  onSupprimerLigne,
  onCopierLigne,
  onCreerLigneFinition,
  onSupprimerLigneFinition,
  onApplyToColumn,
  highlightedColumn,
}: TableauPrestationsProps) {
  // Séparer les lignes panneau et finition
  const lignesPanneau = lignes.filter(l => l.typeLigne === 'panneau');

  // Pour chaque ligne panneau, trouver sa ligne finition associée
  const getLigneFinition = (panneauId: string) =>
    lignes.find(l => l.typeLigne === 'finition' && l.ligneParentId === panneauId);

  return (
    <div className="tableau-container">
      <div className="tableau-scroll">
        <table className="tableau-prestations">
          <thead>
            <tr>
              {/* GROUPE 1: Identification */}
              <th className="col-etat group-id">
                <span className="th-content">État<InfoBulle {...INFOBULLES_CONTENU.etat} /></span>
              </th>
              <th className="col-panneau group-id">
                <span className="th-content">Panneau<InfoBulle titre="Panneau" contenu="Rappel du panneau sélectionné pour cette configuration." /></span>
              </th>
              <th className="col-reference group-id group-end-sticky">
                <span className="th-content">Référence<InfoBulle {...INFOBULLES_CONTENU.reference} /></span>
              </th>
              {/* GROUPE 2: Débit (panneau global sélectionné dans le header) */}
              <th className="col-dimensions group-panneau">
                <span className="th-content">Dimensions<InfoBulle {...INFOBULLES_CONTENU.dimensions} /></span>
              </th>
              <th className="col-chants group-panneau">
                <span className="th-content">Chants<InfoBulle {...INFOBULLES_CONTENU.chants} /></span>
              </th>
              <th className="col-usinages group-panneau">
                <span className="th-content">Usinages<InfoBulle {...INFOBULLES_CONTENU.usinages} /></span>
              </th>
              <th className="col-percage group-panneau group-end">
                <span className="th-content">
                  Perçage<InfoBulle titre="Perçage" contenu="Cochez si le panneau nécessite des perçages (charnières, poignées...)." />
                  <ApplyColumnButton colonne="percage" lignes={lignes} onApply={onApplyToColumn} isHighlighted={highlightedColumn === 'percage'} />
                </span>
              </th>
              {/* GROUPE 3: Finition optionnelle */}
              <th className="col-finition-opt group-finition group-end">
                <span className="th-content">
                  <Paintbrush size={12} className="mr-1" />
                  Finition ?<InfoBulle titre="Finition optionnelle" contenu="Cochez pour ajouter une finition (vernis, teinte+vernis ou laque). Une ligne de finition sera créée sous le panneau." />
                </span>
              </th>
              {/* GROUPE 4: Prix */}
              <th className="col-prix group-prix">
                <span className="th-content">Tarif HT<InfoBulle {...INFOBULLES_CONTENU.prix} /></span>
              </th>
              <th className="col-actions group-prix">
                <span className="th-content">Actions<InfoBulle {...INFOBULLES_CONTENU.actions} /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lignesPanneau.map((lignePanneau, index) => {
              const ligneFinition = getLigneFinition(lignePanneau.id);
              return (
                <LignePanneau
                  key={lignePanneau.id}
                  ligne={lignePanneau}
                  ligneFinition={ligneFinition || null}
                  panneauGlobal={panneauGlobal}
                  index={index}
                  onUpdate={(updates) => onUpdateLigne(lignePanneau.id, updates)}
                  onUpdateFinition={ligneFinition ? (updates) => onUpdateLigne(ligneFinition.id, updates) : undefined}
                  onSupprimer={() => onSupprimerLigne(lignePanneau.id)}
                  onCopier={() => onCopierLigne(lignePanneau.id)}
                  onCreerFinition={(typeFinition) => onCreerLigneFinition(lignePanneau.id, typeFinition)}
                  onSupprimerFinition={() => onSupprimerLigneFinition(lignePanneau.id)}
                  canDelete={lignesPanneau.length > 1}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="scroll-indicator">← scroll →</div>

      <style jsx>{`
        .tableau-container {
          position: relative;
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-subtle);
          border-radius: var(--admin-radius-xl);
          overflow: hidden;
        }

        .tableau-scroll {
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
        }

        .tableau-scroll::-webkit-scrollbar {
          height: 8px;
        }

        .tableau-scroll::-webkit-scrollbar-track {
          background: var(--admin-bg-tertiary);
        }

        .tableau-scroll::-webkit-scrollbar-thumb {
          background: var(--admin-border-default);
          border-radius: 4px;
        }

        .tableau-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--admin-border-strong);
        }

        .tableau-prestations {
          min-width: 1400px;
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .tableau-prestations thead th {
          position: sticky;
          top: 0;
          background: var(--admin-bg-elevated);
          z-index: 10;
          padding: 0.75rem 0.5rem;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--admin-text-tertiary);
          border-bottom: 1px solid var(--admin-border-default);
          border-right: 1px solid var(--admin-border-default);
          text-align: left;
          white-space: nowrap;
        }

        .tableau-prestations thead th:last-child {
          border-right: none;
        }

        .th-content {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .mr-1 {
          margin-right: 4px;
        }

        /* Bouton flèche pour appliquer à toute la colonne */
        .th-content :global(.btn-apply-col) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          padding: 0;
          margin-left: 2px;
          background: transparent;
          border: none;
          border-radius: 3px;
          color: var(--admin-text-muted);
          cursor: pointer;
          opacity: 0.5;
          transition: all 0.15s;
        }

        .th-content :global(.btn-apply-col:hover) {
          opacity: 1;
          color: var(--admin-olive);
          background: var(--admin-olive-bg);
        }

        /* Animation quand la colonne vient d'être modifiée */
        .th-content :global(.btn-apply-col.highlighted) {
          opacity: 1;
          color: white;
          background: var(--admin-olive);
          animation: pulse-highlight 1s ease-in-out infinite;
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(139, 157, 81, 0.6);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(139, 157, 81, 0.3);
            transform: scale(1.15);
          }
        }

        /* Colonnes sticky */
        .col-etat {
          position: sticky;
          left: 0;
          z-index: 15;
          width: 50px;
          text-align: center !important;
        }

        .col-panneau {
          width: 220px;
        }

        .col-reference {
          position: sticky;
          left: 50px;
          z-index: 15;
          width: 140px;
        }

        .col-actions {
          position: sticky;
          right: 0;
          z-index: 15;
          width: 100px;
          text-align: center !important;
        }

        /* Largeurs des colonnes */
        .col-dimensions { width: 400px; }
        .col-chants { width: 200px; }
        .col-usinages { width: 80px; text-align: center !important; }
        .col-percage { width: 70px; text-align: center !important; }
        .col-finition-opt { width: 160px; }
        .col-prix { width: 90px; text-align: right !important; }

        .scroll-indicator {
          position: absolute;
          bottom: 8px;
          right: 12px;
          font-size: 0.6875rem;
          color: var(--admin-text-muted);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }

        .tableau-container:hover .scroll-indicator {
          opacity: 0.7;
        }

        @media (min-width: 1500px) {
          .scroll-indicator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
