'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Recycle,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  ChevronDown,
  Plus,
  ArrowLeft,
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
  const router = useRouter();

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
    <div className="min-h-screen bg-[var(--cx-surface-0)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--cx-surface-0)]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo et nav */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Recycle size={24} className="text-green-400" />
                </div>
                <div>
                  <h1 className="font-semibold text-white">Marketplace Chutes</h1>
                  <p className="text-xs text-white/50">
                    {totalCount} annonce{totalCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/chutes/vendre"
                className="cx-btn cx-btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Vendre une chute</span>
              </Link>
              <CutXAppsMenu />
              <UserAccountMenu />
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="mt-4 flex items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une chute... (ex: mélaminé blanc 19mm)"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
              />
            </form>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`cx-btn ${showFilters ? 'cx-btn-accent-ghost' : 'cx-btn-secondary'} flex items-center gap-2`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filtres</span>
            </button>
          </div>

          {/* Filtres */}
          {showFilters && (
            <div className="mt-4 p-4 bg-[var(--cx-surface-1)] rounded-lg border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white">Filtres</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-white/50 hover:text-white flex items-center gap-1"
                >
                  <X size={14} />
                  Effacer
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Type de panneau */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">
                    Type de panneau
                  </label>
                  <select
                    value={filters.productTypes?.[0] || ''}
                    onChange={(e) =>
                      updateFilter(
                        'productTypes',
                        e.target.value ? [e.target.value as ProductType] : undefined,
                      )
                    }
                    className="w-full px-3 py-2 bg-[var(--cx-surface-2)] border border-white/10 rounded text-sm text-white"
                  >
                    <option value="">Tous</option>
                    {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* État */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">État</label>
                  <select
                    value={filters.conditions?.[0] || ''}
                    onChange={(e) =>
                      updateFilter(
                        'conditions',
                        e.target.value ? [e.target.value as ChuteCondition] : undefined,
                      )
                    }
                    className="w-full px-3 py-2 bg-[var(--cx-surface-2)] border border-white/10 rounded text-sm text-white"
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
                  <label className="block text-xs text-white/50 mb-1">
                    Prix max (€)
                  </label>
                  <input
                    type="number"
                    value={filters.priceMax || ''}
                    onChange={(e) =>
                      updateFilter(
                        'priceMax',
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    placeholder="Max"
                    className="w-full px-3 py-2 bg-[var(--cx-surface-2)] border border-white/10 rounded text-sm text-white"
                  />
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Trier par</label>
                  <select
                    value={filters.sortBy || 'date_desc'}
                    onChange={(e) =>
                      updateFilter(
                        'sortBy',
                        e.target.value as ChuteSearchFilters['sortBy'],
                      )
                    }
                    className="w-full px-3 py-2 bg-[var(--cx-surface-2)] border border-white/10 rounded text-sm text-white"
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
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* État de chargement */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cx-card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[var(--cx-surface-1)]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-[var(--cx-surface-1)] rounded w-3/4" />
                  <div className="h-4 bg-[var(--cx-surface-1)] rounded w-1/2" />
                  <div className="h-6 bg-[var(--cx-surface-1)] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400">
              Erreur lors du chargement des annonces
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 cx-btn cx-btn-secondary"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Liste des chutes */}
        {!isLoading && !error && (
          <>
            {allChutes.length === 0 ? (
              <div className="text-center py-16">
                <Recycle size={48} className="mx-auto text-white/20 mb-4" />
                <h2 className="text-xl font-medium text-white mb-2">
                  Aucune chute trouvée
                </h2>
                <p className="text-white/50 mb-6">
                  Soyez le premier à publier une annonce !
                </p>
                <Link href="/chutes/vendre" className="cx-btn cx-btn-primary">
                  Vendre une chute
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allChutes.map((chute) => (
                    <ChuteCard key={chute.id} chute={chute} />
                  ))}
                </div>

                {/* Load more */}
                {hasNextPage && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="cx-btn cx-btn-secondary"
                    >
                      {isFetchingNextPage
                        ? 'Chargement...'
                        : 'Voir plus d\'annonces'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ChutesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--cx-surface-0)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-[var(--cx-accent)]" />
        </div>
      }
    >
      <ChutesContent />
    </Suspense>
  );
}
