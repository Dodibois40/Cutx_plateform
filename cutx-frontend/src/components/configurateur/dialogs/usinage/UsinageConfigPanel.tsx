'use client';

import type { UsinageTemplate, UsinageConfigParam } from '@/lib/configurateur/types';

interface Props {
  template: UsinageTemplate;
  values: Record<string, number>;
  quantite: number;
  onChange: (key: string, value: number) => void;
  onQuantiteChange: (quantite: number) => void;
}

const PRICING_LABELS: Record<string, string> = {
  PER_UNIT: '/ unite',
  PER_METER: '/ ml',
  PER_M2: '/ m2',
  FIXED: 'forfait',
};

export function UsinageConfigPanel({
  template,
  values,
  quantite,
  onChange,
  onQuantiteChange,
}: Props) {
  const handleInputChange = (param: UsinageConfigParam, rawValue: string) => {
    let value = parseFloat(rawValue) || 0;

    // Appliquer les contraintes min/max
    if (param.min !== undefined && value < param.min) {
      value = param.min;
    }
    if (param.max !== undefined && value > param.max) {
      value = param.max;
    }

    onChange(param.key, value);
  };

  return (
    <div className="config-panel">
      <style jsx>{`
        .config-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .template-info {
          padding: 1rem;
          background: var(--admin-olive-bg, #f0f2e8);
          border-radius: 8px;
          border-left: 3px solid var(--admin-olive, #6b7c4c);
        }

        .template-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--admin-text-primary, #1a1a1a);
          margin-bottom: 0.25rem;
        }

        .template-price {
          font-size: 0.875rem;
          color: var(--admin-olive, #6b7c4c);
          font-weight: 500;
        }

        .template-description {
          font-size: 0.8rem;
          color: var(--admin-text-secondary, #666);
          margin-top: 0.5rem;
          line-height: 1.4;
        }

        .params-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .param-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .param-field.full-width {
          grid-column: 1 / -1;
        }

        .param-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--admin-text-secondary, #666);
        }

        .param-label .required {
          color: var(--admin-sable, #c9a86c);
        }

        .param-input-wrapper {
          display: flex;
          align-items: center;
        }

        .param-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 6px 0 0 6px;
          font-size: 0.875rem;
          text-align: right;
        }

        .param-input:focus {
          outline: none;
          border-color: var(--admin-olive, #6b7c4c);
        }

        .param-unit {
          padding: 0.5rem 0.75rem;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-left: none;
          border-radius: 0 6px 6px 0;
          font-size: 0.75rem;
          color: var(--admin-text-muted, #999);
          min-width: 40px;
          text-align: center;
        }

        .quantite-section {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--admin-border-subtle, #f0f0f0);
        }

        .quantite-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .quantite-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-primary, #1a1a1a);
        }

        .quantite-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-qty {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.25rem;
          color: var(--admin-text-secondary, #666);
          transition: all 0.2s;
        }

        .btn-qty:hover {
          background: var(--admin-olive-bg, #f0f2e8);
          border-color: var(--admin-olive, #6b7c4c);
          color: var(--admin-olive, #6b7c4c);
        }

        .quantite-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-text-primary, #1a1a1a);
          min-width: 40px;
          text-align: center;
        }

        .no-params {
          text-align: center;
          padding: 1rem;
          color: var(--admin-text-muted, #999);
          font-size: 0.875rem;
          font-style: italic;
        }
      `}</style>

      {/* Info template */}
      <div className="template-info">
        <div className="template-name">{template.nom}</div>
        <div className="template-price">
          {template.priceHT} EUR {PRICING_LABELS[template.pricingType]}
        </div>
        {template.description && (
          <div className="template-description">{template.description}</div>
        )}
      </div>

      {/* Parametres */}
      {template.configSchema.length > 0 ? (
        <div className="params-grid">
          {template.configSchema.map((param) => (
            <div key={param.key} className="param-field">
              <label className="param-label">
                {param.label}
                {param.required && <span className="required"> *</span>}
              </label>
              <div className="param-input-wrapper">
                <input
                  type="number"
                  className="param-input"
                  value={values[param.key] ?? param.defaultValue ?? ''}
                  onChange={(e) => handleInputChange(param, e.target.value)}
                  min={param.min}
                  max={param.max}
                  step="1"
                  placeholder={param.defaultValue?.toString() || '0'}
                />
                <span className="param-unit">{param.unit}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-params">Aucun parametre requis pour cet usinage</div>
      )}

      {/* Quantite */}
      <div className="quantite-section">
        <div className="quantite-row">
          <span className="quantite-label">Quantite</span>
          <div className="quantite-controls">
            <button
              type="button"
              className="btn-qty"
              onClick={() => onQuantiteChange(Math.max(1, quantite - 1))}
            >
              -
            </button>
            <span className="quantite-value">{quantite}</span>
            <button
              type="button"
              className="btn-qty"
              onClick={() => onQuantiteChange(quantite + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
