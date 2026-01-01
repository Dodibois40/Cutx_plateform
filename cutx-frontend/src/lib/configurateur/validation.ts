// lib/configurateur/validation.ts
// Validation des données pour le Configurateur V3

import type {
  ConfigurateurV3State,
  LignePrestationV3,
  ValidationResult,
} from './types';
import { REGLES } from './constants';
import { getEtatLigne } from './calculs';

/**
 * Note: Il n'y a PAS de minimum de commande bloquant ni de minimum par teinte.
 * Le seul minimum est le 0.25m² facturé par face, qui est géré dans les calculs (surfaceFacturee).
 * Le minimum de commande (120€ HT) est juste informatif, pas bloquant.
 */
export function validerMinimums(_state: ConfigurateurV3State): ValidationResult {
  // Pas de validation bloquante sur les minimums
  // Le client peut commander ce qu'il veut, on facture au minimum 0.25m² par face
  return {
    isValid: true,
    erreurs: [],
  };
}

/**
 * Vérifie si une ligne PANNEAU est valide
 */
export function validerLignePanneau(ligne: LignePrestationV3): ValidationResult {
  const erreurs: string[] = [];

  // Référence obligatoire
  if (!ligne.reference || ligne.reference.trim() === '') {
    erreurs.push('La référence est obligatoire');
  }

  // Dimensions obligatoires et valides
  if (!ligne.dimensions.longueur || ligne.dimensions.longueur <= 0) {
    erreurs.push('La longueur doit être supérieure à 0');
  }

  if (!ligne.dimensions.largeur || ligne.dimensions.largeur <= 0) {
    erreurs.push('La largeur doit être supérieure à 0');
  }

  if (ligne.dimensions.epaisseur < 0) {
    erreurs.push('L\'épaisseur ne peut pas être négative');
  }

  // Vérifier dimensions raisonnables (max 5000mm = 5m)
  if (ligne.dimensions.longueur > 5000) {
    erreurs.push('La longueur ne peut pas dépasser 5000 mm');
  }

  if (ligne.dimensions.largeur > 3000) {
    erreurs.push('La largeur ne peut pas dépasser 3000 mm');
  }

  return {
    isValid: erreurs.length === 0,
    erreurs,
  };
}

/**
 * Vérifie si une ligne FINITION est valide
 */
export function validerLigneFinition(ligne: LignePrestationV3): ValidationResult {
  const erreurs: string[] = [];

  // Finition obligatoire (laque ou vernis)
  if (!ligne.finition) {
    erreurs.push('La finition est obligatoire');
  }

  // Brillance obligatoire
  if (!ligne.brillance) {
    erreurs.push('La brillance est obligatoire');
  }

  // Vérifier compatibilité finition/brillance
  if (ligne.finition === 'laque' && ligne.brillance === 'gloss_naturel') {
    erreurs.push('La brillance "0 Gloss Naturel" n\'est pas disponible en laque');
  }

  return {
    isValid: erreurs.length === 0,
    erreurs,
  };
}

/**
 * Vérifie si une ligne est valide (dispatch selon le type)
 */
export function validerLigne(ligne: LignePrestationV3): ValidationResult {
  if (ligne.typeLigne === 'finition') {
    return validerLigneFinition(ligne);
  }
  return validerLignePanneau(ligne);
}

/**
 * Vérifie l'unicité des références
 */
export function validerReferencesUniques(lignes: LignePrestationV3[]): ValidationResult {
  const erreurs: string[] = [];
  const references = new Map<string, number>();

  lignes.forEach(ligne => {
    if (ligne.reference && ligne.reference.trim() !== '') {
      const ref = ligne.reference.trim().toLowerCase();
      const count = references.get(ref) || 0;
      references.set(ref, count + 1);
    }
  });

  references.forEach((count, ref) => {
    if (count > 1) {
      erreurs.push(`La référence "${ref}" est utilisée ${count} fois`);
    }
  });

  return {
    isValid: erreurs.length === 0,
    erreurs,
  };
}

/**
 * Vérifie si le configurateur est prêt à être soumis
 */
export function validerConfigurateur(state: ConfigurateurV3State): ValidationResult {
  const erreurs: string[] = [];

  // Vérifier qu'il y a au moins une ligne complète
  const lignesCompletes = state.lignes.filter(l => getEtatLigne(l) === 'complete');
  if (lignesCompletes.length === 0) {
    erreurs.push('configurateur.validation.atLeastOneCompleteLine');
  }

  // Vérifier la référence chantier
  if (!state.referenceChantier || state.referenceChantier.trim() === '') {
    erreurs.push('configurateur.validation.projectReferenceRequired');
  }

  // Vérifier les références uniques
  const uniqueResult = validerReferencesUniques(state.lignes);
  erreurs.push(...uniqueResult.erreurs);

  // Vérifier chaque ligne complète
  lignesCompletes.forEach((ligne, index) => {
    const ligneResult = validerLigne(ligne);
    if (!ligneResult.isValid) {
      ligneResult.erreurs.forEach(err => {
        erreurs.push(`Ligne "${ligne.reference || index + 1}": ${err}`);
      });
    }
  });

  // Vérifier les minimums (seulement si on a des lignes)
  if (lignesCompletes.length > 0) {
    const minimumResult = validerMinimums(state);
    erreurs.push(...minimumResult.erreurs);
  }

  return {
    isValid: erreurs.length === 0,
    erreurs,
  };
}
