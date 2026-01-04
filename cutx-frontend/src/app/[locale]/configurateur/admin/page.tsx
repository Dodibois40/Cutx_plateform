'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { UsinageTemplateList } from './components/UsinageTemplateList';
import { UsinageTemplateForm } from './components/UsinageTemplateForm';
import type { UsinageTemplate } from '@/lib/configurateur/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

export default function UsinagesAdminPage() {
  const t = useTranslations('dialogs.machiningAdmin');
  const { getToken } = useAuth();

  const [templates, setTemplates] = useState<UsinageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UsinageTemplate | null>(null);

  // Charger les templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/usinages/admin/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('Acces reserve aux administrateurs');
          return;
        }
        throw new Error('Erreur lors du chargement');
      }

      const data = await res.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Creer un template
  const handleCreate = async (data: Partial<UsinageTemplate>) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/usinages/admin/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Erreur lors de la creation');

      await fetchTemplates();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Modifier un template
  const handleUpdate = async (id: string, data: Partial<UsinageTemplate>) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/usinages/admin/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Erreur lors de la modification');

      await fetchTemplates();
      setShowForm(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Supprimer un template
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet usinage ?')) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/usinages/admin/templates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      await fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle actif/inactif
  const handleToggle = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/usinages/admin/templates/${id}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Erreur');

      await fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  // Ouvrir le formulaire d'edition
  const handleEdit = (template: UsinageTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  // Fermer le formulaire
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  return (
    <div className="admin-page">
      <style jsx>{`
        .admin-page {
          min-height: 100vh;
          background: var(--admin-bg-secondary, #f5f5f0);
          padding: 2rem;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 6px;
          cursor: pointer;
          color: var(--admin-text-secondary, #666);
          text-decoration: none;
          font-size: 0.875rem;
        }

        .btn-back:hover {
          background: var(--admin-bg-tertiary, #f0f0f0);
        }

        .admin-title {
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--admin-text-primary, #1a1a1a);
          margin: 0;
        }

        .btn-add {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--admin-olive, #6b7c4c);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .btn-add:hover {
          background: var(--admin-olive-dark, #5a6a3f);
        }

        .admin-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .loading-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .loading-state {
          color: var(--admin-text-secondary, #666);
        }

        .error-state {
          color: var(--admin-sable, #c9a86c);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <header className="admin-header">
        <div className="header-left">
          <Link href="/configurateur" className="btn-back">
            <ArrowLeft size={18} />
            Retour
          </Link>
          <h1 className="admin-title">{t('title')}</h1>
        </div>

        <button className="btn-add" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          {t('addNew')}
        </button>
      </header>

      <main className="admin-content">
        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} className="spinner" />
            <p>Chargement...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : (
          <UsinageTemplateList
            templates={templates}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        )}
      </main>

      {showForm && (
        <UsinageTemplateForm
          template={editingTemplate}
          onSave={editingTemplate
            ? (data) => handleUpdate(editingTemplate.id, data)
            : handleCreate
          }
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
