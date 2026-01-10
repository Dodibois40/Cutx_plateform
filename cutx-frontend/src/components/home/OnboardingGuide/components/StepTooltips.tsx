'use client';

/**
 * StepTooltips - All tooltip components for onboarding steps
 */

import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import type { SearchProduct } from '../../types';
import type { OnboardingStep } from '../types';

interface TooltipProps {
  currentStep: OnboardingStep;
}

interface ImportTooltipProps extends TooltipProps {
  position: { top: number; right: number } | null;
}

interface SearchTooltipProps extends TooltipProps {
  position: { top: number; left: number } | null;
}

interface AssignTooltipProps extends TooltipProps {}

interface FileFlyProps {
  position: { x: number; y: number };
  isVisible: boolean;
}

interface DragGhostProps {
  isDragging: boolean;
  position: { x: number; y: number };
  product: SearchProduct | null | undefined;
}

// Base tooltip box styling
const tooltipBoxClass = "flex items-center gap-4 px-5 py-4 rounded-xl bg-[#141413] border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]";

// Arrow pointing right
const ArrowRight = () => (
  <div
    className="absolute top-1/2 -right-4 animate-arrow-right"
    style={{
      width: 0,
      height: 0,
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
      borderLeft: '8px solid rgb(245 158 11)',
    }}
  />
);

// Arrow pointing left (for search bar)
const ArrowLeft = () => (
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
);

/** STEP 1: Import tooltip */
export function ImportTooltip({ currentStep, position }: ImportTooltipProps) {
  if (currentStep !== 'import' || !position) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        top: position.top,
        right: '29%',
      }}
    >
      <div className="relative">
        <ArrowRight />
        <div className={tooltipBoxClass}>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20">
            <Upload className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="font-semibold text-white text-lg">
              Importez votre feuille de debit
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              Glissez un fichier Excel ou DXF ici
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** STEP 1: File flying animation */
export function FileFlyAnimation({ position, isVisible }: FileFlyProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed z-[60] pointer-events-none animate-file-fly"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 text-black shadow-[0_10px_40px_rgba(245,158,11,0.4)]">
        <FileSpreadsheet className="w-8 h-8" />
        <div>
          <div className="font-bold">Meuble_Demo.xlsx</div>
          <div className="text-xs opacity-70">4 pieces</div>
        </div>
      </div>
    </div>
  );
}

/** STEP 2: Search tooltip */
export function SearchTooltip({ currentStep, position }: SearchTooltipProps) {
  const isVisible = (currentStep === 'search' || currentStep === 'search-typing' || currentStep === 'waiting-results');
  if (!isVisible || !position) return null;

  return (
    <div
      className="fixed z-50 transition-opacity duration-300"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateY(-50%)',
      }}
    >
      <div className="relative">
        <ArrowLeft />
        <div className={tooltipBoxClass}>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-black font-bold text-lg">
            {currentStep === 'waiting-results' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              '2'
            )}
          </div>
          <div>
            <div className="font-semibold text-white text-lg">
              {currentStep === 'waiting-results' ? 'Chargement des resultats...' : 'Recherchez un panneau'}
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              {currentStep === 'waiting-results' ? 'Veuillez patienter' : 'Ex: melamine blanc 19mm, MDF, OSB...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** STEP 3: Assign tooltip */
export function AssignTooltip({ currentStep }: AssignTooltipProps) {
  if (currentStep !== 'assign') return null;

  return (
    <div
      className="fixed z-50"
      style={{
        top: '35%',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div className={tooltipBoxClass}>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-black font-bold text-lg">
          3
        </div>
        <div>
          <div className="font-semibold text-white text-lg">
            Glissez le panneau sur votre fichier
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Drag & drop pour affecter le materiau
          </p>
        </div>
      </div>
    </div>
  );
}

/** Dragging ghost element */
export function DragGhost({ isDragging, position, product }: DragGhostProps) {
  if (!isDragging || !product) return null;

  return (
    <div
      className="fixed z-[60] pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%) rotate(-2deg)',
      }}
    >
      <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-lg scale-105" />
      <div className="relative px-5 py-3 rounded-xl bg-[#1a1a19] border border-amber-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="font-semibold text-white text-sm truncate max-w-[220px]">
          {product.nom}
        </div>
        <div className="text-xs text-neutral-400 mt-0.5">
          {product.epaisseur}mm - {product.reference || 'Panneau'}
        </div>
      </div>
    </div>
  );
}
