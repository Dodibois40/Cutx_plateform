'use client';

import { useState, useLayoutEffect, useCallback, useEffect, useRef } from 'react';
import { X, Play, FileSpreadsheet, Upload, Loader2 } from 'lucide-react';
import type { SearchProduct } from './types';

// CSS for animations
const animationStyles = `
  @keyframes arrow-bounce-right {
    0%, 100% { transform: translateY(-50%) translateX(0); }
    50% { transform: translateY(-50%) translateX(4px); }
  }
  @keyframes arrow-bounce-left {
    0%, 100% { transform: translateY(-50%) translateX(0); }
    50% { transform: translateY(-50%) translateX(-4px); }
  }
  @keyframes arrow-bounce-down {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(4px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
  }
  @keyframes file-fly {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
    }
    30% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1) rotate(0deg);
    }
  }
  .animate-arrow-right {
    animation: arrow-bounce-right 1s ease-in-out infinite;
  }
  .animate-arrow-left {
    animation: arrow-bounce-left 1s ease-in-out infinite;
  }
  .animate-arrow-down {
    animation: arrow-bounce-down 1s ease-in-out infinite;
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  .animate-file-fly {
    animation: file-fly 0.8s ease-out forwards;
  }
`;

// Demo configuration - Slow pace for first-time users
const DEMO_TEXT = 'mélaminé blanc 19';
const TYPING_DELAY_MS = 120;
const STEP_TOOLTIP_READ_MS = 3500;    // Time to read each tooltip
const FILE_FLY_DURATION_MS = 2000;    // File flying animation
const DRAG_DURATION_MS = 2500;        // Drag animation

interface OnboardingGuideProps {
  onClose: () => void;
  onTypeText?: (text: string) => void;
  onAddMockFile?: () => string;
  onAssignPanel?: (fileId: string, panel: SearchProduct) => void;
  firstProduct?: SearchProduct | null;
}

// Steps: import → search → waiting → assign → complete
type OnboardingStep = 'import' | 'import-animating' | 'search' | 'search-typing' | 'waiting-results' | 'assign' | 'assign-animating' | 'complete';

export default function OnboardingGuide({
  onClose,
  onTypeText,
  onAddMockFile,
  onAssignPanel,
  firstProduct,
}: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('import');
  const [searchBarPosition, setSearchBarPosition] = useState<{ top: number; left: number } | null>(null);
  const [filesPanelPosition, setFilesPanelPosition] = useState<{ top: number; right: number } | null>(null);
  const [mockFileId, setMockFileId] = useState<string | null>(null);
  const [fileFlyPosition, setFileFlyPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const hasStartedRef = useRef(false);
  const searchStartedRef = useRef(false);
  const typingIndexRef = useRef(0);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for callbacks
  const onTypeTextRef = useRef(onTypeText);
  const onAddMockFileRef = useRef(onAddMockFile);
  const onAssignPanelRef = useRef(onAssignPanel);
  onTypeTextRef.current = onTypeText;
  onAddMockFileRef.current = onAddMockFile;
  onAssignPanelRef.current = onAssignPanel;

  // Get step number for display (1, 2, 3)
  const getStepNumber = () => {
    if (currentStep === 'import' || currentStep === 'import-animating') return 1;
    if (currentStep === 'search' || currentStep === 'search-typing' || currentStep === 'waiting-results') return 2;
    return 3;
  };

  // Update positions
  const updatePositions = useCallback(() => {
    const searchBar = document.querySelector('[data-onboarding="search-bar"]');
    if (searchBar) {
      const rect = searchBar.getBoundingClientRect();
      setSearchBarPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 16,
      });
    }

    // Files panel is on the right 20%
    setFilesPanelPosition({
      top: window.innerHeight * 0.3,
      right: window.innerWidth * 0.1,
    });

    // File fly target position (center of files panel)
    setFileFlyPosition({
      x: window.innerWidth * 0.9,
      y: window.innerHeight * 0.35,
    });
  }, []);

  useLayoutEffect(() => {
    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [updatePositions]);

  // Step 1: Import file flow
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // After reading import tooltip, animate file
    const step1Timer = setTimeout(() => {
      setCurrentStep('import-animating');

      // Add mock file during animation
      setTimeout(() => {
        if (onAddMockFileRef.current) {
          const fileId = onAddMockFileRef.current();
          setMockFileId(fileId);
        }
      }, FILE_FLY_DURATION_MS * 0.7);

      // Move to step 2 after animation
      setTimeout(() => {
        setCurrentStep('search');
      }, FILE_FLY_DURATION_MS);

    }, STEP_TOOLTIP_READ_MS);

    return () => {
      clearTimeout(step1Timer);
      hasStartedRef.current = false;
      searchStartedRef.current = false;
    };
  }, []);

  // Step 2a: Start search flow - trigger typing after tooltip read time
  useEffect(() => {
    if (currentStep !== 'search' || searchStartedRef.current) return;
    searchStartedRef.current = true;

    const searchTimer = setTimeout(() => {
      setCurrentStep('search-typing');
      onTypeTextRef.current?.('');
      typingIndexRef.current = 0;

      // Start typing interval
      typingIntervalRef.current = setInterval(() => {
        if (typingIndexRef.current < DEMO_TEXT.length) {
          typingIndexRef.current++;
          const text = DEMO_TEXT.slice(0, typingIndexRef.current);
          if (onTypeTextRef.current) {
            onTypeTextRef.current(text);
          }
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setTimeout(() => {
            setCurrentStep('waiting-results');
          }, 500);
        }
      }, TYPING_DELAY_MS);
    }, STEP_TOOLTIP_READ_MS);

    return () => {
      clearTimeout(searchTimer);
      // Only clear interval if we're actually unmounting, not just changing steps
      // The interval will be cleared when typing finishes
    };
  }, [currentStep]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, []);

  // Waiting for results: transition to assign when firstProduct is available
  useEffect(() => {
    if (currentStep !== 'waiting-results') return;
    if (firstProduct && mockFileId) {
      const timer = setTimeout(() => {
        setCurrentStep('assign');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, firstProduct, mockFileId]);

  // Step 3: Assign flow
  useEffect(() => {
    if (currentStep !== 'assign' || !firstProduct || !mockFileId) return;

    const assignTimer = setTimeout(() => {
      setCurrentStep('assign-animating');

      // Find elements for animation
      const productCard = document.querySelector('[data-product-card]');
      const fileCard = document.querySelector('[data-file-card]');

      if (!productCard || !fileCard) {
        // Skip animation if elements not found
        if (onAssignPanelRef.current && mockFileId) {
          onAssignPanelRef.current(mockFileId, firstProduct);
        }
        setCurrentStep('complete');
        setTimeout(onClose, 2000);
        return;
      }

      const productRect = productCard.getBoundingClientRect();
      const fileRect = fileCard.getBoundingClientRect();

      setIsDragging(true);
      setDragPosition({
        x: productRect.left + productRect.width / 2,
        y: productRect.top + productRect.height / 2
      });

      const startTime = Date.now();
      const startX = productRect.left + productRect.width / 2;
      const startY = productRect.top + productRect.height / 2;
      const endX = fileRect.left + fileRect.width / 2;
      const endY = fileRect.top + fileRect.height / 2;

      const animateFrame = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DRAG_DURATION_MS, 1);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        setDragPosition({
          x: startX + (endX - startX) * eased,
          y: startY + (endY - startY) * eased,
        });

        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        } else {
          setIsDragging(false);
          if (onAssignPanelRef.current && mockFileId) {
            onAssignPanelRef.current(mockFileId, firstProduct);
          }
          setCurrentStep('complete');
          setTimeout(onClose, 2500);
        }
      };

      requestAnimationFrame(animateFrame);
    }, STEP_TOOLTIP_READ_MS);

    return () => clearTimeout(assignTimer);
  }, [currentStep, firstProduct, mockFileId, onClose]);

  return (
    <>
      <style>{animationStyles}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Demo Mode Badge */}
      <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-black shadow-lg animate-pulse-glow">
          <Play className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold tracking-wide">MODE DÉMO</span>
        </div>
      </div>

      {/* Step indicator with labels */}
      <div className="fixed z-50 top-16 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
          <div className={`flex items-center gap-2 ${getStepNumber() >= 1 ? 'text-amber-500' : 'text-white/40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStepNumber() >= 1 ? 'bg-amber-500 text-black' : 'bg-white/20'}`}>1</div>
            <span className="text-xs font-medium hidden sm:inline">Import</span>
          </div>
          <div className={`w-8 h-0.5 ${getStepNumber() >= 2 ? 'bg-amber-500' : 'bg-white/20'}`} />
          <div className={`flex items-center gap-2 ${getStepNumber() >= 2 ? 'text-amber-500' : 'text-white/40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStepNumber() >= 2 ? 'bg-amber-500 text-black' : 'bg-white/20'}`}>2</div>
            <span className="text-xs font-medium hidden sm:inline">Recherche</span>
          </div>
          <div className={`w-8 h-0.5 ${getStepNumber() >= 3 ? 'bg-amber-500' : 'bg-white/20'}`} />
          <div className={`flex items-center gap-2 ${getStepNumber() >= 3 ? 'text-amber-500' : 'text-white/40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStepNumber() >= 3 ? 'bg-amber-500 text-black' : 'bg-white/20'}`}>3</div>
            <span className="text-xs font-medium hidden sm:inline">Affectation</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Import tooltip - positioned in main area, pointing to files panel */}
      {currentStep === 'import' && filesPanelPosition && (
        <div
          className="fixed z-50"
          style={{
            top: filesPanelPosition.top,
            right: '24%', // Position in the main content area (left 80%), not inside files panel
          }}
        >
          <div className="relative">
            {/* Arrow pointing right towards files panel */}
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
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#141413] border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20">
                <Upload className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <div className="font-semibold text-white text-lg">
                  Importez votre feuille de débit
                </div>
                <p className="text-sm text-neutral-400 mt-1">
                  Glissez un fichier Excel ou DXF ici
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: File flying animation */}
      {currentStep === 'import-animating' && (
        <div
          className="fixed z-[60] pointer-events-none animate-file-fly"
          style={{
            left: fileFlyPosition.x,
            top: fileFlyPosition.y,
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 text-black shadow-[0_10px_40px_rgba(245,158,11,0.4)]">
            <FileSpreadsheet className="w-8 h-8" />
            <div>
              <div className="font-bold">Meuble_Demo.xlsx</div>
              <div className="text-xs opacity-70">4 pièces</div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Search tooltip */}
      {(currentStep === 'search' || currentStep === 'search-typing' || currentStep === 'waiting-results') && searchBarPosition && (
        <div
          className="fixed z-50 transition-opacity duration-300"
          style={{
            top: searchBarPosition.top,
            left: searchBarPosition.left,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="relative">
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
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#141413] border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-black font-bold text-lg">
                {currentStep === 'waiting-results' ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  '2'
                )}
              </div>
              <div>
                <div className="font-semibold text-white text-lg">
                  {currentStep === 'waiting-results' ? 'Chargement des résultats...' : 'Recherchez un panneau'}
                </div>
                <p className="text-sm text-neutral-400 mt-1">
                  {currentStep === 'waiting-results' ? 'Veuillez patienter' : 'Ex: mélaminé blanc 19mm, MDF, OSB...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Assign tooltip */}
      {currentStep === 'assign' && (
        <div
          className="fixed z-50"
          style={{
            top: '35%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#141413] border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-black font-bold text-lg">
              3
            </div>
            <div>
              <div className="font-semibold text-white text-lg">
                Glissez le panneau sur votre fichier
              </div>
              <p className="text-sm text-neutral-400 mt-1">
                Drag & drop pour affecter le matériau
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dragging ghost element */}
      {isDragging && firstProduct && (
        <div
          className="fixed z-[60] pointer-events-none"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            transform: 'translate(-50%, -50%) rotate(-2deg)',
          }}
        >
          <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-lg scale-105" />
          <div className="relative px-5 py-3 rounded-xl bg-[#1a1a19] border border-amber-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <div className="font-semibold text-white text-sm truncate max-w-[220px]">
              {firstProduct.nom}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              {firstProduct.epaisseur}mm • {firstProduct.reference || 'Panneau'}
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {currentStep === 'complete' && (
        <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="px-10 py-8 rounded-2xl bg-[#1a1a19] border border-neutral-700 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-lg">✓</span>
              </div>
              <span className="text-xl font-semibold text-white">C'est terminé !</span>
            </div>
            <p className="text-neutral-400 text-center text-sm">
              Votre fichier est prêt à être configuré
            </p>
          </div>
        </div>
      )}

      {/* Close button */}
      <div className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-800/90 border border-neutral-700 text-white hover:bg-neutral-700 transition-colors shadow-xl backdrop-blur-sm"
        >
          <span className="text-sm font-medium">Passer la démo</span>
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>
    </>
  );
}
