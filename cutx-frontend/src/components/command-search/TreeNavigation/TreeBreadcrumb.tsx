'use client';

import { Fragment } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { BreadcrumbItem } from '../types';

interface TreeBreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (path: BreadcrumbItem[], slug: string | null) => void;
}

export function TreeBreadcrumb({ path, onNavigate }: TreeBreadcrumbProps) {
  if (path.length === 0) return null;

  return (
    <nav
      className="flex items-center gap-1 px-3 py-2 text-xs border-b border-[var(--cx-border-subtle)] bg-[var(--cx-surface-1)]/50 overflow-x-auto"
      aria-label="Fil d'Ariane"
    >
      {/* Home button */}
      <button
        onClick={() => onNavigate([], null)}
        className="flex items-center gap-1 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors flex-shrink-0"
        aria-label="Retour à la racine"
      >
        <Home className="w-3 h-3" />
        <span>Tous</span>
      </button>

      {/* Path segments */}
      {path.map((item, index) => {
        const isLast = index === path.length - 1;
        const pathToHere = path.slice(0, index + 1);

        return (
          <Fragment key={item.slug}>
            <ChevronRight
              className="w-3 h-3 text-[var(--cx-text-muted)] flex-shrink-0"
              aria-hidden="true"
            />
            <button
              onClick={() => onNavigate(pathToHere, item.slug)}
              className={`
                truncate max-w-[120px] transition-colors
                ${
                  isLast
                    ? 'text-amber-500 font-medium'
                    : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)]'
                }
              `}
              aria-current={isLast ? 'page' : undefined}
            >
              {item.name}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
