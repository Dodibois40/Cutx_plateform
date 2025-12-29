'use client';

// Import des styles CutX (variables CSS nécessaires pour le configurateur)
import '@/app/styles/cutx.css';

import { Plus, AlertTriangle, CheckCircle, XCircle, Tag, Lightbulb, Save, Trash2 } from 'lucide-react';
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

// Re-export types for external usage
export type { DevisSubmitData, InitialData };

// Props du composant
interface ConfigurateurV3Props {
  isClientMode?: boolean;
  onSubmit?: (data: DevisSubmitData) => void;
  onBack?: () => void;
  initialData?: InitialData;
  devisId?: string;
  isEditing?: boolean;
}

/**
 * Composant principal du Configurateur V3
 * Utilise le ConfigurateurProvider pour la gestion d'état
 */
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

/**
 * Contenu du configurateur - utilise le Context
 */
function ConfigurateurContent() {
  const {
    // State
    referenceChantier,
    setReferenceChantier,
    lignes,
    lastSaved,
    panneauGlobal,
    setPanneauGlobal,
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

    // Computed
    totaux,
    tarifsDecoupeChants,
    validation,

    // Handlers
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

    // Config
    isClientMode,
    isEditing,
    onBack,
  } = useConfigurateur();

  return (
    <div className="configurateur">
      {/* Header avec référence chantier + sélection panneau global */}
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
      />

      {/* Toast de notification */}
      {toast && (
        <div className="px-6 py-3">
          <div
            className="toast-notification"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              background: toast.type === 'success'
                ? 'var(--admin-status-success-bg)'
                : toast.type === 'warning'
                  ? 'var(--admin-status-warning-bg)'
                  : 'var(--admin-status-danger-bg)',
              border: `1px solid ${toast.type === 'success'
                ? 'var(--admin-status-success-border)'
                : toast.type === 'warning'
                  ? 'var(--admin-status-warning-border)'
                  : 'var(--admin-status-danger-border)'
                }`,
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={18} style={{ color: 'var(--admin-status-success)', flexShrink: 0 }} />
            ) : toast.type === 'warning' ? (
              <AlertTriangle size={18} style={{ color: 'var(--admin-status-warning)', flexShrink: 0 }} />
            ) : (
              <XCircle size={18} style={{ color: 'var(--admin-status-danger)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '0.875rem',
                color: toast.type === 'success'
                  ? 'var(--admin-status-success)'
                  : toast.type === 'warning'
                    ? 'var(--admin-status-warning)'
                    : 'var(--admin-status-danger)',
              }}>
                {toast.message}
              </p>
              {toast.details && toast.details.length > 0 && (
                <ul style={{
                  margin: '0.5rem 0 0 0',
                  paddingLeft: '1.25rem',
                  fontSize: '0.8125rem',
                  color: 'var(--admin-text-secondary)',
                }}>
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
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--admin-text-muted)',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Alerte minimums */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-sable)' }}>
          <AlertTriangle size={16} />
          <span>
            Minimum : {REGLES.SURFACE_MINIMUM} m² facturé par face OU {REGLES.MINIMUM_COMMANDE_HT}€ HT par commande
          </span>
        </div>
      </div>

      {/* Tableau des prestations */}
      <div className="px-6">
        <TableauPrestations
          lignes={lignes}
          panneauGlobal={panneauGlobal}
          onUpdateLigne={handleUpdateLigne}
          onSupprimerLigne={handleSupprimerLigne}
          onCopierLigne={handleCopierLigne}
          onCreerLigneFinition={handleCreerLigneFinition}
          onSupprimerLigneFinition={handleSupprimerLigneFinition}
          onApplyToColumn={handleApplyToColumn}
          highlightedColumn={highlightedColumn}
        />
      </div>

      {/* Boutons d'action */}
      <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleAjouterLigne}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'var(--admin-bg-hover)',
            color: 'var(--admin-olive)',
            border: '1px dashed var(--admin-olive-border)',
          }}
        >
          <Plus size={18} />
          <span>Ajouter une ligne</span>
        </button>

        <button
          onClick={() => setModalEtiquettes(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'var(--admin-bg-hover)',
            color: 'var(--admin-ardoise)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <Tag size={18} />
          <span>Imprimer étiquettes</span>
        </button>

        {/* Bouton pour relancer la modale de bienvenue */}
        <button
          onClick={() => setShowWelcomeModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all guide-btn"
          style={{
            background: 'var(--admin-bg-hover)',
            color: 'var(--admin-olive)',
            border: '1px solid var(--admin-olive-border)',
          }}
        >
          <Lightbulb size={18} />
          <span>Guide</span>
        </button>

        {/* Séparateur visuel + auto-save (uniquement en mode création) */}
        {!isEditing && (
          <>
            <div style={{ width: '1px', height: '24px', background: 'var(--admin-border-subtle)', margin: '0 0.5rem' }} />

            {/* Indicateur de sauvegarde automatique */}
            {lastSaved && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--admin-olive-bg)',
                  color: 'var(--admin-olive)',
                  fontSize: '0.8125rem',
                }}
              >
                <Save size={14} />
                <span>
                  Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Bouton pour effacer et recommencer */}
            <button
              onClick={handleClearSave}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                background: 'transparent',
                color: 'var(--admin-text-muted)',
                border: '1px solid var(--admin-border-subtle)',
              }}
              title="Effacer la configuration et recommencer à zéro"
            >
              <Trash2 size={16} />
              <span>Nouvelle config</span>
            </button>
          </>
        )}
      </div>

      {/* Récap Tarifs Découpe & Chants (V3) */}
      {(tarifsDecoupeChants.decoupe || tarifsDecoupeChants.chants) && (
        <div className="px-6 py-4">
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

      {/* Erreurs de validation */}
      {validation.erreurs.length > 0 && (
        <div className="px-6 py-3">
          <div
            className="p-4 rounded-lg"
            style={{
              background: 'var(--admin-status-danger-bg)',
              border: '1px solid var(--admin-status-danger-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--admin-status-danger)' }}>
              <AlertTriangle size={18} />
              <span className="font-semibold">Erreurs de validation</span>
            </div>
            <ul className="list-disc list-inside text-sm space-y-1" style={{ color: 'var(--admin-text-secondary)' }}>
              {validation.erreurs.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Récapitulatif sticky bottom */}
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

      {/* Modal de copie */}
      <ModalCopie
        open={modalCopie.open}
        ligneSource={modalCopie.ligneSource}
        nouvelleReference={modalCopie.nouvelleReference}
        onReferenceChange={(ref) => setModalCopie(prev => ({ ...prev, nouvelleReference: ref }))}
        onConfirmer={handleConfirmerCopie}
        onAnnuler={handleAnnulerCopie}
      />

      {/* Modal d'impression d'étiquettes */}
      <ModalEtiquettes
        open={modalEtiquettes}
        referenceChantier={referenceChantier}
        lignes={lignes}
        onClose={() => setModalEtiquettes(false)}
      />

      {/* Modale de bienvenue - s'affiche auto au premier chargement ou via bouton Guide */}
      <WelcomeModal
        forceOpen={showWelcomeModal}
        onForceOpenHandled={() => setShowWelcomeModal(false)}
      />

      {/* Popup optimiseur de débit */}
      <PopupOptimiseur
        open={showOptimiseur}
        onClose={() => setShowOptimiseur(false)}
        lignes={lignes}
        panneauxCatalogue={panneauxCatalogue}
        panneauGlobal={panneauGlobal}
      />

      <style jsx>{`
        .configurateur {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          min-height: 100vh;
          padding-bottom: 100px;
        }

        .guide-btn:hover {
          background: var(--admin-olive-bg) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 157, 81, 0.2);
        }
      `}</style>
    </div>
  );
}
