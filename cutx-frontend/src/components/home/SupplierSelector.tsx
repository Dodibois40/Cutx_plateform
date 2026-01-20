'use client';

import { useCallback } from 'react';

// Définition des fournisseurs disponibles
export const SUPPLIERS = [
  { slug: 'dispano', name: 'Dispano' },
  { slug: 'bouney', name: 'B comme Bois' },
  { slug: 'barrillet', name: 'Barillet' },  // Note: 'barrillet' avec 2 'l' (slug catalogue)
] as const;

export type SupplierSlug = typeof SUPPLIERS[number]['slug'];

interface SupplierSelectorProps {
  /** Slugs des fournisseurs actifs */
  activeSuppliers: SupplierSlug[];
  /** Callback quand un fournisseur est activé/désactivé */
  onToggle: (slug: SupplierSlug) => void;
}

/**
 * SupplierSelector - Sélecteur de fournisseurs cohérent avec ModeSelector
 * Dots olive comme indicateurs d'état actif
 */
export function SupplierSelector({ activeSuppliers, onToggle }: SupplierSelectorProps) {
  const handleToggle = useCallback((slug: SupplierSlug) => {
    // Empêcher de désactiver tous les fournisseurs
    if (activeSuppliers.length === 1 && activeSuppliers.includes(slug)) {
      return;
    }
    onToggle(slug);
  }, [activeSuppliers, onToggle]);

  return (
    <div className="inline-flex items-center gap-0.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
      {SUPPLIERS.map((supplier) => {
        const isActive = activeSuppliers.includes(supplier.slug);
        return (
          <button
            key={supplier.slug}
            onClick={() => handleToggle(supplier.slug)}
            className={`
              inline-flex items-center gap-2
              px-3 py-1.5
              text-xs font-medium rounded-lg
              transition-[background-color,color] duration-150
              ${isActive
                ? 'bg-white/[0.08] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }
            `}
            title={isActive ? `Désactiver ${supplier.name}` : `Activer ${supplier.name}`}
          >
            <span
              className={`
                w-1.5 h-1.5 rounded-full
                transition-colors duration-150
                ${isActive ? 'bg-[var(--cx-accent)]' : 'bg-white/20'}
              `}
            />
            <span>{supplier.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SupplierSelector;
