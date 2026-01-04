'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { UsinageTemplate, UsinageConfigParam } from '@/lib/configurateur/types';

interface Props {
  template: UsinageTemplate | null;
  onSave: (data: Partial<UsinageTemplate>) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'RAINURE', label: 'Rainure' },
  { value: 'PERCAGE', label: 'Percage' },
  { value: 'USINAGE_CN', label: 'Usinage CNC' },
  { value: 'DEFONCEUSE', label: 'Defonceuse' },
  { value: 'PASSE_MAIN', label: 'Passe-main' },
  { value: 'AUTRE', label: 'Autre' },
];

const PRICING_TYPES = [
  { value: 'PER_UNIT', label: 'Par unite' },
  { value: 'PER_METER', label: 'Par metre lineaire' },
  { value: 'PER_M2', label: 'Par metre carre' },
  { value: 'FIXED', label: 'Prix fixe (forfait)' },
];

const DEFAULT_PARAM: UsinageConfigParam = {
  key: '',
  label: '',
  unit: 'mm',
  required: true,
  min: 0,
  max: 5000,
};

export function UsinageTemplateForm({ template, onSave, onClose }: Props) {
  const t = useTranslations('dialogs.machiningAdmin');

  // Form state
  const [nom, setNom] = useState(template?.nom || '');
  const [description, setDescription] = useState(template?.description || '');
  const [iconSvg, setIconSvg] = useState(template?.iconSvg || '');
  const [configSchema, setConfigSchema] = useState<UsinageConfigParam[]>(
    template?.configSchema || []
  );
  const [technicalSvg, setTechnicalSvg] = useState(template?.technicalSvg || '');
  const [pricingType, setPricingType] = useState<string>(template?.pricingType || 'PER_UNIT');
  const [priceHT, setPriceHT] = useState(template?.priceHT?.toString() || '0');
  const [category, setCategory] = useState(template?.category || 'AUTRE');
  const [sortOrder, setSortOrder] = useState(template?.sortOrder?.toString() || '0');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valider le SVG
  const svgPreview = useMemo(() => {
    if (!iconSvg) return null;
    try {
      // Simple check for SVG validity
      if (iconSvg.includes('<svg') && iconSvg.includes('</svg>')) {
        return iconSvg;
      }
      return null;
    } catch {
      return null;
    }
  }, [iconSvg]);

  // Ajouter un parametre
  const addParameter = () => {
    setConfigSchema([...configSchema, { ...DEFAULT_PARAM, key: `param${configSchema.length + 1}` }]);
  };

  // Modifier un parametre
  const updateParameter = (index: number, field: keyof UsinageConfigParam, value: string | number | boolean) => {
    setConfigSchema(prev => prev.map((param, i) =>
      i === index ? { ...param, [field]: value } : param
    ));
  };

  // Supprimer un parametre
  const removeParameter = (index: number) => {
    setConfigSchema(configSchema.filter((_, i) => i !== index));
  };

  // Sauvegarder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!nom.trim()) {
      setError('Le nom est obligatoire');
      return;
    }

    if (!iconSvg.trim() || !svgPreview) {
      setError('Un icone SVG valide est obligatoire');
      return;
    }

    // Valider les parametres
    for (const param of configSchema) {
      if (!param.key.trim() || !param.label.trim()) {
        setError('Tous les parametres doivent avoir une cle et un label');
        return;
      }
    }

    try {
      setSaving(true);

      await onSave({
        nom: nom.trim(),
        description: description.trim() || undefined,
        iconSvg: iconSvg.trim(),
        configSchema,
        technicalSvg: technicalSvg.trim() || undefined,
        pricingType: pricingType as 'PER_UNIT' | 'PER_METER' | 'PER_M2' | 'FIXED',
        priceHT: parseFloat(priceHT) || 0,
        category: category as 'RAINURE' | 'PERCAGE' | 'USINAGE_CN' | 'DEFONCEUSE' | 'PASSE_MAIN' | 'AUTRE',
        sortOrder: parseInt(sortOrder) || 0,
      });
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay">
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .btn-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          color: var(--admin-text-secondary, #666);
        }

        .btn-close:hover {
          background: var(--admin-bg-tertiary, #f5f5f0);
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-primary, #1a1a1a);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--admin-olive, #6b7c4c);
        }

        .form-group textarea {
          min-height: 100px;
          font-family: monospace;
          resize: vertical;
        }

        .svg-preview-section {
          display: grid;
          grid-template-columns: 1fr 120px;
          gap: 1rem;
        }

        .svg-preview {
          width: 100px;
          height: 100px;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .svg-preview :global(svg) {
          width: 64px;
          height: 64px;
        }

        .svg-preview-empty {
          color: var(--admin-text-muted, #999);
          font-size: 0.75rem;
          text-align: center;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--admin-text-primary, #1a1a1a);
          margin: 1.5rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .params-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .param-row {
          display: grid;
          grid-template-columns: 1fr 1fr 80px 80px 80px auto;
          gap: 0.75rem;
          align-items: end;
          padding: 1rem;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border-radius: 8px;
        }

        .param-row input,
        .param-row select {
          padding: 0.5rem;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .param-row label {
          font-size: 0.7rem;
          color: var(--admin-text-secondary, #666);
          margin-bottom: 0.25rem;
        }

        .param-field {
          display: flex;
          flex-direction: column;
        }

        .checkbox-field {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-bottom: 0.5rem;
        }

        .btn-remove-param {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          color: #dc2626;
          border-radius: 6px;
        }

        .btn-remove-param:hover {
          background: #fee2e2;
        }

        .btn-add-param {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border: 1px dashed var(--admin-border-default, #e0e0e0);
          border-radius: 8px;
          cursor: pointer;
          color: var(--admin-text-secondary, #666);
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .btn-add-param:hover {
          background: #e8e8e0;
          border-color: var(--admin-olive, #6b7c4c);
          color: var(--admin-olive, #6b7c4c);
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--admin-border-default, #e0e0e0);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .footer-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-cancel {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-cancel:hover {
          background: var(--admin-bg-tertiary, #f5f5f0);
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--admin-olive, #6b7c4c);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .btn-save:hover:not(:disabled) {
          background: var(--admin-olive-dark, #5a6a3f);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{template ? t('editTemplate') : t('createTemplate')}</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Nom et Categorie */}
          <div className="form-row">
            <div className="form-group">
              <label>Nom *</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Rainure traversante"
                required
              />
            </div>
            <div className="form-group">
              <label>Categorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group full-width">
            <label>Description / Explication</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'usinage, conditions d'utilisation..."
              rows={3}
            />
          </div>

          {/* Icone SVG */}
          <h3 className="section-title">{t('svgIcon')}</h3>
          <div className="svg-preview-section">
            <div className="form-group">
              <label>{t('svgIconHint')}</label>
              <textarea
                value={iconSvg}
                onChange={(e) => setIconSvg(e.target.value)}
                placeholder='<svg viewBox="0 0 24 24">...</svg>'
                rows={5}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#666' }}>{t('svgPreview')}</label>
              <div className="svg-preview">
                {svgPreview ? (
                  <div dangerouslySetInnerHTML={{ __html: svgPreview }} />
                ) : (
                  <span className="svg-preview-empty">Apercu SVG</span>
                )}
              </div>
            </div>
          </div>

          {/* Tarification */}
          <h3 className="section-title">{t('pricing')}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>{t('pricingType')}</label>
              <select value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
                {PRICING_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('priceHT')} (EUR)</label>
              <input
                type="number"
                value={priceHT}
                onChange={(e) => setPriceHT(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Schema de configuration */}
          <h3 className="section-title">{t('configSchema')}</h3>
          <div className="params-list">
            {configSchema.map((param, index) => (
              <div key={index} className="param-row">
                <div className="param-field">
                  <label>{t('parameterKey')}</label>
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => updateParameter(index, 'key', e.target.value)}
                    placeholder="longueur"
                  />
                </div>
                <div className="param-field">
                  <label>{t('parameterLabel')}</label>
                  <input
                    type="text"
                    value={param.label}
                    onChange={(e) => updateParameter(index, 'label', e.target.value)}
                    placeholder="Longueur"
                  />
                </div>
                <div className="param-field">
                  <label>{t('parameterUnit')}</label>
                  <input
                    type="text"
                    value={param.unit}
                    onChange={(e) => updateParameter(index, 'unit', e.target.value)}
                    placeholder="mm"
                  />
                </div>
                <div className="param-field">
                  <label>{t('parameterMin')}</label>
                  <input
                    type="number"
                    value={param.min ?? ''}
                    onChange={(e) => updateParameter(index, 'min', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="param-field">
                  <label>{t('parameterMax')}</label>
                  <input
                    type="number"
                    value={param.max ?? ''}
                    onChange={(e) => updateParameter(index, 'max', parseFloat(e.target.value) || 5000)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-remove-param"
                  onClick={() => removeParameter(index)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button type="button" className="btn-add-param" onClick={addParameter}>
              <Plus size={18} />
              {t('addParameter')}
            </button>
          </div>

          {/* Dessin technique (optionnel) */}
          <h3 className="section-title">{t('technicalSvg')}</h3>
          <div className="form-group">
            <label>{t('technicalSvgHint')}</label>
            <textarea
              value={technicalSvg}
              onChange={(e) => setTechnicalSvg(e.target.value)}
              placeholder='{"viewBox": "0 0 200 150", "elements": [...], "dimensions": [...]}'
              rows={4}
            />
          </div>

          {/* Ordre d'affichage */}
          <div className="form-row">
            <div className="form-group">
              <label>{t('sortOrder')}</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div>
            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
          <div className="footer-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              <Save size={18} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  // Render with portal
  if (typeof window === 'undefined') return null;

  return createPortal(modalContent, document.body);
}
