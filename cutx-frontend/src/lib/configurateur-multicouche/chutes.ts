/**
 * Calculs des chutes pour le panneau multicouche artisanal
 *
 * Quand les couches ont des dimensions différentes, les feuilles plus grandes
 * génèrent des chutes (excédents de matière) à valoriser.
 *
 * Exemple:
 * - Âme: 2500 × 1200
 * - Stratifié: 3050 × 1500
 * → Dimensions finales: 2500 × 1200 (MIN)
 * → Chute stratifié: bande de 550mm en longueur + bande de 300mm en largeur
 */

import type { BuilderCouche, ChutePreview } from '@/components/home/multicouche-builder/types';

/** Taille minimale pour qu'une chute soit considérée comme valorisable (mm) */
const CHUTE_MIN_SIZE = 100;

/**
 * Calcule les dimensions finales du panneau multicouche
 * = MIN(longueur de toutes les couches) × MIN(largeur de toutes les couches)
 */
export function calculerDimensionsFinales(
  couches: BuilderCouche[]
): { longueur: number; largeur: number } {
  const couchesAvecProduit = couches.filter(
    (c) => c.produit && c.panneauLongueur && c.panneauLargeur
  );

  if (couchesAvecProduit.length === 0) {
    return { longueur: 0, largeur: 0 };
  }

  const longueur = Math.min(
    ...couchesAvecProduit.map((c) => c.panneauLongueur!)
  );
  const largeur = Math.min(
    ...couchesAvecProduit.map((c) => c.panneauLargeur!)
  );

  return { longueur, largeur };
}

/**
 * Calcule les chutes générées par chaque couche
 *
 * Pour chaque couche dont les dimensions dépassent les dimensions finales,
 * on génère des chutes représentant l'excédent de matière.
 *
 * Schéma de découpe (vue de dessus):
 * ┌─────────────────────────────────────┐
 * │                                     │
 * │   Panneau final    │  Chute largeur │
 * │   (utilisé)        │                │
 * │                    │                │
 * ├────────────────────┴────────────────┤
 * │        Chute longueur               │
 * └─────────────────────────────────────┘
 */
export function calculerChutes(
  couches: BuilderCouche[],
  dimensionsFinales: { longueur: number; largeur: number }
): ChutePreview[] {
  const chutes: ChutePreview[] = [];

  // Pas de calcul si dimensions finales nulles
  if (dimensionsFinales.longueur === 0 || dimensionsFinales.largeur === 0) {
    return chutes;
  }

  for (const couche of couches) {
    // Skip si pas de produit assigné
    if (!couche.produit) continue;

    const panneauL = couche.panneauLongueur || 0;
    const panneauLarg = couche.panneauLargeur || 0;

    // Skip si le panneau correspond exactement aux dimensions finales
    if (
      panneauL === dimensionsFinales.longueur &&
      panneauLarg === dimensionsFinales.largeur
    ) {
      continue;
    }

    // Calcul des excédents
    const excessLongueur = panneauL - dimensionsFinales.longueur;
    const excessLargeur = panneauLarg - dimensionsFinales.largeur;

    // Chute en longueur (bande horizontale en bas)
    // Dimensions: excédent × largeur totale du panneau
    if (excessLongueur >= CHUTE_MIN_SIZE) {
      const surfaceM2 = (excessLongueur * panneauLarg) / 1_000_000;
      chutes.push({
        id: `${couche.id}-longueur`,
        sourceCoucheId: couche.id,
        sourceCoucheNom: couche.panneauNom || 'Couche',
        dimensions: {
          longueur: excessLongueur,
          largeur: panneauLarg,
          epaisseur: couche.epaisseur,
        },
        surfaceM2,
        valeurEstimee: surfaceM2 * couche.prixPanneauM2,
        position: 'longueur',
      });
    }

    // Chute en largeur (bande verticale à droite)
    // Dimensions: longueur utilisée × excédent largeur
    // Note: on utilise la longueur FINALE (pas totale) pour éviter le double comptage
    if (excessLargeur >= CHUTE_MIN_SIZE) {
      const surfaceM2 =
        (dimensionsFinales.longueur * excessLargeur) / 1_000_000;
      chutes.push({
        id: `${couche.id}-largeur`,
        sourceCoucheId: couche.id,
        sourceCoucheNom: couche.panneauNom || 'Couche',
        dimensions: {
          longueur: dimensionsFinales.longueur,
          largeur: excessLargeur,
          epaisseur: couche.epaisseur,
        },
        surfaceM2,
        valeurEstimee: surfaceM2 * couche.prixPanneauM2,
        position: 'largeur',
      });
    }
  }

  return chutes;
}

/**
 * Calcule la valeur totale des chutes
 */
export function calculerValeurTotaleChutes(chutes: ChutePreview[]): number {
  return chutes.reduce((total, chute) => total + chute.valeurEstimee, 0);
}

/**
 * Calcule l'épaisseur totale du panneau multicouche
 */
export function calculerEpaisseurTotale(couches: BuilderCouche[]): number {
  return couches.reduce((total, couche) => total + couche.epaisseur, 0);
}

/**
 * Calcule le prix total des couches (matière première)
 * Basé sur la surface des dimensions finales × prix/m² de chaque couche
 */
export function calculerPrixCouches(
  couches: BuilderCouche[],
  dimensionsFinales: { longueur: number; largeur: number }
): number {
  if (dimensionsFinales.longueur === 0 || dimensionsFinales.largeur === 0) {
    return 0;
  }

  const surfaceFinaleM2 =
    (dimensionsFinales.longueur * dimensionsFinales.largeur) / 1_000_000;

  return couches.reduce((total, couche) => {
    if (!couche.produit) return total;
    return total + surfaceFinaleM2 * couche.prixPanneauM2;
  }, 0);
}

/**
 * Calcule le prix du collage (si mode fournisseur)
 * Tarif: 25€/m² par joint (interface entre couches)
 */
export function calculerPrixCollage(
  modeCollage: 'fournisseur' | 'client',
  nombreCouches: number,
  dimensionsFinales: { longueur: number; largeur: number }
): number {
  // Pas de frais de collage si le client colle lui-même
  if (modeCollage === 'client') return 0;

  // Pas de collage si moins de 2 couches
  if (nombreCouches < 2) return 0;

  const surfaceM2 =
    (dimensionsFinales.longueur * dimensionsFinales.largeur) / 1_000_000;
  const nombreJoints = nombreCouches - 1;
  const tarifCollageM2 = 25; // €/m² par joint

  return surfaceM2 * nombreJoints * tarifCollageM2;
}
