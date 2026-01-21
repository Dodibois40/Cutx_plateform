'use client';

import { AlertTriangle, Plus } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loader">
        <div className="leaf leaf-1" />
        <div className="leaf leaf-2" />
        <div className="leaf leaf-3" />
      </div>
      <p>Chargement de l&apos;arborescence...</p>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <AlertTriangle size={32} />
      <p>{error}</p>
      <button onClick={onRetry}>Réessayer</button>
    </div>
  );
}

interface EmptyStateProps {
  onCreateRoot: () => void;
}

export function EmptyState({ onCreateRoot }: EmptyStateProps) {
  return (
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
      <button onClick={onCreateRoot} className="btn-create-empty">
        <Plus size={18} />
        Créer une catégorie
      </button>
    </div>
  );
}
