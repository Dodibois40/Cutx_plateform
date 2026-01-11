'use client';

/**
 * Modale d'export PDF pour l'optimiseur
 *
 * Propose 2 exports:
 * - Plan de Découpe (pour l'atelier)
 * - Catalogue Chutes (pour la marketplace)
 */

import { useState } from 'react';
import { X, FileText, Package, Download, Loader2, Check } from 'lucide-react';
import {
  downloadCuttingPlanPdf,
  downloadOffcutsCatalogPdf,
  collectOffcuts,
} from '@/lib/configurateur/optimiseur/pdf-templates';
import type { PanneauOptimise } from '@/lib/configurateur/optimiseur/pdf-templates';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  panneaux: PanneauOptimise[];
  currentPanneauIndex: number;
}

type ExportType = 'cutting-plan' | 'offcuts-catalog';
type ExportMode = 'all' | 'current';

export function ExportPdfModal({
  isOpen,
  onClose,
  panneaux,
  currentPanneauIndex,
}: ExportPdfModalProps) {
  const [projectName, setProjectName] = useState('');
  const [exportType, setExportType] = useState<ExportType>('cutting-plan');
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Calculer le nombre de chutes valorisables
  const offcuts = collectOffcuts(panneaux);
  const nbOffcuts = offcuts.length;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const targetPanneaux =
        exportMode === 'all' ? panneaux : [panneaux[currentPanneauIndex]];

      if (exportType === 'cutting-plan') {
        await downloadCuttingPlanPdf(targetPanneaux, projectName || 'Mon projet');
      } else {
        await downloadOffcutsCatalogPdf(targetPanneaux, projectName || 'Mon projet');
      }

      setExportSuccess(true);
      // Fermer après 1.5s
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content export-pdf-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>Export PDF</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Type d'export */}
        <div className="export-types">
          <button
            className={`export-type-btn ${exportType === 'cutting-plan' ? 'active' : ''}`}
            onClick={() => setExportType('cutting-plan')}
          >
            <FileText size={24} />
            <span className="type-name">Plan de Découpe</span>
            <span className="type-desc">Pour l'atelier</span>
          </button>

          <button
            className={`export-type-btn ${exportType === 'offcuts-catalog' ? 'active' : ''}`}
            onClick={() => setExportType('offcuts-catalog')}
          >
            <Package size={24} />
            <span className="type-name">Catalogue Chutes</span>
            <span className="type-desc">
              {nbOffcuts} chute{nbOffcuts !== 1 ? 's' : ''} valorisable{nbOffcuts !== 1 ? 's' : ''}
            </span>
          </button>
        </div>

        {/* Options */}
        <div className="export-options">
          {/* Nom du projet */}
          <div className="option-group">
            <label htmlFor="projectName">Nom du projet</label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Mon projet"
              className="input-field"
            />
          </div>

          {/* Mode d'export */}
          <div className="option-group">
            <label>Panneaux à exporter</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'all'}
                  onChange={() => setExportMode('all')}
                />
                <span>Tous les panneaux ({panneaux.length})</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'current'}
                  onChange={() => setExportMode('current')}
                />
                <span>Panneau actuel uniquement</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={isExporting}>
            Annuler
          </button>
          <button
            className={`btn-export-primary ${exportSuccess ? 'success' : ''}`}
            onClick={handleExport}
            disabled={isExporting || exportSuccess}
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Génération...
              </>
            ) : exportSuccess ? (
              <>
                <Check size={18} />
                Téléchargé !
              </>
            ) : (
              <>
                <Download size={18} />
                Télécharger PDF
              </>
            )}
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: #1f1f1e;
            border-radius: 12px;
            width: 90%;
            max-width: 480px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .modal-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: white;
          }

          .btn-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
          }

          .btn-close:hover {
            color: white;
            background: rgba(255, 255, 255, 0.1);
          }

          .export-types {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 20px 24px;
          }

          .export-type-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px 16px;
            background: rgba(255, 255, 255, 0.04);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            color: rgba(255, 255, 255, 0.7);
          }

          .export-type-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
          }

          .export-type-btn.active {
            background: rgba(245, 158, 11, 0.15);
            border-color: #f59e0b;
            color: white;
          }

          .export-type-btn.active :global(svg) {
            color: #f59e0b;
          }

          .type-name {
            font-size: 14px;
            font-weight: 600;
          }

          .type-desc {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
          }

          .export-options {
            padding: 0 24px 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .option-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .option-group > label {
            font-size: 12px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.6);
          }

          .input-field {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 14px;
            color: white;
            outline: none;
            transition: border-color 0.2s;
          }

          .input-field:focus {
            border-color: #f59e0b;
          }

          .input-field::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }

          .radio-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .radio-option {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
          }

          .radio-option input[type="radio"] {
            accent-color: #f59e0b;
            width: 16px;
            height: 16px;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .btn-cancel {
            padding: 10px 20px;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-cancel:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.3);
          }

          .btn-cancel:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-export-primary {
            padding: 10px 24px;
            background: #f59e0b;
            border: none;
            border-radius: 8px;
            color: black;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          }

          .btn-export-primary:hover:not(:disabled) {
            background: #d97706;
          }

          .btn-export-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .btn-export-primary.success {
            background: #22c55e;
          }

          .animate-spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
