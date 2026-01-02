'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  LignePrestationV3,
  ConfigurateurV3State,
  ModalCopieState,
  TypeFinition,
} from '@/lib/configurateur/types';
import {
  creerNouvelleLigne,
  creerLigneFinition,
  migrerLigneToV4,
  REGLES,
} from '@/lib/configurateur/constants';
import { getPanneauxDisponibles, type PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import {
  mettreAJourCalculsLigne,
  calculerTotaux,
} from '@/lib/configurateur/calculs';
import { validerConfigurateur, validerLigne } from '@/lib/configurateur/validation';
import { estimerTraitsScieAvecFormes, estimerPrixChants } from '@/lib/configurateur';
import { parseExcelAuto } from '@/lib/configurateur/import';
import type { ColonneDuplicable } from '@/components/configurateur/TableauPrestations';

// === TYPES ===

export interface ToastMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  details?: string[];
}

interface SavedData {
  referenceChantier: string;
  lignes: LignePrestationV3[];
  savedAt: string;
}

export interface DevisSubmitData {
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

export interface InitialData {
  referenceChantier: string;
  lignes: LignePrestationV3[];
}

interface TarifsDecoupeChants {
  decoupe: {
    metresLineaires: number;
    prixDecoupe: number;
  } | null;
  chants: {
    metresLineaires: number;
    prixPlacage: number;
    prixFourniture: number;
    prixTotalHT: number;
  } | null;
}

// === CONTEXT TYPE ===

interface ConfigurateurContextType {
  // State principal
  referenceChantier: string;
  setReferenceChantier: (ref: string) => void;
  lignes: LignePrestationV3[];
  setLignes: React.Dispatch<React.SetStateAction<LignePrestationV3[]>>;
  lastSaved: Date | null;
  isRestored: boolean;
  panneauGlobal: PanneauCatalogue | null;
  setPanneauGlobal: (panneau: PanneauCatalogue | null) => void;
  panneauMulticouche: PanneauMulticouche | null;
  setPanneauMulticouche: (panneau: PanneauMulticouche | null) => void;

  // Catalogue
  panneauxCatalogue: PanneauCatalogue[];
  panneauxLoading: boolean;

  // UI State
  modalCopie: ModalCopieState;
  setModalCopie: React.Dispatch<React.SetStateAction<ModalCopieState>>;
  isImporting: boolean;
  toast: ToastMessage | null;
  modalEtiquettes: boolean;
  setModalEtiquettes: (open: boolean) => void;
  highlightedColumn: ColonneDuplicable | null;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
  showOptimiseur: boolean;
  setShowOptimiseur: (show: boolean) => void;

  // Computed values
  totaux: ReturnType<typeof calculerTotaux>;
  tarifsDecoupeChants: TarifsDecoupeChants;
  state: ConfigurateurV3State;
  validation: ReturnType<typeof validerConfigurateur>;

  // Handlers lignes
  handleAjouterLigne: () => void;
  handleSupprimerLigne: (id: string) => void;
  handleUpdateLigne: (id: string, updates: Partial<LignePrestationV3>) => void;
  handleCopierLigne: (id: string) => void;
  handleConfirmerCopie: () => void;
  handleAnnulerCopie: () => void;

  // Handlers finition
  handleCreerLigneFinition: (lignePanneauId: string, typeFinition: TypeFinition) => void;
  handleSupprimerLigneFinition: (lignePanneauId: string) => void;

  // Handlers utilitaires
  showToast: (toast: ToastMessage) => void;
  handleApplyToColumn: (colonne: ColonneDuplicable, valeur: string | boolean | null) => void;
  handleClearSave: () => void;
  handleImportExcel: (file: File) => Promise<void>;
  handleAjouterAuPanier: () => void;

  // Config
  isClientMode: boolean;
  isEditing: boolean;
  onSubmit?: (data: DevisSubmitData) => void;
  onBack?: () => void;
}

// === CONTEXT ===

const ConfigurateurContext = createContext<ConfigurateurContextType | null>(null);

// === CONSTANTS ===

const STORAGE_KEY = 'configurateur-autosave';
const COLONNES_DUPLICABLES: ColonneDuplicable[] = ['percage'];

// === PROVIDER ===

interface ConfigurateurProviderProps {
  children: ReactNode;
  isClientMode?: boolean;
  onSubmit?: (data: DevisSubmitData) => void;
  onBack?: () => void;
  initialData?: InitialData;
  devisId?: string;
  isEditing?: boolean;
}

export function ConfigurateurProvider({
  children,
  isClientMode = false,
  onSubmit,
  onBack,
  initialData,
  isEditing = false,
}: ConfigurateurProviderProps) {
  // === STATE ===
  const [referenceChantier, setReferenceChantier] = useState('');
  const [lignes, setLignes] = useState<LignePrestationV3[]>([creerNouvelleLigne()]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const isInitialMount = useRef(true);

  const [panneauGlobal, setPanneauGlobal] = useState<PanneauCatalogue | null>(null);
  const [panneauMulticouche, setPanneauMulticouche] = useState<PanneauMulticouche | null>(null);
  const [modalCopie, setModalCopie] = useState<ModalCopieState>({
    open: false,
    ligneSource: null,
    nouvelleReference: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [modalEtiquettes, setModalEtiquettes] = useState(false);
  const [highlightedColumn, setHighlightedColumn] = useState<ColonneDuplicable | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showOptimiseur, setShowOptimiseur] = useState(false);
  const [panneauxCatalogue, setPanneauxCatalogue] = useState<PanneauCatalogue[]>([]);
  const [panneauxLoading, setPanneauxLoading] = useState(true);

  // === LOAD PANNEAUX CATALOGUE ===
  useEffect(() => {
    const loadPanneaux = async () => {
      try {
        setPanneauxLoading(true);
        const panneaux = await getPanneauxDisponibles();
        setPanneauxCatalogue(panneaux);
      } catch (error) {
        console.error('Erreur chargement panneaux:', error);
        setPanneauxCatalogue([]);
      } finally {
        setPanneauxLoading(false);
      }
    };
    loadPanneaux();
  }, []);

  // === COMPUTED VALUES ===
  const totaux = useMemo(() => calculerTotaux(lignes), [lignes]);

  const tarifsDecoupeChants = useMemo((): TarifsDecoupeChants => {
    const lignesPanneau = lignes.filter(l =>
      l.typeLigne === 'panneau' &&
      l.dimensions.longueur > 0 &&
      (l.dimensions.largeur > 0 || l.forme === 'circle') // Cercle n'a pas besoin de largeur
    );

    if (lignesPanneau.length === 0) {
      return { decoupe: null, chants: null };
    }

    // Construire les débits avec informations de forme
    const debits = lignesPanneau.map(l => {
      // Pour les rectangles, synchroniser chantsConfig avec l.chants
      const chantsConfig = (l.forme || 'rectangle') === 'rectangle'
        ? { type: 'rectangle' as const, edges: l.chants }
        : l.chantsConfig || { type: 'rectangle' as const, edges: l.chants };

      return {
        longueur: l.dimensions.longueur,
        largeur: l.dimensions.largeur,
        chants: l.chants,
        dimensions: l.dimensions,
        forme: l.forme,
        chantsConfig,
        dimensionsLShape: l.dimensionsLShape,
        formeCustom: l.formeCustom,
      };
    });

    const decoupe = estimerTraitsScieAvecFormes(debits);
    const chants = estimerPrixChants(debits, { prixMlChant: 0.80 });

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

  const validation = useMemo(() => validerConfigurateur(state), [state]);

  // === LOAD INITIAL DATA OR LOCALSTORAGE ===
  useEffect(() => {
    if (initialData) {
      console.log('[ConfigurateurContext] Chargement initialData:', initialData.lignes.length, 'lignes');
      setReferenceChantier(initialData.referenceChantier || '');
      // Migration + calculs pour les lignes existantes
      const lignesRestaurees = initialData.lignes.map(l => mettreAJourCalculsLigne(migrerLigneToV4(l)));
      setLignes(lignesRestaurees);
      setIsRestored(true);
      isInitialMount.current = false;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        if (data.lignes && Array.isArray(data.lignes) && data.lignes.length > 0) {
          setReferenceChantier(data.referenceChantier || '');
          // Migration + calculs pour les lignes sauvegardées
          const lignesRestaurees = data.lignes.map(l => mettreAJourCalculsLigne(migrerLigneToV4(l)));
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

  // === AUTO-SAVE ===
  useEffect(() => {
    if (isInitialMount.current) return;
    if (isEditing || initialData) return;

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
  }, [referenceChantier, lignes, isEditing, initialData]);

  // === TOAST HANDLER ===
  const showToast = useCallback((toastData: ToastMessage) => {
    setToast(toastData);
    setTimeout(() => setToast(null), 5000);
  }, []);

  // === HANDLERS LIGNES ===
  const handleClearSave = useCallback(() => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer votre configuration et recommencer à zéro ?')) {
      localStorage.removeItem(STORAGE_KEY);
      setReferenceChantier('');
      setLignes([creerNouvelleLigne()]);
      setLastSaved(null);
      setIsRestored(false);
    }
  }, []);

  const handleAjouterLigne = useCallback(() => {
    setLignes(prev => [...prev, creerNouvelleLigne()]);
  }, []);

  const handleSupprimerLigne = useCallback((id: string) => {
    setLignes(prev => {
      const filtered = prev.filter(l => l.id !== id);
      return filtered.length > 0 ? filtered : [creerNouvelleLigne()];
    });
  }, []);

  const handleUpdateLigne = useCallback((id: string, updates: Partial<LignePrestationV3>) => {
    setLignes(prev => prev.map(ligne => {
      if (ligne.id !== id) return ligne;
      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    }));

    const colonneModifiee = COLONNES_DUPLICABLES.find(col => {
      const key = col as keyof typeof updates;
      if (!(key in updates)) return false;
      const value = updates[key];
      if (typeof value === 'boolean') return value === true;
      return value !== null && value !== '';
    });

    if (colonneModifiee && lignes.length > 1) {
      setHighlightedColumn(colonneModifiee);
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

  // === HANDLERS FINITION ===
  const handleCreerLigneFinition = useCallback((lignePanneauId: string, typeFinition: TypeFinition) => {
    setLignes(prev => {
      const lignePanneau = prev.find(l => l.id === lignePanneauId);
      if (!lignePanneau) return prev;

      const updatedPanneau: LignePrestationV3 = {
        ...lignePanneau,
        avecFinition: true,
        typeFinition,
      };

      const ligneFinition = creerLigneFinition(updatedPanneau);
      const index = prev.findIndex(l => l.id === lignePanneauId);
      const newLignes = [...prev];
      newLignes[index] = updatedPanneau;
      newLignes.splice(index + 1, 0, mettreAJourCalculsLigne(ligneFinition));

      return newLignes;
    });
  }, []);

  const handleSupprimerLigneFinition = useCallback((lignePanneauId: string) => {
    setLignes(prev => {
      const filteredLignes = prev.filter(l => !(l.typeLigne === 'finition' && l.ligneParentId === lignePanneauId));
      return filteredLignes.map(l => {
        if (l.id === lignePanneauId) {
          return { ...l, avecFinition: false, typeFinition: null };
        }
        return l;
      });
    });
  }, []);

  // === HANDLER APPLY TO COLUMN ===
  const handleApplyToColumn = useCallback((colonne: ColonneDuplicable, valeur: string | boolean | null) => {
    setLignes(prev => prev.map(ligne => {
      if (ligne.typeLigne !== 'panneau') return ligne;

      const updates: Partial<LignePrestationV3> = {};
      switch (colonne) {
        case 'percage':
          updates.percage = valeur as boolean;
          break;
      }

      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    }));

    const nbLignesPanneau = lignes.filter(l => l.typeLigne === 'panneau').length;
    showToast({
      type: 'success',
      message: `Valeur appliquée à ${nbLignesPanneau} ligne${nbLignesPanneau > 1 ? 's' : ''}`,
    });

    setHighlightedColumn(null);
  }, [lignes, showToast]);

  // === HANDLER IMPORT EXCEL ===
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

      if (donnees.referenceChantier && !referenceChantier) {
        setReferenceChantier(donnees.referenceChantier);
      }

      const nouvellesLignes: LignePrestationV3[] = [];

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

      setLignes(prev => {
        const lignesExistantes = prev.filter(l =>
          l.reference.trim() !== '' ||
          l.materiau !== null ||
          l.finition !== null ||
          l.dimensions.longueur > 0 ||
          l.dimensions.largeur > 0
        );
        return [...lignesExistantes, ...nouvellesLignes];
      });

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

  // === HANDLER AJOUTER AU PANIER ===
  const handleAjouterAuPanier = useCallback(() => {
    if (!validation.isValid) {
      alert('Veuillez corriger les erreurs avant de continuer :\n\n' + validation.erreurs.join('\n'));
      return;
    }

    if (isClientMode || isEditing) {
      if (!isEditing && !referenceChantier.trim()) {
        alert('La référence chantier est obligatoire');
        return;
      }

      const lignesValides = lignes.filter(l => l.prixHT > 0);
      const surfaceTotale = lignesValides.reduce((acc, l) => acc + ((l.surfaceM2 || 0) * (l.nombreFaces || 1)), 0);

      const devisData: DevisSubmitData = {
        referenceChantier: referenceChantier.trim(),
        title: referenceChantier.trim(),
        description: 'Prestation de finition',
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
        proposedEndDate: null,
        proposedEndDateComment: null,
      };

      if (onSubmit) {
        onSubmit(devisData);
      }
      return;
    }

    alert('Fonctionnalité en cours de développement');
  }, [validation, referenceChantier, lignes, totaux, isClientMode, isEditing, onSubmit]);

  // === CONTEXT VALUE ===
  const contextValue: ConfigurateurContextType = useMemo(() => ({
    // State principal
    referenceChantier,
    setReferenceChantier,
    lignes,
    setLignes,
    lastSaved,
    isRestored,
    panneauGlobal,
    setPanneauGlobal,
    panneauMulticouche,
    setPanneauMulticouche,

    // Catalogue
    panneauxCatalogue,
    panneauxLoading,

    // UI State
    modalCopie,
    setModalCopie,
    isImporting,
    toast,
    modalEtiquettes,
    setModalEtiquettes,
    highlightedColumn,
    showWelcomeModal,
    setShowWelcomeModal,
    showOptimiseur,
    setShowOptimiseur,

    // Computed values
    totaux,
    tarifsDecoupeChants,
    state,
    validation,

    // Handlers lignes
    handleAjouterLigne,
    handleSupprimerLigne,
    handleUpdateLigne,
    handleCopierLigne,
    handleConfirmerCopie,
    handleAnnulerCopie,

    // Handlers finition
    handleCreerLigneFinition,
    handleSupprimerLigneFinition,

    // Handlers utilitaires
    showToast,
    handleApplyToColumn,
    handleClearSave,
    handleImportExcel,
    handleAjouterAuPanier,

    // Config
    isClientMode,
    isEditing,
    onSubmit,
    onBack,
  }), [
    referenceChantier,
    lignes,
    lastSaved,
    isRestored,
    panneauGlobal,
    panneauMulticouche,
    panneauxCatalogue,
    panneauxLoading,
    modalCopie,
    isImporting,
    toast,
    modalEtiquettes,
    highlightedColumn,
    showWelcomeModal,
    showOptimiseur,
    totaux,
    tarifsDecoupeChants,
    state,
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
    onSubmit,
    onBack,
  ]);

  return (
    <ConfigurateurContext.Provider value={contextValue}>
      {children}
    </ConfigurateurContext.Provider>
  );
}

// === HOOK ===

export function useConfigurateur() {
  const context = useContext(ConfigurateurContext);
  if (!context) {
    throw new Error('useConfigurateur must be used within a ConfigurateurProvider');
  }
  return context;
}

// === SELECTOR HOOKS (pour optimisation des re-renders) ===

export function useConfigurateurLignes() {
  const { lignes, setLignes, handleAjouterLigne, handleSupprimerLigne, handleUpdateLigne } = useConfigurateur();
  return { lignes, setLignes, handleAjouterLigne, handleSupprimerLigne, handleUpdateLigne };
}

export function useConfigurateurTotaux() {
  const { totaux, tarifsDecoupeChants, validation } = useConfigurateur();
  return { totaux, tarifsDecoupeChants, validation };
}

export function useConfigurateurUI() {
  const {
    toast,
    showToast,
    modalCopie,
    setModalCopie,
    modalEtiquettes,
    setModalEtiquettes,
    showWelcomeModal,
    setShowWelcomeModal,
    showOptimiseur,
    setShowOptimiseur,
    highlightedColumn,
  } = useConfigurateur();

  return {
    toast,
    showToast,
    modalCopie,
    setModalCopie,
    modalEtiquettes,
    setModalEtiquettes,
    showWelcomeModal,
    setShowWelcomeModal,
    showOptimiseur,
    setShowOptimiseur,
    highlightedColumn,
  };
}

export function useConfigurateurCatalogue() {
  const { panneauxCatalogue, panneauxLoading, panneauGlobal, setPanneauGlobal, panneauMulticouche, setPanneauMulticouche } = useConfigurateur();
  return { panneauxCatalogue, panneauxLoading, panneauGlobal, setPanneauGlobal, panneauMulticouche, setPanneauMulticouche };
}
