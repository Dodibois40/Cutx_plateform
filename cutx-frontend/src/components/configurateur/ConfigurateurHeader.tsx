'use client';

import { useRef, useState } from 'react';
import { Upload, ArrowLeft, ChevronDown, Package, FileSpreadsheet } from 'lucide-react';
import { formaterPrix } from '@/lib/configurateur/calculs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { ProduitCatalogue } from '@/lib/catalogues';
import PopupSelectionPanneau from './PopupSelectionPanneau';

interface ConfigurateurHeaderProps {
  referenceChantier: string;
  onReferenceChange: (value: string) => void;
  onImportExcel?: (file: File) => void;
  isImporting?: boolean;
  isClientMode?: boolean;
  onBack?: () => void;
  panneauGlobal?: PanneauCatalogue | null;
  panneauxCatalogue?: PanneauCatalogue[];
  onSelectPanneau?: (panneau: PanneauCatalogue | null) => void;
}

export default function ConfigurateurHeader({
  referenceChantier,
  onReferenceChange,
  onImportExcel,
  isImporting = false,
  isClientMode = false,
  onBack,
  panneauGlobal,
  panneauxCatalogue = [],
  onSelectPanneau,
}: ConfigurateurHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPanneauPopup, setShowPanneauPopup] = useState(false);

  // Panel price calculation
  const DIMENSIONS_PANNEAU_BRUT = { longueur: 2800, largeur: 2070 };
  const surfacePanneauM2 = (DIMENSIONS_PANNEAU_BRUT.longueur * DIMENSIONS_PANNEAU_BRUT.largeur) / 1_000_000;
  const epaisseurDefaut = panneauGlobal?.epaisseurs?.[0]?.toString() || '19';
  const prixM2 = panneauGlobal?.prixM2?.[epaisseurDefaut] || 0;
  const prixPanneauBrut = surfacePanneauM2 * prixM2;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportExcel) {
      onImportExcel(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const isReferenceEmpty = !referenceChantier.trim();
  const isPanneauEmpty = !panneauGlobal;

  return (
    <header className="cx-header">
      {/* LEFT SECTION: Back + Reference */}
      <div className="cx-header-section">
        {isClientMode && onBack && (
          <button onClick={onBack} className="cx-btn cx-btn--ghost">
            <ArrowLeft size={16} />
            <span>Retour</span>
          </button>
        )}

        {isClientMode && onBack && <div className="cx-header-divider" />}

        {/* Reference Input */}
        <div className="header-field">
          <label className="header-field-label">Reference</label>
          <div className={`header-input-wrapper ${isReferenceEmpty ? 'header-input-wrapper--warning' : ''}`}>
            <input
              type="text"
              value={referenceChantier}
              onChange={(e) => onReferenceChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Ref. chantier"
              className="header-input"
            />
          </div>
        </div>
      </div>

      {/* CENTER SECTION: Panel Selection */}
      <div className="cx-header-section panel-section">
        <div className="header-field header-field--panel">
          <label className="header-field-label">Panneau</label>
          <button
            onClick={() => setShowPanneauPopup(true)}
            className={`panel-selector ${panneauGlobal ? 'panel-selector--selected' : 'panel-selector--empty'}`}
          >
            {panneauGlobal?.imageUrl ? (
              <img
                src={panneauGlobal.imageUrl}
                alt={panneauGlobal.nom}
                className="panel-selector-image"
              />
            ) : (
              <div className="panel-selector-placeholder">
                <Package size={16} />
              </div>
            )}
            <div className="panel-selector-content">
              <span className="panel-selector-name">
                {panneauGlobal ? panneauGlobal.nom : 'Selectionner un panneau'}
              </span>
              {panneauGlobal && (
                <span className="panel-selector-meta">
                  {DIMENSIONS_PANNEAU_BRUT.longueur} x {DIMENSIONS_PANNEAU_BRUT.largeur} mm | {panneauGlobal.epaisseurs.join('/')} mm
                </span>
              )}
            </div>
            <ChevronDown size={14} className="panel-selector-chevron" />
          </button>
          {panneauGlobal && (
            <div className="panel-price">
              <span className="panel-price-value">{formaterPrix(prixPanneauBrut)}</span>
              <span className="panel-price-unit">/panneau</span>
            </div>
          )}
        </div>

        {/* Panel Selection Popup */}
        <PopupSelectionPanneau
          open={showPanneauPopup}
          panneauxCatalogue={panneauxCatalogue}
          selectedPanneauId={panneauGlobal?.id || null}
          epaisseurActuelle={19}
          onSelect={() => {}}
          onSelectCatalogue={(produit: ProduitCatalogue) => {
            if (onSelectPanneau) {
              const produitAvecId = produit as ProduitCatalogue & { id: string };
              const panneau: PanneauCatalogue = {
                id: produitAvecId.id || produit.reference,
                nom: `${produit.nom} (${produit.reference})`,
                categorie: 'agglo_plaque' as const,
                essence: null,
                epaisseurs: produit.epaisseur ? [produit.epaisseur] : [19],
                prixM2: produit.epaisseur
                  ? { [produit.epaisseur.toString()]: produit.prixVenteM2 || produit.prixAchatM2 || 0 }
                  : { '19': produit.prixVenteM2 || produit.prixAchatM2 || 0 },
                fournisseur: produit.marque || 'BOUNEY',
                disponible: produit.stock === 'EN STOCK',
                description: `${produit.marque} - ${produit.type}`,
                ordre: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                imageUrl: produit.imageUrl,
              };
              onSelectPanneau(panneau);
            }
            setShowPanneauPopup(false);
          }}
          onClose={() => setShowPanneauPopup(false)}
        />
      </div>

      {/* RIGHT SECTION: Actions */}
      <div className="cx-header-section">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Import Button */}
        {onImportExcel && (
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="cx-btn cx-btn--secondary"
            title="Importer une feuille de debits Excel"
          >
            <FileSpreadsheet size={15} />
            <span>{isImporting ? 'Import...' : 'Import Excel'}</span>
          </button>
        )}

        {/* Mode Badge */}
        <div className="mode-badge">
          <span className="cx-status-dot cx-status-dot--success" />
          <span>Tableur</span>
        </div>
      </div>

      <style jsx>{`
        .header-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .header-field-label {
          font-size: var(--cx-text-xs);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--cx-text-muted);
        }

        .header-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--cx-surface-2);
          border: 1px solid var(--cx-border-default);
          border-radius: var(--cx-radius-md);
          transition: all var(--cx-transition-fast);
        }

        .header-input-wrapper:focus-within {
          border-color: var(--cx-accent);
          box-shadow: 0 0 0 2px var(--cx-accent-muted);
        }

        .header-input-wrapper--warning {
          border-color: var(--cx-warning);
          background: var(--cx-warning-muted);
        }

        .header-input {
          width: 160px;
          padding: 8px 12px;
          font-family: var(--cx-font-mono);
          font-size: var(--cx-text-sm);
          color: var(--cx-text-primary);
          background: transparent;
          border: none;
          outline: none;
        }

        .header-input::placeholder {
          color: var(--cx-text-muted);
          font-family: var(--cx-font-sans);
        }

        /* Panel Section */
        .panel-section {
          flex: 1;
          justify-content: center;
        }

        .header-field--panel {
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }

        .header-field--panel .header-field-label {
          min-width: 60px;
        }

        .panel-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 6px 6px;
          min-width: 280px;
          background: var(--cx-surface-2);
          border: 1px solid var(--cx-border-default);
          border-radius: var(--cx-radius-lg);
          cursor: pointer;
          transition: all var(--cx-transition-fast);
        }

        .panel-selector:hover {
          border-color: var(--cx-border-strong);
          background: var(--cx-surface-3);
        }

        .panel-selector--selected {
          border-color: var(--cx-border-accent);
        }

        .panel-selector--selected:hover {
          border-color: var(--cx-accent);
        }

        .panel-selector--empty {
          border-style: dashed;
          border-color: var(--cx-warning);
          background: var(--cx-warning-muted);
        }

        .panel-selector-image {
          width: 32px;
          height: 32px;
          border-radius: var(--cx-radius-md);
          object-fit: cover;
          border: 1px solid var(--cx-border-subtle);
        }

        .panel-selector-placeholder {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cx-surface-3);
          border-radius: var(--cx-radius-md);
          color: var(--cx-text-muted);
        }

        .panel-selector-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
          min-width: 0;
        }

        .panel-selector-name {
          font-size: var(--cx-text-sm);
          font-weight: 500;
          color: var(--cx-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .panel-selector-meta {
          font-size: var(--cx-text-xs);
          font-family: var(--cx-font-mono);
          color: var(--cx-text-tertiary);
        }

        .panel-selector-chevron {
          color: var(--cx-text-muted);
          flex-shrink: 0;
        }

        .panel-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
          padding: 6px 10px;
          background: var(--cx-accent-subtle);
          border-radius: var(--cx-radius-md);
        }

        .panel-price-value {
          font-family: var(--cx-font-mono);
          font-size: var(--cx-text-md);
          font-weight: 600;
          color: var(--cx-accent);
        }

        .panel-price-unit {
          font-size: var(--cx-text-xs);
          color: var(--cx-text-tertiary);
        }

        /* Mode Badge */
        .mode-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          font-size: var(--cx-text-xs);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--cx-text-tertiary);
          background: var(--cx-surface-2);
          border-radius: var(--cx-radius-md);
          border: 1px solid var(--cx-border-subtle);
        }
      `}</style>
    </header>
  );
}
