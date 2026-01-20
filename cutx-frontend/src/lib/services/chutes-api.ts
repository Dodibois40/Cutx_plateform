import type {
  ChuteSearchResult,
  ChuteOfferingDetail,
  ChuteCard,
  ChuteSearchFilters,
  CreateChuteInput,
} from '@/types/chutes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

/**
 * Rechercher des chutes
 */
export async function searchChutes(
  filters: ChuteSearchFilters,
  token?: string,
): Promise<ChuteSearchResult> {
  const params = new URLSearchParams();

  // Convertir les filtres en query params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/chutes?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de la recherche: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupérer une chute par ID
 */
export async function getChuteById(
  id: string,
  token?: string,
): Promise<ChuteOfferingDetail> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/chutes/${id}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Chute non trouvée');
    }
    throw new Error(`Erreur: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupérer mes annonces
 */
export async function getMyListings(
  token: string,
  statuses?: string[],
): Promise<ChuteCard[]> {
  const params = new URLSearchParams();
  if (statuses?.length) {
    params.append('status', statuses.join(','));
  }

  const response = await fetch(
    `${API_URL}/api/chutes/my-listings?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Erreur: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Créer une nouvelle annonce
 */
export async function createChute(
  data: CreateChuteInput,
  token: string,
): Promise<ChuteOfferingDetail> {
  const response = await fetch(`${API_URL}/api/chutes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Mettre à jour une annonce
 */
export async function updateChute(
  id: string,
  data: Partial<CreateChuteInput>,
  token: string,
): Promise<ChuteOfferingDetail> {
  const response = await fetch(`${API_URL}/api/chutes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Publier un brouillon
 */
export async function publishChute(
  id: string,
  token: string,
): Promise<ChuteOfferingDetail> {
  const response = await fetch(`${API_URL}/api/chutes/${id}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Supprimer (archiver) une annonce
 */
export async function deleteChute(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/chutes/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.statusText}`);
  }
}

/**
 * Type pour une image uploadée
 */
export interface ChuteImageResult {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  order: number;
  isPrimary: boolean;
}

/**
 * Uploader une image pour une annonce
 */
export async function uploadChuteImage(
  chuteId: string,
  file: File,
  token: string,
  isPrimary: boolean = false,
): Promise<ChuteImageResult> {
  const formData = new FormData();
  formData.append('image', file);

  const params = new URLSearchParams();
  if (isPrimary) {
    params.append('isPrimary', 'true');
  }

  const response = await fetch(
    `${API_URL}/api/chutes/${chuteId}/images?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur lors de l'upload: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Supprimer une image d'une annonce
 */
export async function deleteChuteImage(
  chuteId: string,
  imageId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/chutes/${chuteId}/images/${imageId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur lors de la suppression: ${response.statusText}`);
  }
}

/**
 * Définir une image comme principale
 */
export async function setChuteImagePrimary(
  chuteId: string,
  imageId: string,
  token: string,
): Promise<ChuteImageResult> {
  const response = await fetch(
    `${API_URL}/api/chutes/${chuteId}/images/${imageId}/primary`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Formater le prix
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Formater les dimensions
 */
export function formatDimensions(
  length: number,
  width: number,
  thickness: number,
): string {
  // Convertir mm en cm si > 100mm
  const formatDim = (mm: number) => {
    if (mm >= 100) {
      return `${(mm / 10).toFixed(mm % 10 === 0 ? 0 : 1)} cm`;
    }
    return `${mm} mm`;
  };

  return `${formatDim(length)} × ${formatDim(width)} × ${thickness} mm`;
}

/**
 * Calculer la surface en m²
 */
export function calculateSurface(length: number, width: number): number {
  return (length * width) / 1000000; // mm² -> m²
}

/**
 * Formater la surface
 */
export function formatSurface(length: number, width: number): string {
  const surface = calculateSurface(length, width);
  return `${surface.toFixed(2)} m²`;
}

/**
 * Calculer le prix au m²
 */
export function calculatePricePerM2(
  price: number,
  length: number,
  width: number,
): number {
  const surface = calculateSurface(length, width);
  if (surface === 0) return 0;
  return price / surface;
}

/**
 * Formater la date relative
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}
