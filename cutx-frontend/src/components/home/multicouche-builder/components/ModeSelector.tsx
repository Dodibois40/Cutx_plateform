'use client';

/**
 * ModeSelector - Toggle entre Panneau industriel et Multicouche
 *
 * Affiché AU NIVEAU DU MOTEUR DE RECHERCHE pour guider l'utilisateur
 * AVANT qu'il clique sur un résultat.
 */

import { Layers, Package } from 'lucide-react';
import type { HomePanelMode } from '../types';

interface ModeSelectorProps {
  mode: HomePanelMode;
  onModeChange: (mode: HomePanelMode) => void;
  /** Nombre de fichiers importés (mode industriel) */
  industrielCount?: number;
  /** Nombre de couches configurées (mode multicouche) */
  multicoucheCount?: number;
}

export default function ModeSelector({
  mode,
  onModeChange,
  industrielCount = 0,
  multicoucheCount = 0,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-lg">
      {/* Panneau industriel */}
      <button
        onClick={() => onModeChange('industriel')}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md
          text-sm font-medium transition-all duration-200
          ${
            mode === 'industriel'
              ? 'bg-amber-500/20 text-amber-500'
              : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
          }
        `}
      >
        <Package size={14} />
        <span>Industriel</span>
        {industrielCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-500 rounded-full">
            {industrielCount}
          </span>
        )}
      </button>

      {/* Panneau multicouche */}
      <button
        onClick={() => onModeChange('multicouche')}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md
          text-sm font-medium transition-all duration-200
          ${
            mode === 'multicouche'
              ? 'bg-amber-500/20 text-amber-500'
              : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
          }
        `}
      >
        <Layers size={14} />
        <span>Multicouche</span>
        {multicoucheCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-500 rounded-full">
            {multicoucheCount}
          </span>
        )}
      </button>
    </div>
  );
}
