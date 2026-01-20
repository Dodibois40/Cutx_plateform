'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Command } from 'cmdk';
import { CommandInput } from './CommandInput';
import { CommandGroups } from './CommandGroups';
import { CommandFooter } from './CommandFooter';
import { useCommandSearch } from '../hooks/useCommandSearch';
import { useRecentSearches } from '../hooks/useRecentSearches';
import type { CommandPaletteProps, BreadcrumbItem } from '../types';
import './styles.css';

export function CommandPalette({
  open,
  onOpenChange,
  onSelectCategory,
  onSelectProduct,
  onSearch,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { isLoading, categories, products } = useCommandSearch(search, {
    enabled: open,
  });
  const { recentSearches, addRecent, clearRecent } = useRecentSearches();

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      // Delay reset to avoid flash
      const timer = setTimeout(() => setSearch(''), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle category selection
  const handleSelectCategory = useCallback(
    (slug: string, path: BreadcrumbItem[]) => {
      addRecent(path.map((p) => p.name).join(' > '));
      onSelectCategory(slug, path);
      onOpenChange(false);
    },
    [addRecent, onSelectCategory, onOpenChange]
  );

  // Handle product selection
  const handleSelectProduct = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        addRecent(product.title);
      }
      onSelectProduct(productId);
      onOpenChange(false);
    },
    [products, addRecent, onSelectProduct, onOpenChange]
  );

  // Handle recent search selection
  const handleSelectRecent = useCallback(
    (query: string) => {
      setSearch(query);
      onSearch(query);
      addRecent(query);
    },
    [onSearch, addRecent]
  );

  // Handle search submit (Enter on empty or with text)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && search.length >= 2) {
        addRecent(search);
        onSearch(search);
        onOpenChange(false);
      }
    },
    [search, addRecent, onSearch, onOpenChange]
  );

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="cutx-command-overlay"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <Command
        className="cutx-command-palette cutx-command-dialog"
        onKeyDown={handleKeyDown}
        loop
        shouldFilter={false}
      >
        <CommandInput
          ref={inputRef}
          value={search}
          onValueChange={setSearch}
          isLoading={isLoading}
        />

        <Command.List className="cutx-command-list">
          <CommandGroups
            search={search}
            isLoading={isLoading}
            recentSearches={recentSearches}
            categories={categories}
            products={products}
            onSelectRecent={handleSelectRecent}
            onSelectCategory={handleSelectCategory}
            onSelectProduct={handleSelectProduct}
            onClearRecent={clearRecent}
          />
        </Command.List>

        <CommandFooter />
      </Command>
    </>
  );
}

// Re-export sub-components
export { CommandInput } from './CommandInput';
export { CommandItem } from './CommandItem';
export { CommandGroups } from './CommandGroups';
export { CommandFooter } from './CommandFooter';
