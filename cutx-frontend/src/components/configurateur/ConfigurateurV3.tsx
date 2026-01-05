'use client';

import '@/app/styles/cutx.css';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, AlertTriangle, CheckCircle, XCircle, Tag, Lightbulb, Save, RotateCcw } from 'lucide-react';
import { validerLigne } from '@/lib/configurateur/validation';
import { parseExcelAuto, parseDxfFile } from '@/lib/configurateur/import';
import { creerNouvelleLigne, migrerLigneToV4 } from '@/lib/configurateur/constants';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';
import {
  ConfigurateurProvider,
  useConfigurateur,
  type DevisSubmitData,
  type InitialData,
} from '@/contexts/ConfigurateurContext';
import { GroupesProvider, useGroupes } from '@/contexts/GroupesContext';
import ConfigurateurHeader from './ConfigurateurHeader';
import TableauPrestations from './TableauPrestations';
import PopupMulticouche from './PopupMulticouche';
import PopupSelectionPanneau from './PopupSelectionPanneau';
import { GroupesContainer } from './groupes';
import RecapitulatifTotal from './recap/RecapitulatifTotal';
import RecapTarifsDecoupe from './recap/RecapTarifsDecoupe';
import ModalCopie from './dialogs/ModalCopie';
import ModalEtiquettes from './dialogs/ModalEtiquettes';
import WelcomeModal from './WelcomeModal';
import { PopupOptimiseur } from './optimiseur';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { ProduitCatalogue } from '@/lib/catalogues';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
      <GroupesProvider>
        <ConfigurateurContent />
      </GroupesProvider>
    </ConfigurateurProvider>
  );
}

function ConfigurateurContent() {
  const t = useTranslations();

  // Context configurateur classique
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
    handleImportDxf,
    handleAjouterAuPanier,
    isClientMode,
    isEditing,
    onBack,
  } = useConfigurateur();

  // Context groupes
  const {
    modeGroupes,
    setModeGroupes,
    groupes,
    lignesNonAssignees,
    totauxGlobaux,
    hasLignesNonAssignees,
    ajouterLigneNonAssignee,
    supprimerLigne: supprimerLigneGroupe,
    updateLigne: updateLigneGroupe,
    importerLignes,
    creerGroupe,
  } = useGroupes();

  // State pour le sélecteur de panneau (mode groupes)
  const [selecteurPanneauOpen, setSelecteurPanneauOpen] = useState(false);
  const [selecteurPanneauCallback, setSelecteurPanneauCallback] = useState<((p: PanneauCatalogue) => void) | null>(null);

  // State pour le popup multicouche (mode groupes)
  const [multicoucheGroupesOpen, setMulticoucheGroupesOpen] = useState(false);

  // Handler pour ouvrir le sélecteur de panneau (mode groupes)
  const handleSelectPanneauGroupes = useCallback((callback: (panneau: PanneauCatalogue) => void) => {
    setSelecteurPanneauCallback(() => callback);
    setSelecteurPanneauOpen(true);
  }, []);

  // Handler pour la sélection d'un panneau (mode groupes)
  const handlePanneauSelected = useCallback((panneau: PanneauCatalogue) => {
    if (selecteurPanneauCallback) {
      selecteurPanneauCallback(panneau);
    }
    setSelecteurPanneauOpen(false);
    setSelecteurPanneauCallback(null);
  }, [selecteurPanneauCallback]);

  // Handler pour copier une ligne (mode groupes) - utilise le même modal
  const handleCopierLigneGroupes = useCallback((ligneId: string) => {
    // Trouver la ligne dans les groupes ou non assignées
    const allLignes = [...groupes.flatMap(g => g.lignes), ...lignesNonAssignees];
    const ligne = allLignes.find(l => l.id === ligneId);
    if (ligne) {
      setModalCopie({
        open: true,
        ligneSource: ligne,
        nouvelleReference: '',
      });
    }
  }, [groupes, lignesNonAssignees, setModalCopie]);

  // Handler mode-aware pour confirmer la copie
  const handleConfirmerCopieWrapper = useCallback(() => {
    if (!modalCopie.ligneSource) return;
    if (!modalCopie.nouvelleReference.trim()) {
      alert('La référence est obligatoire');
      return;
    }

    if (modeGroupes) {
      // Mode groupes: ajouter aux lignes non assignées
      const nouvelleLigne: LignePrestationV3 = {
        ...modalCopie.ligneSource,
        id: crypto.randomUUID(),
        reference: modalCopie.nouvelleReference.trim(),
      };
      ajouterLigneNonAssignee(mettreAJourCalculsLigne(nouvelleLigne));
      setModalCopie({ open: false, ligneSource: null, nouvelleReference: '' });
    } else {
      // Mode classique: utiliser le handler du contexte
      handleConfirmerCopie();
    }
  }, [modeGroupes, modalCopie, ajouterLigneNonAssignee, setModalCopie, handleConfirmerCopie]);

  // === WRAPPERS IMPORT (mode-aware) ===

  // Handler import Excel qui redirige vers le bon contexte
  const handleImportExcelWrapper = useCallback(async (file: File) => {
    if (!modeGroupes) {
      // Mode ancien: utiliser le handler du ConfigurateurContext
      return handleImportExcel(file);
    }

    // Mode groupes: parser et importer dans lignesNonAssignees
    try {
      const result = await parseExcelAuto(file);

      if (!result.success || !result.donnees) {
        showToast({
          type: 'error',
          message: result.erreur || 'Erreur lors de l\'import',
          details: result.avertissements,
        });
        return;
      }

      const { donnees } = result;

      if (donnees.referenceChantier && !referenceChantier) {
        setReferenceChantier(donnees.referenceChantier);
      }

      const nouvellesLignes = [];

      for (const ligneImport of donnees.lignes) {
        for (let i = 1; i <= ligneImport.quantite; i++) {
          const suffixe = ligneImport.quantite > 1 ? ` (${i}/${ligneImport.quantite})` : '';
          const nouvelleLigne = creerNouvelleLigne();

          nouvelleLigne.reference = `${ligneImport.reference}${suffixe}`;
          nouvelleLigne.dimensions = {
            longueur: ligneImport.longueur,
            largeur: ligneImport.largeur,
            epaisseur: donnees.epaisseur,
          };
          nouvelleLigne.chants = { ...ligneImport.chants };

          if (ligneImport.materiau) {
            nouvelleLigne.materiau = ligneImport.materiau;
          } else if (donnees.materiau) {
            nouvelleLigne.materiau = donnees.materiau;
          }

          nouvellesLignes.push(mettreAJourCalculsLigne(nouvelleLigne));
        }
      }

      // Importer dans le contexte groupes (lignesNonAssignees)
      importerLignes(nouvellesLignes);

      const nbLignesCrees = nouvellesLignes.length;
      showToast({
        type: result.avertissements.length > 0 ? 'warning' : 'success',
        message: `${nbLignesCrees} ligne${nbLignesCrees > 1 ? 's' : ''} importée${nbLignesCrees > 1 ? 's' : ''} depuis "${file.name}"`,
        details: result.avertissements.length > 0 ? result.avertissements : undefined,
      });

    } catch (error) {
      showToast({
        type: 'error',
        message: 'Erreur inattendue lors de l\'import',
        details: [error instanceof Error ? error.message : 'Erreur inconnue'],
      });
    }
  }, [modeGroupes, handleImportExcel, referenceChantier, setReferenceChantier, importerLignes, showToast]);

  // Handler import DXF qui redirige vers le bon contexte
  const handleImportDxfWrapper = useCallback(async (file: File) => {
    if (!modeGroupes) {
      // Mode ancien: utiliser le handler du ConfigurateurContext
      return handleImportDxf(file);
    }

    // Mode groupes: parser et importer dans lignesNonAssignees
    try {
      const result = await parseDxfFile(file);

      if (!result.success || !result.donnees) {
        showToast({
          type: 'error',
          message: result.erreur || 'Erreur lors de l\'import DXF',
          details: result.avertissements,
        });
        return;
      }

      const { donnees } = result;

      // Mettre à jour la référence chantier si vide
      if (donnees.projet && !referenceChantier) {
        setReferenceChantier(donnees.projet);
      }

      const nouvellesLignes = [];

      for (const panel of donnees.panels) {
        // Créer une ligne par quantité
        for (let i = 1; i <= panel.quantite; i++) {
          const suffixe = panel.quantite > 1 ? ` (${i}/${panel.quantite})` : '';
          const nouvelleLigne = creerNouvelleLigne();

          nouvelleLigne.reference = `${panel.reference}${suffixe}`;
          nouvelleLigne.dimensions = {
            longueur: panel.dimensions.longueur,
            largeur: panel.dimensions.largeur,
            epaisseur: panel.dimensions.epaisseur,
          };

          // Les panneaux DXF de Blum DYNAPLAN sont rectangulaires
          nouvelleLigne.forme = 'rectangle';

          // Configuration des chants rectangulaires (A, B, C, D)
          nouvelleLigne.chantsConfig = {
            type: 'rectangle',
            edges: { A: false, B: false, C: false, D: false },
          };

          // Stocker les données DXF comme métadonnées
          nouvelleLigne.formeCustom = {
            dxfData: panel.dxfData,
            surfaceM2: panel.surfaceM2,
            perimetreM: panel.perimetreM,
            boundingBox: {
              width: panel.boundingBox.width,
              height: panel.boundingBox.height,
            },
          };

          // Si des perçages sont détectés, activer l'option
          if (panel.geometry.circles.length > 0) {
            nouvelleLigne.percage = true;
          }

          nouvellesLignes.push(mettreAJourCalculsLigne(nouvelleLigne));
        }
      }

      // Importer dans le contexte groupes (lignesNonAssignees)
      importerLignes(nouvellesLignes);

      const nbLignesCrees = nouvellesLignes.length;
      showToast({
        type: result.avertissements.length > 0 ? 'warning' : 'success',
        message: `${nbLignesCrees} ligne${nbLignesCrees > 1 ? 's' : ''} importée${nbLignesCrees > 1 ? 's' : ''} depuis "${file.name}"`,
        details: result.avertissements.length > 0 ? result.avertissements : undefined,
      });

    } catch (error) {
      showToast({
        type: 'error',
        message: 'Erreur inattendue lors de l\'import DXF',
        details: [error instanceof Error ? error.message : 'Erreur inconnue'],
      });
    }
  }, [modeGroupes, handleImportDxf, referenceChantier, setReferenceChantier, importerLignes, showToast]);

  return (
    <div className="configurateur">
      {/* Header */}
      <ConfigurateurHeader
        referenceChantier={referenceChantier}
        onReferenceChange={setReferenceChantier}
        onImportExcel={handleImportExcelWrapper}
        onImportDxf={handleImportDxfWrapper}
        isImporting={isImporting}
        isClientMode={isClientMode}
        onBack={onBack}
        panneauGlobal={panneauGlobal}
        panneauxCatalogue={panneauxCatalogue}
        onSelectPanneau={setPanneauGlobal}
        panneauMulticouche={panneauMulticouche}
        onSelectMulticouche={setPanneauMulticouche}
        // Props pour le toggle mode
        modeGroupes={modeGroupes}
        onToggleMode={() => setModeGroupes(!modeGroupes)}
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
                    <li>{t('common.misc.andMore', { count: toast.details.length - 5 })}</li>
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

      {/* Warning si lignes non assignées (mode groupes) */}
      {modeGroupes && hasLignesNonAssignees && (
        <div className="warning-banner">
          <AlertTriangle size={14} />
          <span>
            Certaines lignes ne sont pas assignées à un panneau. Glissez-les vers un groupe.
          </span>
        </div>
      )}

      {/* Data Table ou Groupes selon le mode */}
      <div className="table-section">
        {modeGroupes ? (
          <GroupesContainer
            panneauxCatalogue={panneauxCatalogue}
            onSelectPanneau={handleSelectPanneauGroupes}
            onOpenMulticouche={() => setMulticoucheGroupesOpen(true)}
            onCopierLigne={handleCopierLigneGroupes}
          />
        ) : (
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
        )}
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="action-bar-left">
          {!modeGroupes && (
            <button onClick={handleAjouterLigne} className="cx-btn cx-btn--accent-ghost">
              <Plus size={16} />
              <span>{t('configurateur.lines.addLine')}</span>
            </button>
          )}

          <button
            onClick={() => setModalEtiquettes(true)}
            className="cx-btn cx-btn--ghost"
          >
            <Tag size={15} />
            <span>{t('configurateur.lines.labels')}</span>
          </button>

          <button
            onClick={() => setShowWelcomeModal(true)}
            className="cx-btn cx-btn--ghost"
          >
            <Lightbulb size={15} />
            <span>{t('configurateur.lines.guide')}</span>
          </button>
        </div>

        {!isEditing && (
          <div className="action-bar-right">
            {lastSaved && (
              <div className="save-indicator">
                <Save size={12} />
                <span>
                  {t('common.time.savedAt', { time: lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })}
                </span>
              </div>
            )}

            <button
              onClick={handleClearSave}
              className="cx-btn cx-btn--ghost cx-btn--sm"
              title={t('configurateur.tooltips.clearAndRestart')}
            >
              <RotateCcw size={14} />
              <span>{t('configurateur.lines.reset')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Pricing Summary */}
      {!modeGroupes && (tarifsDecoupeChants.decoupe || tarifsDecoupeChants.chants) && (
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
      {!modeGroupes && validation.erreurs.length > 0 && (
        <div className="validation-section">
          <div className="validation-banner">
            <div className="validation-header">
              <AlertTriangle size={14} />
              <span>{t('common.validation.validationRequired')}</span>
            </div>
            <ul className="validation-list">
              {validation.erreurs.map((err, i) => (
                <li key={i}>{err.startsWith('configurateur.') ? t(err) : err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sticky Footer - Total */}
      <RecapitulatifTotal
        totalHT={modeGroupes ? totauxGlobaux.prixTotalHT : totaux.totalHT}
        totalTVA={modeGroupes ? totauxGlobaux.prixTotalHT * 0.2 : totaux.totalTVA}
        totalTTC={modeGroupes ? totauxGlobaux.prixTotalTTC : totaux.totalTTC}
        totalFournitureHT={modeGroupes ? 0 : totaux.totalFournitureHT}
        totalPrestationHT={modeGroupes ? totauxGlobaux.prixTotalHT : totaux.totalPrestationHT}
        isValid={modeGroupes ? true : validation.isValid}
        onAjouterAuPanier={handleAjouterAuPanier}
        nombrePieces={modeGroupes ? totauxGlobaux.nbLignesTotal : lignes.filter(l => l.typeLigne === 'panneau').length}
        surfaceTotale={modeGroupes ? totauxGlobaux.surfaceTotaleM2 : lignes.reduce((acc, l) => acc + ((l.surfaceM2 || 0) * (l.nombreFaces || 1)), 0)}
        metresLineairesChants={modeGroupes ? 0 : lignes.reduce((acc, l) => acc + (l.metresLineairesChants || 0), 0)}
        lignesCompletes={modeGroupes ? totauxGlobaux.nbLignesTotal : lignes.filter(l => validerLigne(l).isValid).length}
        totalLignes={modeGroupes ? totauxGlobaux.nbLignesTotal : lignes.filter(l => l.typeLigne === 'panneau').length}
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
        onConfirmer={handleConfirmerCopieWrapper}
        onAnnuler={handleAnnulerCopie}
      />

      <ModalEtiquettes
        open={modalEtiquettes}
        referenceChantier={referenceChantier}
        lignes={modeGroupes ? [...groupes.flatMap(g => g.lignes), ...lignesNonAssignees] : lignes}
        onClose={() => setModalEtiquettes(false)}
      />

      <WelcomeModal
        forceOpen={showWelcomeModal}
        onForceOpenHandled={() => setShowWelcomeModal(false)}
      />

      <PopupOptimiseur
        open={showOptimiseur}
        onClose={() => setShowOptimiseur(false)}
        lignes={modeGroupes ? [...groupes.flatMap(g => g.lignes), ...lignesNonAssignees] : lignes}
        panneauxCatalogue={panneauxCatalogue}
        panneauGlobal={panneauGlobal}
      />

      {/* Popup sélecteur de panneau (mode groupes) - Utilise le vrai catalogue */}
      <PopupSelectionPanneau
        open={selecteurPanneauOpen}
        panneauxCatalogue={panneauxCatalogue}
        selectedPanneauId={null}
        epaisseurActuelle={19}
        onSelect={(panneau) => {
          handlePanneauSelected(panneau);
        }}
        onSelectCatalogue={(produit: ProduitCatalogue) => {
          // Conversion ProduitCatalogue -> PanneauCatalogue
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
            longueur: produit.longueur,
            largeur: produit.largeur,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            imageUrl: produit.imageUrl,
          };
          handlePanneauSelected(panneau);
        }}
        onClose={() => setSelecteurPanneauOpen(false)}
      />

      {/* Popup Multicouche (mode groupes) */}
      <PopupMulticouche
        open={multicoucheGroupesOpen}
        panneauxCatalogue={panneauxCatalogue}
        panneauMulticouche={null}
        onSave={(panneau) => {
          // Créer un groupe avec le panneau multicouche
          creerGroupe({ panneau: { type: 'multicouche', panneau } });
          setMulticoucheGroupesOpen(false);
        }}
        onClose={() => setMulticoucheGroupesOpen(false)}
      />

      <style jsx>{`
        .configurateur {
          min-height: 100vh;
          padding-bottom: 100px;
          background: var(--cx-surface-0);
        }

        /* Warning Banner */
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          font-size: var(--cx-text-sm);
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          border-bottom: 1px solid rgba(245, 158, 11, 0.2);
        }

        .warning-banner svg {
          flex-shrink: 0;
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
