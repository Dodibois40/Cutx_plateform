'use client';

import { useState, useCallback } from 'react';
import {
  CategoryTree,
  CategoryForm,
  type AdminCategory,
} from '@/components/admin/arborescence';
import { PanelManager } from '@/components/admin/arborescence/panel-manager';

// Local imports
import { useArborescenceData, useCategoryActions, usePanelDropHandler } from './hooks';
import {
  ArborescenceSidebar,
  ArborescenceHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  AccessDenied,
} from './components';
import './styles/arborescence.css';

// ═══════════════════════════════════════════════════════════════
// PAGE ARBORESCENCE - Design "Botanical Admin"
// Tons forêt profonds, accents dorés, atmosphère organique
// ═══════════════════════════════════════════════════════════════

export default function ArborescenceAdminPage() {
  // Data fetching & suppliers
  const {
    categories,
    rawCategories,
    loading,
    error,
    activeSuppliers,
    fetchCategories,
    handleSupplierToggle,
  } = useArborescenceData();

  // Category CRUD actions
  const {
    showForm,
    editingCategory,
    parentForNew,
    handleCreateRoot,
    handleCreateChild,
    handleEdit,
    handleFormClose,
  } = useCategoryActions(fetchCategories);

  // Panel drop handling
  const { handlePanelsDropped, isAssigning, clearSelectionTrigger } =
    usePanelDropHandler(fetchCategories);

  // Selected category for filtering panels
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);

  // Handler pour la sélection de catégorie (afficher ses panneaux)
  const handleCategorySelect = useCallback((category: AdminCategory) => {
    // Toggle: si déjà sélectionné, désélectionner
    setSelectedCategory((prev) => (prev?.id === category.id ? null : category));
  }, []);

  // Handler pour effacer le filtre de catégorie
  const handleClearCategoryFilter = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Erreur admin
  if (error === 'admin') {
    return <AccessDenied />;
  }

  return (
    <div className="arbo-page">
      {/* ══════════════════════════════════════════════════════════
          SIDEBAR GAUCHE
          ══════════════════════════════════════════════════════════ */}
      <ArborescenceSidebar
        activeSuppliers={activeSuppliers}
        onSupplierToggle={handleSupplierToggle}
        categories={categories}
      />

      {/* ══════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
          ══════════════════════════════════════════════════════════ */}
      <main className="main-content">
        <ArborescenceHeader
          onCreateRoot={handleCreateRoot}
          onRefresh={() => fetchCategories()}
          isLoading={loading}
        />

        {/* Zone de l'arbre */}
        <div className="tree-container">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => fetchCategories()} />
          ) : categories.length === 0 ? (
            <EmptyState onCreateRoot={handleCreateRoot} />
          ) : (
            <CategoryTree
              categories={categories}
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
          activeSuppliers={activeSuppliers}
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
          categories={rawCategories}
          onClose={handleFormClose}
          onSaved={() => fetchCategories()}
        />
      )}
    </div>
  );
}
