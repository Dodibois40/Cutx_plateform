/**
 * API Client pour les couleurs (RAL + Fabricants)
 * Récupère les données depuis le backend Firestore
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RALColor {
  code: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
}

interface ManufacturerColor {
  code: string;
  name?: string;
  hex: string;
  category?: string;
}

interface ManufacturerMeta {
  id: string;
  name: string;
  colorCount: number;
}

interface SearchResult {
  type: 'ral' | 'manufacturer';
  manufacturerId?: string;
  manufacturerName?: string;
  color: RALColor | ManufacturerColor;
}

// Cache local pour éviter les requêtes répétées
let ralColorsCache: RALColor[] | null = null;
let manufacturersCache: Map<string, ManufacturerColor[]> = new Map();
let manufacturersMetaCache: ManufacturerMeta[] | null = null;

/**
 * Récupère toutes les couleurs RAL
 */
export async function fetchRALColors(): Promise<RALColor[]> {
  if (ralColorsCache) return ralColorsCache;

  try {
    const response = await fetch(`${API_BASE}/api/couleurs/ral`);
    if (!response.ok) throw new Error('Erreur fetch RAL');

    const json = await response.json();
    if (json.success && json.data) {
      ralColorsCache = json.data;
      return json.data;
    }
    throw new Error('Format de réponse invalide');
  } catch (error) {
    console.error('Erreur fetchRALColors:', error);
    // Fallback vers données locales si API indisponible
    const { RAL_COLORS } = await import('./ral-colors');
    return RAL_COLORS;
  }
}

/**
 * Récupère une couleur RAL par son code
 */
export async function fetchRALByCode(code: string): Promise<RALColor | null> {
  try {
    const normalizedCode = encodeURIComponent(code);
    const response = await fetch(`${API_BASE}/api/couleurs/ral/${normalizedCode}`);
    if (!response.ok) return null;

    const json = await response.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (error) {
    console.error('Erreur fetchRALByCode:', error);
    // Fallback local
    const { getRALByCode } = await import('./ral-colors');
    return getRALByCode(code) || null;
  }
}

/**
 * Récupère la liste des fabricants disponibles
 */
export async function fetchManufacturers(): Promise<ManufacturerMeta[]> {
  if (manufacturersMetaCache) return manufacturersMetaCache;

  try {
    const response = await fetch(`${API_BASE}/api/couleurs/fabricants`);
    if (!response.ok) throw new Error('Erreur fetch fabricants');

    const json = await response.json();
    if (json.success && json.data) {
      manufacturersMetaCache = json.data;
      return json.data;
    }
    throw new Error('Format de réponse invalide');
  } catch (error) {
    console.error('Erreur fetchManufacturers:', error);
    // Fallback local
    const { MANUFACTURERS } = await import('./manufacturer-colors');
    return MANUFACTURERS.map(m => ({
      id: m.id,
      name: m.name,
      colorCount: m.colors.length
    }));
  }
}

/**
 * Récupère toutes les couleurs d'un fabricant
 */
export async function fetchManufacturerColors(manufacturerId: string): Promise<ManufacturerColor[]> {
  if (manufacturersCache.has(manufacturerId)) {
    return manufacturersCache.get(manufacturerId)!;
  }

  try {
    const response = await fetch(`${API_BASE}/api/couleurs/fabricants/${manufacturerId}`);
    if (!response.ok) throw new Error('Erreur fetch couleurs fabricant');

    const json = await response.json();
    if (json.success && json.data) {
      manufacturersCache.set(manufacturerId, json.data);
      return json.data;
    }
    throw new Error('Format de réponse invalide');
  } catch (error) {
    console.error('Erreur fetchManufacturerColors:', error);
    // Fallback local
    const { getManufacturerColors } = await import('./manufacturer-colors');
    return getManufacturerColors(manufacturerId);
  }
}

/**
 * Recherche une couleur dans RAL et tous les fabricants
 */
export async function searchColors(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];

  try {
    const response = await fetch(`${API_BASE}/api/couleurs/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Erreur search');

    const json = await response.json();
    if (json.success && json.data) {
      return json.data;
    }
    throw new Error('Format de réponse invalide');
  } catch (error) {
    console.error('Erreur searchColors:', error);
    // Fallback local
    const { searchManufacturerColor, MANUFACTURERS } = await import('./manufacturer-colors');
    const { RAL_COLORS } = await import('./ral-colors');

    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase();

    // Chercher dans RAL
    for (const color of RAL_COLORS) {
      if (color.code.toLowerCase().includes(normalizedQuery) ||
          color.name.toLowerCase().includes(normalizedQuery)) {
        results.push({ type: 'ral', color });
      }
    }

    // Chercher dans fabricants
    const manufacturerResults = searchManufacturerColor(query);
    for (const result of manufacturerResults) {
      results.push({
        type: 'manufacturer',
        manufacturerId: result.manufacturer.id,
        manufacturerName: result.manufacturer.name,
        color: result.color
      });
    }

    return results.slice(0, 20);
  }
}

/**
 * Invalide le cache local
 */
export function invalidateLocalCache(): void {
  ralColorsCache = null;
  manufacturersCache.clear();
  manufacturersMetaCache = null;
}

/**
 * Trouve la couleur RAL la plus proche d'un hex donné
 * Utilise les couleurs en cache ou les récupère depuis l'API
 */
export async function findClosestRALFromAPI(hex: string): Promise<RALColor> {
  const colors = await fetchRALColors();

  const normalizedHex = hex.replace('#', '');
  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);

  let closestColor = colors[0];
  let minDistance = Infinity;

  for (const ralColor of colors) {
    const distance = Math.sqrt(
      Math.pow(r - ralColor.rgb.r, 2) +
      Math.pow(g - ralColor.rgb.g, 2) +
      Math.pow(b - ralColor.rgb.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = ralColor;
    }
  }

  return closestColor;
}
