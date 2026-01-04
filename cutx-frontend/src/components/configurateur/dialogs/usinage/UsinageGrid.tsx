'use client';

import type { UsinageTemplate } from '@/lib/configurateur/types';

interface Props {
  templates: UsinageTemplate[];
  selectedId: string | null;
  onSelect: (template: UsinageTemplate) => void;
}

export function UsinageGrid({ templates, selectedId, onSelect }: Props) {
  return (
    <div className="usinage-grid">
      <style jsx>{`
        .usinage-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .usinage-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .usinage-btn:hover {
          background: var(--admin-bg-hover, #e8e8e0);
          border-color: var(--admin-olive-border, #d4d6c8);
        }

        .usinage-btn.selected {
          background: var(--admin-olive-bg, #f0f2e8);
          border-color: var(--admin-olive, #6b7c4c);
        }

        .icon-container {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-container :global(svg) {
          width: 40px;
          height: 40px;
          fill: var(--admin-text-secondary, #666);
        }

        .usinage-btn.selected .icon-container :global(svg) {
          fill: var(--admin-olive, #6b7c4c);
        }

        .usinage-name {
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--admin-text-secondary, #666);
          text-align: center;
          line-height: 1.2;
          max-height: 2.4em;
          overflow: hidden;
        }

        .usinage-btn.selected .usinage-name {
          color: var(--admin-olive, #6b7c4c);
          font-weight: 600;
        }

        .usinage-price {
          font-size: 0.65rem;
          color: var(--admin-text-muted, #999);
        }

        @media (max-width: 600px) {
          .usinage-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      {templates.map((template) => (
        <button
          key={template.id}
          className={`usinage-btn ${selectedId === template.id ? 'selected' : ''}`}
          onClick={() => onSelect(template)}
          title={template.description || template.nom}
        >
          <div
            className="icon-container"
            dangerouslySetInnerHTML={{ __html: template.iconSvg }}
          />
          <span className="usinage-name">{template.nom}</span>
          <span className="usinage-price">{template.priceHT} EUR</span>
        </button>
      ))}
    </div>
  );
}
