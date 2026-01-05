// lib/configurateur/groupes/hooks.ts
// Hook pour la gestion des groupes de panneaux

import { useState, useCallback, useMemo } from 'react';
import type { LignePrestationV3 } from '../types';
import type {
  GroupePanneau,
  GroupesState,
  TotauxGroupe,
  TotauxGlobaux,
  CreateGroupeOptions,
  DragEndResult,
  GroupeWarning,
  PanneauGroupe,
} from './types';
import {
  isEpaisseurCompatible,
  getFirstEpaisseur,
  getPanneauDisplayInfo,
} from './helpers';
import { mettreAJourCalculsLigne } from '../calculs';

const TVA_RATE = 0.20;

/**
 * Génère un ID unique pour un groupe
 */
function generateGroupeId(): string {
  return `groupe-${crypto.randomUUID()}`;
}

/**
 * Hook principal pour la gestion des groupes de panneaux
 */
export function useGroupesPanneaux(initialLignes: LignePrestationV3[] = []) {
  // State principal
  const [groupes, setGroupes] = useState<GroupePanneau[]>([]);
  const [lignesNonAssignees, setLignesNonAssignees] = useState<LignePrestationV3[]>(initialLignes);

  // === ACTIONS GROUPES ===

  /**
   * Créer un nouveau groupe
   */
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

  /**
   * Supprimer un groupe (déplace les lignes vers "Non assigné")
   */
  const supprimerGroupe = useCallback((groupeId: string) => {
    setGroupes(prev => {
      const groupe = prev.find(g => g.id === groupeId);
      if (groupe && groupe.lignes.length > 0) {
        // Déplacer les lignes vers "Non assigné"
        setLignesNonAssignees(prevLignes => [...prevLignes, ...groupe.lignes]);
      }
      return prev.filter(g => g.id !== groupeId);
    });
  }, []);

  /**
   * Mettre à jour le panneau d'un groupe
   */
  const updatePanneauGroupe = useCallback((groupeId: string, panneauGroupe: PanneauGroupe | null) => {
    setGroupes(prev => prev.map(g => {
      if (g.id !== groupeId) return g;
      return { ...g, panneau: panneauGroupe };
    }));
  }, []);

  /**
   * Toggle expand/collapse d'un groupe
   */
  const toggleExpandGroupe = useCallback((groupeId: string) => {
    setGroupes(prev => prev.map(g => {
      if (g.id !== groupeId) return g;
      return { ...g, isExpanded: !g.isExpanded };
    }));
  }, []);

  // === ACTIONS LIGNES ===

  /**
   * Ajouter une ligne (dans "Non assigné" par défaut)
   */
  const ajouterLigne = useCallback((ligne: LignePrestationV3, groupeId?: string) => {
    if (groupeId) {
      setGroupes(prev => prev.map(g => {
        if (g.id !== groupeId) return g;
        return { ...g, lignes: [...g.lignes, ligne] };
      }));
    } else {
      setLignesNonAssignees(prev => [...prev, ligne]);
    }
  }, []);

  /**
   * Supprimer une ligne (de n'importe où)
   */
  const supprimerLigne = useCallback((ligneId: string) => {
    // Chercher dans les groupes
    setGroupes(prev => prev.map(g => ({
      ...g,
      lignes: g.lignes.filter(l => l.id !== ligneId),
    })));

    // Chercher dans non assignées
    setLignesNonAssignees(prev => prev.filter(l => l.id !== ligneId));
  }, []);

  /**
   * Mettre à jour une ligne
   */
  const updateLigne = useCallback((ligneId: string, updates: Partial<LignePrestationV3>) => {
    const updateFn = (ligne: LignePrestationV3) => {
      if (ligne.id !== ligneId) return ligne;
      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    };

    // Mettre à jour dans les groupes
    setGroupes(prev => prev.map(g => ({
      ...g,
      lignes: g.lignes.map(updateFn),
    })));

    // Mettre à jour dans non assignées
    setLignesNonAssignees(prev => prev.map(updateFn));
  }, []);

  /**
   * Déplacer une ligne entre groupes (pour drag & drop)
   */
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

    // Vérifier compatibilité épaisseur si destination est un groupe
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
    if (destinationGroupeId === null) {
      setLignesNonAssignees(prev => {
        const newLignes = [...prev];
        newLignes.splice(destinationIndex, 0, ligne!);
        return newLignes;
      });
    } else {
      setGroupes(prev => prev.map(g => {
        if (g.id !== destinationGroupeId) return g;
        const newLignes = [...g.lignes];
        newLignes.splice(destinationIndex, 0, ligne!);
        return { ...g, lignes: newLignes };
      }));
    }

    return warning;
  }, [groupes, lignesNonAssignees]);

  /**
   * Adapter l'épaisseur d'une ligne au panneau du groupe
   */
  const adapterEpaisseurLigne = useCallback((ligneId: string, groupeId: string) => {
    const groupe = groupes.find(g => g.id === groupeId);
    if (!groupe?.panneau) return;

    const nouvelleEpaisseur = getFirstEpaisseur(groupe.panneau);
    if (nouvelleEpaisseur <= 0) return;

    // Trouver la ligne pour préserver ses dimensions existantes
    const ligne = groupe.lignes.find(l => l.id === ligneId)
      || lignesNonAssignees.find(l => l.id === ligneId);

    if (!ligne) return;

    updateLigne(ligneId, {
      dimensions: {
        ...ligne.dimensions, // Préserver longueur et largeur
        epaisseur: nouvelleEpaisseur,
      },
    });
  }, [groupes, lignesNonAssignees, updateLigne]);

  // === IMPORT ===

  /**
   * Importer des lignes (toutes vont dans "Non assigné")
   */
  const importerLignes = useCallback((lignes: LignePrestationV3[]) => {
    setLignesNonAssignees(prev => [...prev, ...lignes]);
  }, []);

  /**
   * Remplacer toutes les lignes non assignées
   */
  const setLignesNonAssigneesDirectement = useCallback((lignes: LignePrestationV3[]) => {
    setLignesNonAssignees(lignes);
  }, []);

  // === CALCULS ===

  /**
   * Calculer les totaux par groupe
   */
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

  /**
   * Calculer les totaux globaux
   */
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

  /**
   * Vérifier s'il y a des lignes non assignées
   */
  const hasLignesNonAssignees = useMemo(() => lignesNonAssignees.length > 0, [lignesNonAssignees]);

  /**
   * Vérifier si prêt pour optimisation
   */
  const canOptimize = useMemo(() => {
    return groupes.length > 0 && groupes.some(g => g.lignes.length > 0 && g.panneau !== null);
  }, [groupes]);

  // === RESET ===

  /**
   * Réinitialiser tout
   */
  const reset = useCallback(() => {
    setGroupes([]);
    setLignesNonAssignees([]);
  }, []);

  // === STATE COMPLET ===

  const state: GroupesState = useMemo(() => ({
    groupes,
    lignesNonAssignees,
  }), [groupes, lignesNonAssignees]);

  return {
    // State
    state,
    groupes,
    lignesNonAssignees,

    // Actions groupes
    creerGroupe,
    supprimerGroupe,
    updatePanneauGroupe,
    toggleExpandGroupe,

    // Actions lignes
    ajouterLigne,
    supprimerLigne,
    updateLigne,
    deplacerLigne,
    adapterEpaisseurLigne,

    // Import
    importerLignes,
    setLignesNonAssignees: setLignesNonAssigneesDirectement,

    // Setters directs pour restauration
    setGroupes,

    // Calculs
    totauxParGroupe,
    totauxGlobaux,

    // Validation
    hasLignesNonAssignees,
    canOptimize,

    // Reset
    reset,
  };
}

export type UseGroupesPanneauxReturn = ReturnType<typeof useGroupesPanneaux>;
