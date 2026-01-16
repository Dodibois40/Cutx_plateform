/**
 * Constantes pour le module catalogues
 * Centralise les valeurs hardcodées pour faciliter la maintenance
 */

export const SEARCH_CONSTANTS = {
  /** Longueur minimum pour une recherche */
  MIN_SEARCH_LENGTH: 2,
  /** Limite par défaut pour les résultats */
  DEFAULT_LIMIT: 100,
  /** Limite pour l'autocomplétion */
  AUTOCOMPLETE_LIMIT: 6,
  /** Seuil de similarité pour la recherche trigram (0-1) */
  SIMILARITY_THRESHOLD: 0.2,
  /** Épaisseur maximale en mm */
  MAX_THICKNESS_MM: 100,
  /** Configuration PostgreSQL pour la recherche */
  POSTGRES_SEARCH_CONFIG: 'french_unaccent',
} as const;

export const CACHE_CONSTANTS = {
  /** TTL du cache des options de filtre (5 minutes) */
  FILTER_OPTIONS_CACHE_TTL_MS: 300000,
  /** TTL du cache des facettes (30 secondes) */
  FACETS_CACHE_TTL_MS: 30000,
  /** Fenêtre de tracking des vues (5 minutes) */
  VIEW_TRACKING_WINDOW_MS: 5 * 60 * 1000,
  /** Durée pour le nettoyage des logs de vues (1 semaine) */
  VIEW_LOGS_CLEANUP_DAYS: 7,
} as const;

export const STOCK_STATUS = {
  IN_STOCK: 'EN STOCK',
  OUT_OF_STOCK: 'RUPTURE',
  ON_ORDER: 'SUR COMMANDE',
} as const;

export const PANEL_TYPES = {
  CHANT: 'CHANT',
  PANNEAU: 'PANNEAU',
  STRATIFIE: 'STRATIFIE',
  BANDE_DE_CHANT: 'BANDE_DE_CHANT',
} as const;

/**
 * Mapping des colonnes de tri valides
 */
export const SORT_FIELD_MAP: Record<string, string> = {
  pricePerM2: 'pricePerM2',
  pricePerMl: 'pricePerMl',
  pricePerUnit: 'pricePerUnit',
  name: 'name',
  reference: 'reference',
  thickness: 'thickness',
  createdAt: 'createdAt',
} as const;

/**
 * Labels des catégories de décor
 */
export const DECOR_CATEGORY_LABELS: Record<string, string> = {
  BOIS: 'Bois',
  UNI: 'Uni',
  FANTAISIE: 'Fantaisie',
  PIERRE: 'Pierre & Minéral',
  METAL: 'Métal',
  TEXTILE: 'Textile',
  BETON: 'Béton',
} as const;

/**
 * Mapping des genres de produits pour les filtres
 */
export const GENRE_FILTERS = [
  { key: 'genre_hydrofuge', label: 'Hydrofuge', searchTerm: 'hydrofuge' },
  { key: 'genre_ignifuge', label: 'Ignifugé', searchTerm: 'ignifuge' },
  { key: 'genre_exterieur', label: 'Extérieur', searchTerm: 'extérieur' },
  { key: 'genre_acoustique', label: 'Acoustique', searchTerm: 'acoustique' },
  { key: 'genre_antistatique', label: 'Antistatique', searchTerm: 'antistatique' },
] as const;
