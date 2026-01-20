'use client';

import { Search, X, Filter } from 'lucide-react';
import { useState } from 'react';

interface PanelSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  productType: string;
  onProductTypeChange: (value: string) => void;
  supplier: string;
  onSupplierChange: (value: string) => void;
}

const PRODUCT_TYPES = [
  { value: '', label: 'Tous types' },
  { value: 'MELAMINE', label: 'Mélaminé' },
  { value: 'STRATIFIE', label: 'Stratifié' },
  { value: 'MDF', label: 'MDF' },
  { value: 'BANDE_DE_CHANT', label: 'Bande de chant' },
  { value: 'COMPACT', label: 'Compact' },
  { value: 'PANNEAU_BRUT', label: 'Panneau brut' },
];

const SUPPLIERS = [
  { value: '', label: 'Tous fournisseurs' },
  { value: 'bouney', label: 'Bouney' },
  { value: 'dispano', label: 'Dispano' },
  { value: 'bcb', label: 'B comme Bois' },
];

export function PanelSearchBar({
  search,
  onSearchChange,
  productType,
  onProductTypeChange,
  supplier,
  onSupplierChange,
}: PanelSearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = productType || supplier;

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--cx-text-muted)]"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un panneau..."
          className="w-full pl-10 pr-20 py-2.5 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg text-sm text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] focus:outline-none focus:border-[var(--cx-accent)]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded transition-colors ${
              showFilters || hasFilters
                ? 'bg-[var(--cx-accent)]/20 text-[var(--cx-accent)]'
                : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)]'
            }`}
            aria-label="Filtres"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex gap-2">
          <select
            value={productType}
            onChange={(e) => onProductTypeChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg text-sm text-[var(--cx-text)] focus:outline-none focus:border-[var(--cx-accent)]"
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={supplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg text-sm text-[var(--cx-text)] focus:outline-none focus:border-[var(--cx-accent)]"
          >
            {SUPPLIERS.map((sup) => (
              <option key={sup.value} value={sup.value}>
                {sup.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                onProductTypeChange('');
                onSupplierChange('');
              }}
              className="px-3 py-2 text-sm text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}
    </div>
  );
}
