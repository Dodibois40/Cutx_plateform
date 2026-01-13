// Product type labels with colors
export const PRODUCT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  MELAMINE: { label: 'Mélaminé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  STRATIFIE: { label: 'Stratifié', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  MDF: { label: 'MDF', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  BANDE_DE_CHANT: { label: 'Chant', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  COMPACT: { label: 'Compact', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  CONTREPLAQUE: { label: 'CP', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  PARTICULE: { label: 'Agglo', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PLACAGE: { label: 'Placage', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  OSB: { label: 'OSB', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
  PANNEAU_MASSIF: { label: 'Massif', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

// Supplier badge config - keys must match API catalogue.name values
export const SUPPLIER_CONFIG: Record<string, { letter: string; color: string; title: string }> = {
  'Bouney': { letter: 'B', color: 'bg-sky-500/20 text-sky-400 border-sky-500/40', title: 'B comme Bois' },
  'Dispano': { letter: 'D', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', title: 'Dispano' },
  'Barrillet': { letter: 'B', color: 'bg-violet-500/20 text-violet-400 border-violet-500/40', title: 'Barrillet Distribution' },
};

// Calculate panel price from m2 price and dimensions
export function calculatePanelPrice(
  priceM2: number | null | undefined,
  length: number | string | undefined,
  width: number | undefined
): number | null {
  if (!priceM2 || !length || !width) return null;
  const l = typeof length === 'string' ? 0 : length;
  if (l === 0) return null;
  const surfaceM2 = (l * width) / 1_000_000;
  return Math.round(priceM2 * surfaceM2 * 100) / 100;
}

// Get product type config
export function getTypeConfig(productType: string | undefined | null) {
  return productType ? PRODUCT_TYPE_CONFIG[productType] : null;
}

// Get supplier config
export function getSupplierConfig(fournisseur: string | undefined | null) {
  return fournisseur ? SUPPLIER_CONFIG[fournisseur] : null;
}
