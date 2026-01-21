'use client';

import { useState, useCallback } from 'react';
import type { AdminCategory } from '@/components/admin/arborescence';

export function useCategoryActions(onRefresh: () => void) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  const handleCreateRoot = useCallback(() => {
    setParentForNew(null);
    setEditingCategory(null);
    setShowForm(true);
  }, []);

  const handleCreateChild = useCallback((parentId: string) => {
    setParentForNew(parentId);
    setEditingCategory(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((category: AdminCategory) => {
    setEditingCategory(category);
    setParentForNew(null);
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingCategory(null);
    setParentForNew(null);
  }, []);

  const handleFormSaved = useCallback(() => {
    handleFormClose();
    onRefresh();
  }, [handleFormClose, onRefresh]);

  return {
    showForm,
    editingCategory,
    parentForNew,
    handleCreateRoot,
    handleCreateChild,
    handleEdit,
    handleFormClose,
    handleFormSaved,
  };
}
