'use client';

/**
 * ChantGroupeDisplay - Affichage compact du chant assigné à un groupe
 * Utilisé dans le header de GroupePanneau
 */

import { X, Plus } from 'lucide-react';
import type { ChantGroupe } from '@/lib/configurateur/groupes/types';

export interface ChantGroupeDisplayProps {
  chant: ChantGroupe | null;
  onSelectChant: () => void;
  onClearChant: () => void;
}

export function ChantGroupeDisplay({
  chant,
  onSelectChant,
  onClearChant,
}: ChantGroupeDisplayProps) {
  // Chant assigné - affichage compact
  if (chant) {
    return (
      <div className="chant-display chant-display--assigned">
        {chant.imageUrl && (
          <img
            src={chant.imageUrl}
            alt=""
            className="chant-thumb"
          />
        )}
        <div className="chant-info">
          <span className="chant-label">Chant</span>
          <span className="chant-nom" title={chant.nom}>
            {chant.nom}
          </span>
          <span className="chant-meta">
            {chant.epaisseur && <span>{chant.epaisseur}mm</span>}
            {chant.prixMl && <span className="chant-prix">{chant.prixMl.toFixed(2)}€/mL</span>}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearChant();
          }}
          className="chant-clear-btn"
          title="Supprimer le chant"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <style jsx>{`
          .chant-display {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: var(--cx-radius-md);
            background: var(--cx-warning-muted);
            border: 1px solid var(--cx-warning-subtle);
          }

          .chant-thumb {
            width: 28px;
            height: 28px;
            border-radius: 4px;
            object-fit: cover;
            flex-shrink: 0;
          }

          .chant-info {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
          }

          .chant-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--cx-warning);
            font-weight: 600;
          }

          .chant-nom {
            font-size: var(--cx-text-xs);
            font-weight: 500;
            color: var(--cx-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
          }

          .chant-meta {
            display: flex;
            gap: 6px;
            font-size: 10px;
            color: var(--cx-text-tertiary);
          }

          .chant-prix {
            color: var(--cx-warning);
            font-weight: 600;
          }

          .chant-clear-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            padding: 0;
            border: none;
            border-radius: 4px;
            background: transparent;
            color: var(--cx-text-muted);
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.15s;
          }

          .chant-clear-btn:hover {
            color: var(--cx-error);
            background: var(--cx-error-muted);
          }
        `}</style>
      </div>
    );
  }

  // Pas de chant - bouton pour ajouter
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        console.log('[ChantGroupeDisplay] Button clicked, calling onSelectChant');
        onSelectChant();
      }}
      className="chant-add-btn"
    >
      <Plus className="w-4 h-4" />
      <span>Bande de chant</span>

      <style jsx>{`
        .chant-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px dashed var(--cx-warning-subtle);
          border-radius: var(--cx-radius-md);
          background: transparent;
          color: var(--cx-warning);
          font-size: var(--cx-text-xs);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .chant-add-btn:hover {
          border-color: var(--cx-warning);
          background: var(--cx-warning-muted);
        }
      `}</style>
    </button>
  );
}
