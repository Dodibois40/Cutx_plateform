'use client';

import '@/app/styles/cutx.css';

import { Plus, AlertTriangle, CheckCircle, XCircle, Tag, Lightbulb, Save, RotateCcw, Info } from 'lucide-react';
import { REGLES } from '@/lib/configurateur/constants';
import { validerLigne } from '@/lib/configurateur/validation';
import {
  ConfigurateurProvider,
  useConfigurateur,
  type DevisSubmitData,
  type InitialData,
} from '@/contexts/ConfigurateurContext';
import ConfigurateurHeader from './ConfigurateurHeader';
import TableauPrestations from './TableauPrestations';
import RecapitulatifTotal from './recap/RecapitulatifTotal';
import RecapTarifsDecoupe from './recap/RecapTarifsDecoupe';
import ModalCopie from './dialogs/ModalCopie';
import ModalEtiquettes from './dialogs/ModalEtiquettes';
import WelcomeModal from './WelcomeModal';
import { PopupOptimiseur } from './optimiseur';

export type { DevisSubmitData, InitialData };

interface ConfigurateurV3Props {
  isClientMode?: boolean;
  onSubmit?: (data: DevisSubmitData) => void;
  onBack?: () => void;
  initialData?: InitialData;
  devisId?: string;
  isEditing?: boolean;
}

export default function ConfigurateurV3(props: ConfigurateurV3Props) {
  return (
    <ConfigurateurProvider
      isClientMode={props.isClientMode}
      onSubmit={props.onSubmit}
      onBack={props.onBack}
      initialData={props.initialData}
      devisId={props.devisId}
      isEditing={props.isEditing}
    >
      <ConfigurateurContent />
    </ConfigurateurProvider>
  );
}

function ConfigurateurContent() {
  const {
    referenceChantier,
    setReferenceChantier,
    lignes,
    lastSaved,
    panneauGlobal,
    setPanneauGlobal,
    panneauMulticouche,
    setPanneauMulticouche,
    panneauxCatalogue,
    isImporting,
    toast,
    modalCopie,
    setModalCopie,
    modalEtiquettes,
    setModalEtiquettes,
    highlightedColumn,
    showWelcomeModal,
    setShowWelcomeModal,
    showOptimiseur,
    setShowOptimiseur,
    totaux,
    tarifsDecoupeChants,
    validation,
    handleAjouterLigne,
    handleSupprimerLigne,
    handleUpdateLigne,
    handleCopierLigne,
    handleConfirmerCopie,
    handleAnnulerCopie,
    handleCreerLigneFinition,
    handleSupprimerLigneFinition,
    showToast,
    handleApplyToColumn,
    handleClearSave,
    handleImportExcel,
    handleAjouterAuPanier,
    isClientMode,
    isEditing,
    onBack,
  } = useConfigurateur();

  return (
    <div className="configurateur">
      {/* Header */}
      <ConfigurateurHeader
        referenceChantier={referenceChantier}
        onReferenceChange={setReferenceChantier}
        onImportExcel={handleImportExcel}
        isImporting={isImporting}
        isClientMode={isClientMode}
        onBack={onBack}
        panneauGlobal={panneauGlobal}
        panneauxCatalogue={panneauxCatalogue}
        onSelectPanneau={setPanneauGlobal}
        panneauMulticouche={panneauMulticouche}
        onSelectMulticouche={setPanneauMulticouche}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'warning' && <AlertTriangle size={16} />}
              {toast.type === 'error' && <XCircle size={16} />}
            </div>
            <div className="toast-content">
              <p className="toast-message">{toast.message}</p>
              {toast.details && toast.details.length > 0 && (
                <ul className="toast-details">
                  {toast.details.slice(0, 5).map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                  {toast.details.length > 5 && (
                    <li>... et {toast.details.length - 5} autre(s)</li>
                  )}
                </ul>
              )}
            </div>
            <button
              onClick={() => showToast({ type: 'success', message: '' })}
              className="toast-close"
            >
              <XCircle size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Info Banner - Minimum requirements */}
      <div className="info-banner">
        <Info size={14} />
        <span>
          Minimum : {REGLES.SURFACE_MINIMUM} m2 facture par face ou {REGLES.MINIMUM_COMMANDE_HT} EUR HT par commande
        </span>
      </div>

      {/* Data Table */}
      <div className="table-section">
        <TableauPrestations
          lignes={lignes}
          panneauGlobal={panneauGlobal}
          panneauMulticouche={panneauMulticouche}
          onUpdateLigne={handleUpdateLigne}
          onSupprimerLigne={handleSupprimerLigne}
          onCopierLigne={handleCopierLigne}
          onCreerLigneFinition={handleCreerLigneFinition}
          onSupprimerLigneFinition={handleSupprimerLigneFinition}
          onApplyToColumn={handleApplyToColumn}
          highlightedColumn={highlightedColumn}
        />
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="action-bar-left">
          <button onClick={handleAjouterLigne} className="cx-btn cx-btn--accent-ghost">
            <Plus size={16} />
            <span>Ajouter ligne</span>
          </button>

          <button
            onClick={() => setModalEtiquettes(true)}
            className="cx-btn cx-btn--ghost"
          >
            <Tag size={15} />
            <span>Etiquettes</span>
          </button>

          <button
            onClick={() => setShowWelcomeModal(true)}
            className="cx-btn cx-btn--ghost"
          >
            <Lightbulb size={15} />
            <span>Guide</span>
          </button>
        </div>

        {!isEditing && (
          <div className="action-bar-right">
            {lastSaved && (
              <div className="save-indicator">
                <Save size={12} />
                <span>
                  Sauvegarde {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            <button
              onClick={handleClearSave}
              className="cx-btn cx-btn--ghost cx-btn--sm"
              title="Effacer et recommencer"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Pricing Summary */}
      {(tarifsDecoupeChants.decoupe || tarifsDecoupeChants.chants) && (
        <div className="pricing-section">
          <RecapTarifsDecoupe
            traitsScie={tarifsDecoupeChants.decoupe ? {
              panneaux: [],
              totalMetresLineaires: tarifsDecoupeChants.decoupe.metresLineaires,
              totalPrixDecoupe: tarifsDecoupeChants.decoupe.prixDecoupe,
              nombrePanneaux: 1,
            } : null}
            chants={tarifsDecoupeChants.chants ? {
              panneaux: [],
              totalMetresLineaires: tarifsDecoupeChants.chants.metresLineaires,
              totalPrixPlacage: tarifsDecoupeChants.chants.prixPlacage,
              totalPrixFourniture: tarifsDecoupeChants.chants.prixFourniture,
              totalPrixHT: tarifsDecoupeChants.chants.prixTotalHT,
            } : null}
            mode="compact"
          />
        </div>
      )}

      {/* Validation Errors */}
      {validation.erreurs.length > 0 && (
        <div className="validation-section">
          <div className="validation-banner">
            <div className="validation-header">
              <AlertTriangle size={14} />
              <span>Validation requise</span>
            </div>
            <ul className="validation-list">
              {validation.erreurs.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sticky Footer - Total */}
      <RecapitulatifTotal
        totalHT={totaux.totalHT}
        totalTVA={totaux.totalTVA}
        totalTTC={totaux.totalTTC}
        totalFournitureHT={totaux.totalFournitureHT}
        totalPrestationHT={totaux.totalPrestationHT}
        isValid={validation.isValid}
        onAjouterAuPanier={handleAjouterAuPanier}
        nombrePieces={lignes.filter(l => l.typeLigne === 'panneau').length}
        surfaceTotale={lignes.reduce((acc, l) => acc + ((l.surfaceM2 || 0) * (l.nombreFaces || 1)), 0)}
        metresLineairesChants={lignes.reduce((acc, l) => acc + (l.metresLineairesChants || 0), 0)}
        lignesCompletes={lignes.filter(l => validerLigne(l).isValid).length}
        totalLignes={lignes.filter(l => l.typeLigne === 'panneau').length}
        isEditing={isEditing}
        onOpenOptimiseur={() => setShowOptimiseur(true)}
        panneauGlobal={panneauGlobal}
      />

      {/* Modals */}
      <ModalCopie
        open={modalCopie.open}
        ligneSource={modalCopie.ligneSource}
        nouvelleReference={modalCopie.nouvelleReference}
        onReferenceChange={(ref) => setModalCopie(prev => ({ ...prev, nouvelleReference: ref }))}
        onConfirmer={handleConfirmerCopie}
        onAnnuler={handleAnnulerCopie}
      />

      <ModalEtiquettes
        open={modalEtiquettes}
        referenceChantier={referenceChantier}
        lignes={lignes}
        onClose={() => setModalEtiquettes(false)}
      />

      <WelcomeModal
        forceOpen={showWelcomeModal}
        onForceOpenHandled={() => setShowWelcomeModal(false)}
      />

      <PopupOptimiseur
        open={showOptimiseur}
        onClose={() => setShowOptimiseur(false)}
        lignes={lignes}
        panneauxCatalogue={panneauxCatalogue}
        panneauGlobal={panneauGlobal}
      />

      <style jsx>{`
        .configurateur {
          min-height: 100vh;
          padding-bottom: 100px;
          background: var(--cx-surface-0);
        }

        /* Toast */
        .toast-container {
          padding: 12px 24px;
        }

        .toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--cx-radius-lg);
          animation: cx-slide-up var(--cx-transition-base);
        }

        .toast--success {
          background: var(--cx-success-muted);
          border-left: 3px solid var(--cx-success);
        }

        .toast--warning {
          background: var(--cx-warning-muted);
          border-left: 3px solid var(--cx-warning);
        }

        .toast--error {
          background: var(--cx-error-muted);
          border-left: 3px solid var(--cx-error);
        }

        .toast-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .toast--success .toast-icon { color: var(--cx-success); }
        .toast--warning .toast-icon { color: var(--cx-warning); }
        .toast--error .toast-icon { color: var(--cx-error); }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-message {
          margin: 0;
          font-size: var(--cx-text-sm);
          font-weight: 500;
          color: var(--cx-text-primary);
        }

        .toast-details {
          margin: 8px 0 0 0;
          padding-left: 16px;
          font-size: var(--cx-text-xs);
          color: var(--cx-text-secondary);
          list-style-type: disc;
        }

        .toast-details li {
          margin-bottom: 2px;
        }

        .toast-close {
          flex-shrink: 0;
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--cx-text-muted);
          cursor: pointer;
          border-radius: var(--cx-radius-sm);
          transition: all var(--cx-transition-fast);
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--cx-text-primary);
        }

        /* Info Banner */
        .info-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          font-size: var(--cx-text-sm);
          color: var(--cx-text-tertiary);
        }

        .info-banner svg {
          flex-shrink: 0;
          color: var(--cx-text-muted);
        }

        /* Table Section */
        .table-section {
          padding: 0 24px;
        }

        /* Action Bar */
        .action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 24px;
        }

        .action-bar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-bar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .save-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          font-size: var(--cx-text-xs);
          color: var(--cx-accent);
          background: var(--cx-accent-subtle);
          border-radius: var(--cx-radius-md);
        }

        /* Pricing Section */
        .pricing-section {
          padding: 0 24px 16px;
        }

        /* Validation Section */
        .validation-section {
          padding: 0 24px 16px;
        }

        .validation-banner {
          padding: 12px 16px;
          background: var(--cx-error-muted);
          border-radius: var(--cx-radius-lg);
          border-left: 3px solid var(--cx-error);
        }

        .validation-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: var(--cx-text-sm);
          font-weight: 600;
          color: var(--cx-error);
        }

        .validation-list {
          margin: 0;
          padding-left: 24px;
          font-size: var(--cx-text-sm);
          color: var(--cx-text-secondary);
          list-style-type: disc;
        }

        .validation-list li {
          margin-bottom: 4px;
        }

        .validation-list li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
