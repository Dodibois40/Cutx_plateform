'use client';

import { Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import type { UsinageTemplate } from '@/lib/configurateur/types';

interface Props {
  templates: UsinageTemplate[];
  onEdit: (template: UsinageTemplate) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  RAINURE: 'Rainure',
  PERCAGE: 'Percage',
  USINAGE_CN: 'CNC',
  DEFONCEUSE: 'Defonceuse',
  PASSE_MAIN: 'Passe-main',
  AUTRE: 'Autre',
};

const PRICING_LABELS: Record<string, string> = {
  PER_UNIT: '/ unite',
  PER_METER: '/ ml',
  PER_M2: '/ m2',
  FIXED: 'forfait',
};

export function UsinageTemplateList({ templates, onEdit, onDelete, onToggle }: Props) {
  if (templates.length === 0) {
    return (
      <div className="empty-state">
        <style jsx>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            text-align: center;
          }

          .empty-state p {
            color: var(--admin-text-secondary, #666);
            font-size: 1.1rem;
          }
        `}</style>
        <p>Aucun usinage configure. Cliquez sur "Nouvel usinage" pour commencer.</p>
      </div>
    );
  }

  return (
    <div className="template-grid">
      <style jsx>{`
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .template-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
          position: relative;
        }

        .template-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .template-card.inactive {
          opacity: 0.6;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .drag-handle {
          cursor: grab;
          color: var(--admin-text-muted, #999);
        }

        .icon-preview {
          width: 48px;
          height: 48px;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-preview :global(svg) {
          width: 32px;
          height: 32px;
        }

        .card-title {
          flex: 1;
        }

        .card-title h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--admin-text-primary, #1a1a1a);
        }

        .card-title .category {
          font-size: 0.75rem;
          color: var(--admin-text-secondary, #666);
          margin-top: 0.25rem;
        }

        .card-body {
          padding: 1rem;
        }

        .description {
          font-size: 0.875rem;
          color: var(--admin-text-secondary, #666);
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .price {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--admin-olive, #6b7c4c);
        }

        .price-unit {
          font-size: 0.875rem;
          color: var(--admin-text-secondary, #666);
        }

        .params-count {
          font-size: 0.75rem;
          color: var(--admin-text-muted, #999);
          background: var(--admin-bg-tertiary, #f5f5f0);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          display: inline-block;
        }

        .card-actions {
          display: flex;
          border-top: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .card-actions button {
          flex: 1;
          padding: 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--admin-text-secondary, #666);
          transition: background 0.2s, color 0.2s;
        }

        .card-actions button:hover {
          background: var(--admin-bg-tertiary, #f5f5f0);
        }

        .card-actions button:not(:last-child) {
          border-right: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .card-actions .btn-edit:hover {
          color: var(--admin-olive, #6b7c4c);
        }

        .card-actions .btn-toggle:hover {
          color: var(--admin-ardoise, #4a5568);
        }

        .card-actions .btn-delete:hover {
          color: #dc2626;
        }

        .inactive-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--admin-sable, #c9a86c);
          color: white;
          font-size: 0.65rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
      `}</style>

      {templates.map((template) => (
        <div
          key={template.id}
          className={`template-card ${!template.isActive ? 'inactive' : ''}`}
        >
          {!template.isActive && <span className="inactive-badge">Inactif</span>}

          <div className="card-header">
            <div className="drag-handle">
              <GripVertical size={20} />
            </div>

            <div
              className="icon-preview"
              dangerouslySetInnerHTML={{ __html: template.iconSvg }}
            />

            <div className="card-title">
              <h3>{template.nom}</h3>
              <div className="category">
                {CATEGORY_LABELS[template.category || 'AUTRE'] || template.category}
              </div>
            </div>
          </div>

          <div className="card-body">
            {template.description && (
              <p className="description">{template.description}</p>
            )}

            <div className="price-row">
              <span className="price">{template.priceHT.toFixed(2)} EUR</span>
              <span className="price-unit">
                {PRICING_LABELS[template.pricingType] || template.pricingType}
              </span>
            </div>

            <span className="params-count">
              {template.configSchema.length} parametre(s)
            </span>
          </div>

          <div className="card-actions">
            <button className="btn-edit" onClick={() => onEdit(template)}>
              <Pencil size={16} />
              Modifier
            </button>
            <button className="btn-toggle" onClick={() => onToggle(template.id)}>
              {template.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
              {template.isActive ? 'Desactiver' : 'Activer'}
            </button>
            <button className="btn-delete" onClick={() => onDelete(template.id)}>
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
