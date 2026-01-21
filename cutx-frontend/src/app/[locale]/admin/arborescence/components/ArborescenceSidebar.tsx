'use client';

import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import { SupplierSelector, type SupplierSlug } from '@/components/home/SupplierSelector';
import type { AdminCategory } from '@/components/admin/arborescence';
import { countAll } from '../utils';

interface ArborescenceSidebarProps {
  activeSuppliers: SupplierSlug[];
  onSupplierToggle: (slug: SupplierSlug) => void;
  categories: AdminCategory[];
}

export function ArborescenceSidebar({
  activeSuppliers,
  onSupplierToggle,
  categories,
}: ArborescenceSidebarProps) {
  const stats = countAll(categories);

  return (
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
          <SupplierSelector activeSuppliers={activeSuppliers} onToggle={onSupplierToggle} />
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
  );
}
