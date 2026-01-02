// lib/caissons/export-configurateur.ts
// Fonction pour exporter un caisson vers le configurateur (creer les lignes automatiquement)

import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { ResultatCalculCaisson, PanneauCalcule } from './types';

// Generer un ID unique pour chaque ligne
function genererIdLigne(): string {
  return `ligne_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Generer une reference unique
function genererReference(prefix: string, index: number): string {
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${String(index + 1).padStart(2, '0')}-${timestamp}`;
}

/**
 * Convertit un panneau calcule en ligne de prestation pour le configurateur
 */
function panneauVersLigne(
  panneau: PanneauCalcule,
  index: number,
  nomCaisson: string
): LignePrestationV3 {
  const reference = genererReference(panneau.nomCourt || 'PAN', index);

  return {
    id: genererIdLigne(),
    reference: `[${nomCaisson}] ${panneau.nom}`,

    // Type de ligne
    typeLigne: 'panneau',
    ligneParentId: null,

    // Materiau (depuis le panneau source si disponible)
    materiau: panneau.panneauSource?.nom || null,

    // Dimensions
    dimensions: {
      longueur: panneau.longueur,
      largeur: panneau.largeur,
      epaisseur: panneau.epaisseur,
    },

    // Chants
    chants: {
      A: panneau.chants.A,
      B: panneau.chants.B,
      C: panneau.chants.C,
      D: panneau.chants.D,
    },
    sensDuFil: 'longueur',

    // Forme (rectangle par defaut)
    forme: 'rectangle',
    chantsConfig: { type: 'rectangle', edges: panneau.chants },
    dimensionsLShape: null,
    dimensionsTriangle: null,
    formeCustom: null,

    // Options
    usinages: [],
    percage: false,

    // Fourniture
    avecFourniture: panneau.panneauSource !== null,
    panneauId: panneau.panneauSource?.id || null,
    panneauNom: panneau.panneauSource?.nom || null,
    panneauImageUrl: panneau.panneauSource?.imageUrl || null,
    // prixM2 est un Record<string, number>, on prend la premiere valeur
    prixPanneauM2: panneau.panneauSource?.prixM2
      ? Object.values(panneau.panneauSource.prixM2)[0] || 0
      : 0,

    // Finition (pas de finition par defaut)
    avecFinition: false,
    typeFinition: null,
    finition: null,
    teinte: null,
    codeCouleurLaque: null,
    brillance: null,
    nombreFaces: 1,

    // Calculs (seront recalcules par le configurateur)
    surfaceM2: panneau.surfaceM2,
    surfaceFacturee: panneau.surfaceFacturee,
    metresLineairesChants: panneau.metresLineairesChants,

    // Prix (seront recalcules)
    prixPanneau: panneau.panneauSource?.prixM2
      ? panneau.surfaceFacturee * (Object.values(panneau.panneauSource.prixM2)[0] || 0)
      : 0,
    prixFaces: 0,
    prixChants: 0,
    prixUsinages: 0,
    prixPercage: 0,
    prixFournitureHT: 0,
    prixPrestationHT: 0,
    prixHT: 0,
    prixTTC: 0,
  };
}

/**
 * Exporte un caisson vers le configurateur
 * Retourne un tableau de lignes de prestation a ajouter
 */
export function exporterCaissonVersConfigurateur(
  resultat: ResultatCalculCaisson
): LignePrestationV3[] {
  const nomCaisson = resultat.config.nom || 'Caisson';
  const lignes: LignePrestationV3[] = [];

  // Creer une ligne pour chaque panneau
  resultat.panneaux.forEach((panneau, index) => {
    // Pour les panneaux avec quantite > 1, creer plusieurs lignes
    for (let i = 0; i < panneau.quantite; i++) {
      const ligne = panneauVersLigne(
        { ...panneau, quantite: 1 },
        lignes.length,
        nomCaisson
      );

      // Ajuster la reference si plusieurs exemplaires
      if (panneau.quantite > 1) {
        ligne.reference = `[${nomCaisson}] ${panneau.nom} (${i + 1}/${panneau.quantite})`;
      }

      lignes.push(ligne);
    }
  });

  return lignes;
}

/**
 * Exporte un caisson avec regroupement (une seule ligne avec quantite)
 * Alternative plus compacte
 */
export function exporterCaissonRegroupeVersConfigurateur(
  resultat: ResultatCalculCaisson
): LignePrestationV3[] {
  const nomCaisson = resultat.config.nom || 'Caisson';
  const lignes: LignePrestationV3[] = [];

  resultat.panneaux.forEach((panneau, index) => {
    const ligne = panneauVersLigne(panneau, index, nomCaisson);

    // Ajouter la quantite dans la reference si > 1
    if (panneau.quantite > 1) {
      ligne.reference = `[${nomCaisson}] ${panneau.nom} (x${panneau.quantite})`;
    }

    lignes.push(ligne);
  });

  return lignes;
}

/**
 * Resume d'export pour affichage
 */
export interface ResumeExport {
  nombreLignes: number;
  surfaceTotale: number;
  metresLineaires: number;
  panneaux: Array<{
    nom: string;
    dimensions: string;
    quantite: number;
  }>;
}

export function genererResumeExport(resultat: ResultatCalculCaisson): ResumeExport {
  return {
    nombreLignes: resultat.panneaux.reduce((sum, p) => sum + p.quantite, 0),
    surfaceTotale: resultat.surfaceTotaleM2,
    metresLineaires: resultat.metresLineairesTotaux,
    panneaux: resultat.panneaux.map(p => ({
      nom: p.nom,
      dimensions: `${p.longueur} x ${p.largeur} x ${p.epaisseur}mm`,
      quantite: p.quantite,
    })),
  };
}
