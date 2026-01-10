'use client';

/**
 * StepIndicator - Progress indicator for onboarding (1-2-3)
 */

import { getStepNumber, type OnboardingStep } from '../types';

interface StepIndicatorProps {
  currentStep: OnboardingStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const stepNum = getStepNumber(currentStep);

  return (
    <div className="fixed z-50 top-16 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
        {/* Step 1: Import */}
        <div className={`flex items-center gap-2 ${stepNum >= 1 ? 'text-amber-500' : 'text-white/40'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stepNum >= 1 ? 'bg-amber-500 text-black' : 'bg-white/20'}`}>
            1
          </div>
          <span className="text-xs font-medium hidden sm:inline">Import</span>
        </div>

        {/* Connector 1-2 */}
        <div className={`w-8 h-0.5 ${stepNum >= 2 ? 'bg-amber-500' : 'bg-white/20'}`} />

        {/* Step 2: Recherche */}
        <div className={`flex items-center gap-2 ${stepNum >= 2 ? 'text-amber-500' : 'text-white/40'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stepNum >= 2 ? 'bg-amber-500 text-black' : 'bg-white/20'}`}>
            2
          </div>
          <span className="text-xs font-medium hidden sm:inline">Recherche</span>
        </div>

        {/* Connector 2-3 */}
        <div className={`w-8 h-0.5 ${stepNum >= 3 ? 'bg-amber-500' : 'bg-white/20'}`} />

        {/* Step 3: Affectation */}
        <div className={`flex items-center gap-2 ${stepNum >= 3 ? 'text-amber-500' : 'text-white/40'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stepNum >= 3 ? 'bg-amber-500 text-black' : 'bg-white/20'}`}>
            3
          </div>
          <span className="text-xs font-medium hidden sm:inline">Affectation</span>
        </div>
      </div>
    </div>
  );
}
