'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { X, Wrench, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Usinage, UsinageTemplate, UsinageApplique } from '@/lib/configurateur/types';
import { fetchUsinageTemplates, calculerPrixUsinage } from '@/lib/services/usinages-api';
import { formaterPrix } from '@/lib/configurateur/calculs';
import { UsinageGrid, UsinageConfigPanel, UsinageTechnicalSvg, UsinageImportButton } from './usinage';

interface PopupUsinagesProps {
  open: boolean;
  usinages: Usinage[];
  onUpdate: (usinages: Usinage[]) => void;
  onClose: () => void;
}

interface ImportedFile {
  data: string;
  type: 'dxf' | 'dwg' | 'image';
  filename: string;
}

export default function PopupUsinages({
  open,
  usinages,
  onUpdate,
  onClose,
}: PopupUsinagesProps) {
  const t = useTranslations('dialogs.machining');
  const tCommon = useTranslations('common');

  // Templates depuis l'API
  const [templates, setTemplates] = useState<UsinageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection et configuration
  const [selectedTemplate, setSelectedTemplate] = useState<UsinageTemplate | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, number>>({});
  const [quantite, setQuantite] = useState(1);
  const [importedFile, setImportedFile] = useState<ImportedFile | null>(null);

  // Usinages selectionnes (liste locale)
  const [selectedUsinages, setSelectedUsinages] = useState<UsinageApplique[]>([]);

  // Charger les templates au montage
  useEffect(() => {
    if (open) {
      loadTemplates();
      // Convertir les usinages existants en format UsinageApplique
      convertExistingUsinages();
    }
  }, [open, usinages]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchUsinageTemplates();
      setTemplates(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des usinages');
    } finally {
      setLoading(false);
    }
  };

  const convertExistingUsinages = () => {
    // Convertir les anciens usinages au nouveau format
    const converted: UsinageApplique[] = usinages.map((u) => ({
      templateId: u.type,
      templateNom: u.description,
      templateIconSvg: '', // On ne l'a pas dans l'ancien format
      configValues: {},
      prixUnitaire: u.prixUnitaire,
      quantite: u.quantite,
      prixTotal: u.prixUnitaire * u.quantite,
    }));
    setSelectedUsinages(converted);
  };

  // Selectionner un template
  const handleSelectTemplate = (template: UsinageTemplate) => {
    setSelectedTemplate(template);
    // Initialiser les valeurs par defaut
    const defaultValues: Record<string, number> = {};
    template.configSchema.forEach((param) => {
      defaultValues[param.key] = param.defaultValue || 0;
    });
    setConfigValues(defaultValues);
    setQuantite(1);
    setImportedFile(null);
  };

  // Modifier une valeur de configuration
  const handleConfigChange = (key: string, value: number) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  // Prix calcule pour l'usinage en cours
  const prixUsinage = useMemo(() => {
    if (!selectedTemplate) return 0;
    return calculerPrixUsinage(selectedTemplate, configValues, quantite);
  }, [selectedTemplate, configValues, quantite]);

  // Ajouter l'usinage configure
  const handleAddUsinage = () => {
    if (!selectedTemplate) return;

    const newUsinage: UsinageApplique = {
      templateId: selectedTemplate.id,
      templateNom: selectedTemplate.nom,
      templateIconSvg: selectedTemplate.iconSvg,
      configValues: { ...configValues },
      importedFile: importedFile || undefined,
      prixUnitaire: selectedTemplate.priceHT,
      quantite,
      prixTotal: prixUsinage,
    };

    setSelectedUsinages((prev) => [...prev, newUsinage]);

    // Reset
    setSelectedTemplate(null);
    setConfigValues({});
    setQuantite(1);
    setImportedFile(null);
  };

  // Supprimer un usinage
  const handleRemoveUsinage = (index: number) => {
    setSelectedUsinages((prev) => prev.filter((_, i) => i !== index));
  };

  // Total des usinages
  const totalUsinages = useMemo(() => {
    return selectedUsinages.reduce((sum, u) => sum + u.prixTotal, 0);
  }, [selectedUsinages]);

  // Valider
  const handleValider = () => {
    // Convertir au format Usinage pour compatibilite
    const usinagesFinaux: Usinage[] = selectedUsinages.map((u) => ({
      type: u.templateId,
      description: u.templateNom,
      prixUnitaire: u.prixUnitaire,
      quantite: u.quantite,
    }));
    onUpdate(usinagesFinaux);
    onClose();
  };

  // Annuler
  const handleAnnuler = () => {
    setSelectedTemplate(null);
    setConfigValues({});
    setQuantite(1);
    setImportedFile(null);
    onClose();
  };

  if (!open) return null;

  const modalContent = (
    <div className="popup-overlay" onClick={handleAnnuler}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="popup-header">
          <div className="header-title">
            <Wrench size={20} style={{ color: 'var(--admin-olive)' }} />
            <h3>{t('title')}</h3>
          </div>
          <button className="btn-close" onClick={handleAnnuler}>
            <X size={20} />
          </button>
        </div>

        {/* Body - Deux colonnes */}
        <div className="popup-body">
          {loading ? (
            <div className="loading-state">
              <Loader2 size={32} className="spinner" />
              <p>{t('loadingTemplates')}</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <p>{t('noTemplates')}</p>
            </div>
          ) : (
            <div className="two-columns">
              {/* Colonne gauche: Selection */}
              <div className="column-left">
                <h4>{t('selectUsinage')}</h4>
                <UsinageGrid
                  templates={templates}
                  selectedId={selectedTemplate?.id || null}
                  onSelect={handleSelectTemplate}
                />

                <UsinageImportButton
                  importedFile={importedFile}
                  onImport={setImportedFile}
                  onClear={() => setImportedFile(null)}
                />
              </div>

              {/* Colonne droite: Configuration */}
              <div className="column-right">
                {selectedTemplate ? (
                  <>
                    <h4>{t('configureUsinage')}</h4>

                    {/* Dessin technique */}
                    <UsinageTechnicalSvg
                      template={selectedTemplate}
                      configValues={configValues}
                    />

                    {/* Panneau de configuration */}
                    <UsinageConfigPanel
                      template={selectedTemplate}
                      values={configValues}
                      quantite={quantite}
                      onChange={handleConfigChange}
                      onQuantiteChange={setQuantite}
                    />

                    {/* Prix et bouton ajouter */}
                    <div className="add-section">
                      <div className="price-preview">
                        <span>Prix:</span>
                        <span className="price-value">{formaterPrix(prixUsinage)}</span>
                      </div>
                      <button className="btn-add" onClick={handleAddUsinage}>
                        <Plus size={18} />
                        Ajouter
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="placeholder">
                    <p>Selectionnez un usinage pour le configurer</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Liste des usinages selectionnes */}
          {selectedUsinages.length > 0 && (
            <div className="selection-section">
              <h4>{t('currentSelection')}</h4>
              <div className="selection-list">
                {selectedUsinages.map((usinage, index) => (
                  <div key={index} className="selection-item">
                    <div className="selection-info">
                      <span className="selection-label">{usinage.templateNom}</span>
                      <span className="selection-detail">
                        x{usinage.quantite} = {formaterPrix(usinage.prixTotal)}
                      </span>
                    </div>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveUsinage(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="popup-footer">
          <div className="footer-total">
            <span>{t('totalMachining')}</span>
            <span className="total-value">{formaterPrix(totalUsinages)}</span>
          </div>
          <div className="footer-actions">
            <button className="btn-cancel" onClick={handleAnnuler}>
              {tCommon('actions.cancel')}
            </button>
            <button className="btn-confirm" onClick={handleValider}>
              {tCommon('actions.validate')}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .popup-content {
          background: var(--admin-bg-card, white);
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          margin: 1rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--admin-border-subtle, #f0f0f0);
          flex-shrink: 0;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .header-title h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-text-primary, #1a1a1a);
          margin: 0;
        }

        .btn-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-tertiary, #999);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: var(--admin-bg-hover, #f0f0f0);
          color: var(--admin-text-primary, #1a1a1a);
        }

        .popup-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--admin-text-secondary, #666);
        }

        .spinner {
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .column-left,
        .column-right {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .column-left h4,
        .column-right h4 {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--admin-text-tertiary, #999);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border: 2px dashed var(--admin-border-default, #e0e0e0);
          border-radius: 12px;
          color: var(--admin-text-muted, #999);
          text-align: center;
          min-height: 200px;
        }

        .add-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--admin-olive-bg, #f0f2e8);
          border-radius: 8px;
          margin-top: 0.5rem;
        }

        .price-preview {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--admin-text-secondary, #666);
        }

        .price-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--admin-olive, #6b7c4c);
        }

        .btn-add {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: var(--admin-olive, #6b7c4c);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .btn-add:hover {
          background: var(--admin-olive-dark, #5a6a3f);
        }

        .selection-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--admin-border-subtle, #f0f0f0);
        }

        .selection-section h4 {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--admin-text-tertiary, #999);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.75rem 0;
        }

        .selection-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .selection-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--admin-olive-bg, #f0f2e8);
          border: 1px solid var(--admin-olive-border, #d4d6c8);
          border-radius: 8px;
        }

        .selection-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .selection-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-primary, #1a1a1a);
        }

        .selection-detail {
          font-size: 0.75rem;
          color: var(--admin-olive, #6b7c4c);
        }

        .btn-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--admin-text-muted, #999);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-remove:hover {
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.3);
          color: #dc2626;
        }

        .popup-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--admin-border-subtle, #f0f0f0);
          background: var(--admin-bg-elevated, #fafafa);
          border-radius: 0 0 16px 16px;
          flex-shrink: 0;
        }

        .footer-total {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--admin-text-secondary, #666);
        }

        .total-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--admin-sable, #c9a86c);
        }

        .footer-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-cancel,
        .btn-confirm {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          color: var(--admin-text-secondary, #666);
        }

        .btn-cancel:hover {
          background: var(--admin-bg-hover, #f0f0f0);
          color: var(--admin-text-primary, #1a1a1a);
        }

        .btn-confirm {
          background: linear-gradient(135deg, var(--admin-olive, #6b7c4c) 0%, var(--admin-olive-dark, #5a6a3f) 100%);
          border: none;
          color: white;
        }

        .btn-confirm:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .two-columns {
            grid-template-columns: 1fr;
          }

          .popup-content {
            max-width: 100%;
            margin: 0.5rem;
            max-height: 95vh;
          }
        }
      `}</style>
    </div>
  );

  // Render avec portal
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
