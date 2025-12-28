'use client';

// Import des styles CutX (variables CSS nécessaires pour le configurateur)
import '@/app/styles/cutx.css';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Plus, AlertTriangle, ShoppingCart, CheckCircle, XCircle, Tag, Lightbulb, Save, Trash2 } from 'lucide-react';
import type { LignePrestationV3, ConfigurateurV3State, ModalCopieState, TypeFinition } from '@/lib/configurateur/types';
import {
  creerNouvelleLigne,
  creerLigneFinition,
  PLACEHOLDERS,
  REGLES,
} from '@/lib/configurateur/constants';
import { getPanneauxDisponibles, type PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import {
  mettreAJourCalculsLigne,
  calculerTotaux,
  formaterPrix,
} from '@/lib/configurateur/calculs';
import { validerConfigurateur, validerLigne } from '@/lib/configurateur/validation';
import { estimerTraitsScie, estimerPrixChants } from '@/lib/configurateur';
import { parseExcelAuto } from '@/lib/configurateur/import';
import type { DonneesImportees } from '@/lib/configurateur/import';
import ConfigurateurHeader from './ConfigurateurHeader';
import TableauPrestations from './TableauPrestations';
import RecapitulatifTotal from './recap/RecapitulatifTotal';
import RecapTarifsDecoupe from './recap/RecapTarifsDecoupe';
import ModalCopie from './dialogs/ModalCopie';
import ModalEtiquettes from './dialogs/ModalEtiquettes';
import WelcomeModal from './WelcomeModal';
import { PopupOptimiseur } from './optimiseur';
import type { ColonneDuplicable } from './TableauPrestations';

// Type pour les toasts de notification
interface ToastMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  details?: string[];
}

// Clé localStorage pour la sauvegarde automatique
const STORAGE_KEY = 'configurateur-autosave';

// Interface pour les données sauvegardées
interface SavedData {
  referenceChantier: string;
  lignes: LignePrestationV3[];
  savedAt: string;
}

// Interface pour les données envoyées à l'API
interface DevisSubmitData {
  referenceChantier: string;
  title: string;
  description: string;
  surface: number;
  quantity: number;
  estimatedPrice: number;
  devisData: string;
  devisResult: string;
  proposedEndDate: string | null;
  proposedEndDateComment: string | null;
}

// Interface pour les données initiales (mode édition)
interface InitialData {
  referenceChantier: string;
  lignes: LignePrestationV3[];
}

// Props du composant
interface ConfigurateurV3Props {
  isClientMode?: boolean;
  onSubmit?: (data: DevisSubmitData) => void;
  onBack?: () => void;
  // Props pour le mode édition
  initialData?: InitialData;
  devisId?: string;
  isEditing?: boolean;
}

export default function ConfigurateurV3({
  isClientMode = false,
  onSubmit,
  onBack,
  initialData,
  devisId,
  isEditing = false,
}: ConfigurateurV3Props) {
  // === STATE ===
  const [referenceChantier, setReferenceChantier] = useState('');
  const [lignes, setLignes] = useState<LignePrestationV3[]>([creerNouvelleLigne()]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const isInitialMount = useRef(true);
  // V3: Panneau global sélectionné (UN seul panneau par configuration)
  const [panneauGlobal, setPanneauGlobal] = useState<PanneauCatalogue | null>(null);

  const [modalCopie, setModalCopie] = useState<ModalCopieState>({
    open: false,
    ligneSource: null,
    nouvelleReference: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [modalEtiquettes, setModalEtiquettes] = useState(false);
  // Track la dernière colonne modifiée pour afficher le tooltip
  const [highlightedColumn, setHighlightedColumn] = useState<ColonneDuplicable | null>(null);
  // Contrôle du modal de bienvenue (Guide button)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  // Popup optimiseur de débit
  const [showOptimiseur, setShowOptimiseur] = useState(false);

  // === PANNEAUX CATALOGUE (V3 - chargé depuis API) ===
  const [panneauxCatalogue, setPanneauxCatalogue] = useState<PanneauCatalogue[]>([]);
  const [panneauxLoading, setPanneauxLoading] = useState(true);

  // Charger les panneaux depuis l'API au montage
  useEffect(() => {
    const loadPanneaux = async () => {
      try {
        setPanneauxLoading(true);
        const panneaux = await getPanneauxDisponibles();
        setPanneauxCatalogue(panneaux);
      } catch (error) {
        console.error('Erreur chargement panneaux:', error);
        // En cas d'erreur API, laisser le catalogue vide
        setPanneauxCatalogue([]);
      } finally {
        setPanneauxLoading(false);
      }
    };
    loadPanneaux();
  }, []);

  // === CALCULS ===
  const totaux = useMemo(() => {
    return calculerTotaux(lignes);
  }, [lignes]);

  // === CALCUL TARIFS DÉCOUPE & CHANTS (V3) ===
  const tarifsDecoupeChants = useMemo(() => {
    // Filtrer les lignes panneau avec dimensions valides
    const lignesPanneau = lignes.filter(l =>
      l.typeLigne === 'panneau' &&
      l.dimensions.longueur > 0 &&
      l.dimensions.largeur > 0
    );

    if (lignesPanneau.length === 0) {
      return { decoupe: null, chants: null };
    }

    // Préparer les données pour l'estimation
    const debits = lignesPanneau.map(l => ({
      longueur: l.dimensions.longueur,
      largeur: l.dimensions.largeur,
      chants: l.chants,
      dimensions: l.dimensions,
    }));

    // Estimation des traits de scie
    const decoupe = estimerTraitsScie(debits);

    // Estimation du placage de chants
    // TODO: Ajouter le prix du chant depuis le catalogue quand disponible
    const chants = estimerPrixChants(debits, { prixMlChant: 0.80 }); // 0.80€/ml chant ABS estimation

    return { decoupe, chants };
  }, [lignes]);

  const state: ConfigurateurV3State = useMemo(() => ({
    referenceChantier,
    lignes,
    totalFournitureHT: totaux.totalFournitureHT,
    totalPrestationHT: totaux.totalPrestationHT,
    totalHT: totaux.totalHT,
    totalTVA: totaux.totalTVA,
    totalTTC: totaux.totalTTC,
    isValid: false,
    erreurs: [],
  }), [referenceChantier, lignes, totaux]);

  const validation = useMemo(() => {
    return validerConfigurateur(state);
  }, [state]);

  // === CHARGEMENT: initialData (mode édition ou import CutX) OU localStorage (nouveau devis) ===
  useEffect(() => {
    // Mode édition OU import CutX : utiliser initialData
    if (initialData) {
      console.log('[ConfigurateurV3] Chargement initialData:', initialData.lignes.length, 'lignes');
      setReferenceChantier(initialData.referenceChantier || '');
      // Recalculer les prix pour chaque ligne (au cas où les tarifs ont changé)
      const lignesRestaurees = initialData.lignes.map(l => mettreAJourCalculsLigne(l));
      setLignes(lignesRestaurees);
      setIsRestored(true);
      isInitialMount.current = false;
      return;
    }

    // Mode création : charger depuis localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        // Vérifier que les données sont valides
        if (data.lignes && Array.isArray(data.lignes) && data.lignes.length > 0) {
          setReferenceChantier(data.referenceChantier || '');
          // Recalculer les prix pour chaque ligne (au cas où les tarifs ont changé)
          const lignesRestaurees = data.lignes.map(l => mettreAJourCalculsLigne(l));
          setLignes(lignesRestaurees);
          setLastSaved(new Date(data.savedAt));
          setIsRestored(true);
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la restauration de la sauvegarde:', error);
    }
    isInitialMount.current = false;
  }, [isEditing, initialData]);

  // === AUTO-SAVE: Sauvegarder à chaque modification (uniquement en mode création sans import) ===
  useEffect(() => {
    // Ne pas sauvegarder au premier rendu (avant la restauration)
    if (isInitialMount.current) return;

    // Ne pas sauvegarder en mode édition ou avec import CutX (on ne veut pas écraser le localStorage)
    if (isEditing || initialData) return;

    // Debounce: attendre 500ms après la dernière modification
    const timeoutId = setTimeout(() => {
      try {
        const dataToSave: SavedData = {
          referenceChantier,
          lignes,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [referenceChantier, lignes, isEditing]);

  // === HANDLER: Effacer la sauvegarde et recommencer ===
  const handleClearSave = useCallback(() => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer votre configuration et recommencer à zéro ?')) {
      localStorage.removeItem(STORAGE_KEY);
      setReferenceChantier('');
      setLignes([creerNouvelleLigne()]);
      setLastSaved(null);
      setIsRestored(false);
    }
  }, []);

  // === HANDLERS ===
  const handleAjouterLigne = useCallback(() => {
    setLignes(prev => [...prev, creerNouvelleLigne()]);
  }, []);

  const handleSupprimerLigne = useCallback((id: string) => {
    setLignes(prev => {
      const filtered = prev.filter(l => l.id !== id);
      // Toujours garder au moins une ligne
      return filtered.length > 0 ? filtered : [creerNouvelleLigne()];
    });
  }, []);

  // Colonnes qui peuvent être dupliquées (V3 : seulement percage sur lignes panneau)
  const COLONNES_DUPLICABLES: ColonneDuplicable[] = ['percage'];

  const handleUpdateLigne = useCallback((id: string, updates: Partial<LignePrestationV3>) => {
    setLignes(prev => prev.map(ligne => {
      if (ligne.id !== id) return ligne;
      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    }));

    // Détecter si une colonne duplicable a été modifiée avec une valeur non vide
    const colonneModifiee = COLONNES_DUPLICABLES.find(col => {
      const key = col as keyof typeof updates;
      if (!(key in updates)) return false;
      const value = updates[key];
      // Pour les booléens (poncage), on considère true comme une valeur valide
      if (typeof value === 'boolean') return value === true;
      // Pour les strings, on vérifie que ce n'est pas null/vide
      return value !== null && value !== '';
    });

    if (colonneModifiee && lignes.length > 1) {
      setHighlightedColumn(colonneModifiee);
      // Auto-clear après 4 secondes
      setTimeout(() => setHighlightedColumn(null), 4000);
    }
  }, [lignes.length]);

  const handleCopierLigne = useCallback((id: string) => {
    const ligneSource = lignes.find(l => l.id === id);
    if (!ligneSource) return;

    setModalCopie({
      open: true,
      ligneSource,
      nouvelleReference: '',
    });
  }, [lignes]);

  const handleConfirmerCopie = useCallback(() => {
    if (!modalCopie.ligneSource) return;
    if (!modalCopie.nouvelleReference.trim()) {
      alert('La référence est obligatoire');
      return;
    }

    const nouvelleLigne: LignePrestationV3 = {
      ...modalCopie.ligneSource,
      id: crypto.randomUUID(),
      reference: modalCopie.nouvelleReference.trim(),
    };

    setLignes(prev => [...prev, mettreAJourCalculsLigne(nouvelleLigne)]);
    setModalCopie({ open: false, ligneSource: null, nouvelleReference: '' });
  }, [modalCopie]);

  const handleAnnulerCopie = useCallback(() => {
    setModalCopie({ open: false, ligneSource: null, nouvelleReference: '' });
  }, []);

  // === HANDLERS FINITION (V3) ===
  const handleCreerLigneFinition = useCallback((lignePanneauId: string, typeFinition: TypeFinition) => {
    setLignes(prev => {
      // Trouver la ligne panneau
      const lignePanneau = prev.find(l => l.id === lignePanneauId);
      if (!lignePanneau) return prev;

      // Mettre à jour la ligne panneau avec avecFinition et typeFinition
      const updatedPanneau: LignePrestationV3 = {
        ...lignePanneau,
        avecFinition: true,
        typeFinition,
      };

      // Créer la ligne finition
      const ligneFinition = creerLigneFinition(updatedPanneau);

      // Insérer la ligne finition juste après le panneau
      const index = prev.findIndex(l => l.id === lignePanneauId);
      const newLignes = [...prev];
      newLignes[index] = updatedPanneau;
      newLignes.splice(index + 1, 0, mettreAJourCalculsLigne(ligneFinition));

      return newLignes;
    });
  }, []);

  const handleSupprimerLigneFinition = useCallback((lignePanneauId: string) => {
    setLignes(prev => {
      // Supprimer la ligne finition liée au panneau
      const filteredLignes = prev.filter(l => !(l.typeLigne === 'finition' && l.ligneParentId === lignePanneauId));

      // Mettre à jour la ligne panneau pour désactiver la finition
      return filteredLignes.map(l => {
        if (l.id === lignePanneauId) {
          return {
            ...l,
            avecFinition: false,
            typeFinition: null,
          };
        }
        return l;
      });
    });
  }, []);

  // === TOAST ===
  const showToast = useCallback((toastData: ToastMessage) => {
    setToast(toastData);
    // Auto-hide après 5 secondes
    setTimeout(() => setToast(null), 5000);
  }, []);

  // === DUPLICATION DE VALEUR SUR COLONNE (V3: seulement lignes panneau) ===
  const handleApplyToColumn = useCallback((colonne: ColonneDuplicable, valeur: string | boolean | null) => {
    setLignes(prev => prev.map(ligne => {
      // Ne modifier que les lignes panneau
      if (ligne.typeLigne !== 'panneau') return ligne;

      // Créer les updates selon la colonne
      const updates: Partial<LignePrestationV3> = {};

      switch (colonne) {
        case 'percage':
          updates.percage = valeur as boolean;
          break;
      }

      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    }));

    // Afficher un toast de confirmation
    const nbLignesPanneau = lignes.filter(l => l.typeLigne === 'panneau').length;
    showToast({
      type: 'success',
      message: `Valeur appliquée à ${nbLignesPanneau} ligne${nbLignesPanneau > 1 ? 's' : ''}`,
    });

    // Masquer le tooltip
    setHighlightedColumn(null);
  }, [lignes, showToast]);

  const handleAjouterAuPanier = useCallback(() => {
    if (!validation.isValid) {
      alert('Veuillez corriger les erreurs avant de continuer :\n\n' + validation.erreurs.join('\n'));
      return;
    }

    // Mode client OU mode édition : envoi via callback
    if (isClientMode || isEditing) {
      // Vérifier les champs obligatoires (sauf en mode édition où ils existent déjà)
      if (!isEditing && !referenceChantier.trim()) {
        alert('La référence chantier est obligatoire');
        return;
      }

      // Préparer les données pour l'API
      const lignesValides = lignes.filter(l => l.prixHT > 0);
      const surfaceTotale = lignesValides.reduce((acc, l) => acc + ((l.surfaceM2 || 0) * (l.nombreFaces || 1)), 0);

      const devisData: DevisSubmitData = {
        referenceChantier: referenceChantier.trim(),
        title: referenceChantier.trim(),
        description: 'Prestation de finition', // Description par défaut
        surface: surfaceTotale,
        quantity: lignesValides.length,
        estimatedPrice: totaux.totalHT,
        devisData: JSON.stringify({
          referenceChantier,
          lignes: lignesValides,
          sousTotal: totaux.totalHT,
          totalHT: totaux.totalHT,
          tva: totaux.totalTVA,
          totalTTC: totaux.totalTTC,
        }),
        devisResult: JSON.stringify({
          totalHT: totaux.totalHT,
          tva: totaux.totalTVA,
          totalTTC: totaux.totalTTC,
        }),
        // Note: dates gérées par ModalCommande dans la page parent (mode création)
        // En mode édition, on ne change pas les dates
        proposedEndDate: null,
        proposedEndDateComment: null,
      };

      // Appeler le callback parent
      if (onSubmit) {
        onSubmit(devisData);
      }
      return;
    }

    // Mode admin (non-édition) : fonctionnalité en attente
    alert('Fonctionnalité en cours de développement');
  }, [validation, referenceChantier, lignes, totaux, isClientMode, isEditing, onSubmit]);

  // === IMPORT EXCEL ===
  const handleImportExcel = useCallback(async (file: File) => {
    setIsImporting(true);
    setToast(null);

    try {
      const result = await parseExcelAuto(file);

      if (!result.success || !result.donnees) {
        showToast({
          type: 'error',
          message: result.erreur || 'Erreur lors de l\'import',
          details: result.avertissements,
        });
        setIsImporting(false);
        return;
      }

      const { donnees } = result;

      // Mettre à jour la référence chantier si présente et si vide
      if (donnees.referenceChantier && !referenceChantier) {
        setReferenceChantier(donnees.referenceChantier);
      }

      // Créer les nouvelles lignes
      const nouvellesLignes: LignePrestationV3[] = [];

      for (const ligneImport of donnees.lignes) {
        // Créer N lignes selon la quantité
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

          // Appliquer le matériau de la ligne si détecté
          if (ligneImport.materiau) {
            nouvelleLigne.materiau = ligneImport.materiau;
          } else if (donnees.materiau) {
            // Fallback sur le matériau global si pas de matériau par ligne
            nouvelleLigne.materiau = donnees.materiau;
          }

          // Recalculer les prix
          nouvellesLignes.push(mettreAJourCalculsLigne(nouvelleLigne));
        }
      }

      // Ajouter les lignes (garder les existantes si elles ont du contenu)
      setLignes(prev => {
        // Filtrer les lignes vides existantes
        const lignesExistantes = prev.filter(l =>
          l.reference.trim() !== '' ||
          l.materiau !== null ||
          l.finition !== null ||
          l.dimensions.longueur > 0 ||
          l.dimensions.largeur > 0
        );

        return [...lignesExistantes, ...nouvellesLignes];
      });

      // Afficher le toast de succès
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
    } finally {
      setIsImporting(false);
    }
  }, [referenceChantier, showToast]);

  // === RENDER ===
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
              onClick={() => setToast(null)}
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
              nombrePanneaux: 1, // Estimation
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
