'use client';

// contexts/GroupesContext.tsx
// Contexte pour la gestion des groupes de panneaux

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { LignePrestationV3, TypeFinition } from '@/lib/configurateur/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type {
  GroupePanneau,
  GroupesState,
  TotauxGroupe,
  TotauxGlobaux,
  CreateGroupeOptions,
  DragEndResult,
  GroupeWarning,
} from '@/lib/configurateur/groupes/types';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';
import { creerNouvelleLigne, creerLigneFinition } from '@/lib/configurateur/constants';

// === CONSTANTS ===

const STORAGE_KEY_GROUPES = 'configurateur-groupes-autosave';
const TVA_RATE = 0.20;

// === TYPES ===

interface GroupesContextType {
  // State
  groupes: GroupePanneau[];
  lignesNonAssignees: LignePrestationV3[];
  lignesFinition: Map<string, LignePrestationV3>; // Map lignePanneauId -> ligneFinition
  state: GroupesState;

  // Mode (ancien = lignes plates, nouveau = groupes)
  modeGroupes: boolean;
  setModeGroupes: (mode: boolean) => void;

  // Actions groupes
  creerGroupe: (options?: CreateGroupeOptions) => GroupePanneau;
  supprimerGroupe: (groupeId: string) => void;
  updatePanneauGroupe: (groupeId: string, panneau: PanneauCatalogue | null) => void;
  toggleExpandGroupe: (groupeId: string) => void;

  // Actions lignes
  ajouterLigneNonAssignee: (ligne?: LignePrestationV3) => void;
  ajouterLigneGroupe: (groupeId: string, ligne?: LignePrestationV3) => void;
  supprimerLigne: (ligneId: string) => void;
  updateLigne: (ligneId: string, updates: Partial<LignePrestationV3>) => void;
  deplacerLigne: (result: DragEndResult) => GroupeWarning | null;
  adapterEpaisseurLigne: (ligneId: string, nouvelleEpaisseur: number) => void;

  // Actions finition
  creerLigneFinitionGroupe: (lignePanneauId: string, typeFinition: TypeFinition) => void;
  supprimerLigneFinitionGroupe: (lignePanneauId: string) => void;
  updateLigneFinition: (lignePanneauId: string, updates: Partial<LignePrestationV3>) => void;

  // Import
  importerLignes: (lignes: LignePrestationV3[]) => void;

  // Calculs
  totauxParGroupe: TotauxGroupe[];
  totauxGlobaux: TotauxGlobaux;

  // Validation
  hasLignesNonAssignees: boolean;
  canOptimize: boolean;

  // Utils
  reset: () => void;
  getAllLignes: () => LignePrestationV3[];
  trouverLigne: (ligneId: string) => { ligne: LignePrestationV3; groupeId: string | null } | null;
}

// === CONTEXT ===

const GroupesContext = createContext<GroupesContextType | null>(null);

// === HELPERS ===

function generateGroupeId(): string {
  return `groupe-${crypto.randomUUID()}`;
}

// === PROVIDER ===

interface GroupesProviderProps {
  children: ReactNode;
  initialLignes?: LignePrestationV3[];
}

export function GroupesProvider({ children, initialLignes = [] }: GroupesProviderProps) {
  // Mode: false = ancien mode (lignes plates), true = nouveau mode (groupes)
  const [modeGroupes, setModeGroupes] = useState(true);

  // State principal
  const [groupes, setGroupes] = useState<GroupePanneau[]>([]);
  const [lignesNonAssignees, setLignesNonAssignees] = useState<LignePrestationV3[]>(
    initialLignes.length > 0 ? initialLignes : [creerNouvelleLigne()]
  );
  const [lignesFinition, setLignesFinition] = useState<Map<string, LignePrestationV3>>(new Map());

  // === RESTAURATION LOCALSTORAGE ===
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROUPES);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.groupes && Array.isArray(data.groupes)) {
          setGroupes(data.groupes.map((g: GroupePanneau) => ({
            ...g,
            createdAt: new Date(g.createdAt),
          })));
        }
        if (data.lignesNonAssignees && Array.isArray(data.lignesNonAssignees)) {
          setLignesNonAssignees(data.lignesNonAssignees);
        }
        if (data.lignesFinition && typeof data.lignesFinition === 'object') {
          setLignesFinition(new Map(Object.entries(data.lignesFinition)));
        }
        if (typeof data.modeGroupes === 'boolean') {
          setModeGroupes(data.modeGroupes);
        }
      }
    } catch (error) {
      console.warn('Erreur restauration groupes:', error);
    }
  }, []);

  // === AUTO-SAVE ===
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const dataToSave = {
          groupes,
          lignesNonAssignees,
          lignesFinition: Object.fromEntries(lignesFinition),
          modeGroupes,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY_GROUPES, JSON.stringify(dataToSave));
      } catch (error) {
        console.warn('Erreur sauvegarde groupes:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [groupes, lignesNonAssignees, lignesFinition, modeGroupes]);

  // === ACTIONS GROUPES ===

  const creerGroupe = useCallback((options: CreateGroupeOptions = {}): GroupePanneau => {
    const nouveauGroupe: GroupePanneau = {
      id: generateGroupeId(),
      panneau: options.panneau ?? null,
      lignes: options.lignes ?? [],
      isExpanded: options.isExpanded ?? true,
      createdAt: new Date(),
    };

    setGroupes(prev => [...prev, nouveauGroupe]);
    return nouveauGroupe;
  }, []);

  const supprimerGroupe = useCallback((groupeId: string) => {
    setGroupes(prev => {
      const groupe = prev.find(g => g.id === groupeId);
      if (groupe && groupe.lignes.length > 0) {
        setLignesNonAssignees(prevLignes => [...prevLignes, ...groupe.lignes]);
      }
      return prev.filter(g => g.id !== groupeId);
    });
  }, []);

  const updatePanneauGroupe = useCallback((groupeId: string, panneau: PanneauCatalogue | null) => {
    setGroupes(prev => prev.map(g => {
      if (g.id !== groupeId) return g;
      return { ...g, panneau };
    }));
  }, []);

  const toggleExpandGroupe = useCallback((groupeId: string) => {
    setGroupes(prev => prev.map(g => {
      if (g.id !== groupeId) return g;
      return { ...g, isExpanded: !g.isExpanded };
    }));
  }, []);

  // === ACTIONS LIGNES ===

  const ajouterLigneNonAssignee = useCallback((ligne?: LignePrestationV3) => {
    const nouvelleLigne = ligne ?? creerNouvelleLigne();
    setLignesNonAssignees(prev => [...prev, nouvelleLigne]);
  }, []);

  const ajouterLigneGroupe = useCallback((groupeId: string, ligne?: LignePrestationV3) => {
    const nouvelleLigne = ligne ?? creerNouvelleLigne();
    setGroupes(prev => prev.map(g => {
      if (g.id !== groupeId) return g;
      return { ...g, lignes: [...g.lignes, nouvelleLigne] };
    }));
  }, []);

  const supprimerLigne = useCallback((ligneId: string) => {
    setGroupes(prev => prev.map(g => ({
      ...g,
      lignes: g.lignes.filter(l => l.id !== ligneId),
    })));
    setLignesNonAssignees(prev => {
      const filtered = prev.filter(l => l.id !== ligneId);
      // Garder au moins une ligne vide dans non assigné
      return filtered.length > 0 ? filtered : [creerNouvelleLigne()];
    });
  }, []);

  const updateLigne = useCallback((ligneId: string, updates: Partial<LignePrestationV3>) => {
    const updateFn = (ligne: LignePrestationV3) => {
      if (ligne.id !== ligneId) return ligne;
      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    };

    setGroupes(prev => prev.map(g => ({
      ...g,
      lignes: g.lignes.map(updateFn),
    })));
    setLignesNonAssignees(prev => prev.map(updateFn));
  }, []);

  const deplacerLigne = useCallback((result: DragEndResult): GroupeWarning | null => {
    const { ligneId, sourceGroupeId, destinationGroupeId, destinationIndex } = result;

    // Trouver la ligne
    let ligne: LignePrestationV3 | undefined;

    if (sourceGroupeId === null) {
      ligne = lignesNonAssignees.find(l => l.id === ligneId);
    } else {
      const sourceGroupe = groupes.find(g => g.id === sourceGroupeId);
      ligne = sourceGroupe?.lignes.find(l => l.id === ligneId);
    }

    if (!ligne) return null;

    // Vérifier compatibilité épaisseur
    let warning: GroupeWarning | null = null;
    if (destinationGroupeId !== null) {
      const destGroupe = groupes.find(g => g.id === destinationGroupeId);
      if (destGroupe?.panneau) {
        const panneauEpaisseurs = destGroupe.panneau.epaisseurs;
        const ligneEpaisseur = ligne.dimensions.epaisseur;
        if (ligneEpaisseur > 0 && panneauEpaisseurs.length > 0 && !panneauEpaisseurs.includes(ligneEpaisseur)) {
          warning = {
            type: 'epaisseur_mismatch',
            message: `Attention : épaisseur ligne (${ligneEpaisseur}mm) non disponible pour ce panneau (${panneauEpaisseurs.join(', ')}mm). Adapter ?`,
            details: { ligneEpaisseur, panneauEpaisseur: panneauEpaisseurs[0] },
          };
        }
      }
    }

    // Retirer de la source
    if (sourceGroupeId === null) {
      setLignesNonAssignees(prev => prev.filter(l => l.id !== ligneId));
    } else {
      setGroupes(prev => prev.map(g => {
        if (g.id !== sourceGroupeId) return g;
        return { ...g, lignes: g.lignes.filter(l => l.id !== ligneId) };
      }));
    }

    // Ajouter à la destination
    const ligneCopy = { ...ligne };
    if (destinationGroupeId === null) {
      setLignesNonAssignees(prev => {
        const newLignes = [...prev];
        newLignes.splice(destinationIndex, 0, ligneCopy);
        return newLignes;
      });
    } else {
      setGroupes(prev => prev.map(g => {
        if (g.id !== destinationGroupeId) return g;
        const newLignes = [...g.lignes];
        newLignes.splice(destinationIndex, 0, ligneCopy);
        return { ...g, lignes: newLignes };
      }));
    }

    return warning;
  }, [groupes, lignesNonAssignees]);

  const adapterEpaisseurLigne = useCallback((ligneId: string, nouvelleEpaisseur: number) => {
    updateLigne(ligneId, {
      dimensions: {
        longueur: 0,
        largeur: 0,
        epaisseur: nouvelleEpaisseur,
      },
    });
  }, [updateLigne]);

  // === ACTIONS FINITION ===

  // Trouver une ligne panneau par son ID (dans groupes ou non assignées)
  const trouverLignePanneau = useCallback((lignePanneauId: string): LignePrestationV3 | null => {
    // Chercher dans les groupes
    for (const groupe of groupes) {
      const ligne = groupe.lignes.find(l => l.id === lignePanneauId);
      if (ligne) return ligne;
    }
    // Chercher dans non assignées
    return lignesNonAssignees.find(l => l.id === lignePanneauId) || null;
  }, [groupes, lignesNonAssignees]);

  const creerLigneFinitionGroupe = useCallback((lignePanneauId: string, typeFinition: TypeFinition) => {
    const lignePanneau = trouverLignePanneau(lignePanneauId);
    if (!lignePanneau) return;

    // Mettre à jour la ligne panneau avec avecFinition et typeFinition
    const updatedPanneau: LignePrestationV3 = {
      ...lignePanneau,
      avecFinition: true,
      typeFinition,
    };

    // Mettre à jour la ligne panneau dans groupes ou non assignées
    updateLigne(lignePanneauId, { avecFinition: true, typeFinition });

    // Créer la ligne de finition
    const nouvelleFinition = mettreAJourCalculsLigne(creerLigneFinition(updatedPanneau));

    // Ajouter à la Map des finitions
    setLignesFinition(prev => new Map(prev).set(lignePanneauId, nouvelleFinition));
  }, [trouverLignePanneau, updateLigne]);

  const supprimerLigneFinitionGroupe = useCallback((lignePanneauId: string) => {
    // Mettre à jour la ligne panneau
    updateLigne(lignePanneauId, { avecFinition: false, typeFinition: null });

    // Supprimer la finition de la Map
    setLignesFinition(prev => {
      const newMap = new Map(prev);
      newMap.delete(lignePanneauId);
      return newMap;
    });
  }, [updateLigne]);

  const updateLigneFinition = useCallback((lignePanneauId: string, updates: Partial<LignePrestationV3>) => {
    setLignesFinition(prev => {
      const finition = prev.get(lignePanneauId);
      if (!finition) return prev;

      const updated = mettreAJourCalculsLigne({ ...finition, ...updates });
      return new Map(prev).set(lignePanneauId, updated);
    });
  }, []);

  // === IMPORT ===

  const importerLignes = useCallback((lignes: LignePrestationV3[]) => {
    setLignesNonAssignees(prev => {
      // Filtrer les lignes vides existantes
      const lignesExistantes = prev.filter(l =>
        l.reference.trim() !== '' ||
        l.dimensions.longueur > 0 ||
        l.dimensions.largeur > 0
      );
      return [...lignesExistantes, ...lignes];
    });
  }, []);

  // === CALCULS ===

  const totauxParGroupe = useMemo((): TotauxGroupe[] => {
    return groupes.map(groupe => {
      const lignesPanneau = groupe.lignes.filter(l => l.typeLigne === 'panneau');
      const surfaceTotaleM2 = lignesPanneau.reduce((acc, l) => acc + (l.surfaceM2 || 0), 0);
      const prixLignesHT = groupe.lignes.reduce((acc, l) => acc + (l.prixHT || 0), 0);
      const prixChantsHT = lignesPanneau.reduce((acc, l) => acc + (l.prixChants || 0), 0);

      return {
        groupeId: groupe.id,
        nbLignes: groupe.lignes.length,
        surfaceTotaleM2,
        prixLignesHT,
        prixChantsHT,
        prixTotalHT: prixLignesHT,
      };
    });
  }, [groupes]);

  const totauxGlobaux = useMemo((): TotauxGlobaux => {
    const nbLignesTotal = groupes.reduce((acc, g) => acc + g.lignes.length, 0) + lignesNonAssignees.length;
    const surfaceTotaleM2 = totauxParGroupe.reduce((acc, t) => acc + t.surfaceTotaleM2, 0);
    const prixTotalHT = totauxParGroupe.reduce((acc, t) => acc + t.prixTotalHT, 0);
    const prixTotalTTC = prixTotalHT * (1 + TVA_RATE);

    return {
      totauxParGroupe,
      nbGroupes: groupes.length,
      nbLignesTotal,
      nbLignesNonAssignees: lignesNonAssignees.length,
      surfaceTotaleM2,
      prixTotalHT,
      prixTotalTTC,
    };
  }, [groupes, lignesNonAssignees, totauxParGroupe]);

  // === VALIDATION ===

  const hasLignesNonAssignees = useMemo(() => {
    // Ignorer les lignes vides
    return lignesNonAssignees.some(l =>
      l.reference.trim() !== '' ||
      l.dimensions.longueur > 0 ||
      l.dimensions.largeur > 0
    );
  }, [lignesNonAssignees]);

  const canOptimize = useMemo(() => {
    return groupes.length > 0 && groupes.some(g => g.lignes.length > 0 && g.panneau !== null);
  }, [groupes]);

  // === UTILS ===

  const reset = useCallback(() => {
    setGroupes([]);
    setLignesNonAssignees([creerNouvelleLigne()]);
    setLignesFinition(new Map());
    localStorage.removeItem(STORAGE_KEY_GROUPES);
  }, []);

  const getAllLignes = useCallback((): LignePrestationV3[] => {
    const lignesGroupes = groupes.flatMap(g => g.lignes);
    return [...lignesGroupes, ...lignesNonAssignees];
  }, [groupes, lignesNonAssignees]);

  const trouverLigne = useCallback((ligneId: string): { ligne: LignePrestationV3; groupeId: string | null } | null => {
    // Chercher dans les groupes
    for (const groupe of groupes) {
      const ligne = groupe.lignes.find(l => l.id === ligneId);
      if (ligne) return { ligne, groupeId: groupe.id };
    }
    // Chercher dans non assignées
    const ligne = lignesNonAssignees.find(l => l.id === ligneId);
    if (ligne) return { ligne, groupeId: null };
    return null;
  }, [groupes, lignesNonAssignees]);

  // === STATE COMPLET ===

  const state: GroupesState = useMemo(() => ({
    groupes,
    lignesNonAssignees,
  }), [groupes, lignesNonAssignees]);

  // === CONTEXT VALUE ===

  const contextValue: GroupesContextType = useMemo(() => ({
    // State
    groupes,
    lignesNonAssignees,
    lignesFinition,
    state,

    // Mode
    modeGroupes,
    setModeGroupes,

    // Actions groupes
    creerGroupe,
    supprimerGroupe,
    updatePanneauGroupe,
    toggleExpandGroupe,

    // Actions lignes
    ajouterLigneNonAssignee,
    ajouterLigneGroupe,
    supprimerLigne,
    updateLigne,
    deplacerLigne,
    adapterEpaisseurLigne,

    // Actions finition
    creerLigneFinitionGroupe,
    supprimerLigneFinitionGroupe,
    updateLigneFinition,

    // Import
    importerLignes,

    // Calculs
    totauxParGroupe,
    totauxGlobaux,

    // Validation
    hasLignesNonAssignees,
    canOptimize,

    // Utils
    reset,
    getAllLignes,
    trouverLigne,
  }), [
    groupes,
    lignesNonAssignees,
    lignesFinition,
    state,
    modeGroupes,
    creerGroupe,
    supprimerGroupe,
    updatePanneauGroupe,
    toggleExpandGroupe,
    ajouterLigneNonAssignee,
    ajouterLigneGroupe,
    supprimerLigne,
    updateLigne,
    deplacerLigne,
    adapterEpaisseurLigne,
    creerLigneFinitionGroupe,
    supprimerLigneFinitionGroupe,
    updateLigneFinition,
    importerLignes,
    totauxParGroupe,
    totauxGlobaux,
    hasLignesNonAssignees,
    canOptimize,
    reset,
    getAllLignes,
    trouverLigne,
  ]);

  return (
    <GroupesContext.Provider value={contextValue}>
      {children}
    </GroupesContext.Provider>
  );
}

// === HOOK ===

export function useGroupes() {
  const context = useContext(GroupesContext);
  if (!context) {
    throw new Error('useGroupes must be used within a GroupesProvider');
  }
  return context;
}
