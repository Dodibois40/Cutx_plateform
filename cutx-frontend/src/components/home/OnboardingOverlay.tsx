'use client';

import { X, Search, MousePointerClick } from 'lucide-react';

interface OnboardingOverlayProps {
  onClose: () => void;
}

export default function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      <div className="fixed z-50 top-[42%] left-[25%]">
        <div className="relative">
          <div className="absolute -top-2 left-6 w-4 h-4 bg-amber-500 rotate-45" />
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 text-black shadow-lg shadow-amber-500/30">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/20 text-white font-bold text-sm">
              1
            </div>
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Search className="w-4 h-4" />
                Recherchez un panneau
              </div>
              <p className="text-xs text-black/70 mt-0.5">
                Ex: melamine blanc 19mm
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed z-50 top-[25%] right-[22%]">
        <div className="relative">
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-amber-500 rotate-45" />
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 text-black shadow-lg shadow-amber-500/30">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/20 text-white font-bold text-sm">
              2
            </div>
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <MousePointerClick className="w-4 h-4" />
                Glissez-le sur le fichier
              </div>
              <p className="text-xs text-black/70 mt-0.5">
                Drag and drop pour affecter
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2">
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
