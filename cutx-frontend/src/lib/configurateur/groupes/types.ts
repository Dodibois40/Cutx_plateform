// lib/configurateur/groupes/types.ts
// Types pour la gestion des groupes de panneaux dans le configurateur

import type { LignePrestationV3 } from '../types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';

/**
 * Type union discriminé pour les panneaux de groupe
 * Permet de supporter à la fois les panneaux catalogue et multicouches
 */
export type PanneauGroupe =
  | { type: 'catalogue'; panneau: PanneauCatalogue }
  | { type: 'multicouche'; panneau: PanneauMulticouche };

/**
 * Groupe de panneau contenant des lignes de configuration
 * Chaque groupe est associé à un panneau du catalogue ou multicouche
 */
export interface GroupePanneau {
  id: string;
  panneau: PanneauGroupe | null;
  lignes: LignePrestationV3[];
  isExpanded: boolean;
  createdAt: Date;
}

/**
 * State complet des groupes pour le configurateur
 */
export interface GroupesState {
  groupes: GroupePanneau[];
  lignesNonAssignees: LignePrestationV3[];
}

/**
 * Résultat du calcul des totaux par groupe
 */
export interface TotauxGroupe {
  groupeId: string;
  nbLignes: number;
  surfaceTotaleM2: number;
  prixLignesHT: number;
  prixChantsHT: number;
  prixTotalHT: number;
}

/**
 * Résultat du calcul des totaux globaux
 */
export interface TotauxGlobaux {
  totauxParGroupe: TotauxGroupe[];
  nbGroupes: number;
  nbLignesTotal: number;
  nbLignesNonAssignees: number;
  surfaceTotaleM2: number;
  prixTotalHT: number;
  prixTotalTTC: number;
}

/**
 * Action de déplacement d'une ligne
 */
export interface DeplacementLigne {
  ligneId: string;
  sourceGroupeId: string | null; // null = zone non assignée
  destinationGroupeId: string | null; // null = zone non assignée
  nouvelIndex?: number;
}

/**
 * Options pour la création d'un nouveau groupe
 */
export interface CreateGroupeOptions {
  panneau?: PanneauGroupe | null;
  lignes?: LignePrestationV3[];
  isExpanded?: boolean;
}

/**
 * Callback pour le drag & drop
 */
export interface DragEndResult {
  ligneId: string;
  sourceGroupeId: string | null;
  destinationGroupeId: string | null;
  sourceIndex: number;
  destinationIndex: number;
}

/**
 * Warning pour l'utilisateur lors d'opérations
 */
export interface GroupeWarning {
  type: 'epaisseur_mismatch' | 'epaisseur_mismatch_multi' | 'lignes_non_assignees' | 'groupe_vide';
  message: string;
  details?: {
    ligneEpaisseur?: number;
    panneauEpaisseur?: number;
    nbLignes?: number;
    // Pour multi-select
    lignesCompatibles?: string[]; // IDs des lignes avec épaisseur compatible
    lignesIncompatibles?: string[]; // IDs des lignes avec épaisseur incompatible
    destinationGroupeId?: string | null;
    destinationIndex?: number;
  };
}

/**
 * Données sauvegardées pour persistence localStorage
 */
export interface GroupesSavedData {
  groupes: Array<{
    id: string;
    panneauId: string | null;
    ligneIds: string[];
    isExpanded: boolean;
  }>;
  lignesNonAssigneesIds: string[];
  savedAt: string;
}
