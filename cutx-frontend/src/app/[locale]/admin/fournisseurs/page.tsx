'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, Loader2, AlertTriangle, Store, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

interface Catalogue {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  logoUrl: string | null;
}

export default function FournisseursAdminPage() {
  const { getToken } = useAuth();

  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchCatalogues = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/catalogues/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('admin');
          return;
        }
        throw new Error('Erreur lors du chargement');
      }

      const data = await res.json();
      setCatalogues(data.catalogues || []);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des fournisseurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchCatalogues();
  }, [fetchCatalogues]);

  const handleToggle = async (id: string) => {
    try {
      setToggling(id);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/catalogues/admin/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Erreur lors de la modification');

      const data = await res.json();
      setCatalogues(prev =>
        prev.map(c => (c.id === id ? data.catalogue : c))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(null);
    }
  };

  // Erreur admin
  if (error === 'admin') {
    return (
      <div className="h-screen bg-[#080808] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-16 h-16 text-amber-500" />
        <p className="text-white text-xl">Acces reserve aux administrateurs</p>
        <Link
          href="/"
          className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Gestion des Fournisseurs</h1>
            <p className="text-white/60 text-sm">
              Activer ou desactiver les fournisseurs dans la bibliotheque
            </p>
          </div>
        </div>

        {/* Liste des fournisseurs */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : (
          <div className="space-y-3">
            {catalogues.map(catalogue => (
              <div
                key={catalogue.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  catalogue.isActive
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      catalogue.isActive ? 'bg-emerald-500/20' : 'bg-white/10'
                    }`}
                  >
                    <Store
                      className={`w-6 h-6 ${
                        catalogue.isActive ? 'text-emerald-400' : 'text-white/40'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{catalogue.name}</h3>
                    <p className="text-sm text-white/50">/{catalogue.slug}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(catalogue.id)}
                  disabled={toggling === catalogue.id}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  title={catalogue.isActive ? 'Desactiver' : 'Activer'}
                >
                  {toggling === catalogue.id ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : catalogue.isActive ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-white/40" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-sm text-blue-300">
            <strong>Note :</strong> Les fournisseurs desactives n&apos;apparaitront plus
            dans les resultats de recherche pour les utilisateurs non-admin.
          </p>
        </div>
      </div>
    </div>
  );
}
