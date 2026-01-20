// Types pour le Marketplace Chutes

export type ProductType =
  | 'MELAMINE'
  | 'STRATIFIE'
  | 'COMPACT'
  | 'PLACAGE'
  | 'AGGLO_BRUT'
  | 'MDF'
  | 'CONTREPLAQUE'
  | 'OSB'
  | 'MASSIF'
  | 'CHANT'
  | 'SOLID_SURFACE'
  | 'PANNEAU_DECO';

export type ChuteCondition = 'PARFAIT' | 'BON' | 'CORRECT' | 'A_NETTOYER';

export type ChuteOfferingStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'RESERVED'
  | 'SOLD'
  | 'EXPIRED'
  | 'ARCHIVED';

export type BoostLevel = 'NONE' | 'STANDARD' | 'PREMIUM' | 'URGENT';

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
  createdAt: string;
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
  distance?: number;
}

export interface ChuteSearchResult {
  items: ChuteCard[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets?: ChuteFacets;
}

export interface ChuteFacets {
  productTypes: { value: ProductType; count: number }[];
  conditions: { value: ChuteCondition; count: number }[];
  thicknesses: { value: number; count: number }[];
  priceRanges: { min: number; max: number; count: number }[];
  cities: { value: string; count: number }[];
  departements: { value: string; count: number }[];
}

export interface ChuteImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  order: number;
  isPrimary: boolean;
}

export interface ChuteOfferingDetail {
  id: string;
  title: string;
  description: string | null;
  productType: ProductType;
  material: string | null;
  thickness: number;
  length: number;
  width: number;
  quantity: number;
  condition: ChuteCondition;
  certificationChecks: string[];
  price: number;
  originalPanelPrice: number | null;
  acceptsOffers: boolean;
  minimumOffer: number | null;
  boostLevel: BoostLevel;
  latitude: number | null;
  longitude: number | null;
  city: string;
  postalCode: string;
  departement: string | null;
  images: ChuteImage[];
  useCatalogImage: boolean;
  catalogPanelId: string | null;
  status: ChuteOfferingStatus;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  seller: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    sellerProfile?: {
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
      averageRating: number | null;
      ratingCount: number;
      responseRate: number | null;
      responseTime: number | null;
      totalSales: number;
    } | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    offers: number;
    favorites: number;
    messages: number;
  };
}

export interface ChuteSearchFilters {
  q?: string;
  productTypes?: ProductType[];
  thicknessMin?: number;
  thicknessMax?: number;
  lengthMin?: number;
  lengthMax?: number;
  widthMin?: number;
  widthMax?: number;
  conditions?: ChuteCondition[];
  certifiedOnly?: boolean;
  priceMin?: number;
  priceMax?: number;
  acceptsOffersOnly?: boolean;
  postalCode?: string;
  departement?: string;
  radius?: number;
  userLat?: number;
  userLng?: number;
  verifiedSellersOnly?: boolean;
  categoryId?: string;
  statuses?: ChuteOfferingStatus[];
  sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'distance' | 'popularity' | 'boost';
  page?: number;
  limit?: number;
  includeFacets?: boolean;
}

export interface CreateChuteInput {
  title: string;
  description?: string;
  productType: ProductType;
  material?: string;
  thickness: number;
  length: number;
  width: number;
  quantity?: number;
  condition: ChuteCondition;
  certificationChecks?: string[];
  price: number;
  originalPanelPrice?: number;
  acceptsOffers?: boolean;
  minimumOffer?: number;
  boostLevel?: BoostLevel;
  city: string;
  postalCode: string;
  departement?: string;
  latitude?: number;
  longitude?: number;
  useCatalogImage?: boolean;
  catalogPanelId?: string;
  categoryId?: string;
  isDraft?: boolean;
}

// Labels et traductions
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  MELAMINE: 'Mélaminé',
  STRATIFIE: 'Stratifié',
  COMPACT: 'Compact',
  PLACAGE: 'Placage',
  AGGLO_BRUT: 'Aggloméré Brut',
  MDF: 'MDF',
  CONTREPLAQUE: 'Contreplaqué',
  OSB: 'OSB',
  MASSIF: 'Bois Massif',
  CHANT: 'Chant',
  SOLID_SURFACE: 'Solid Surface',
  PANNEAU_DECO: 'Panneau Décoratif',
};

export const CONDITION_LABELS: Record<ChuteCondition, string> = {
  PARFAIT: 'Parfait état',
  BON: 'Bon état',
  CORRECT: 'Correct',
  A_NETTOYER: 'À nettoyer',
};

export const CONDITION_COLORS: Record<ChuteCondition, string> = {
  PARFAIT: 'bg-green-500/20 text-green-400',
  BON: 'bg-blue-500/20 text-blue-400',
  CORRECT: 'bg-yellow-500/20 text-yellow-400',
  A_NETTOYER: 'bg-orange-500/20 text-orange-400',
};

export const BOOST_LABELS: Record<BoostLevel, string> = {
  NONE: 'Standard',
  STANDARD: 'Boost',
  PREMIUM: 'Premium',
  URGENT: 'Urgent',
};

export const BOOST_COLORS: Record<BoostLevel, string> = {
  NONE: '',
  STANDARD: 'bg-blue-500/20 text-blue-400',
  PREMIUM: 'bg-purple-500/20 text-purple-400',
  URGENT: 'bg-red-500/20 text-red-400',
};

export const STATUS_LABELS: Record<ChuteOfferingStatus, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'En vente',
  RESERVED: 'Réservée',
  SOLD: 'Vendue',
  EXPIRED: 'Expirée',
  ARCHIVED: 'Archivée',
};
