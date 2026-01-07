/**
 * Utilitaires de classification automatique des produits
 * Détecte et corrige les mauvaises classifications à l'import
 */

import type { PanelImportData } from '../schemas/panel-validation.schema';

/**
 * Patterns de détection des bandes de chant par nom
 */
const EDGE_BAND_NAME_PATTERNS = [
  /bande\s*de\s*chant/i,
  /chant\s+abs/i,
  /chant\s+pvc/i,
  /chant\s+pro/i,
  /chant\s+acrylique/i,
  /chant\s+melamine/i,
  /chant\s+stratifie/i,
  /^chant\s+/i, // Commence par "chant "
];

/**
 * Dimensions typiques des bandes de chant
 */
const EDGE_BAND_DIMENSIONS = {
  maxWidth: 50, // Largeur max en mm (typiquement 19-45mm)
  maxThickness: 2, // Épaisseur max en mm (typiquement 0.4-2mm)
};

/**
 * Détecte si un produit est une bande de chant basé sur son nom
 */
export function isEdgeBandByName(name: string | null | undefined): boolean {
  if (!name) return false;
  return EDGE_BAND_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Détecte si un produit est une bande de chant basé sur ses dimensions
 * Critères: largeur <= 50mm ET épaisseur <= 2mm
 */
export function isEdgeBandByDimensions(
  width: number | null | undefined,
  thickness: number | null | undefined,
): boolean {
  if (!width || !thickness) return false;

  return (
    width >= 1 && // Min 1mm pour éviter les valeurs nulles mal parsées
    width <= EDGE_BAND_DIMENSIONS.maxWidth &&
    thickness > 0 &&
    thickness <= EDGE_BAND_DIMENSIONS.maxThickness
  );
}

/**
 * Détecte si un produit est probablement une bande de chant
 * Combine détection par nom ET par dimensions
 */
export function detectEdgeBand(data: PanelImportData): {
  isEdgeBand: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
} {
  const byName = isEdgeBandByName(data.name);
  const byDimensions = isEdgeBandByDimensions(data.defaultWidth, data.defaultThickness);

  // Haute confiance: le nom contient explicitement "chant"
  if (byName) {
    return {
      isEdgeBand: true,
      confidence: 'high',
      reason: `Nom contient un pattern de chant: "${data.name}"`,
    };
  }

  // Confiance moyenne: dimensions typiques de chant
  if (byDimensions) {
    return {
      isEdgeBand: true,
      confidence: 'medium',
      reason: `Dimensions typiques de chant: ${data.defaultWidth}mm x ${data.defaultThickness}mm`,
    };
  }

  return {
    isEdgeBand: false,
    confidence: 'low',
    reason: 'Pas de caractéristique de bande de chant détectée',
  };
}

/**
 * Résultat de classification avec détails
 */
export interface ClassificationResult {
  data: PanelImportData;
  wasModified: boolean;
  modifications: string[];
}

/**
 * Classifie et corrige un produit à l'import
 *
 * Actions effectuées:
 * 1. Détection des bandes de chant mal classifiées → correction productType
 * 2. Déplacement prix/m² vers prix/ml pour les chants
 * 3. Auto-remplissage defaultThickness depuis thickness[0] si null
 */
export function classifyProduct(data: PanelImportData): ClassificationResult {
  const modifications: string[] = [];
  let result = { ...data };

  // 1. Auto-classification des bandes de chant
  const edgeBandDetection = detectEdgeBand(data);

  if (edgeBandDetection.isEdgeBand && data.productType !== 'BANDE_DE_CHANT') {
    // Seulement corriger si confiance high (nom explicite)
    // ou medium ET productType est suspect (PLACAGE, MELAMINE sur petites dimensions)
    const shouldCorrect =
      edgeBandDetection.confidence === 'high' ||
      (edgeBandDetection.confidence === 'medium' &&
        ['PLACAGE', 'MELAMINE', 'MDF', null, undefined].includes(
          data.productType as string | null | undefined,
        ));

    if (shouldCorrect) {
      result.productType = 'BANDE_DE_CHANT';
      modifications.push(
        `productType: ${data.productType || 'NULL'} → BANDE_DE_CHANT (${edgeBandDetection.reason})`,
      );

      // 2. Déplacer prix/m² vers prix/ml si applicable
      if (data.pricePerM2 && !data.pricePerMl) {
        result.pricePerMl = data.pricePerM2;
        result.pricePerM2 = null;
        modifications.push(`Prix déplacé: pricePerM2 (${data.pricePerM2}) → pricePerMl`);
      }
    }
  }

  // 3. Auto-remplissage defaultThickness depuis thickness[0]
  if (
    result.defaultThickness === null &&
    result.thickness &&
    result.thickness.length > 0
  ) {
    const firstThickness = result.thickness[0];
    // Vérifier que c'est une valeur raisonnable
    if (firstThickness >= 0.1 && firstThickness <= 100) {
      result.defaultThickness = firstThickness;
      modifications.push(`defaultThickness: NULL → ${firstThickness}mm (depuis thickness[0])`);
    }
  }

  return {
    data: result,
    wasModified: modifications.length > 0,
    modifications,
  };
}

/**
 * Classifie un batch de produits et retourne des statistiques
 */
export function classifyProducts(products: PanelImportData[]): {
  results: ClassificationResult[];
  stats: {
    total: number;
    modified: number;
    edgeBandsReclassified: number;
    pricesMoved: number;
    thicknessAutoFilled: number;
  };
} {
  const results = products.map(classifyProduct);

  const stats = {
    total: products.length,
    modified: results.filter((r) => r.wasModified).length,
    edgeBandsReclassified: results.filter((r) =>
      r.modifications.some((m) => m.includes('→ BANDE_DE_CHANT')),
    ).length,
    pricesMoved: results.filter((r) =>
      r.modifications.some((m) => m.includes('pricePerMl')),
    ).length,
    thicknessAutoFilled: results.filter((r) =>
      r.modifications.some((m) => m.includes('defaultThickness:')),
    ).length,
  };

  return { results, stats };
}
