import type {
  ChuteOffering,
  ChuteImage,
  ChuteOffer,
  ChuteCondition,
  ChuteOfferingStatus,
  BoostLevel,
  ProductType,
  User,
  Category,
} from '@prisma/client';

// Type pour une chute avec ses relations de base
export type ChuteOfferingWithRelations = ChuteOffering & {
  images: ChuteImage[];
  seller: Pick<User, 'id' | 'firstName' | 'lastName' | 'company'>;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  _count?: {
    offers: number;
    favorites: number;
    messages: number;
  };
};

// Type pour le détail complet d'une chute
export type ChuteOfferingDetail = ChuteOfferingWithRelations & {
  offers?: ChuteOffer[];
};

// Type pour la carte d'une chute (liste)
export interface ChuteCard {
  id: string;
  title: string;
  productType: ProductType;
  material: string | null;
  thickness: number;
  length: number;
  width: number;
  condition: ChuteCondition;
  price: number;
  acceptsOffers: boolean;
  boostLevel: BoostLevel;
  city: string;
  postalCode: string;
  departement: string | null;
  status: ChuteOfferingStatus;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  primaryImage: string | null;
  useCatalogImage: boolean;
  catalogPanelId: string | null;
  seller: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
    averageRating: number | null;
  } | null;
  distance?: number; // Distance en km si géolocalisation
}

// Type pour les résultats de recherche
export interface ChuteSearchResult {
  items: ChuteCard[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets?: ChuteFacets;
}

// Facettes pour les filtres
export interface ChuteFacets {
  productTypes: { value: ProductType; count: number }[];
  conditions: { value: ChuteCondition; count: number }[];
  thicknesses: { value: number; count: number }[];
  priceRanges: { min: number; max: number; count: number }[];
  cities: { value: string; count: number }[];
  departements: { value: string; count: number }[];
}

// Commission selon le niveau de boost
export const COMMISSION_RATES: Record<BoostLevel, number> = {
  NONE: 0.05,      // 5%
  STANDARD: 0.08,  // 8%
  PREMIUM: 0.10,   // 10%
  URGENT: 0.12,    // 12%
};

// Coût du boost par semaine
export const BOOST_COSTS: Record<BoostLevel, number> = {
  NONE: 0,
  STANDARD: 2,
  PREMIUM: 5,
  URGENT: 10,
};

// Durée par défaut des annonces (30 jours)
export const DEFAULT_OFFERING_DURATION_DAYS = 30;

// Durée d'expiration des offres (48h)
export const OFFER_EXPIRATION_HOURS = 48;

// Nombre maximum d'images par annonce
export const MAX_IMAGES_PER_OFFERING = 5;
