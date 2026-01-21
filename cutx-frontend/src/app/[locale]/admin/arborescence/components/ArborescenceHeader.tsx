'use client';

import { Plus, RefreshCw } from 'lucide-react';

interface ArborescenceHeaderProps {
  onCreateRoot: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ArborescenceHeader({
  onCreateRoot,
  onRefresh,
  isLoading,
}: ArborescenceHeaderProps) {
  return (
    <header className="page-header">
      <div className="header-bg" />
      <div className="header-content">
        <div className="header-text">
          <h1>Arborescence</h1>
          <p>Organisez la structure de votre catalogue</p>
        </div>
        <div className="header-actions">
          <button onClick={onCreateRoot} className="btn-create">
            <Plus size={18} />
            <span>Nouvelle racine</span>
          </button>
          <button onClick={onRefresh} disabled={isLoading} className="btn-refresh">
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
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
  );
}
