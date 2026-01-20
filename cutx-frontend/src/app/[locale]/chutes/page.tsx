'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Recycle,
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Leaf,
} from 'lucide-react';
import Link from 'next/link';
import { useChutesSearch } from '@/lib/hooks/chutes/useChutesSearch';
import { ChuteCard } from '@/components/chutes/listing/ChuteCard';
import type { ChuteSearchFilters, ProductType, ChuteCondition } from '@/types/chutes';
import { PRODUCT_TYPE_LABELS, CONDITION_LABELS } from '@/types/chutes';
import { CutXAppsMenu } from '@/components/ui/CutXAppsMenu';
import { UserAccountMenu } from '@/components/ui/UserAccountMenu';

// Wrapper avec Suspense pour useSearchParams
function ChutesContent() {
  const searchParams = useSearchParams();

  // État des filtres
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ChuteSearchFilters>({
    q: searchParams.get('q') || undefined,
    productTypes: searchParams.get('type')
      ? ([searchParams.get('type')] as ProductType[])
      : undefined,
    sortBy: (searchParams.get('sort') as ChuteSearchFilters['sortBy']) || 'date_desc',
  });

  // Recherche
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useChutesSearch({
    filters,
    enabled: true,
  });

  // Toutes les chutes
  const allChutes = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const totalCount = data?.pages[0]?.total || 0;

  // Gérer la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchQuery || undefined }));
  };

  // Mettre à jour un filtre
  const updateFilter = <K extends keyof ChuteSearchFilters>(
    key: K,
    value: ChuteSearchFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Effacer les filtres
  const clearFilters = () => {
    setSearchQuery('');
    setFilters({ sortBy: 'date_desc' });
  };

  // Options de tri
  const sortOptions = [
    { value: 'date_desc', label: 'Plus récent' },
    { value: 'date_asc', label: 'Plus ancien' },
    { value: 'price_asc', label: 'Prix croissant' },
    { value: 'price_desc', label: 'Prix décroissant' },
    { value: 'popularity', label: 'Populaire' },
  ];

  return (
    <div className="fixed inset-0 w-full h-full bg-[var(--cx-background)] flex flex-col overflow-hidden">
      {/* Top bar - positioned elements like homepage */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <UserAccountMenu />
        <CutXAppsMenu hideTeaser />
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <Link
          href="/chutes/vendre"
          className="cx-btn cx-btn--primary flex items-center gap-2"
          style={{
            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
            borderColor: '#22c55e',
          }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Vendre une chute</span>
        </Link>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header section - centered like homepage */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-16 pb-8 px-4">
          {/* Logo CutX - link to home */}
          <Link
            href="/"
            className="mb-6 hover:opacity-80 transition-opacity"
          >
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter">
              <span className="text-white">Cut</span>
              <span className="text-amber-500">X</span>
            </h1>
          </Link>

          {/* Section title with eco badge */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
              }}
            >
              <Recycle
                size={22}
                className="text-green-400"
                style={{ animation: 'cx-subtle-pulse 3s ease-in-out infinite' }}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                Marketplace Chutes
                <span
                  className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full"
                  style={{
                    background: 'rgba(74, 222, 128, 0.12)',
                    color: '#4ade80',
                    border: '1px solid rgba(74, 222, 128, 0.2)',
                  }}
                >
                  <Leaf size={10} className="inline mr-1" />
                  Éco
                </span>
              </h2>
              <p className="text-sm text-[var(--cx-text-muted)]">
                {totalCount} annonce{totalCount !== 1 ? 's' : ''} disponible{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Search bar - same style as homepage */}
          <div className="w-full max-w-2xl mt-6">
            <form onSubmit={handleSearch} className="relative group">
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(139, 154, 75, 0.1) 100%)',
                  filter: 'blur(8px)',
                }}
              />
              <div className="relative flex items-center">
                <Search
                  size={20}
                  className="absolute left-4 text-[var(--cx-text-muted)] group-focus-within:text-green-400 transition-colors"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une chute... (ex: mélaminé blanc 19mm)"
                  className="w-full pl-12 pr-24 py-3.5 bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-xl text-white placeholder:text-[var(--cx-text-muted)] focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-lg transition-all ${
                      showFilters
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'hover:bg-[var(--cx-surface-3)] text-[var(--cx-text-muted)] hover:text-white border border-transparent'
                    }`}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>
              </div>
            </form>

            {/* Filters panel */}
            {showFilters && (
              <div
                className="mt-4 p-5 rounded-xl border cx-smooth-appear"
                style={{
                  background: 'var(--cx-surface-1)',
                  borderColor: 'var(--cx-border-default)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Filtres</h3>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[var(--cx-text-muted)] hover:text-green-400 flex items-center gap-1.5 transition-colors"
                  >
                    <X size={14} />
                    Effacer tout
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Type de panneau */}
                  <div>
                    <label className="block text-xs text-[var(--cx-text-tertiary)] mb-2 uppercase tracking-wide font-medium">
                      Type
                    </label>
                    <select
                      value={filters.productTypes?.[0] || ''}
                      onChange={(e) =>
                        updateFilter(
                          'productTypes',
                          e.target.value ? [e.target.value as ProductType] : undefined,
                        )
                      }
                      className="cx-input"
                    >
                      <option value="">Tous les types</option>
                      {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* État */}
                  <div>
                    <label className="block text-xs text-[var(--cx-text-tertiary)] mb-2 uppercase tracking-wide font-medium">
                      État
                    </label>
                    <select
                      value={filters.conditions?.[0] || ''}
                      onChange={(e) =>
                        updateFilter(
                          'conditions',
                          e.target.value ? [e.target.value as ChuteCondition] : undefined,
                        )
                      }
                      className="cx-input"
                    >
                      <option value="">Tous</option>
                      {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prix max */}
                  <div>
                    <label className="block text-xs text-[var(--cx-text-tertiary)] mb-2 uppercase tracking-wide font-medium">
                      Prix max
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={filters.priceMax || ''}
                        onChange={(e) =>
                          updateFilter(
                            'priceMax',
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="—"
                        className="cx-input pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cx-text-muted)] text-sm">€</span>
                    </div>
                  </div>

                  {/* Tri */}
                  <div>
                    <label className="block text-xs text-[var(--cx-text-tertiary)] mb-2 uppercase tracking-wide font-medium">
                      Tri
                    </label>
                    <select
                      value={filters.sortBy || 'date_desc'}
                      onChange={(e) =>
                        updateFilter(
                          'sortBy',
                          e.target.value as ChuteSearchFilters['sortBy'],
                        )
                      }
                      className="cx-input"
                    >
                      {sortOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results area - scrollable */}
        <main className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Loading state */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 cx-stagger-children">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="cx-card overflow-hidden">
                    <div className="aspect-[4/3] cx-skeleton" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 cx-skeleton rounded w-3/4" />
                      <div className="h-4 cx-skeleton rounded w-1/2" />
                      <div className="h-6 cx-skeleton rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-[var(--cx-error-muted)] flex items-center justify-center mb-4">
                  <X size={32} className="text-[var(--cx-error)]" />
                </div>
                <p className="text-[var(--cx-error)] font-medium mb-4">
                  Erreur lors du chargement des annonces
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="cx-btn cx-btn--secondary"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && (
              <>
                {allChutes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                      style={{
                        background: 'rgba(74, 222, 128, 0.08)',
                        border: '1px solid rgba(74, 222, 128, 0.15)',
                      }}
                    >
                      <Recycle size={40} className="text-green-400/50" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Aucune chute trouvée
                    </h2>
                    <p className="text-[var(--cx-text-muted)] mb-8 text-center max-w-md">
                      Soyez le premier à publier une annonce et donnez une seconde vie à vos chutes de panneaux !
                    </p>
                    <Link
                      href="/chutes/vendre"
                      className="cx-btn cx-btn--primary flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
                        borderColor: '#22c55e',
                      }}
                    >
                      <Plus size={18} />
                      Vendre une chute
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 cx-stagger-children">
                      {allChutes.map((chute) => (
                        <ChuteCard key={chute.id} chute={chute} />
                      ))}
                    </div>

                    {/* Load more */}
                    {hasNextPage && (
                      <div className="mt-10 flex justify-center">
                        <button
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                          className="cx-btn cx-btn--secondary"
                        >
                          {isFetchingNextPage ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full cx-spin" />
                              Chargement...
                            </>
                          ) : (
                            "Voir plus d'annonces"
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ChutesPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[var(--cx-background)] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-2 border-green-500/20 border-t-green-500 rounded-full cx-spin" />
          <p className="text-[var(--cx-text-muted)] text-sm">Chargement du marketplace...</p>
        </div>
      }
    >
      <ChutesContent />
    </Suspense>
  );
}
