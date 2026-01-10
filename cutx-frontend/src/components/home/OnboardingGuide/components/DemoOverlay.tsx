'use client';

/**
 * DemoOverlay - Backdrop, demo badge, success message, and close button
 */

import { X, Play } from 'lucide-react';

interface DemoOverlayProps {
  onClose: () => void;
}

interface SuccessMessageProps {
  isVisible: boolean;
}

/** Demo backdrop */
export function DemoBackdrop({ onClose }: DemoOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
  );
}

/** Demo mode badge at top */
export function DemoBadge() {
  return (
    <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-black shadow-lg animate-pulse-glow">
        <Play className="w-4 h-4 fill-current" />
        <span className="text-sm font-bold tracking-wide">MODE DEMO</span>
      </div>
    </div>
  );
}

/** Success message when complete */
export function SuccessMessage({ isVisible }: SuccessMessageProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="px-10 py-8 rounded-2xl bg-[#1a1a19] border border-neutral-700 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-lg">&#10003;</span>
          </div>
          <span className="text-xl font-semibold text-white">C'est termine !</span>
        </div>
        <p className="text-neutral-400 text-center text-sm">
          Votre fichier est pret a etre configure
        </p>
      </div>
    </div>
  );
}

/** Close/skip button at bottom */
export function CloseButton({ onClose }: DemoOverlayProps) {
  return (
    <div className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2">
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-800/90 border border-neutral-700 text-white hover:bg-neutral-700 transition-colors shadow-xl backdrop-blur-sm"
      >
        <span className="text-sm font-medium">Passer la demo</span>
        <X className="w-4 h-4 text-neutral-400" />
      </button>
    </div>
  );
}
