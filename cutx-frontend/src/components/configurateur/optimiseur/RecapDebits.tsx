'use client';

import type { DebitPlace } from '@/lib/configurateur/optimiseur/types';

interface RecapDebitsProps {
  debits: DebitPlace[];
  titre?: string;
}

export default function RecapDebits({
  debits,
  titre = 'Récapitulatif débit',
}: RecapDebitsProps) {
  // Calculer les totaux
  const surfaceTotale = debits.reduce(
    (sum, d) => sum + (d.longueur * d.largeur) / 1_000_000,
    0
  );

  return (
    <div className="recap-container">
      {/* Header */}
      <div className="recap-header">
        <span className="recap-titre">{titre}</span>
      </div>

      {/* Tableau */}
      <div className="tableau-scroll">
        <table className="tableau-debits">
          <thead>
            <tr>
              <th className="col-ref">Ref</th>
              <th className="col-dim">Longueur</th>
              <th className="col-dim">Largeur</th>
            </tr>
          </thead>
          <tbody>
            {debits.map((debit) => (
              <tr key={debit.id}>
                <td className="cell-ref">{debit.reference}</td>
                <td className="cell-dim">{debit.longueur}</td>
                <td className="cell-dim">{debit.largeur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer avec totaux */}
      <div className="recap-footer">
        <div className="footer-stat">
          <span className="footer-label">{debits.length} pièce{debits.length > 1 ? 's' : ''}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-value">{surfaceTotale.toFixed(2)} m²</span>
        </div>
      </div>

      <style jsx>{`
        .recap-container {
          display: flex;
          flex-direction: column;
          background: var(--admin-bg-card);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 12px;
          min-width: 220px;
          max-width: 280px;
          max-height: 100%;
          overflow: hidden;
        }

        .recap-header {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          text-align: center;
        }

        .recap-titre {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--admin-text-muted);
        }

        .tableau-scroll {
          flex: 1;
          overflow-y: auto;
          max-height: 300px;
        }

        .tableau-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .tableau-scroll::-webkit-scrollbar-track {
          background: var(--admin-bg-tertiary);
        }

        .tableau-scroll::-webkit-scrollbar-thumb {
          background: var(--admin-border-default);
          border-radius: 3px;
        }

        .tableau-debits {
          width: 100%;
          border-collapse: collapse;
        }

        .tableau-debits thead {
          position: sticky;
          top: 0;
          background: var(--admin-bg-elevated);
          z-index: 1;
        }

        .tableau-debits th {
          padding: 0.5rem 0.75rem;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--admin-text-tertiary);
          text-align: left;
          border-bottom: 1px solid var(--admin-border-default);
        }

        .tableau-debits th.col-dim {
          text-align: right;
        }

        .tableau-debits td {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          border-bottom: 1px solid var(--admin-border-subtle);
        }

        .cell-ref {
          color: var(--admin-text-primary);
          font-weight: 500;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cell-dim {
          text-align: right;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          color: var(--admin-text-secondary);
        }

        .tableau-debits tbody tr:hover {
          background: var(--admin-bg-hover);
        }

        .recap-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border-top: 1px solid var(--admin-border-subtle);
        }

        .footer-label {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .footer-value {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-olive);
        }
      `}</style>
    </div>
  );
}
