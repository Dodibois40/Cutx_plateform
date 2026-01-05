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
import type { LignePrestationV3, TypeFinition, Chants, Finition, Brillance } from '@/lib/configurateur/types';
import type {
  GroupePanneau,
  GroupesState,
  TotauxGroupe,
  TotauxGlobaux,
  CreateGroupeOptions,
  DragEndResult,
  GroupeWarning,
  PanneauGroupe,
} from '@/lib/configurateur/groupes/types';
import {
  isPanneauCatalogue,
  isPanneauMulticouche,
  isEpaisseurCompatible,
  getFirstEpaisseur,
  getPanneauDisplayInfo,
} from '@/lib/configurateur/groupes/helpers';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';
import { creerNouvelleLigne, creerLigneFinition } from '@/lib/configurateur/constants';

// === CONSTANTS ===

const STORAGE_KEY_GROUPES = 'configurateur-groupes-autosave';
const TVA_RATE = 0.20;

// Type pour les colonnes duplicables (chants, perçage, finition)
export type ColonneDuplicableGroupe = 'chants' | 'percage' | 'finition';

// Type pour la valeur de finition à appliquer (inclut tous les détails de la ligne finition)
export interface FinitionApplyValue {
  avecFinition: boolean;
  typeFinition: TypeFinition | null;
  // Détails de la ligne de finition
  finition: Finition | null;
  teinte: string | null;
  codeCouleurLaque: string | null;
  brillance: Brillance | null;
  nombreFaces: 1 | 2;
}

// === TYPES ===

interface GroupesContextType {
  // State
  groupes: GroupePanneau[];
  lignesNonAssignees: LignePrestationV3[];
  lignesFinition: Map<string, LignePrestationV3>; // Map lignePanneauId -> ligneFinition
  state: GroupesState;

  // Multi-sélection
  selectedLigneIds: Set<string>;
  toggleLigneSelection: (ligneId: string) => void;
  clearSelection: () => void;
  isLigneSelected: (ligneId: string) => boolean;
  selectLignes: (ligneIds: string[]) => void;
  deplacerLignesMultiples: (destinationGroupeId: string | null, destinationIndex: number) => GroupeWarning | null;
  executerDeplacementMultiple: (
    ligneIds: string[],
    destinationGroupeId: string | null,
    destinationIndex: number,
    adapterEpaisseur?: boolean
  ) => void;

  // Mode (ancien = lignes plates, nouveau = groupes)
  modeGroupes: boolean;
  setModeGroupes: (mode: boolean) => void;

  // Actions groupes
  creerGroupe: (options?: CreateGroupeOptions) => GroupePanneau;
  supprimerGroupe: (groupeId: string) => void;
  supprimerGroupeEtLignes: (groupeId: string) => void; // Supprime le groupe ET toutes ses lignes
  updatePanneauGroupe: (groupeId: string, panneauGroupe: PanneauGroupe | null) => void;
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

  // Apply to column (appliquer à toutes les lignes)
  applyToColumnGroupe: (
    colonne: ColonneDuplicableGroupe,
    valeur: boolean | Chants | FinitionApplyValue,
    groupeId: string | null // null = lignes non assignées
  ) => number; // Retourne le nombre de lignes modifiées

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

  // Multi-sélection
  const [selectedLigneIds, setSelectedLigneIds] = useState<Set<string>>(new Set());

  // === RESTAURATION LOCALSTORAGE ===
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROUPES);
      if (saved) {
        const data = JSON.parse(saved);

        // Migration: filtrer les lignes de finition qui pourraient être dans les anciens tableaux
        // et les déplacer vers la Map lignesFinition
        const migratedFinitions = new Map<string, LignePrestationV3>();

        // Set global pour détecter les doublons entre tous les groupes et lignesNonAssignees
        const allSeenIds = new Set<string>();

        if (data.groupes && Array.isArray(data.groupes)) {
          setGroupes(data.groupes.map((g: GroupePanneau & { panneau?: unknown }) => {
            // Migration: Convertir l'ancien format PanneauCatalogue vers PanneauGroupe
            let panneauMigrated: PanneauGroupe | null = null;
            if (g.panneau) {
              // Vérifier si c'est déjà le nouveau format (a un champ 'type')
              const panneauAny = g.panneau as { type?: string; panneau?: unknown };
              if (panneauAny.type === 'catalogue' || panneauAny.type === 'multicouche') {
                // Déjà le nouveau format
                panneauMigrated = g.panneau as PanneauGroupe;
              } else {
                // Ancien format: PanneauCatalogue direct
                panneauMigrated = { type: 'catalogue', panneau: g.panneau as never };
              }
            }

            return {
              ...g,
              panneau: panneauMigrated,
              createdAt: new Date(g.createdAt),
              // Filtrer les lignes pour ne garder que les panneaux (migration) et éviter les doublons
              lignes: (g.lignes || []).filter((l: LignePrestationV3) => {
                if (l.typeLigne === 'finition' && l.ligneParentId) {
                  // Migrer vers la Map des finitions
                  migratedFinitions.set(l.ligneParentId, l);
                  return false;
                }
                // Éviter les doublons globaux
                if (allSeenIds.has(l.id)) {
                  return false;
                }
                allSeenIds.add(l.id);
                return l.typeLigne === 'panneau';
              }),
            };
          }));
        }

        if (data.lignesNonAssignees && Array.isArray(data.lignesNonAssignees)) {
          // Filtrer les lignes de finition et les doublons (migration)
          // Utiliser allSeenIds pour éviter aussi les doublons avec les groupes
          const cleanedLignes = data.lignesNonAssignees.filter((l: LignePrestationV3) => {
            // Migrer les finitions vers la Map
            if (l.typeLigne === 'finition' && l.ligneParentId) {
              migratedFinitions.set(l.ligneParentId, l);
              return false;
            }
            // Éviter les doublons (y compris avec les lignes des groupes)
            if (allSeenIds.has(l.id)) {
              return false;
            }
            allSeenIds.add(l.id);
            return l.typeLigne === 'panneau';
          });
          setLignesNonAssignees(cleanedLignes.length > 0 ? cleanedLignes : [creerNouvelleLigne()]);
        }

        // Charger les finitions (nouvelles données + migrées)
        if (data.lignesFinition && typeof data.lignesFinition === 'object') {
          const loadedFinitions = new Map(Object.entries(data.lignesFinition) as [string, LignePrestationV3][]);
          // Fusionner avec les finitions migrées (les nouvelles ont priorité)
          migratedFinitions.forEach((finition, panneauId) => {
            if (!loadedFinitions.has(panneauId)) {
              loadedFinitions.set(panneauId, finition);
            }
          });
          setLignesFinition(loadedFinitions);
        } else if (migratedFinitions.size > 0) {
          setLignesFinition(migratedFinitions);
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

  // Supprime le groupe ET toutes ses lignes (+ leurs finitions associées)
  const supprimerGroupeEtLignes = useCallback((groupeId: string) => {
    setGroupes(prev => {
      const groupe = prev.find(g => g.id === groupeId);
      if (groupe) {
        // Supprimer les finitions associées aux lignes du groupe
        const ligneIds = groupe.lignes.map(l => l.id);
        setLignesFinition(prevFinitions => {
          const newMap = new Map(prevFinitions);
          ligneIds.forEach(id => newMap.delete(id));
          return newMap;
        });
      }
      return prev.filter(g => g.id !== groupeId);
    });
  }, []);

  const updatePanneauGroupe = useCallback((groupeId: string, panneauGroupe: PanneauGroupe | null) => {
    setGroupes(prev => prev.map(g => {
      if (g.id !== groupeId) return g;
      return { ...g, panneau: panneauGroupe };
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
        const ligneEpaisseur = ligne.dimensions.epaisseur;
        const displayInfo = getPanneauDisplayInfo(destGroupe.panneau);
        if (ligneEpaisseur > 0 && displayInfo && !isEpaisseurCompatible(destGroupe.panneau, ligneEpaisseur)) {
          warning = {
            type: 'epaisseur_mismatch',
            message: `Attention : épaisseur ligne (${ligneEpaisseur}mm) non disponible pour ce panneau (${displayInfo.epaisseurs.join(', ')}mm). Adapter ?`,
            details: { ligneEpaisseur, panneauEpaisseur: getFirstEpaisseur(destGroupe.panneau) },
          };
        }
      }
    }

    // Retirer de la source ET ajouter à la destination en UNE SEULE opération
    // pour éviter les race conditions (doublons de clés)
    const ligneCopy = { ...ligne };

    if (sourceGroupeId === null && destinationGroupeId === null) {
      // Déplacement interne dans lignesNonAssignees
      setLignesNonAssignees(prev => {
        const filtered = prev.filter(l => l.id !== ligneId);
        const result = [...filtered];
        result.splice(destinationIndex, 0, ligneCopy);
        return result;
      });
    } else if (sourceGroupeId === null && destinationGroupeId !== null) {
      // De non-assignées vers un groupe
      setLignesNonAssignees(prev => prev.filter(l => l.id !== ligneId));
      setGroupes(prev => prev.map(g => {
        if (g.id !== destinationGroupeId) return g;
        const newLignes = [...g.lignes];
        newLignes.splice(destinationIndex, 0, ligneCopy);
        return { ...g, lignes: newLignes };
      }));
    } else if (sourceGroupeId !== null && destinationGroupeId === null) {
      // D'un groupe vers non-assignées
      setGroupes(prev => prev.map(g => {
        if (g.id !== sourceGroupeId) return g;
        return { ...g, lignes: g.lignes.filter(l => l.id !== ligneId) };
      }));
      setLignesNonAssignees(prev => {
        const newLignes = [...prev];
        newLignes.splice(destinationIndex, 0, ligneCopy);
        return newLignes;
      });
    } else if (sourceGroupeId === destinationGroupeId) {
      // Déplacement interne dans le même groupe
      setGroupes(prev => prev.map(g => {
        if (g.id !== sourceGroupeId) return g;
        const filtered = g.lignes.filter(l => l.id !== ligneId);
        const newLignes = [...filtered];
        newLignes.splice(destinationIndex, 0, ligneCopy);
        return { ...g, lignes: newLignes };
      }));
    } else {
      // D'un groupe vers un autre groupe
      setGroupes(prev => prev.map(g => {
        if (g.id === sourceGroupeId) {
          return { ...g, lignes: g.lignes.filter(l => l.id !== ligneId) };
        }
        if (g.id === destinationGroupeId) {
          const newLignes = [...g.lignes];
          newLignes.splice(destinationIndex, 0, ligneCopy);
          return { ...g, lignes: newLignes };
        }
        return g;
      }));
    }

    return warning;
  }, [groupes, lignesNonAssignees]);

  const adapterEpaisseurLigne = useCallback((ligneId: string, nouvelleEpaisseur: number) => {
    // Trouver la ligne pour préserver ses dimensions existantes
    let ligne: LignePrestationV3 | null = null;
    for (const groupe of groupes) {
      const found = groupe.lignes.find(l => l.id === ligneId);
      if (found) {
        ligne = found;
        break;
      }
    }
    if (!ligne) {
      ligne = lignesNonAssignees.find(l => l.id === ligneId) || null;
    }

    if (!ligne) return;

    updateLigne(ligneId, {
      dimensions: {
        ...ligne.dimensions, // Préserver longueur et largeur
        epaisseur: nouvelleEpaisseur,
      },
    });
  }, [groupes, lignesNonAssignees, updateLigne]);

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

  // === APPLY TO COLUMN ===

  const applyToColumnGroupe = useCallback((
    colonne: ColonneDuplicableGroupe,
    valeur: boolean | Chants | FinitionApplyValue,
    groupeId: string | null
  ): number => {
    let count = 0;

    // Pour finition, on doit gérer les lignes de finition séparément
    if (colonne === 'finition') {
      const finitionValue = valeur as FinitionApplyValue;
      const lignesATraiter = groupeId === null
        ? lignesNonAssignees
        : groupes.find(g => g.id === groupeId)?.lignes || [];

      // Collecter les IDs des lignes panneau à mettre à jour
      const ligneIds: string[] = [];
      lignesATraiter.forEach(ligne => {
        if (ligne.typeLigne === 'panneau') {
          ligneIds.push(ligne.id);
          count++;
        }
      });

      // Appliquer la finition à chaque ligne
      ligneIds.forEach(ligneId => {
        if (finitionValue.avecFinition && finitionValue.typeFinition) {
          // Créer ou mettre à jour la finition
          const lignePanneau = lignesATraiter.find(l => l.id === ligneId);
          if (lignePanneau) {
            // Mettre à jour la ligne panneau
            const updatedPanneau: LignePrestationV3 = {
              ...lignePanneau,
              avecFinition: true,
              typeFinition: finitionValue.typeFinition,
            };

            // Mettre à jour via updateLigne (sera appelé après)
            const updateFn = (l: LignePrestationV3) => {
              if (l.id !== ligneId) return l;
              return mettreAJourCalculsLigne({
                ...l,
                avecFinition: true,
                typeFinition: finitionValue.typeFinition,
              });
            };

            if (groupeId === null) {
              setLignesNonAssignees(prev => prev.map(updateFn));
            } else {
              setGroupes(prev => prev.map(g => {
                if (g.id !== groupeId) return g;
                return { ...g, lignes: g.lignes.map(updateFn) };
              }));
            }

            // Créer la ligne de finition avec tous les détails copiés
            const baseFinition = creerLigneFinition(updatedPanneau);
            const nouvelleFinition = mettreAJourCalculsLigne({
              ...baseFinition,
              finition: finitionValue.finition,
              teinte: finitionValue.teinte,
              codeCouleurLaque: finitionValue.codeCouleurLaque,
              brillance: finitionValue.brillance,
              nombreFaces: finitionValue.nombreFaces,
            });
            setLignesFinition(prev => new Map(prev).set(ligneId, nouvelleFinition));
          }
        } else {
          // Supprimer la finition
          const updateFn = (l: LignePrestationV3) => {
            if (l.id !== ligneId) return l;
            return mettreAJourCalculsLigne({
              ...l,
              avecFinition: false,
              typeFinition: null,
            });
          };

          if (groupeId === null) {
            setLignesNonAssignees(prev => prev.map(updateFn));
          } else {
            setGroupes(prev => prev.map(g => {
              if (g.id !== groupeId) return g;
              return { ...g, lignes: g.lignes.map(updateFn) };
            }));
          }

          // Supprimer la ligne de finition
          setLignesFinition(prev => {
            const newMap = new Map(prev);
            newMap.delete(ligneId);
            return newMap;
          });
        }
      });

      return count;
    }

    // Pour chants et percage, logique existante
    const updateFn = (ligne: LignePrestationV3): LignePrestationV3 => {
      if (ligne.typeLigne !== 'panneau') return ligne;
      count++;

      const updates: Partial<LignePrestationV3> = {};
      switch (colonne) {
        case 'chants':
          // Copier la configuration des chants
          updates.chants = { ...(valeur as Chants) };
          break;
        case 'percage':
          updates.percage = valeur as boolean;
          break;
      }

      return mettreAJourCalculsLigne({ ...ligne, ...updates });
    };

    if (groupeId === null) {
      // Appliquer aux lignes non assignées
      setLignesNonAssignees(prev => prev.map(updateFn));
    } else {
      // Appliquer aux lignes d'un groupe spécifique
      setGroupes(prev => prev.map(g => {
        if (g.id !== groupeId) return g;
        return { ...g, lignes: g.lignes.map(updateFn) };
      }));
    }

    return count;
  }, [groupes, lignesNonAssignees]);

  // === IMPORT ===

  const importerLignes = useCallback((lignes: LignePrestationV3[]) => {
    setLignesNonAssignees(prev => {
      // Filtrer les lignes vides existantes
      const lignesExistantes = prev.filter(l =>
        (l.reference?.trim() ?? '') !== '' ||
        (l.dimensions?.longueur ?? 0) > 0 ||
        (l.dimensions?.largeur ?? 0) > 0
      );
      return [...lignesExistantes, ...lignes];
    });
  }, []);

  // === MULTI-SÉLECTION ===

  const toggleLigneSelection = useCallback((ligneId: string) => {
    setSelectedLigneIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ligneId)) {
        newSet.delete(ligneId);
      } else {
        newSet.add(ligneId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLigneIds(new Set());
  }, []);

  const isLigneSelected = useCallback((ligneId: string): boolean => {
    return selectedLigneIds.has(ligneId);
  }, [selectedLigneIds]);

  const selectLignes = useCallback((ligneIds: string[]) => {
    setSelectedLigneIds(new Set(ligneIds));
  }, []);

  // Fonction interne pour exécuter le déplacement (définie avant deplacerLignesMultiples)
  const executerDeplacementMultipleInternal = useCallback((
    ligneIds: string[],
    destinationGroupeId: string | null,
    destinationIndex: number,
    adapterEpaisseur: boolean
  ) => {
    if (ligneIds.length === 0) return;

    const ligneIdsSet = new Set(ligneIds);

    // Collecter les lignes à déplacer
    const lignesToMove: LignePrestationV3[] = [];

    groupes.forEach(groupe => {
      groupe.lignes.forEach(ligne => {
        if (ligneIdsSet.has(ligne.id)) {
          lignesToMove.push({ ...ligne });
        }
      });
    });

    lignesNonAssignees.forEach(ligne => {
      if (ligneIdsSet.has(ligne.id)) {
        lignesToMove.push({ ...ligne });
      }
    });

    if (lignesToMove.length === 0) return;

    // Si on doit adapter les épaisseurs
    if (adapterEpaisseur && destinationGroupeId !== null) {
      const destGroupe = groupes.find(g => g.id === destinationGroupeId);
      if (destGroupe?.panneau) {
        const newEpaisseur = getFirstEpaisseur(destGroupe.panneau);
        if (newEpaisseur > 0) {
          lignesToMove.forEach(ligne => {
            ligne.dimensions.epaisseur = newEpaisseur;
            // Recalculer les prix
            const updatedLigne = mettreAJourCalculsLigne(ligne);
            Object.assign(ligne, updatedLigne);
          });
        }
      }
    }

    // Retirer des sources ET ajouter à destination en UNE SEULE opération
    // pour éviter les race conditions (doublons de clés)
    if (destinationGroupeId === null) {
      // Destination = lignes non assignées
      // Retirer des groupes
      setGroupes(prev => prev.map(g => ({
        ...g,
        lignes: g.lignes.filter(l => !ligneIdsSet.has(l.id)),
      })));

      // Retirer + ajouter dans lignesNonAssignees en une seule opération
      setLignesNonAssignees(prev => {
        const filtered = prev.filter(l => !ligneIdsSet.has(l.id));
        const result = [...filtered];
        result.splice(destinationIndex, 0, ...lignesToMove);
        return result.length > 0 ? result : [creerNouvelleLigne()];
      });
    } else {
      // Destination = un groupe
      // Retirer des lignesNonAssignees
      setLignesNonAssignees(prev => {
        const filtered = prev.filter(l => !ligneIdsSet.has(l.id));
        return filtered.length > 0 ? filtered : [creerNouvelleLigne()];
      });

      // Retirer des autres groupes + ajouter au groupe destination en une seule opération
      setGroupes(prev => prev.map(g => {
        if (g.id === destinationGroupeId) {
          // Groupe destination: retirer + ajouter
          const filteredLignes = g.lignes.filter(l => !ligneIdsSet.has(l.id));
          const newLignes = [...filteredLignes];
          newLignes.splice(destinationIndex, 0, ...lignesToMove);
          return { ...g, lignes: newLignes };
        }
        // Autres groupes: juste retirer
        return { ...g, lignes: g.lignes.filter(l => !ligneIdsSet.has(l.id)) };
      }));
    }

    // Vider la sélection après le déplacement
    setSelectedLigneIds(new Set());
  }, [groupes, lignesNonAssignees]);

  // Vérifier et préparer le déplacement multiple (retourne un warning si incompatibilité)
  const deplacerLignesMultiples = useCallback((
    destinationGroupeId: string | null,
    destinationIndex: number
  ): GroupeWarning | null => {
    if (selectedLigneIds.size === 0) return null;

    // Collecter toutes les lignes sélectionnées
    const lignesToMove: LignePrestationV3[] = [];
    const ligneIdsToMove = new Set(selectedLigneIds);

    // Depuis les groupes
    groupes.forEach(groupe => {
      groupe.lignes.forEach(ligne => {
        if (ligneIdsToMove.has(ligne.id)) {
          lignesToMove.push({ ...ligne });
        }
      });
    });

    // Depuis les non assignées
    lignesNonAssignees.forEach(ligne => {
      if (ligneIdsToMove.has(ligne.id)) {
        lignesToMove.push({ ...ligne });
      }
    });

    if (lignesToMove.length === 0) return null;

    // Si destination = zone non assignée, pas de vérification d'épaisseur
    if (destinationGroupeId === null) {
      // Exécuter directement le déplacement
      executerDeplacementMultipleInternal(lignesToMove.map(l => l.id), null, destinationIndex, false);
      return null;
    }

    // Vérifier la compatibilité des épaisseurs avec le groupe destination
    const destGroupe = groupes.find(g => g.id === destinationGroupeId);
    if (!destGroupe?.panneau) {
      // Pas de panneau défini, déplacer toutes
      executerDeplacementMultipleInternal(lignesToMove.map(l => l.id), destinationGroupeId, destinationIndex, false);
      return null;
    }

    const displayInfo = getPanneauDisplayInfo(destGroupe.panneau);
    if (!displayInfo || displayInfo.epaisseurs.length === 0) {
      // Pas d'épaisseurs définies, déplacer toutes
      executerDeplacementMultipleInternal(lignesToMove.map(l => l.id), destinationGroupeId, destinationIndex, false);
      return null;
    }

    const lignesCompatibles: string[] = [];
    const lignesIncompatibles: string[] = [];

    lignesToMove.forEach(ligne => {
      const ligneEpaisseur = ligne.dimensions.epaisseur;
      // Ligne compatible si épaisseur = 0 (non définie) ou si épaisseur compatible avec panneau
      if (ligneEpaisseur === 0 || isEpaisseurCompatible(destGroupe.panneau!, ligneEpaisseur)) {
        lignesCompatibles.push(ligne.id);
      } else {
        lignesIncompatibles.push(ligne.id);
      }
    });

    // Si toutes compatibles, déplacer directement
    if (lignesIncompatibles.length === 0) {
      executerDeplacementMultipleInternal(lignesToMove.map(l => l.id), destinationGroupeId, destinationIndex, false);
      return null;
    }

    // Retourner un warning avec les détails
    const warning: GroupeWarning = {
      type: 'epaisseur_mismatch_multi',
      message: `${lignesIncompatibles.length} ligne${lignesIncompatibles.length > 1 ? 's' : ''} sur ${lignesToMove.length} ${lignesIncompatibles.length > 1 ? 'ont' : 'a'} une épaisseur incompatible avec ce panneau (${displayInfo.epaisseurs.join(', ')}mm).`,
      details: {
        panneauEpaisseur: getFirstEpaisseur(destGroupe.panneau),
        lignesCompatibles,
        lignesIncompatibles,
        destinationGroupeId,
        destinationIndex,
      },
    };

    return warning;
  }, [selectedLigneIds, groupes, lignesNonAssignees, executerDeplacementMultipleInternal]);

  // Fonction exposée pour exécuter le déplacement (appelée après confirmation dialog)
  const executerDeplacementMultiple = useCallback((
    ligneIds: string[],
    destinationGroupeId: string | null,
    destinationIndex: number,
    adapterEpaisseur: boolean = false
  ) => {
    executerDeplacementMultipleInternal(ligneIds, destinationGroupeId, destinationIndex, adapterEpaisseur);
  }, [executerDeplacementMultipleInternal]);

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
      (l.reference?.trim() ?? '') !== '' ||
      (l.dimensions?.longueur ?? 0) > 0 ||
      (l.dimensions?.largeur ?? 0) > 0
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

    // Multi-sélection
    selectedLigneIds,
    toggleLigneSelection,
    clearSelection,
    isLigneSelected,
    selectLignes,
    deplacerLignesMultiples,
    executerDeplacementMultiple,

    // Mode
    modeGroupes,
    setModeGroupes,

    // Actions groupes
    creerGroupe,
    supprimerGroupe,
    supprimerGroupeEtLignes,
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

    // Apply to column
    applyToColumnGroupe,

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
    selectedLigneIds,
    toggleLigneSelection,
    clearSelection,
    isLigneSelected,
    selectLignes,
    deplacerLignesMultiples,
    executerDeplacementMultiple,
    modeGroupes,
    creerGroupe,
    supprimerGroupe,
    supprimerGroupeEtLignes,
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
    applyToColumnGroupe,
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
