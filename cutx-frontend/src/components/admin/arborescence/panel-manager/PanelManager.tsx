'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import ProductDetailModal from '@/components/home/ProductDetailModal';
import { PanelSearchBar } from './PanelSearchBar';
import { PanelSelectionBar } from './PanelSelectionBar';
import { PanelList } from './PanelList';
import type { PanelManagerProps } from './types';

export function PanelManager({
  onAssignComplete,
  selectedCategorySlug,
  selectedCategoryName,
  onClearCategoryFilter,
  clearSelectionTrigger,
}: PanelManagerProps) {
  // Search state
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [supplier, setSupplier] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail modal state
  const [detailPanelId, setDetailPanelId] = useState<string | null>(null);

  // Fetch panels using the hook (returns produits directly, not data.pages)
  const {
    produits,
    isLoading,
    fetchNextPage,
    hasMore,
    isFetchingNextPage,
  } = useCatalogueSearch({
    search: search || '*',
    useSmartSearch: true,
    enabled: true,
    catalogueSlugs: supplier ? [supplier] : undefined,
    categorySlug: selectedCategorySlug || undefined,
  });

  // Filter by product type (client-side for now)
  const filteredPanels = useMemo(() => {
    if (!productType) return produits;
    return produits.filter((p) => p.productType === productType);
  }, [produits, productType]);

  // Selection handlers
  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredPanels.map((p) => p.id)));
  }, [filteredPanels]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Clear selection when a drop succeeds (clearSelectionTrigger is incremented)
  useEffect(() => {
    if (clearSelectionTrigger && clearSelectionTrigger > 0) {
      setSelectedIds(new Set());
    }
  }, [clearSelectionTrigger]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--cx-border)]">
        <h2 className="text-lg font-semibold text-[var(--cx-text)]">
          Panneaux
        </h2>
        <p className="text-xs text-[var(--cx-text-muted)] mt-0.5">
          {selectedCategorySlug
            ? 'Panneaux de cette catégorie'
            : 'Cliquez sur un dossier pour voir ses panneaux'}
        </p>
      </div>

      {/* Category filter badge */}
      {selectedCategorySlug && selectedCategoryName && (
        <div className="px-4 py-2 border-b border-[var(--cx-border)] bg-[rgba(127,163,126,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--accent-green)]">Catégorie :</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedCategoryName}
              </span>
            </div>
            {onClearCategoryFilter && (
              <button
                onClick={onClearCategoryFilter}
                className="text-xs px-2 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-warm)] transition-colors"
              >
                ✕ Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-[var(--cx-border)]">
        <PanelSearchBar
          search={search}
          onSearchChange={setSearch}
          productType={productType}
          onProductTypeChange={setProductType}
          supplier={supplier}
          onSupplierChange={setSupplier}
        />
      </div>

      {/* Selection bar */}
      <div className="px-4 py-2 border-b border-[var(--cx-border)]">
        <PanelSelectionBar
          selectedCount={selectedIds.size}
          onClearSelection={handleDeselectAll}
        />
      </div>

      {/* Panel list */}
      <PanelList
        panels={filteredPanels}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        isLoading={isLoading}
        onViewDetails={setDetailPanelId}
      />

      {/* Load more */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-[var(--cx-border)]">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full py-2 text-sm text-[var(--cx-accent)] hover:text-[var(--cx-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {isFetchingNextPage ? 'Chargement...' : 'Charger plus de panneaux'}
          </button>
        </div>
      )}

      {/* Detail modal */}
      <ProductDetailModal
        open={!!detailPanelId}
        productId={detailPanelId}
        onClose={() => setDetailPanelId(null)}
      />
    </div>
  );
}
