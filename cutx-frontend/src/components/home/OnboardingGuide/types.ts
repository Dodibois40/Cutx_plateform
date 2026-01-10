import type { SearchProduct } from '../types';

// Demo configuration - Slow pace for first-time users
export const DEMO_TEXT = 'melamine blanc 19';
export const TYPING_DELAY_MS = 120;
export const STEP_TOOLTIP_READ_MS = 3500;    // Time to read each tooltip
export const FILE_FLY_DURATION_MS = 2000;    // File flying animation
export const DRAG_DURATION_MS = 2500;        // Drag animation

// Steps: import -> search -> waiting -> assign -> complete
export type OnboardingStep =
  | 'import'
  | 'import-animating'
  | 'search'
  | 'search-typing'
  | 'waiting-results'
  | 'assign'
  | 'assign-animating'
  | 'complete';

export interface OnboardingGuideProps {
  onClose: () => void;
  onTypeText?: (text: string) => void;
  onAddMockFile?: () => string;
  onAssignPanel?: (fileId: string, panel: SearchProduct) => void;
  firstProduct?: SearchProduct | null;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  searchBarPosition: { top: number; left: number } | null;
  filesPanelPosition: { top: number; right: number } | null;
  mockFileId: string | null;
  fileFlyPosition: { x: number; y: number };
  isDragging: boolean;
  dragPosition: { x: number; y: number };
}

// Get step number for display (1, 2, 3)
export function getStepNumber(step: OnboardingStep): number {
  if (step === 'import' || step === 'import-animating') return 1;
  if (step === 'search' || step === 'search-typing' || step === 'waiting-results') return 2;
  return 3;
}
