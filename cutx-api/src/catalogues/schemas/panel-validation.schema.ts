/**
 * Schéma de validation Zod pour l'import de panneaux
 * Assure la qualité des données à l'entrée pour éviter les scripts de correction post-import
 */

import { z } from 'zod';

/**
 * Enum des types de produits valides
 * Doit correspondre aux valeurs dans productTypeLabels de catalogues.service.ts
 */
export const ProductTypeEnum = z.enum([
  'MELAMINE',
  'STRATIFIE',
  'PLACAGE',
  'BANDE_DE_CHANT',
  'COMPACT',
  'MDF',
  'CONTREPLAQUE',
  'PANNEAU_MASSIF',
  'OSB',
  'PARTICULE',
  'PLAN_DE_TRAVAIL',
  'PANNEAU_DECORATIF',
  'PANNEAU_3_PLIS',
  'SOLID_SURFACE',
  'PANNEAU_SPECIAL',
  'PANNEAU_CONSTRUCTION',
  'PANNEAU_ISOLANT',
  'CIMENT_BOIS',
  'LATTE',
  'PANNEAU_ALVEOLAIRE',
  'ALVEOLAIRE',
  'PVC',
  'SANITAIRE',
  'PORTE',
  'COLLE',
]);

export type ProductType = z.infer<typeof ProductTypeEnum>;

/**
 * Schéma de validation pour l'import d'un panneau
 * Valide les dimensions, prix et types avec des seuils réalistes
 */
export const PanelImportSchema = z.object({
  // Identifiants - obligatoires
  reference: z
    .string()
    .min(1, 'Référence obligatoire')
    .max(100, 'Référence trop longue (max 100 caractères)'),

  name: z
    .string()
    .min(1, 'Nom obligatoire')
    .max(500, 'Nom trop long (max 500 caractères)'),

  // Épaisseur: doit être réaliste (0.1mm - 100mm)
  // Les valeurs > 100mm sont probablement des erreurs de parsing (ex: 84551 = référence mal parsée)
  defaultThickness: z
    .number()
    .min(0.1, 'Épaisseur trop petite (min 0.1mm)')
    .max(100, 'Épaisseur aberrante (max 100mm) - vérifier le parsing')
    .nullable()
    .optional(),

  // Tableau d'épaisseurs disponibles
  thickness: z
    .array(
      z
        .number()
        .min(0.1, 'Épaisseur trop petite')
        .max(100, 'Épaisseur aberrante'),
    )
    .optional()
    .default([]),

  // Largeur par défaut: 1mm - 3000mm (panneaux standards jusqu'à 3m)
  defaultWidth: z
    .number()
    .min(1, 'Largeur trop petite')
    .max(3000, 'Largeur trop grande (max 3000mm)')
    .nullable()
    .optional(),

  // Longueur par défaut: 1mm - 6000mm (panneaux standards jusqu'à 6m)
  defaultLength: z
    .number()
    .min(1, 'Longueur trop petite')
    .max(6000, 'Longueur trop grande (max 6000mm)')
    .nullable()
    .optional(),

  // Prix: positif ou null
  pricePerM2: z.number().positive('Prix/m² doit être positif').nullable().optional(),

  pricePerMl: z.number().positive('Prix/ml doit être positif').nullable().optional(),

  // Type de produit
  productType: ProductTypeEnum.nullable().optional(),

  // Catégorie (ID référence)
  categoryId: z.string().nullable().optional(),

  // Catalogue (ID référence)
  catalogueId: z.string().optional(),

  // Décor et couleur
  decor: z.string().max(500).nullable().optional(),
  colorChoice: z.string().max(100).nullable().optional(),

  // Matériau
  material: z.string().max(100).nullable().optional(),

  // Statut stock
  stockStatus: z.enum(['EN_STOCK', 'SUR_COMMANDE', 'RUPTURE']).nullable().optional(),

  // URL image
  imageUrl: z.string().url().nullable().optional(),

  // Actif
  isActive: z.boolean().optional().default(true),

  // Sous-catégorie (string libre)
  sousCategorie: z.string().max(200).nullable().optional(),
});

export type PanelImportData = z.infer<typeof PanelImportSchema>;

/**
 * Schéma plus permissif pour le mode "warning"
 * Accepte les données mais log les anomalies
 */
export const PanelImportSchemaLenient = PanelImportSchema.extend({
  // Permettre des épaisseurs jusqu'à 500mm en mode lenient (planches épaisses)
  defaultThickness: z.number().min(0.1).max(500).nullable().optional(),
  thickness: z.array(z.number().min(0.1).max(500)).optional().default([]),
});

export type PanelImportDataLenient = z.infer<typeof PanelImportSchemaLenient>;

/**
 * Résultat de validation avec warnings
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
  warnings?: string[];
}

/**
 * Valide un panneau avec mode strict ou lenient
 * En mode lenient, les anomalies sont retournées comme warnings
 */
export function validatePanelImport(
  data: unknown,
  mode: 'strict' | 'lenient' = 'strict',
): ValidationResult<PanelImportData> {
  const schema = mode === 'strict' ? PanelImportSchema : PanelImportSchemaLenient;
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error,
    };
  }

  // En mode lenient, vérifier les warnings
  const warnings: string[] = [];
  const validData = result.data as PanelImportData;

  if (mode === 'lenient') {
    // Warning si épaisseur > 100mm
    if (validData.defaultThickness && validData.defaultThickness > 100) {
      warnings.push(
        `Épaisseur élevée (${validData.defaultThickness}mm) - vérifier si correct`,
      );
    }

    // Warning si largeur très petite (possible chant mal classifié)
    if (
      validData.defaultWidth &&
      validData.defaultWidth <= 50 &&
      validData.productType !== 'BANDE_DE_CHANT'
    ) {
      warnings.push(
        `Largeur ${validData.defaultWidth}mm avec type ${validData.productType} - possible bande de chant`,
      );
    }
  }

  return {
    success: true,
    data: validData,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
