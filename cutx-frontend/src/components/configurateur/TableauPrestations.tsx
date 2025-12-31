'use client';

import { ArrowDownToLine, Paintbrush } from 'lucide-react';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import LignePanneau from './LignePanneau';
import InfoBulle, { INFOBULLES_CONTENU } from './InfoBulle';

export type ColonneDuplicable = 'percage';

interface TableauPrestationsProps {
  lignes: LignePrestationV3[];
  panneauGlobal: PanneauCatalogue | null;
  panneauMulticouche: PanneauMulticouche | null;
  onUpdateLigne: (id: string, updates: Partial<LignePrestationV3>) => void;
  onSupprimerLigne: (id: string) => void;
  onCopierLigne: (id: string) => void;
  onCreerLigneFinition: (lignePanneauId: string, typeFinition: TypeFinition) => void;
  onSupprimerLigneFinition: (lignePanneauId: string) => void;
  onApplyToColumn?: (colonne: ColonneDuplicable, valeur: string | boolean | null) => void;
  highlightedColumn?: ColonneDuplicable | null;
}

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
      className={`apply-col-btn ${isHighlighted ? 'apply-col-btn--highlighted' : ''}`}
      onClick={() => onApply(colonne, firstValue)}
      title="Appliquer a toutes les lignes"
    >
      <ArrowDownToLine size={10} strokeWidth={2.5} />
    </button>
  );
}

export default function TableauPrestations({
  lignes,
  panneauGlobal,
  panneauMulticouche,
  onUpdateLigne,
  onSupprimerLigne,
  onCopierLigne,
  onCreerLigneFinition,
  onSupprimerLigneFinition,
  onApplyToColumn,
  highlightedColumn,
}: TableauPrestationsProps) {
  const lignesPanneau = lignes.filter(l => l.typeLigne === 'panneau');

  const getLigneFinition = (panneauId: string) =>
    lignes.find(l => l.typeLigne === 'finition' && l.ligneParentId === panneauId);

  return (
    <div className="table-wrapper">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {/* GROUPE 1: Identification */}
              <th className="col-etat">
                <span className="th-content">
                  Etat
                  <InfoBulle {...INFOBULLES_CONTENU.etat} />
                </span>
              </th>
              <th className="col-panneau">
                <span className="th-content">
                  Panneau
                  <InfoBulle titre="Panneau" contenu="Rappel du panneau selectionne pour cette configuration." />
                </span>
              </th>
              <th className="col-reference">
                <span className="th-content">
                  Reference
                  <InfoBulle {...INFOBULLES_CONTENU.reference} />
                </span>
              </th>

              {/* GROUPE 2: Debit */}
              <th className="col-dimensions">
                <span className="th-content">
                  Dimensions
                  <InfoBulle {...INFOBULLES_CONTENU.dimensions} />
                </span>
              </th>
              <th className="col-chants">
                <span className="th-content">
                  Chants
                  <InfoBulle {...INFOBULLES_CONTENU.chants} />
                </span>
              </th>
              <th className="col-usinages">
                <span className="th-content">
                  Usinages
                  <InfoBulle {...INFOBULLES_CONTENU.usinages} />
                </span>
              </th>
              <th className="col-percage">
                <span className="th-content">
                  Percage
                  <InfoBulle titre="Percage" contenu="Cochez si le panneau necessite des percages (charnieres, poignees...)." />
                  <ApplyColumnButton
                    colonne="percage"
                    lignes={lignes}
                    onApply={onApplyToColumn}
                    isHighlighted={highlightedColumn === 'percage'}
                  />
                </span>
              </th>

              {/* GROUPE 3: Finition */}
              <th className="col-finition">
                <span className="th-content">
                  <Paintbrush size={11} />
                  Finition
                  <InfoBulle titre="Finition optionnelle" contenu="Cochez pour ajouter une finition (vernis, teinte+vernis ou laque). Une ligne de finition sera creee sous le panneau." />
                </span>
              </th>

              {/* GROUPE 4: Prix */}
              <th className="col-prix">
                <span className="th-content">
                  Tarif HT
                  <InfoBulle {...INFOBULLES_CONTENU.prix} />
                </span>
              </th>
              <th className="col-actions">
                <span className="th-content">Actions</span>
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
                  panneauMulticouche={panneauMulticouche}
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

      <style jsx>{`
        .table-wrapper {
          background: var(--cx-surface-1);
          border: 1px solid var(--cx-border-subtle);
          border-radius: var(--cx-radius-xl);
          overflow: hidden;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .table-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .table-scroll::-webkit-scrollbar-track {
          background: var(--cx-surface-2);
        }

        .table-scroll::-webkit-scrollbar-thumb {
          background: var(--cx-border-strong);
          border-radius: 3px;
        }

        .table-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--cx-text-muted);
        }

        .data-table {
          min-width: 1400px;
          width: 100%;
          border-collapse: collapse;
        }

        /* Headers */
        .data-table thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          padding: 12px 16px;
          font-size: var(--cx-text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--cx-text-tertiary);
          background: var(--cx-surface-2);
          border-bottom: 1px solid var(--cx-border-default);
          text-align: left;
          white-space: nowrap;
        }

        .th-content {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Apply column button */
        .th-content :global(.apply-col-btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-left: 2px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 3px;
          color: var(--cx-text-muted);
          cursor: pointer;
          opacity: 0.5;
          transition: all var(--cx-transition-fast);
        }

        .th-content :global(.apply-col-btn:hover) {
          opacity: 1;
          color: var(--cx-accent);
          background: var(--cx-accent-subtle);
        }

        .th-content :global(.apply-col-btn--highlighted) {
          opacity: 1;
          color: #000;
          background: var(--cx-accent);
        }

        /* Column widths */
        .col-etat {
          position: sticky;
          left: 0;
          z-index: 15;
          width: 50px;
          text-align: center !important;
        }

        .col-panneau {
          width: 200px;
        }

        .col-reference {
          position: sticky;
          left: 50px;
          z-index: 15;
          width: 130px;
        }

        .col-dimensions {
          width: 380px;
        }

        .col-chants {
          width: 180px;
        }

        .col-usinages {
          width: 80px;
          text-align: center !important;
        }

        .col-percage {
          width: 70px;
          text-align: center !important;
        }

        .col-finition {
          width: 150px;
        }

        .col-prix {
          width: 100px;
          text-align: right !important;
        }

        .col-actions {
          position: sticky;
          right: 0;
          z-index: 15;
          width: 100px;
          text-align: center !important;
        }

        /* Sticky column backgrounds */
        .col-etat,
        .col-reference,
        .col-actions {
          background: var(--cx-surface-2);
        }

        /* Body rows */
        .data-table :global(tbody tr) {
          transition: background var(--cx-transition-fast);
        }

        .data-table :global(tbody tr:hover) {
          background: rgba(255, 255, 255, 0.02);
        }

        .data-table :global(tbody tr:hover .col-etat),
        .data-table :global(tbody tr:hover .col-reference),
        .data-table :global(tbody tr:hover .col-actions) {
          background: var(--cx-surface-3);
        }

        .data-table :global(tbody td) {
          padding: 10px 16px;
          font-size: var(--cx-text-base);
          color: var(--cx-text-primary);
          border-bottom: 1px solid var(--cx-border-subtle);
          vertical-align: middle;
        }

        .data-table :global(tbody tr:last-child td) {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
