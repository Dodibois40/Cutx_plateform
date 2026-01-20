'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { X } from 'lucide-react';
import type { AdminCategory, CategoryFormData, FlatCategory } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  category: AdminCategory | null;
  parentId: string | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryForm({
  category,
  parentId,
  categories,
  onClose,
  onSaved,
}: Props) {
  const { getToken } = useAuth();
  const [form, setForm] = useState<CategoryFormData>({
    name: category?.name || '',
    slug: category?.slug || '',
    parentId: category?.parentId || parentId,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: category ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = await getToken();
      const url = category
        ? `${API_URL}/api/catalogues/admin/categories/${category.id}`
        : `${API_URL}/api/catalogues/admin/categories`;

      const res = await fetch(url, {
        method: category ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erreur lors de la sauvegarde');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const flattenCategories = (
    cats: AdminCategory[],
    level = 0
  ): FlatCategory[] => {
    return cats.flatMap((c) => [
      { id: c.id, name: c.name, level },
      ...(c.children ? flattenCategories(c.children, level + 1) : []),
    ]);
  };

  const flatCategories = flattenCategories(categories);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Nom</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Ex: MDF Hydrofuge"
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, slug: e.target.value }))
              }
              required
              placeholder="Ex: mdf-hydrofuge"
            />
            <span className="hint">Identifiant unique (URL-safe)</span>
          </div>

          <div className="form-group">
            <label htmlFor="parent">Parent</label>
            <select
              id="parent"
              value={form.parentId || ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  parentId: e.target.value || null,
                }))
              }
            >
              <option value="">-- Racine (aucun parent) --</option>
              {flatCategories
                .filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {'—'.repeat(c.level)} {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-save">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
