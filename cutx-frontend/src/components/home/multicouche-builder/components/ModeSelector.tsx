'use client';

/**
 * ModeSelector - Toggle entre Panneau industriel et Multicouche
 *
 * Design: Figma/Linear-style - ultra minimal, clean state changes
 * No glow, no lift, no bling - just precise, professional transitions
 */

import { useState, useEffect } from 'react';
import { Layers, Package } from 'lucide-react';
import type { HomePanelMode } from '../types';

interface ModeSelectorProps {
  mode: HomePanelMode;
  onModeChange: (mode: HomePanelMode) => void;
  industrielCount?: number;
  multicoucheCount?: number;
}

export default function ModeSelector({
  mode,
  onModeChange,
  industrielCount = 0,
  multicoucheCount = 0,
}: ModeSelectorProps) {
  // Avoid hydration mismatch by using consistent initial state
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Use 'industriel' as default on server to match SSR
  const activeMode = mounted ? mode : 'industriel';

  return (
    <div className="inline-flex items-center p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
      {/* Industriel */}
      <button
        onClick={() => onModeChange('industriel')}
        className={`
          relative flex items-center gap-3 px-6 py-3 rounded-xl
          text-base font-medium
          transition-[background,color,box-shadow] duration-200 ease-out
          ${activeMode === 'industriel'
            ? 'bg-white/[0.08] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
          }
        `}
      >
        <Package size={20} className={activeMode === 'industriel' ? 'text-amber-400' : ''} />
        <span>Industriel</span>
        {industrielCount > 0 && (
          <span className="ml-1 min-w-[22px] h-[22px] flex items-center justify-center text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400">
            {industrielCount}
          </span>
        )}
      </button>

      {/* Multicouche */}
      <button
        onClick={() => onModeChange('multicouche')}
        className={`
          relative flex items-center gap-3 px-6 py-3 rounded-xl
          text-base font-medium
          transition-[background,color,box-shadow] duration-200 ease-out
          ${activeMode === 'multicouche'
            ? 'bg-white/[0.08] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
          }
        `}
      >
        <Layers size={20} className={activeMode === 'multicouche' ? 'text-amber-400' : ''} />
        <span>Multicouche</span>
        {multicoucheCount > 0 && (
          <span className="ml-1 min-w-[22px] h-[22px] flex items-center justify-center text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400">
            {multicoucheCount}
          </span>
        )}
      </button>
    </div>
  );
}
