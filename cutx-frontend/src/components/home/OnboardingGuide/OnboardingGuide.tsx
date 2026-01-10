'use client';

/**
 * OnboardingGuide - Interactive demo for first-time users
 * Refactored: Main component composing extracted subcomponents
 */

import { animationStyles } from './styles';
import type { OnboardingGuideProps } from './types';
import { useOnboardingFlow } from './hooks';
import {
  StepIndicator,
  ImportTooltip,
  FileFlyAnimation,
  SearchTooltip,
  AssignTooltip,
  DragGhost,
  DemoBackdrop,
  DemoBadge,
  SuccessMessage,
  CloseButton,
} from './components';

export default function OnboardingGuide({
  onClose,
  onTypeText,
  onAddMockFile,
  onAssignPanel,
  firstProduct,
}: OnboardingGuideProps) {
  const {
    currentStep,
    searchBarPosition,
    filesPanelPosition,
    fileFlyPosition,
    isDragging,
    dragPosition,
  } = useOnboardingFlow({
    onClose,
    onTypeText,
    onAddMockFile,
    onAssignPanel,
    firstProduct,
  });

  return (
    <>
      <style>{animationStyles}</style>

      {/* Backdrop */}
      <DemoBackdrop onClose={onClose} />

      {/* Demo Mode Badge */}
      <DemoBadge />

      {/* Step indicator (1-2-3) */}
      <StepIndicator currentStep={currentStep} />

      {/* STEP 1: Import tooltip */}
      <ImportTooltip
        currentStep={currentStep}
        position={filesPanelPosition}
      />

      {/* STEP 1: File flying animation */}
      <FileFlyAnimation
        position={fileFlyPosition}
        isVisible={currentStep === 'import-animating'}
      />

      {/* STEP 2: Search tooltip */}
      <SearchTooltip
        currentStep={currentStep}
        position={searchBarPosition}
      />

      {/* STEP 3: Assign tooltip */}
      <AssignTooltip currentStep={currentStep} />

      {/* Dragging ghost element */}
      <DragGhost
        isDragging={isDragging}
        position={dragPosition}
        product={firstProduct}
      />

      {/* Success message */}
      <SuccessMessage isVisible={currentStep === 'complete'} />

      {/* Close button */}
      <CloseButton onClose={onClose} />
    </>
  );
}
