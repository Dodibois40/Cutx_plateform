'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import { useQueryClient } from '@tanstack/react-query';
import ProductDetailModal from '@/components/home/ProductDetailModal';
import { PanelSearchBar } from './PanelSearchBar';
import { PanelSelectionBar } from './PanelSelectionBar';
import { PanelList } from './PanelList';
import type { PanelManagerProps } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function PanelManager({
  onAssignComplete,
  selectedCategorySlug,
  selectedCategoryName,
  onClearCategoryFilter,
  clearSelectionTrigger,
  activeSuppliers,
}: PanelManagerProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Search state
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [supplier, setSupplier] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine which suppliers to use for the search
  // Priority: local supplier filter > activeSuppliers from sidebar
  const effectiveSuppliers = useMemo(() => {
    if (supplier) {
      // Local dropdown filter takes precedence
      return [supplier];
    }
    if (activeSuppliers && activeSuppliers.length > 0) {
      // Use sidebar filter
      return activeSuppliers;
    }
    // No filter - all suppliers
    return undefined;
  }, [supplier, activeSuppliers]);

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
    catalogueSlugs: effectiveSuppliers,
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

  // Delete selected panels
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Supprimer ${selectedIds.size} panneau${selectedIds.size > 1 ? 'x' : ''} définitivement ?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/catalogues/admin/panels`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ panelIds: Array.from(selectedIds) }),
      });

      if (res.ok) {
        setSelectedIds(new Set());
        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['catalogue-search'] });
        onAssignComplete?.();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Delete failed:', err);
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, getToken, queryClient, onAssignComplete]);

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
          onDelete={handleDeleteSelected}
          isDeleting={isDeleting}
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
