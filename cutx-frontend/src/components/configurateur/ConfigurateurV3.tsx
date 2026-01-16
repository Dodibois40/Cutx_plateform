'use client';

import '@/app/styles/cutx.css';
import './ConfigurateurV3.css';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useOptimizerBroadcast } from '@/lib/hooks/useOptimizerBroadcast';
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
import PopupSelectionChant from './PopupSelectionChant';
import { GroupesContainer } from './groupes';
import RecapitulatifTotal from './recap/RecapitulatifTotal';
import RecapTarifsDecoupe from './recap/RecapTarifsDecoupe';
import ModalEtiquettes from './dialogs/ModalEtiquettes';
import WelcomeModal from './WelcomeModal';
import { PopupOptimiseur } from './optimiseur';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { ProduitCatalogue } from '@/lib/catalogues';
import type { ChantGroupe } from '@/lib/configurateur/groupes/types';
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
      <GroupesProvider
        initialLignes={props.initialData?.lignes}
        initialGroupe={props.initialData?.initialGroupe}
        initialGroupes={props.initialData?.initialGroupes}
      >
        <ConfigurateurContent />
      </GroupesProvider>
    </ConfigurateurProvider>
  );
}

function ConfigurateurContent() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  // Hook pour ouvrir l'optimiseur dans une nouvelle fenêtre
  const { openOptimizerWindow, broadcastData } = useOptimizerBroadcast();

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
    modalEtiquettes,
    setModalEtiquettes,
    highlightedColumn,
    showWelcomeModal,
    setShowWelcomeModal,
    showOptimiseur,
    setShowOptimiseur,
    groupeToOptimize,
    setGroupeToOptimize,
    totaux,
    tarifsDecoupeChants,
    validation,
    handleAjouterLigne,
    handleSupprimerLigne,
    handleUpdateLigne,
    handleCopierLigne,
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
    lignesFinition,
    totauxGlobaux,
    hasLignesNonAssignees,
    ajouterLigneNonAssignee,
    ajouterLigneGroupe,
    supprimerLigne: supprimerLigneGroupe,
    updateLigne: updateLigneGroupe,
    importerLignes,
    creerGroupe,
    updatePanneauGroupe,
    dupliquerLigneFinitionGroupe,
  } = useGroupes();

  // State pour le sélecteur de panneau (mode groupes)
  const [selecteurPanneauOpen, setSelecteurPanneauOpen] = useState(false);
  const [selecteurPanneauCallback, setSelecteurPanneauCallback] = useState<((p: PanneauCatalogue) => void) | null>(null);

  // State pour le sélecteur de chant (mode groupes)
  const [selecteurChantOpen, setSelecteurChantOpen] = useState(false);
  // Utiliser un ref pour le callback afin d'éviter les problèmes de closure
  const selecteurChantCallbackRef = useRef<((c: ChantGroupe) => void) | null>(null);
  const [selecteurChantSuggestedDecor, setSelecteurChantSuggestedDecor] = useState<string | null>(null);

  // State pour le popup multicouche (mode groupes)
  const [multicoucheGroupesOpen, setMulticoucheGroupesOpen] = useState(false);
  const [editingMulticoucheGroupeId, setEditingMulticoucheGroupeId] = useState<string | null>(null);

  // Handler pour ouvrir le sélecteur de panneau (mode groupes)
  const handleSelectPanneauGroupes = useCallback((callback: (panneau: PanneauCatalogue) => void) => {
    setSelecteurPanneauCallback(() => callback);
    setSelecteurPanneauOpen(true);
  }, []);

  // Diffuser les changements de données aux fenêtres optimiseur ouvertes
  useEffect(() => {
    // Rassembler toutes les lignes (groupes + non assignées)
    // En mode groupes, on doit associer chaque ligne au panneau de son groupe
    const toutesLesLignes = modeGroupes
      ? [
          ...groupes.flatMap(g => {
            // Récupérer le panneau du groupe (catalogue uniquement)
            const panneauGroupe = g.panneau?.type === 'catalogue' ? g.panneau.panneau : null;
            // Associer chaque ligne au panneau du groupe
            return g.lignes.map(l => ({
              ...l,
              panneauId: panneauGroupe?.id ?? l.panneauId ?? null,
              panneauNom: panneauGroupe?.nom ?? l.panneauNom ?? null,
            }));
          }),
          ...lignesNonAssignees
        ]
      : lignes;

    // En mode groupes, inclure les panneaux des groupes dans le catalogue
    // pour que l'optimiseur puisse les trouver
    let catalogueADiffuser = panneauxCatalogue;
    if (modeGroupes) {
      const panneauxGroupes = groupes
        .map(g => g.panneau?.type === 'catalogue' ? g.panneau.panneau : null)
        .filter((p): p is PanneauCatalogue => p !== null);
      // Fusionner sans doublons (par ID)
      const idsExistants = new Set(panneauxCatalogue.map(p => p.id));
      const panneauxAAjouter = panneauxGroupes.filter(p => !idsExistants.has(p.id));
      catalogueADiffuser = [...panneauxCatalogue, ...panneauxAAjouter];
    }

    broadcastData({
      lignes: toutesLesLignes,
      panneauxCatalogue: catalogueADiffuser,
      panneauGlobal,
      timestamp: Date.now(),
    });
  }, [lignes, groupes, lignesNonAssignees, modeGroupes, panneauxCatalogue, panneauGlobal, broadcastData]);

  // Handler pour la sélection d'un panneau (mode groupes)
  const handlePanneauSelected = useCallback((panneau: PanneauCatalogue) => {
    if (selecteurPanneauCallback) {
      selecteurPanneauCallback(panneau);
    }
    setSelecteurPanneauOpen(false);
    setSelecteurPanneauCallback(null);
  }, [selecteurPanneauCallback]);

  // Handler pour ouvrir le sélecteur de chant (mode groupes)
  const handleSelectChantGroupes = useCallback((callback: (chant: ChantGroupe) => void, suggestedDecor?: string | null) => {
    console.log('[ConfigV3] handleSelectChantGroupes called, suggestedDecor:', suggestedDecor);
    // Stocker le callback dans le ref (évite les problèmes de closure)
    selecteurChantCallbackRef.current = callback;
    setSelecteurChantSuggestedDecor(suggestedDecor ?? null);
    setSelecteurChantOpen(true);
  }, []);

  // Handler pour la sélection d'un chant (mode groupes)
  const handleChantSelected = useCallback((chant: ChantGroupe) => {
    console.log('[ConfigV3] handleChantSelected called, chant:', chant);
    const callback = selecteurChantCallbackRef.current;
    console.log('[ConfigV3] selecteurChantCallbackRef.current is:', callback ? 'defined' : 'null/undefined');
    if (callback) {
      console.log('[ConfigV3] Calling callback...');
      callback(chant);
      console.log('[ConfigV3] Callback called successfully');
    } else {
      console.warn('[ConfigV3] selecteurChantCallbackRef.current is null/undefined!');
    }
    setSelecteurChantOpen(false);
    selecteurChantCallbackRef.current = null;
    setSelecteurChantSuggestedDecor(null);
  }, []);

  // Handler pour ouvrir le popup multicouche en mode édition (pour un groupe existant)
  const handleEditMulticoucheGroupe = useCallback((groupeId: string) => {
    setEditingMulticoucheGroupeId(groupeId);
    setMulticoucheGroupesOpen(true);
  }, []);

  // Handler pour optimiser un groupe spécifique
  const handleOptimiserGroupe = useCallback((groupeId: string) => {
    // Trouver le groupe
    const groupe = groupes.find(g => g.id === groupeId);
    if (!groupe || !groupe.panneau) {
      showToast({
        type: 'warning',
        message: 'Sélectionnez un panneau pour ce groupe avant d\'optimiser',
      });
      return;
    }

    // Vérifier qu'il y a des lignes
    const lignesPanneau = groupe.lignes.filter(l =>
      l.typeLigne === 'panneau' &&
      l.dimensions.longueur > 0 &&
      l.dimensions.largeur > 0
    );

    if (lignesPanneau.length === 0) {
      showToast({
        type: 'warning',
        message: 'Aucune ligne avec dimensions valides à optimiser',
      });
      return;
    }

    // Ouvrir l'optimiseur dans une nouvelle fenêtre
    openOptimizerWindow(
      groupe.lignes,
      panneauxCatalogue,
      groupe.panneau?.type === 'catalogue' ? groupe.panneau.panneau : null,
      locale
    );
  }, [groupes, showToast, panneauxCatalogue, openOptimizerWindow, locale]);

  // Helper: génère la prochaine référence pour une duplication
  const genererProchaineReference = useCallback((referenceBase: string, toutesLesReferences: string[]): string => {
    const match = referenceBase.match(/^(.+?)\s+(\d+)$/);
    const base = match ? match[1] : referenceBase;
    const regex = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+(\\d+))?$`);
    const numerosExistants: number[] = [1];
    for (const ref of toutesLesReferences) {
      const refMatch = ref.match(regex);
      if (refMatch) {
        numerosExistants.push(refMatch[1] ? parseInt(refMatch[1], 10) : 1);
      }
    }
    return `${base} ${Math.max(...numerosExistants) + 1}`;
  }, []);

  // Handler pour copier une ligne (mode groupes) - duplication directe sans popup
  const handleCopierLigneGroupes = useCallback((ligneId: string) => {
    // Trouver la ligne source et son groupe d'origine
    let ligneSource: LignePrestationV3 | undefined;
    let groupeSourceId: string | null = null;

    // Chercher dans les groupes
    for (const groupe of groupes) {
      const found = groupe.lignes.find(l => l.id === ligneId);
      if (found) {
        ligneSource = found;
        groupeSourceId = groupe.id;
        break;
      }
    }

    // Si pas trouvé dans les groupes, chercher dans non assignées
    if (!ligneSource) {
      ligneSource = lignesNonAssignees.find(l => l.id === ligneId);
      groupeSourceId = null;
    }

    if (!ligneSource) return;

    // Ne pas dupliquer si pas de référence (l'animation est gérée par LignePanneau)
    if (!ligneSource.reference?.trim()) return;

    // Générer la nouvelle référence automatiquement
    const allLignes = [...groupes.flatMap(g => g.lignes), ...lignesNonAssignees];
    const toutesLesReferences = allLignes.map(l => l.reference).filter(Boolean) as string[];
    const nouvelleReference = genererProchaineReference(ligneSource.reference, toutesLesReferences);

    const nouvelId = crypto.randomUUID();
    const nouvelleLigne: LignePrestationV3 = {
      ...mettreAJourCalculsLigne({
        ...ligneSource,
        reference: nouvelleReference,
      }),
      id: nouvelId,
    };

    // Ajouter au même groupe ou à non assigné
    if (groupeSourceId) {
      ajouterLigneGroupe(groupeSourceId, nouvelleLigne);
    } else {
      ajouterLigneNonAssignee(nouvelleLigne);
    }

    // Dupliquer la finition si la ligne source en a une
    if (ligneSource.avecFinition && ligneSource.typeFinition && lignesFinition.has(ligneId)) {
      dupliquerLigneFinitionGroupe(ligneId, nouvelId, nouvelleLigne);
    }
  }, [groupes, lignesNonAssignees, lignesFinition, genererProchaineReference, ajouterLigneNonAssignee, ajouterLigneGroupe, dupliquerLigneFinitionGroupe]);

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
            onSelectChant={handleSelectChantGroupes}
            onOpenMulticouche={() => {
              setEditingMulticoucheGroupeId(null); // Création d'un nouveau groupe
              setMulticoucheGroupesOpen(true);
            }}
            onEditMulticouche={handleEditMulticoucheGroupe}
            onCopierLigne={handleCopierLigneGroupes}
            onOptimiserGroupe={handleOptimiserGroupe}
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
        onOpenOptimiseur={() => {
          const toutesLesLignes = modeGroupes
            ? [...groupes.flatMap(g => g.lignes), ...lignesNonAssignees]
            : lignes;
          openOptimizerWindow(toutesLesLignes, panneauxCatalogue, panneauGlobal, locale);
        }}
        panneauGlobal={panneauGlobal}
      />

      {/* Modals */}
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
        onClose={() => {
          setShowOptimiseur(false);
          setGroupeToOptimize(null); // Reset groupe data on close
        }}
        lignes={modeGroupes ? [...groupes.flatMap(g => g.lignes), ...lignesNonAssignees] : lignes}
        panneauxCatalogue={panneauxCatalogue}
        panneauGlobal={panneauGlobal}
        groupeData={groupeToOptimize}
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
          // Note: Le produit vient de CatalogueProduit (API) qui a refFabricant
          const produitAvecId = produit as ProduitCatalogue & { id: string; refFabricant?: string };
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
            refFabricant: produitAvecId.refFabricant ?? null,
          };
          handlePanneauSelected(panneau);
        }}
        onClose={() => setSelecteurPanneauOpen(false)}
      />

      {/* Popup sélecteur de chant (mode groupes) */}
      <PopupSelectionChant
        isOpen={selecteurChantOpen}
        onClose={() => {
          setSelecteurChantOpen(false);
          setSelecteurChantSuggestedDecor(null);
        }}
        onSelect={handleChantSelected}
        suggestedDecor={selecteurChantSuggestedDecor}
      />

      {/* Popup Multicouche (mode groupes) */}
      <PopupMulticouche
        open={multicoucheGroupesOpen}
        panneauxCatalogue={panneauxCatalogue}
        panneauMulticouche={(() => {
          // Si on édite un groupe existant, passer son panneau multicouche
          if (!editingMulticoucheGroupeId) return null;
          const groupe = groupes.find(g => g.id === editingMulticoucheGroupeId);
          if (!groupe?.panneau || groupe.panneau.type !== 'multicouche') return null;
          return groupe.panneau.panneau;
        })()}
        onSave={(panneau) => {
          if (editingMulticoucheGroupeId) {
            // Mettre à jour le groupe existant
            updatePanneauGroupe(editingMulticoucheGroupeId, { type: 'multicouche', panneau });
          } else {
            // Créer un nouveau groupe
            creerGroupe({ panneau: { type: 'multicouche', panneau } });
          }
          setMulticoucheGroupesOpen(false);
          setEditingMulticoucheGroupeId(null);
        }}
        onClose={() => {
          setMulticoucheGroupesOpen(false);
          setEditingMulticoucheGroupeId(null);
        }}
      />

    </div>
  );
}
