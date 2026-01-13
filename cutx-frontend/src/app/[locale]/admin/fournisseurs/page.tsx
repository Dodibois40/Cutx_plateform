'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Store,
  Check,
  X,
  Activity,
  Database,
  Info,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

interface Catalogue {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  logoUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANTS UI - Style Cowork (frontend-design-2)
// ═══════════════════════════════════════════════════════════════

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        relative w-12 h-7 rounded-full transition-all duration-200
        ${checked ? 'bg-emerald-500' : 'bg-[#3A3A3A]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
      `}
    >
      <div
        className={`
          absolute top-1 w-5 h-5 rounded-full bg-white shadow-md
          transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

function CollapsiblePanel({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#222222] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-[#A0A0A0]">{icon}</div>
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#666666] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'coral' | 'emerald' | 'muted';
}) {
  const colorClasses = {
    coral: 'text-[#FF6B4A]',
    emerald: 'text-emerald-500',
    muted: 'text-[#A0A0A0]',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#A0A0A0]">{label}</span>
      <span className={`text-lg font-semibold ${colorClasses[color]}`}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════

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
      setCatalogues((prev) => prev.map((c) => (c.id === id ? data.catalogue : c)));
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(null);
    }
  };

  // Stats calculées
  const activeCount = catalogues.filter((c) => c.isActive).length;
  const inactiveCount = catalogues.filter((c) => !c.isActive).length;

  // Erreur admin - Style Cowork
  if (error === 'admin') {
    return (
      <div className="h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-[#FF6B4A]/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-[#FF6B4A]" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Accès restreint</h1>
          <p className="text-[#A0A0A0]">Cette page est réservée aux administrateurs</p>
        </div>
        <Link
          href="/"
          className="mt-4 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#222222] rounded-xl text-white transition-all duration-200"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      {/* ══════════════════════════════════════════════════════════
          SIDEBAR GAUCHE - Navigation
          ══════════════════════════════════════════════════════════ */}
      <aside className="w-[240px] border-r border-[#1F1F1F] bg-[#111111] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1F1F1F]">
          <Link
            href="/"
            className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-[#1A1A1A] transition-colors"
          >
            <ArrowLeft size={18} className="text-[#A0A0A0]" />
            <span className="text-sm text-[#A0A0A0]">Retour</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <div className="px-3 py-2 text-xs font-medium text-[#666666] uppercase tracking-wider">
            Administration
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white">
            <Store size={18} className="text-[#FF6B4A]" />
            <span className="text-sm">Fournisseurs</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1F1F1F]">
          <p className="text-xs text-[#666666]">
            Gérez les fournisseurs disponibles dans la bibliothèque CutX.
          </p>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          ZONE CENTRALE - Liste des fournisseurs
          ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-6 border-b border-[#1F1F1F]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#FF8F75] flex items-center justify-center">
              <Store size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Gestion des Fournisseurs</h1>
              <p className="text-sm text-[#A0A0A0]">
                Activer ou désactiver les catalogues fournisseurs
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#FF6B4A]" />
              <p className="text-sm text-[#A0A0A0]">Chargement des fournisseurs...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              {catalogues.map((catalogue, index) => (
                <div
                  key={catalogue.id}
                  className={`
                    flex items-center justify-between p-4 rounded-xl border
                    transition-all duration-200 animate-fade-in
                    ${
                      catalogue.isActive
                        ? 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
                        : 'bg-[#1A1A1A]/50 border-[#1F1F1F] opacity-60 hover:opacity-80'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                        ${catalogue.isActive ? 'bg-emerald-500/20' : 'bg-[#2A2A2A]'}
                      `}
                    >
                      {catalogue.isActive ? (
                        <Check size={20} className="text-emerald-500" />
                      ) : (
                        <X size={20} className="text-[#666666]" />
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <h3 className="font-medium text-white">{catalogue.name}</h3>
                      <p className="text-sm text-[#666666]">/{catalogue.slug}</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-3">
                    {toggling === catalogue.id && (
                      <Loader2 size={16} className="animate-spin text-[#A0A0A0]" />
                    )}
                    <Toggle
                      checked={catalogue.isActive}
                      onChange={() => handleToggle(catalogue.id)}
                      disabled={toggling === catalogue.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════
          SIDEBAR DROITE - Stats & Info
          ══════════════════════════════════════════════════════════ */}
      <aside className="w-[280px] border-l border-[#1F1F1F] bg-[#111111] p-4 space-y-4 overflow-y-auto">
        {/* Panel Stats */}
        <CollapsiblePanel title="Statistiques" icon={<Activity size={18} />}>
          <div className="space-y-1">
            <StatCard label="Total" value={catalogues.length} color="muted" />
            <StatCard label="Actifs" value={activeCount} color="emerald" />
            <StatCard label="Inactifs" value={inactiveCount} color="coral" />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-[#A0A0A0]">Taux d&apos;activation</span>
              <span className="text-emerald-500">
                {catalogues.length > 0
                  ? Math.round((activeCount / catalogues.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{
                  width: `${catalogues.length > 0 ? (activeCount / catalogues.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </CollapsiblePanel>

        {/* Panel Context */}
        <CollapsiblePanel title="Catalogues" icon={<Database size={18} />}>
          <div className="space-y-2">
            {catalogues
              .filter((c) => c.isActive)
              .slice(0, 5)
              .map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 text-sm text-[#A0A0A0]"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="truncate">{c.name}</span>
                </div>
              ))}
            {activeCount > 5 && (
              <p className="text-xs text-[#666666]">+{activeCount - 5} autres...</p>
            )}
          </div>
        </CollapsiblePanel>

        {/* Info Banner */}
        <div className="p-4 bg-[#FF6B4A]/10 border border-[#FF6B4A]/20 rounded-xl">
          <div className="flex gap-3">
            <Info size={18} className="text-[#FF6B4A] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Information</p>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">
                Les fournisseurs désactivés n&apos;apparaîtront plus dans les résultats de
                recherche pour les utilisateurs.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
