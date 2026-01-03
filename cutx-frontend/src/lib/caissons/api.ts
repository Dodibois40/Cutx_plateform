// lib/caissons/api.ts
// Service API pour les caissons - Percages System 32 et Export DXF

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// ============================================
// TYPES
// ============================================

export interface DrillingPoint {
  x: number;
  y: number;
  diameter: number;
  depth: number;
  type: 'blind' | 'through';
  source: 'system32' | 'hinge' | 'connector' | 'drawer_runner' | 'custom';
  fittingRef?: string;
}

export interface PanelDrillings {
  panelType: string;
  panelName: string;
  length: number;
  width: number;
  drillings: DrillingPoint[];
  totalHoles: number;
}

export interface DrillingStatistics {
  totalPanels: number;
  totalHoles: number;
  holesBySource: Record<string, number>;
  holesByDiameter: Record<number, number>;
}

export interface CalculateDrillingsResponse {
  panels: PanelDrillings[];
  statistics: DrillingStatistics;
}

export interface DrillingPattern {
  reference: string;
  name: string;
  brand: string;
  category: string;
  holes: Array<{
    offsetX: number;
    offsetY: number;
    diameter: number;
    depth: number;
    type: 'blind' | 'through';
    purpose: string;
  }>;
}

export interface System32Config {
  defaults: {
    backEdgeDistance: number;
    frontEdgeDistance: number;
    holeSpacing: number;
    holeDiameter: number;
    holeDepth: number;
    firstHoleOffset: number;
  };
  hingePatterns: Record<string, {
    cupDiameter: number;
    cupDepth: number;
    screwDistance: number;
    edgeDistance: number;
  }>;
  description: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Calcule les percages System 32 pour un caisson
 */
export async function calculateDrillings(params: {
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseurStructure: number;
  options?: {
    withSystem32?: boolean;
    withConnectors?: boolean;
    withHinges?: boolean;
    hingeType?: string;
    hingePosition?: 'left' | 'right';
    doorHeight?: number;
  };
}): Promise<CalculateDrillingsResponse> {
  const response = await fetch(`${API_URL}/api/caissons/calculate-drillings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  return response.json();
}

/**
 * Exporte un caisson en DXF (telechargement)
 */
export async function exportDxf(params: {
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseurStructure: number;
  options?: {
    withSystem32?: boolean;
    withConnectors?: boolean;
    withHinges?: boolean;
    hingeType?: string;
    hingePosition?: 'left' | 'right';
    doorHeight?: number;
  };
}): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/caissons/export/dxf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Erreur export DXF: ${response.status}`);
  }

  return response.blob();
}

/**
 * Exporte un caisson en DXF et retourne les donnees JSON (pour debug/preview)
 */
export async function exportDxfJson(params: {
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseurStructure: number;
  options?: {
    withSystem32?: boolean;
    withConnectors?: boolean;
    withHinges?: boolean;
    hingeType?: string;
    hingePosition?: 'left' | 'right';
    doorHeight?: number;
  };
}): Promise<{
  dxf: string;
  statistics: {
    totalPanels: number;
    totalHoles: number;
    totalEdgeMeters: number;
    holesByDiameter: Record<number, number>;
  };
  panels: PanelDrillings[];
}> {
  const response = await fetch(`${API_URL}/api/caissons/export/dxf-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Erreur export DXF: ${response.status}`);
  }

  return response.json();
}

/**
 * Genere un SVG pour un panneau
 */
export async function generateSvg(params: {
  panelType: string;
  length: number;
  width: number;
  thickness: number;
  drillings: DrillingPoint[];
  edges?: { A?: boolean; B?: boolean; C?: boolean; D?: boolean };
  options?: { width?: number; height?: number };
}): Promise<{ svg: string }> {
  const response = await fetch(`${API_URL}/api/caissons/export/svg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Erreur generation SVG: ${response.status}`);
  }

  return response.json();
}

/**
 * Recupere les patterns de percage disponibles
 */
export async function getDrillingPatterns(filters?: {
  brand?: string;
  category?: string;
}): Promise<DrillingPattern[]> {
  const params = new URLSearchParams();
  if (filters?.brand) params.append('brand', filters.brand);
  if (filters?.category) params.append('category', filters.category);

  const url = `${API_URL}/api/caissons/drilling-patterns${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  return response.json();
}

/**
 * Recupere la configuration System 32
 */
export async function getSystem32Config(): Promise<System32Config> {
  const response = await fetch(`${API_URL}/api/caissons/system32-config`);

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  return response.json();
}

// ============================================
// HELPERS
// ============================================

/**
 * Telecharge le fichier DXF
 */
export function downloadDxfFile(blob: Blob, filename: string = 'caisson.dxf'): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Convertit les panneaux calcules en params API
 */
export function configToApiParams(config: {
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseurStructure: number;
  avecFacade: boolean;
  positionCharniere: 'gauche' | 'droite';
  angleCharniere: number;
}): {
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseurStructure: number;
  options: {
    withSystem32: boolean;
    withConnectors: boolean;
    withHinges: boolean;
    hingeType: string;
    hingePosition: 'left' | 'right';
    doorHeight: number;
  };
} {
  const hingePosition: 'left' | 'right' = config.positionCharniere === 'gauche' ? 'left' : 'right';

  return {
    largeur: config.largeur,
    hauteur: config.hauteur,
    profondeur: config.profondeur,
    epaisseurStructure: config.epaisseurStructure,
    options: {
      withSystem32: true,
      withConnectors: true,
      withHinges: config.avecFacade,
      hingeType: config.angleCharniere === 155 ? 'CLIP_TOP_155' : 'CLIP_TOP_110',
      hingePosition,
      doorHeight: config.hauteur,
    },
  };
}
