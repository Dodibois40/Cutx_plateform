'use client';

import { Command } from 'cmdk';
import { Clock, Folder, Package, Zap, Search } from 'lucide-react';
import { CommandItem } from './CommandItem';
import type { CommandResult, BreadcrumbItem } from '../types';

interface CommandGroupsProps {
  search: string;
  isLoading: boolean;
  recentSearches: string[];
  categories: CommandResult[];
  products: CommandResult[];
  onSelectRecent: (query: string) => void;
  onSelectCategory: (slug: string, path: BreadcrumbItem[]) => void;
  onSelectProduct: (productId: string) => void;
  onClearRecent: () => void;
}

export function CommandGroups({
  search,
  isLoading,
  recentSearches,
  categories,
  products,
  onSelectRecent,
  onSelectCategory,
  onSelectProduct,
  onClearRecent,
}: CommandGroupsProps) {
  const hasSearch = search.length > 0;
  const hasResults = categories.length > 0 || products.length > 0;

  // Loading state
  if (isLoading && hasSearch) {
    return (
      <div className="p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="cutx-command-skeleton">
            <div className="cutx-command-skeleton-circle" />
            <div className="cutx-command-skeleton-lines">
              <div className="cutx-command-skeleton-line" />
              <div className="cutx-command-skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (hasSearch && !hasResults && !isLoading) {
    return (
      <Command.Empty className="cutx-command-empty">
        <Search className="cutx-command-empty-icon" />
        <div className="cutx-command-empty-title">
          Aucun résultat pour "{search}"
        </div>
        <div className="cutx-command-empty-subtitle">
          Essayez avec d'autres mots-clés
        </div>
      </Command.Empty>
    );
  }

  return (
    <>
      {/* Recent searches (only when no search query) */}
      {!hasSearch && recentSearches.length > 0 && (
        <Command.Group className="cutx-command-group">
          <div className="cutx-command-group-heading">
            <Clock className="cutx-command-group-heading-icon" />
            <span>Récent</span>
          </div>
          {recentSearches.slice(0, 3).map((query) => (
            <CommandItem
              key={`recent-${query}`}
              result={{
                id: query,
                type: 'recent',
                title: query,
                onSelect: () => onSelectRecent(query),
              }}
              onSelect={() => onSelectRecent(query)}
            />
          ))}
        </Command.Group>
      )}

      {/* Quick actions (only when no search query) */}
      {!hasSearch && (
        <Command.Group className="cutx-command-group">
          <div className="cutx-command-group-heading">
            <Zap className="cutx-command-group-heading-icon" />
            <span>Actions rapides</span>
          </div>
          <CommandItem
            result={{
              id: 'search-panels',
              type: 'action',
              title: 'Rechercher des panneaux',
              subtitle: 'MDF, mélaminé, stratifié...',
              onSelect: () => {},
            }}
            onSelect={() => onSelectRecent('panneaux')}
          />
          <CommandItem
            result={{
              id: 'search-chants',
              type: 'action',
              title: 'Rechercher des chants',
              subtitle: 'ABS, PVC, bois...',
              onSelect: () => {},
            }}
            onSelect={() => onSelectRecent('chant')}
          />
        </Command.Group>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Command.Group className="cutx-command-group">
          <div className="cutx-command-group-heading">
            <Folder className="cutx-command-group-heading-icon" />
            <span>Catégories</span>
          </div>
          {categories.slice(0, 4).map((category) => (
            <CommandItem
              key={`category-${category.id}`}
              result={category}
              onSelect={() =>
                onSelectCategory(category.id, [
                  { slug: category.id, name: category.title },
                ])
              }
            />
          ))}
        </Command.Group>
      )}

      {/* Products */}
      {products.length > 0 && (
        <Command.Group className="cutx-command-group">
          <div className="cutx-command-group-heading">
            <Package className="cutx-command-group-heading-icon" />
            <span>Produits</span>
            {products.length > 8 && (
              <span className="ml-auto text-xs opacity-50">
                {products.length} résultats
              </span>
            )}
          </div>
          {products.slice(0, 8).map((product) => (
            <CommandItem
              key={`product-${product.id}`}
              result={product}
              onSelect={() => onSelectProduct(product.id)}
            />
          ))}
        </Command.Group>
      )}
    </>
  );
}
