'use client';

import { useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Printer } from 'lucide-react';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import { BRILLANCES } from '@/lib/configurateur/constants';

interface ModalEtiquettesProps {
  open: boolean;
  referenceChantier: string;
  lignes: LignePrestationV3[];
  onClose: () => void;
}

// Fonction pour formater les chants sélectionnés
function formaterChants(chants: { A: boolean; B: boolean; C: boolean; D: boolean }, noneLabel: string): string {
  const selected = [];
  if (chants.A) selected.push('A');
  if (chants.B) selected.push('B');
  if (chants.C) selected.push('C');
  if (chants.D) selected.push('D');
  return selected.length > 0 ? selected.join(', ') : noneLabel;
}

// Fonction pour obtenir le label de brillance
function getLabelBrillance(brillance: string | null): string {
  if (!brillance) return '-';
  const found = BRILLANCES.find(b => b.value === brillance);
  return found ? found.label : brillance;
}

// Fonction pour formater les dimensions
function formaterDimensions(dimensions: { longueur: number; largeur: number; hauteur?: number; epaisseur: number }): string {
  const { longueur, largeur, hauteur, epaisseur } = dimensions;
  if (hauteur && hauteur > 0) {
    return `${longueur} × ${largeur} × ${hauteur} (ép. ${epaisseur})`;
  }
  return `${longueur} × ${largeur} (ép. ${epaisseur})`;
}

export default function ModalEtiquettes({
  open,
  referenceChantier,
  lignes,
  onClose,
}: ModalEtiquettesProps) {
  const t = useTranslations('dialogs.labels');
  const tCommon = useTranslations('common');
  const printRef = useRef<HTMLDivElement>(null);

  // Filtrer les lignes complètes (avec référence et finition)
  const lignesCompletes = lignes.filter(
    l => l.reference.trim() !== '' && l.finition !== null
  );

  const handlePrint = useCallback(() => {
    // Ouvrir la fenêtre d'impression
    window.print();
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="modal-overlay"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-etiquettes">
        <div className="modal-header">
          <h2>{t('title')}</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {lignesCompletes.length === 0 ? (
            <div className="empty-state">
              <p>{t('empty')}</p>
              <p className="hint">{t('emptyHint')}</p>
            </div>
          ) : (
            <>
              <p className="info">
                {lignesCompletes.length} {lignesCompletes.length > 1 ? 'etiquettes' : 'etiquette'} (format 50x80mm)
              </p>

              {/* Zone de prévisualisation */}
              <div className="preview-zone">
                <div ref={printRef} className="etiquettes-container">
                  {lignesCompletes.map((ligne) => (
                    <div key={ligne.id} className="etiquette">
                      <div className="etiquette-header">
                        <span className="ref-chantier">{referenceChantier || t('withoutRef')}</span>
                      </div>

                      <div className="ref-piece">{ligne.reference}</div>

                      <div className="etiquette-body">
                        <div className="row">
                          <span className="label">{t('finishLabel')}</span>
                          <span className="value">{ligne.finition === 'laque' ? t('finishLacquer') : t('finishVarnish')}</span>
                        </div>

                        <div className="row">
                          <span className="label">{ligne.finition === 'laque' ? t('ralLabel') : t('tintLabel')}</span>
                          <span className="value">
                            {ligne.finition === 'laque'
                              ? (ligne.codeCouleurLaque || '-')
                              : (ligne.teinte || t('colorless'))}
                          </span>
                        </div>

                        <div className="row">
                          <span className="label">{t('glossLabel')}</span>
                          <span className="value brillance">{getLabelBrillance(ligne.brillance)}</span>
                        </div>

                        <div className="row">
                          <span className="label">{t('dimensionsLabel')}</span>
                          <span className="value dimensions">{formaterDimensions(ligne.dimensions)}</span>
                        </div>

                        <div className="row-inline">
                          <div className="col">
                            <span className="label">{t('facesLabel')}</span>
                            <span className="value">{ligne.nombreFaces}F</span>
                          </div>
                          <div className="col">
                            <span className="label">{t('edgesLabel')}</span>
                            <span className="value">{formaterChants(ligne.chants, tCommon('misc.none'))}</span>
                          </div>
                        </div>

                        <div className="row percage">
                          <span className="label">{t('drillingLabel')}</span>
                          <span className={`value ${ligne.percage ? 'oui' : 'non'}`}>
                            {ligne.percage ? t('drillingYes') : t('drillingNo')}
                          </span>
                        </div>
                      </div>

                      <div className="etiquette-footer">
                        <img src="/logo.png" alt="Logo" className="logo" />
                        <span className="brand">{t('brandName')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {lignesCompletes.length > 0 && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              {tCommon('actions.cancel')}
            </button>
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={18} />
              {tCommon('actions.print')}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }

        .modal-etiquettes {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--admin-bg);
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          z-index: 1001;
          width: 90%;
          max-width: 800px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--admin-border);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--admin-text);
        }

        .btn-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          color: var(--admin-text-muted);
          border-radius: 6px;
          transition: all 0.15s;
        }

        .btn-close:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text);
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .info {
          margin: 0 0 1rem;
          font-size: 0.875rem;
          color: var(--admin-text-secondary);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: var(--admin-text-muted);
        }

        .empty-state p {
          margin: 0.5rem 0;
        }

        .empty-state .hint {
          font-size: 0.875rem;
        }

        .preview-zone {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 1.5rem;
          max-height: 50vh;
          overflow-y: auto;
        }

        .etiquettes-container {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
        }

        /* Style d'une étiquette (preview) - Ratio 50x80mm */
        .etiquette {
          width: 200px;
          height: 320px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          font-family: 'Arial', sans-serif;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .etiquette-header {
          text-align: center;
          padding-bottom: 4px;
          border-bottom: 1px solid #333;
          margin-bottom: 4px;
        }

        .ref-chantier {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: #333;
        }

        .ref-piece {
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          color: #000;
          padding: 6px 0;
          border-bottom: 1px dashed #ccc;
          margin-bottom: 6px;
        }

        .etiquette-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2px 0;
        }

        .row-inline {
          display: flex;
          gap: 8px;
          padding: 2px 0;
        }

        .col {
          flex: 1;
          display: flex;
          justify-content: space-between;
        }

        .label {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
        }

        .value {
          font-size: 10px;
          font-weight: 600;
          color: #000;
          text-align: right;
        }

        .value.brillance {
          font-size: 9px;
        }

        .value.dimensions {
          font-size: 9px;
        }

        .percage {
          margin-top: auto;
          padding-top: 6px;
          border-top: 1px solid #eee;
        }

        .percage .value.oui {
          color: #16a34a;
          font-weight: 700;
        }

        .percage .value.non {
          color: #666;
        }

        .etiquette-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding-top: 6px;
          margin-top: 6px;
          border-top: 1px solid #ddd;
        }

        .etiquette-footer .logo {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }

        .etiquette-footer .brand {
          font-size: 7px;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--admin-border);
        }

        .btn-secondary,
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary {
          background: var(--admin-bg-hover);
          border: 1px solid var(--admin-border);
          color: var(--admin-text-secondary);
        }

        .btn-secondary:hover {
          background: var(--admin-bg);
          border-color: var(--admin-text-muted);
        }

        .btn-primary {
          background: var(--admin-olive);
          border: none;
          color: white;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        /* ========================================
           STYLES D'IMPRESSION - 50x80mm
           ======================================== */
        @media print {
          /* Masquer tout sauf les étiquettes */
          body * {
            visibility: hidden;
          }

          .etiquettes-container,
          .etiquettes-container * {
            visibility: visible;
          }

          .modal-overlay,
          .modal-header,
          .modal-footer,
          .info,
          .preview-zone {
            display: none !important;
          }

          .etiquettes-container {
            position: absolute;
            left: 0;
            top: 0;
            display: block;
            padding: 0;
            margin: 0;
          }

          /* Format étiquette 50x80mm */
          .etiquette {
            width: 50mm;
            height: 80mm;
            padding: 2mm;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
            font-size: 8pt;
          }

          .etiquette:last-child {
            page-break-after: auto;
          }

          .etiquette-header {
            padding-bottom: 1mm;
            margin-bottom: 1mm;
          }

          .ref-chantier {
            font-size: 7pt;
          }

          .ref-piece {
            font-size: 10pt;
            padding: 2mm 0;
            margin-bottom: 2mm;
          }

          .etiquette-body {
            gap: 1mm;
          }

          .row,
          .row-inline {
            padding: 0.5mm 0;
          }

          .label {
            font-size: 6pt;
          }

          .value {
            font-size: 7pt;
          }

          .value.brillance,
          .value.dimensions {
            font-size: 6pt;
          }

          .percage {
            padding-top: 2mm;
          }

          .etiquette-footer {
            padding-top: 1.5mm;
            margin-top: 1.5mm;
            gap: 1.5mm;
          }

          .etiquette-footer .logo {
            width: 4mm;
            height: 4mm;
          }

          .etiquette-footer .brand {
            font-size: 5pt;
          }

          /* Configuration de la page */
          @page {
            size: 50mm 80mm;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}
