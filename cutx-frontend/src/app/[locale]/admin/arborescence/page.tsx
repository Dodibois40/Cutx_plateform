'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Store,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import {
  CategoryTree,
  CategoryForm,
  type AdminCategory,
} from '@/components/admin/arborescence';
import { PanelManager, usePanelAssignment } from '@/components/admin/arborescence/panel-manager';
import { SupplierSelector, SUPPLIERS, type SupplierSlug } from '@/components/home/SupplierSelector';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ═══════════════════════════════════════════════════════════════
// PAGE ARBORESCENCE - Design "Botanical Admin"
// Tons forêt profonds, accents dorés, atmosphère organique
// ═══════════════════════════════════════════════════════════════

export default function ArborescenceAdminPage() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  // État pour les fournisseurs actifs (tous sélectionnés par défaut)
  const [activeSuppliers, setActiveSuppliers] = useState<SupplierSlug[]>(
    SUPPLIERS.map(s => s.slug)
  );

  // État pour la catégorie sélectionnée (pour filtrer les panneaux)
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);

  // Trigger pour vider la sélection dans PanelManager après un drop réussi
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0);

  const fetchCategories = useCallback(async (supplierSlugs?: SupplierSlug[]) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();

      // Construire l'URL avec le paramètre catalogues si pas tous sélectionnés
      const slugsToUse = supplierSlugs ?? activeSuppliers;
      const params = new URLSearchParams();
      if (slugsToUse.length > 0 && slugsToUse.length < SUPPLIERS.length) {
        params.set('catalogues', slugsToUse.join(','));
      }
      const queryString = params.toString();
      const url = `${API_URL}/api/catalogues/admin/categories${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('admin');
          return;
        }
        throw new Error('Erreur lors du chargement');
      }

      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [getToken, activeSuppliers]);

  // Fetch initial
  useEffect(() => {
    fetchCategories();
  }, []);

  // Re-fetch quand les fournisseurs changent
  const handleSupplierToggle = useCallback((slug: SupplierSlug) => {
    setActiveSuppliers(prev => {
      // Empêcher de tout désélectionner
      if (prev.length === 1 && prev.includes(slug)) {
        return prev;
      }
      const newSuppliers = prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug];
      // Fetch avec les nouveaux fournisseurs
      fetchCategories(newSuppliers);
      return newSuppliers;
    });
  }, [fetchCategories]);

  // Handlers
  const handleCreateRoot = () => {
    setParentForNew(null);
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleCreateChild = (parentId: string) => {
    setParentForNew(parentId);
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEdit = (category: AdminCategory) => {
    setEditingCategory(category);
    setParentForNew(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
    setParentForNew(null);
  };

  // Handler pour la sélection de catégorie (afficher ses panneaux)
  const handleCategorySelect = useCallback((category: AdminCategory) => {
    // Toggle: si déjà sélectionné, désélectionner
    setSelectedCategory((prev) => (prev?.id === category.id ? null : category));
  }, []);

  // Handler pour effacer le filtre de catégorie
  const handleClearCategoryFilter = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Panel assignment hook
  const { assignPanelsToCategory, isAssigning } = usePanelAssignment();

  const handlePanelsDropped = async (panelIds: string[], categoryId: string) => {
    try {
      const result = await assignPanelsToCategory({ panelIds, categoryId });
      if (result.success > 0) {
        // Refresh to update panel counts
        await fetchCategories();
        // Clear selection in PanelManager to prevent re-dropping same panels
        setClearSelectionTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error assigning panels:', err);
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'assignation');
    }
  };

  // Stats
  const countAll = (cats: AdminCategory[]): { cats: number; panels: number } =>
    (cats || []).reduce(
      (acc, c) => {
        const sub = countAll(c.children || []);
        return {
          cats: acc.cats + 1 + sub.cats,
          panels: acc.panels + (c._count?.panels || 0) + sub.panels,
        };
      },
      { cats: 0, panels: 0 }
    );

  const stats = countAll(categories);

  // Categories avec compteurs agrégés pour l'affichage
  const categoriesWithAggregated = useMemo(() => {
    // Calculer les compteurs agrégés pour chaque catégorie (somme des enfants)
    const computeAggregatedCount = (cat: AdminCategory): number => {
      const childCount = (cat.children || []).reduce(
        (sum, child) => sum + computeAggregatedCount(child),
        0
      );
      return (cat._count?.panels || 0) + childCount;
    };

    // Ajouter aggregatedCount à chaque catégorie récursivement
    const addAggregatedCounts = (cats: AdminCategory[]): AdminCategory[] =>
      cats.map((cat) => ({
        ...cat,
        aggregatedCount: computeAggregatedCount(cat),
        children: cat.children ? addAggregatedCounts(cat.children) : undefined,
      }));

    return addAggregatedCounts(categories);
  }, [categories]);

  // Erreur admin
  if (error === 'admin') {
    return (
      <div className="error-page">
        <div className="error-icon">
          <AlertTriangle size={40} />
        </div>
        <h1>Accès restreint</h1>
        <p>Cette page est réservée aux administrateurs</p>
        <Link href="/" className="back-link">
          Retour à l&apos;accueil
        </Link>
        <style jsx>{`
          .error-page {
            min-height: 100vh;
            background: var(--bg-deep);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            font-family: var(--font-body);
          }
          .error-icon {
            width: 80px;
            height: 80px;
            background: rgba(217, 119, 87, 0.15);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-warm);
          }
          h1 {
            font-family: var(--font-display);
            font-size: 1.75rem;
            color: var(--text-primary);
            margin: 0;
          }
          p {
            color: var(--text-muted);
          }
          .back-link {
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            text-decoration: none;
            transition: all 0.2s;
          }
          .back-link:hover {
            border-color: var(--accent-gold);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="arbo-page">
      {/* ══════════════════════════════════════════════════════════
          SIDEBAR GAUCHE
          ══════════════════════════════════════════════════════════ */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/" className="back-btn">
            <ArrowLeft size={18} />
            <span>Retour</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Administration</div>
          <Link href="/fr/admin/fournisseurs" className="nav-item">
            <Store size={18} />
            <span>Fournisseurs</span>
          </Link>
          <button className="nav-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v6m0 0l-3-3m3 3l3-3" />
              <circle cx="12" cy="14" r="4" />
              <path d="M12 18v4" />
              <path d="M4.93 10.93l2.83 2.83" />
              <path d="M16.24 13.76l2.83-2.83" />
            </svg>
            <span>Arborescence</span>
          </button>
        </nav>

        {/* Filtre par fournisseur */}
        <div className="supplier-filter-section">
          <div className="filter-label">Filtrer par fournisseur</div>
          <div className="supplier-selector-wrapper">
            <SupplierSelector
              activeSuppliers={activeSuppliers}
              onToggle={handleSupplierToggle}
            />
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="stats-mini">
            <div className="stat">
              <span className="stat-value">{stats.cats}</span>
              <span className="stat-label">catégories</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.panels.toLocaleString()}</span>
              <span className="stat-label">panneaux</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
          ══════════════════════════════════════════════════════════ */}
      <main className="main-content">
        {/* Header avec illustration */}
        <header className="page-header">
          <div className="header-bg" />
          <div className="header-content">
            <div className="header-text">
              <h1>Arborescence</h1>
              <p>Organisez la structure de votre catalogue</p>
            </div>
            <div className="header-actions">
              <button onClick={handleCreateRoot} className="btn-create">
                <Plus size={18} />
                <span>Nouvelle racine</span>
              </button>
              <button
                onClick={() => fetchCategories()}
                disabled={loading}
                className="btn-refresh"
              >
                <RefreshCw size={18} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>
          {/* Décoration organique */}
          <div className="header-decoration">
            <svg viewBox="0 0 200 80" className="branch-svg">
              <path
                d="M0 60 Q50 50, 80 30 T160 40 T200 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.3"
              />
              <circle cx="80" cy="30" r="4" fill="currentColor" opacity="0.4" />
              <circle cx="130" cy="35" r="3" fill="currentColor" opacity="0.3" />
              <circle cx="170" cy="25" r="5" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
        </header>

        {/* Zone de l'arbre */}
        <div className="tree-container">
          {loading ? (
            <div className="loading-state">
              <div className="loader">
                <div className="leaf leaf-1" />
                <div className="leaf leaf-2" />
                <div className="leaf leaf-3" />
              </div>
              <p>Chargement de l&apos;arborescence...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertTriangle size={32} />
              <p>{error}</p>
              <button onClick={() => fetchCategories()}>Réessayer</button>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="60" r="15" fill="currentColor" opacity="0.2" />
                  <path
                    d="M40 45 L40 20 M40 30 L30 20 M40 30 L50 20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Aucune catégorie</h3>
              <p>Commencez par créer votre première catégorie racine</p>
              <button onClick={handleCreateRoot} className="btn-create-empty">
                <Plus size={18} />
                Créer une catégorie
              </button>
            </div>
          ) : (
            <CategoryTree
              categories={categoriesWithAggregated}
              onCreateChild={handleCreateChild}
              onEdit={handleEdit}
              onRefresh={() => fetchCategories()}
              onPanelsDropped={handlePanelsDropped}
              onCategorySelect={handleCategorySelect}
              selectedCategoryId={selectedCategory?.id}
            />
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════
          SIDEBAR DROITE - Panel Manager pour assignation
          ══════════════════════════════════════════════════════════ */}
      <aside className="panel-manager-sidebar">
        <PanelManager
          onAssignComplete={() => fetchCategories()}
          selectedCategorySlug={selectedCategory?.slug}
          selectedCategoryName={selectedCategory?.name}
          onClearCategoryFilter={handleClearCategoryFilter}
          clearSelectionTrigger={clearSelectionTrigger}
        />
        {isAssigning && (
          <div className="assigning-overlay">
            <div className="assigning-spinner" />
            <span>Assignation en cours...</span>
          </div>
        )}
      </aside>

      {/* Modal */}
      {showForm && (
        <CategoryForm
          category={editingCategory}
          parentId={parentForNew}
          categories={categories}
          onClose={handleFormClose}
          onSaved={() => fetchCategories()}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          STYLES - Design System "Botanical Admin"
          ══════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&display=swap');

        :root {
          --font-display: 'Fraunces', Georgia, serif;
          --font-body: 'DM Sans', system-ui, sans-serif;

          /* Palette Forêt Profonde */
          --bg-deep: #0d1210;
          --bg-surface: #141a17;
          --bg-card: #1a211d;
          --bg-elevated: #212923;

          --border: #2a3530;
          --border-subtle: #232b27;

          --text-primary: #e8ebe9;
          --text-secondary: #a8b5ad;
          --text-muted: #6b7a71;

          /* Accents */
          --accent-green: #7fa37e;
          --accent-gold: #c9a962;
          --accent-warm: #d97757;

          --accent-green-glow: rgba(127, 163, 126, 0.15);
          --accent-gold-glow: rgba(201, 169, 98, 0.1);
        }

        /* ═══════════════════════════════════════════════════════
           LAYOUT
           ═══════════════════════════════════════════════════════ */
        .arbo-page {
          display: flex;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          background: var(--bg-deep);
          font-family: var(--font-body);
          color: var(--text-primary);
        }

        /* ═══════════════════════════════════════════════════════
           SIDEBAR GAUCHE
           ═══════════════════════════════════════════════════════ */
        .sidebar {
          width: 240px;
          background: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          margin: -0.5rem;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          color: var(--text-primary);
          background: var(--bg-card);
        }

        .sidebar-nav {
          flex: 1;
          padding: 0.5rem;
        }

        .nav-label {
          padding: 0.75rem 1rem 0.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.625rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.9rem;
          text-decoration: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .nav-item:hover {
          background: var(--bg-card);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--accent-green-glow);
          color: var(--accent-green);
          border: 1px solid rgba(127, 163, 126, 0.2);
        }

        .nav-item svg {
          opacity: 0.8;
        }

        .nav-item.active svg {
          opacity: 1;
        }

        /* Filtre fournisseurs */
        .supplier-filter-section {
          padding: 1rem;
          border-top: 1px solid var(--border-subtle);
          margin-top: auto;
        }

        .filter-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }

        .supplier-selector-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        /* Override SupplierSelector styles for sidebar */
        .supplier-selector-wrapper > div {
          flex-direction: column;
          gap: 0.25rem;
          background: transparent;
          border: none;
          padding: 0;
        }

        .supplier-selector-wrapper button {
          width: 100%;
          justify-content: flex-start;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
        }

        .supplier-selector-wrapper button:hover {
          background: var(--bg-elevated);
          border-color: var(--border);
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .stats-mini {
          display: flex;
          gap: 1rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 500;
          color: var(--accent-gold);
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ═══════════════════════════════════════════════════════
           CONTENU PRINCIPAL - 50/50 avec scroll indépendant
           ═══════════════════════════════════════════════════════ */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-height: 100vh;
        }

        .page-header {
          position: relative;
          padding: 1.25rem 2rem;
          background: linear-gradient(
            135deg,
            var(--bg-surface) 0%,
            var(--bg-card) 100%
          );
          border-bottom: 1px solid var(--border-subtle);
          overflow: hidden;
          flex-shrink: 0;
        }

        .header-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at 70% 0%,
            var(--accent-green-glow) 0%,
            transparent 50%
          );
          pointer-events: none;
        }

        .header-content {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .header-text h1 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 500;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .header-text p {
          margin: 0.25rem 0 0;
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-create {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--accent-green) 0%, #6a9069 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(127, 163, 126, 0.25);
        }

        .btn-create:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(127, 163, 126, 0.35);
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refresh:hover {
          border-color: var(--accent-green);
          color: var(--accent-green);
        }

        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .header-decoration {
          display: none; /* Masqué pour gagner de l'espace */
        }

        .branch-svg {
          width: 100%;
          height: 100%;
        }

        /* Tree Container - Scrollable indépendamment */
        .tree-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.5rem 2rem;
          min-height: 0; /* Important pour flex scroll */
        }

        /* ═══════════════════════════════════════════════════════
           FUTURISTIC SCROLLBARS
           ═══════════════════════════════════════════════════════ */

        /* Base scrollbar styles for both panels */
        .tree-container::-webkit-scrollbar,
        .panel-manager-sidebar ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .tree-container::-webkit-scrollbar-track,
        .panel-manager-sidebar ::-webkit-scrollbar-track {
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(127, 163, 126, 0.03) 50%,
            transparent 100%
          );
          border-radius: 4px;
        }

        .tree-container::-webkit-scrollbar-thumb,
        .panel-manager-sidebar ::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            var(--accent-gold) 0%,
            var(--accent-green) 50%,
            var(--accent-gold) 100%
          );
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: padding-box;
          box-shadow:
            0 0 8px rgba(201, 169, 98, 0.4),
            inset 0 0 4px rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .tree-container::-webkit-scrollbar-thumb:hover,
        .panel-manager-sidebar ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            #e8cc77 0%,
            #8fb88e 50%,
            #e8cc77 100%
          );
          box-shadow:
            0 0 15px rgba(201, 169, 98, 0.6),
            0 0 30px rgba(127, 163, 126, 0.3),
            inset 0 0 6px rgba(255, 255, 255, 0.2);
        }

        .tree-container::-webkit-scrollbar-thumb:active,
        .panel-manager-sidebar ::-webkit-scrollbar-thumb:active {
          background: linear-gradient(
            180deg,
            var(--accent-green) 0%,
            var(--accent-gold) 100%
          );
        }

        /* Corner piece */
        .tree-container::-webkit-scrollbar-corner,
        .panel-manager-sidebar ::-webkit-scrollbar-corner {
          background: transparent;
        }

        /* Firefox scrollbar */
        .tree-container,
        .panel-manager-sidebar {
          scrollbar-width: thin;
          scrollbar-color: var(--accent-green) transparent;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-muted);
        }

        .loader {
          position: relative;
          width: 60px;
          height: 60px;
          margin-bottom: 1.5rem;
        }

        .leaf {
          position: absolute;
          width: 12px;
          height: 12px;
          background: var(--accent-green);
          border-radius: 50% 0 50% 50%;
          animation: float 1.5s ease-in-out infinite;
        }

        .leaf-1 {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: 0s;
        }

        .leaf-2 {
          bottom: 10px;
          left: 10px;
          animation-delay: 0.3s;
        }

        .leaf-3 {
          bottom: 10px;
          right: 10px;
          animation-delay: 0.6s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-10px) scale(1.1);
            opacity: 1;
          }
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem;
          text-align: center;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          color: var(--accent-green);
          margin-bottom: 1.5rem;
          opacity: 0.6;
        }

        .empty-state h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 0.5rem;
        }

        .empty-state p {
          color: var(--text-muted);
          margin: 0 0 1.5rem;
        }

        .btn-create-empty {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--bg-card);
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-create-empty:hover {
          border-color: var(--accent-green);
          border-style: solid;
          color: var(--accent-green);
          background: var(--accent-green-glow);
        }

        /* Error State */
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem;
          color: var(--accent-warm);
        }

        .error-state p {
          margin: 1rem 0;
        }

        .error-state button {
          padding: 0.5rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          cursor: pointer;
        }

        /* ═══════════════════════════════════════════════════════
           PANEL MANAGER SIDEBAR (droite) - 50/50 layout
           ═══════════════════════════════════════════════════════ */
        .panel-manager-sidebar {
          flex: 1;
          min-width: 0;
          max-height: 100vh;
          background: var(--bg-surface);
          border-left: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Panel list scroll container */
        .panel-manager-sidebar > div {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .panel-manager-sidebar .flex-1.overflow-y-auto {
          overflow-y: auto;
          overflow-x: hidden;
        }

        .assigning-overlay {
          position: absolute;
          inset: 0;
          background: rgba(13, 18, 16, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 10;
        }

        .assigning-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--accent-green);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .assigning-overlay span {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* Drop target styling for category nodes */
        .node-row-content.drop-target {
          background: linear-gradient(135deg, rgba(127, 163, 126, 0.2) 0%, rgba(127, 163, 126, 0.1) 100%) !important;
          border: 2px dashed var(--accent-green) !important;
          box-shadow: 0 0 20px rgba(127, 163, 126, 0.3), inset 0 0 20px rgba(127, 163, 126, 0.1) !important;
        }

        .node-row-content.drop-target .folder-icon {
          color: var(--accent-green);
          transform: scale(1.2);
        }

        /* Legacy context panel classes kept for compatibility */
        .panel-section {
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          overflow: hidden;
        }

        .guide-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .guide-item:last-child {
          border-bottom: none;
        }

        .guide-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-green-glow);
          border-radius: 6px;
          color: var(--accent-green);
          flex-shrink: 0;
        }

        .guide-icon.edit {
          background: var(--accent-gold-glow);
          color: var(--accent-gold);
        }

        .guide-icon.delete {
          background: rgba(217, 119, 87, 0.1);
          color: var(--accent-warm);
        }

        .guide-text {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .guide-text strong {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .guide-text span {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .panel-decoration {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 2rem 0;
          opacity: 0.15;
          color: var(--accent-green);
        }

        .tree-illustration {
          width: 80px;
          height: 120px;
        }

        /* ═══════════════════════════════════════════════════════
           TREE COMPONENT STYLES
           ═══════════════════════════════════════════════════════ */
        .category-tree {
          max-width: 800px;
        }

        .tree-toolbar {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 1.5rem;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 500;
          font-family: var(--font-body);
          background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toolbar-btn:hover {
          border-color: var(--accent-gold);
          color: var(--accent-gold);
          background: linear-gradient(135deg, rgba(201, 169, 98, 0.1) 0%, rgba(201, 169, 98, 0.05) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(201, 169, 98, 0.15);
        }

        .toolbar-btn:active {
          transform: translateY(0);
        }

        /* ═══════════════════════════════════════════════════════
           TREE NODE STYLES - Enhanced UI
           ═══════════════════════════════════════════════════════ */
        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        .expand-btn:hover:not(:disabled) {
          border-color: var(--accent-gold);
          color: var(--accent-gold);
          background: linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(201, 169, 98, 0.05) 100%);
          transform: scale(1.05);
        }

        .expand-btn:disabled {
          background: transparent;
          border-color: transparent;
          cursor: default;
          opacity: 0;
        }

        .folder-icon {
          color: var(--accent-gold);
          filter: drop-shadow(0 2px 4px rgba(201, 169, 98, 0.3));
          transition: all 0.2s;
        }

        .node-row-content:hover .folder-icon {
          transform: scale(1.1);
          filter: drop-shadow(0 3px 8px rgba(201, 169, 98, 0.4));
        }

        .node-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .node-slug {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
          background: var(--bg-deep);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          opacity: 0.7;
        }

        .node-count {
          margin-left: auto;
          padding: 0.25rem 0.625rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--accent-green);
          background: linear-gradient(135deg, rgba(127, 163, 126, 0.15) 0%, rgba(127, 163, 126, 0.05) 100%);
          border: 1px solid rgba(127, 163, 126, 0.2);
          border-radius: 12px;
          letter-spacing: 0.02em;
        }

        .node-actions {
          display: flex;
          gap: 0.375rem;
          opacity: 0;
          transform: translateX(8px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .node-row-content:hover .node-actions {
          opacity: 1;
          transform: translateX(0);
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .action-btn:hover:not(:disabled) {
          background: var(--bg-card);
          border-color: var(--accent-green);
          color: var(--accent-green);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(127, 163, 126, 0.2);
        }

        .action-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .action-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .delete-btn:hover:not(:disabled) {
          background: rgba(217, 119, 87, 0.1);
          border-color: var(--accent-warm);
          color: var(--accent-warm);
          box-shadow: 0 4px 12px rgba(217, 119, 87, 0.2);
        }

        /* ═══════════════════════════════════════════════════════
           DRAG & DROP STYLES - Enhanced
           ═══════════════════════════════════════════════════════ */
        .toolbar-hint {
          margin-left: auto;
          padding: 0.5rem 0.875rem;
          font-size: 0.7rem;
          color: var(--text-muted);
          background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          letter-spacing: 0.01em;
        }

        /* Tree content wrapper */
        .tree-content {
          position: relative;
          padding: 0.5rem;
          background: linear-gradient(180deg, transparent 0%, rgba(127, 163, 126, 0.02) 100%);
          border-radius: 12px;
        }

        /* Tree item wrapper from library */
        .tree-content [class*="TreeItem"] {
          position: relative;
        }

        /* Node row content - our custom layout */
        .node-row-content {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          border: 1px solid transparent;
          margin: 2px 0;
        }

        .node-row-content:hover {
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(201, 169, 98, 0.03) 100%);
          border-color: var(--border-subtle);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        /* Selected category - when clicking to filter panels */
        .node-row-content.selected {
          background: linear-gradient(135deg, rgba(127, 163, 126, 0.15) 0%, rgba(127, 163, 126, 0.08) 100%);
          border: 2px solid var(--accent-green);
          box-shadow: 0 0 12px rgba(127, 163, 126, 0.25), inset 0 0 20px rgba(127, 163, 126, 0.05);
        }

        .node-row-content.selected .folder-icon {
          color: var(--accent-green);
          filter: drop-shadow(0 2px 8px rgba(127, 163, 126, 0.5));
          transform: scale(1.1);
        }

        .node-row-content.selected .node-name {
          color: var(--accent-green);
        }

        .node-row-content.selected .node-count {
          background: linear-gradient(135deg, var(--accent-green) 0%, #6a9069 100%);
          color: #fff;
          border-color: transparent;
        }

        /* Drag handle area */
        .drag-handle-area {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          color: var(--text-muted);
          opacity: 0;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .node-row-content:hover .drag-handle-area {
          opacity: 0.5;
        }

        /* The whole row is draggable */
        .node-row-content {
          cursor: grab;
        }

        .node-row-content:active {
          cursor: grabbing;
        }

        /* FolderTreeItemWrapper styles */
        .tree-content [class*="FolderTreeItemWrapper"] {
          position: relative;
        }

        /* Library's ghost/clone styles (dragging item) */
        [data-dnd-kit-sortable-tree-ghost="true"] {
          z-index: 100;
        }

        [data-dnd-kit-sortable-tree-ghost="true"] .node-row-content {
          background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-card) 100%);
          border: 2px solid var(--accent-gold);
          box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.4),
            0 0 0 4px rgba(201, 169, 98, 0.1);
          transform: scale(1.02) rotate(1deg);
        }

        /* Library's placeholder styles (original position) */
        [data-dnd-kit-sortable-tree-placeholder="true"] {
          opacity: 0.4;
        }

        [data-dnd-kit-sortable-tree-placeholder="true"] .node-row-content {
          background: repeating-linear-gradient(
            -45deg,
            var(--bg-card),
            var(--bg-card) 8px,
            var(--bg-elevated) 8px,
            var(--bg-elevated) 16px
          );
          border: 2px dashed var(--accent-green);
        }

        /* Indicator mode - shows where item will drop */
        [data-dnd-kit-sortable-tree-indicator="true"] {
          position: relative;
        }

        [data-dnd-kit-sortable-tree-indicator="true"]::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -2px;
          height: 4px;
          background: linear-gradient(90deg, var(--accent-green), var(--accent-gold));
          border-radius: 2px;
          box-shadow: 0 0 12px rgba(127, 163, 126, 0.5);
          animation: pulse-indicator 1s ease-in-out infinite;
        }

        @keyframes pulse-indicator {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ═══════════════════════════════════════════════════════
           LIBRARY TREE LINES - Override default black SVGs
           ═══════════════════════════════════════════════════════ */

        /* Vertical line - bright gold/green gradient effect */
        .dnd-sortable-tree_folder_line {
          background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke='%23c9a962' style='stroke-width: 2px;' x1='50%25' y1='0' x2='50%25' y2='100%25'/></svg>") !important;
          filter: drop-shadow(0 0 3px rgba(201, 169, 98, 0.5));
        }

        /* Vertical + horizontal connector */
        .dnd-sortable-tree_folder_line-to_self {
          background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke='%23c9a962' style='stroke-width: 2px;' x1='50%25' y1='0' x2='50%25' y2='100%25'/><line stroke='%2396c995' style='stroke-width: 2px;' x1='50%25' y1='50%25' x2='100%25' y2='50%25'/></svg>") !important;
          filter: drop-shadow(0 0 3px rgba(201, 169, 98, 0.5));
        }

        /* Last item - vertical to middle + horizontal */
        .dnd-sortable-tree_folder_line-to_self-last {
          background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke='%23c9a962' style='stroke-width: 2px;' x1='50%25' y1='0' x2='50%25' y2='50%25'/><line stroke='%2396c995' style='stroke-width: 2px;' x1='50%25' y1='50%25' x2='100%25' y2='50%25'/></svg>") !important;
          filter: drop-shadow(0 0 3px rgba(201, 169, 98, 0.5));
        }

        /* Collapse button arrow - bright gold */
        .dnd-sortable-tree_folder_tree-item-collapse_button {
          background: url("data:image/svg+xml;utf8,<svg width='10' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 41'><path fill='%23c9a962' d='M30.76 39.2402C31.885 40.3638 33.41 40.995 35 40.995C36.59 40.995 38.115 40.3638 39.24 39.2402L68.24 10.2402C69.2998 9.10284 69.8768 7.59846 69.8494 6.04406C69.822 4.48965 69.1923 3.00657 68.093 1.90726C66.9937 0.807959 65.5106 0.178263 63.9562 0.150837C62.4018 0.123411 60.8974 0.700397 59.76 1.76024L35 26.5102L10.24 1.76024C9.10259 0.700397 7.59822 0.123411 6.04381 0.150837C4.4894 0.178263 3.00632 0.807959 1.90702 1.90726C0.807714 3.00657 0.178019 4.48965 0.150593 6.04406C0.123167 7.59846 0.700153 9.10284 1.75999 10.2402L30.76 39.2402Z' /></svg>") no-repeat center !important;
          filter: drop-shadow(0 0 4px rgba(201, 169, 98, 0.6));
        }

        /* Drag handle - bright */
        .dnd-sortable-tree_folder_handle {
          background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' width='12'><path fill='%237fa37e' d='M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z'></path></svg>") no-repeat center !important;
          filter: drop-shadow(0 0 3px rgba(127, 163, 126, 0.5));
        }

        /* ═══════════════════════════════════════════════════════
           TREE BRANCHES - Enhanced Visibility (Custom CSS)
           ═══════════════════════════════════════════════════════ */
        .tree-content li {
          position: relative;
        }

        .tree-content ul {
          padding-left: 0;
          margin: 0;
          list-style: none;
        }

        .tree-content > ul > li {
          border-left: none;
        }

        /* Nested lists - vertical branch lines */
        .tree-content ul ul {
          margin-left: 8px;
          padding-left: 24px;
          position: relative;
        }

        /* Main vertical branch line - BRIGHT & VISIBLE */
        .tree-content ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 8px;
          bottom: 12px;
          width: 2px;
          background: linear-gradient(
            180deg,
            #d4b866 0%,
            #a8c9a7 50%,
            #7fa37e 100%
          );
          border-radius: 2px;
          box-shadow: 0 0 6px rgba(212, 184, 102, 0.4);
        }

        /* Horizontal connector lines to each item */
        .tree-content ul ul > li {
          position: relative;
        }

        .tree-content ul ul > li::before {
          content: '';
          position: absolute;
          top: 20px;
          left: -16px;
          width: 14px;
          height: 2px;
          background: linear-gradient(
            90deg,
            #a8c9a7 0%,
            #d4b866 100%
          );
          border-radius: 1px;
          box-shadow: 0 0 4px rgba(168, 201, 167, 0.5);
        }

        /* Dot at the end of horizontal line */
        .tree-content ul ul > li::after {
          content: '';
          position: absolute;
          top: 17px;
          left: -4px;
          width: 7px;
          height: 7px;
          background: #d4b866;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(212, 184, 102, 0.7);
        }

        /* Hover effects on branches */
        .tree-content ul ul:hover::before {
          background: linear-gradient(
            180deg,
            #e8cc77 0%,
            #b8d9b7 50%,
            #8fb88e 100%
          );
          box-shadow: 0 0 12px rgba(232, 204, 119, 0.5);
        }

        .tree-content ul ul > li:hover::before {
          background: linear-gradient(
            90deg,
            #e8cc77 0%,
            #b8d9b7 100%
          );
          height: 3px;
          top: 19px;
          box-shadow: 0 0 8px rgba(232, 204, 119, 0.6);
        }

        .tree-content ul ul > li:hover::after {
          background: #b8d9b7;
          box-shadow: 0 0 12px rgba(184, 217, 183, 0.8);
          transform: scale(1.3);
        }

        /* Deeper nesting - Level 2 - Brighter greens */
        .tree-content ul ul ul::before {
          background: linear-gradient(
            180deg,
            #a8d9a7 0%,
            #8bc9c9 50%,
            #6bb5b5 100%
          );
          box-shadow: 0 0 6px rgba(168, 217, 167, 0.4);
        }

        .tree-content ul ul ul > li::before {
          background: linear-gradient(
            90deg,
            #a8d9a7 0%,
            #8bc9c9 100%
          );
          box-shadow: 0 0 4px rgba(168, 217, 167, 0.5);
        }

        .tree-content ul ul ul > li::after {
          background: #a8d9a7;
          box-shadow: 0 0 8px rgba(168, 217, 167, 0.7);
        }

        /* Level 3 nesting - Teal tones */
        .tree-content ul ul ul ul::before {
          background: linear-gradient(
            180deg,
            #8bc9c9 0%,
            #b0a8d9 50%,
            #9a8fcc 100%
          );
          box-shadow: 0 0 6px rgba(139, 201, 201, 0.4);
        }

        .tree-content ul ul ul ul > li::before {
          background: linear-gradient(
            90deg,
            #8bc9c9 0%,
            #b0a8d9 100%
          );
          box-shadow: 0 0 4px rgba(139, 201, 201, 0.5);
        }

        .tree-content ul ul ul ul > li::after {
          background: #8bc9c9;
          box-shadow: 0 0 8px rgba(139, 201, 201, 0.7);
        }

        /* Level 4+ nesting - Purple tones */
        .tree-content ul ul ul ul ul::before {
          background: linear-gradient(
            180deg,
            #b0a8d9 0%,
            #c9a8c9 100%
          );
          box-shadow: 0 0 6px rgba(176, 168, 217, 0.4);
        }

        .tree-content ul ul ul ul ul > li::before {
          background: linear-gradient(
            90deg,
            #b0a8d9 0%,
            #c9a8c9 100%
          );
        }

        .tree-content ul ul ul ul ul > li::after {
          background: #b0a8d9;
          box-shadow: 0 0 8px rgba(176, 168, 217, 0.7);
        }

        /* Depth level colors for folder icons - Brighter */
        .tree-content > ul > li > div .folder-icon {
          color: #d4b866;
          filter: drop-shadow(0 2px 6px rgba(212, 184, 102, 0.5));
        }

        .tree-content ul ul > li > div .folder-icon {
          color: #a8d9a7;
          filter: drop-shadow(0 2px 6px rgba(168, 217, 167, 0.5));
        }

        .tree-content ul ul ul > li > div .folder-icon {
          color: #8bc9c9;
          filter: drop-shadow(0 2px 6px rgba(139, 201, 201, 0.5));
        }

        .tree-content ul ul ul ul > li > div .folder-icon {
          color: #b0a8d9;
          filter: drop-shadow(0 2px 6px rgba(176, 168, 217, 0.5));
        }

        /* Visual feedback when item can be dropped */
        .tree-content [class*="can-drop"] {
          background: var(--accent-green-glow);
        }

        /* ═══════════════════════════════════════════════════════
           MODAL STYLES
           ═══════════════════════════════════════════════════════ */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 18, 16, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
          animation: modal-in 0.2s ease-out;
        }

        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .modal-header h2 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0;
        }

        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .close-btn:hover {
          background: var(--bg-card);
          border-color: var(--border);
        }

        .modal-content form {
          padding: 1.5rem;
        }

        .error-message {
          padding: 0.75rem 1rem;
          background: rgba(217, 119, 87, 0.1);
          border: 1px solid rgba(217, 119, 87, 0.2);
          border-radius: 8px;
          color: var(--accent-warm);
          font-size: 0.9rem;
          margin-bottom: 1.25rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          font-family: var(--font-body);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          transition: all 0.15s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--accent-green);
          box-shadow: 0 0 0 3px var(--accent-green-glow);
        }

        .form-group input::placeholder {
          color: var(--text-muted);
        }

        .hint {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.375rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-subtle);
        }

        .btn-cancel,
        .btn-save {
          padding: 0.625rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 500;
          font-family: var(--font-body);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }

        .btn-cancel:hover {
          background: var(--bg-card);
          border-color: var(--text-muted);
        }

        .btn-save {
          background: var(--accent-green);
          border: none;
          color: #fff;
        }

        .btn-save:hover:not(:disabled) {
          background: #6a9069;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-message {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
