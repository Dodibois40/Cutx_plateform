'use client';

import { useState, useLayoutEffect, useCallback } from 'react';
import { X } from 'lucide-react';

// CSS for arrow animation
const arrowAnimationStyle = `
  @keyframes arrow-bounce-right {
    0%, 100% { transform: translateY(-50%) translateX(0); }
    50% { transform: translateY(-50%) translateX(4px); }
  }
  @keyframes arrow-bounce-left {
    0%, 100% { transform: translateY(-50%) translateX(0); }
    50% { transform: translateY(-50%) translateX(-4px); }
  }
  .animate-arrow-right {
    animation: arrow-bounce-right 1s ease-in-out infinite;
  }
  .animate-arrow-left {
    animation: arrow-bounce-left 1s ease-in-out infinite;
  }
`;

interface OnboardingGuideProps {
  onClose: () => void;
}

interface TooltipPosition {
  top: number;
  left: number;
}

/**
 * Onboarding guide overlay with two tooltips:
 * 1. Next to search bar - explains to search for a panel
 * 2. Next to files panel - explains drag & drop
 *
 * Note: This component is loaded with ssr: false in page.tsx,
 * so it's only rendered on the client.
 */
export default function OnboardingGuide({ onClose }: OnboardingGuideProps) {
  const [searchBarPosition, setSearchBarPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const searchBar = document.querySelector('[data-onboarding="search-bar"]');
    if (searchBar) {
      const rect = searchBar.getBoundingClientRect();
      setSearchBarPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 16,
      });
    }
  }, []);

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition]);

  return (
    <>
      {/* Inject animation styles */}
      <style>{arrowAnimationStyle}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Tooltip 1: Search bar guide */}
      {searchBarPosition && (
        <div
          className="fixed z-50"
          style={{
            top: searchBarPosition.top,
            left: searchBarPosition.left,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="relative">
            {/* Arrow pointing left */}
            <div
              className="absolute top-1/2 -left-4 animate-arrow-right"
              style={{
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderRight: '8px solid rgb(245 158 11)',
              }}
            />
            <div className="flex items-center gap-3 px-4 h-[100px] rounded-xl bg-[#141413] border border-amber-500/40 shadow-[0_0_10px_rgba(255,255,255,0.03)]">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-black font-bold text-sm">
                1
              </div>
              <div>
                <div className="font-semibold text-white">
                  Recherchez un panneau
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Ex: mélaminé blanc 19mm
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip 2: Files panel guide */}
      <div
        className="fixed z-50"
        style={{
          top: '30%',
          right: 'calc(20% + 16px)',
        }}
      >
        <div className="relative">
          {/* Arrow pointing right */}
          <div
            className="absolute top-1/2 -right-4 animate-arrow-left"
            style={{
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '8px solid rgb(245 158 11)',
            }}
          />
          <div className="flex items-center gap-3 px-4 h-[100px] rounded-xl bg-[#141413] border border-amber-500/40 shadow-[0_0_10px_rgba(255,255,255,0.03)]">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-black font-bold text-sm">
              2
            </div>
            <div>
              <div className="font-semibold text-white">
                Glissez-le sur le fichier
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Drag and drop pour affecter
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Close button */}
      <div
        className="fixed z-50"
        style={{
          bottom: '2rem',
          left: '40%',
          transform: 'translateX(-50%)',
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 transition-colors shadow-lg"
        >
          <span className="text-sm font-medium">Compris !</span>
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>
    </>
  );
}
