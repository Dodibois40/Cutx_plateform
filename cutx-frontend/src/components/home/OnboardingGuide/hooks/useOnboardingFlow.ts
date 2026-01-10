'use client';

import { useState, useLayoutEffect, useCallback, useEffect, useRef } from 'react';
import type { SearchProduct } from '../../types';
import {
  type OnboardingStep,
  DEMO_TEXT,
  TYPING_DELAY_MS,
  STEP_TOOLTIP_READ_MS,
  FILE_FLY_DURATION_MS,
  DRAG_DURATION_MS,
} from '../types';

interface UseOnboardingFlowProps {
  onClose: () => void;
  onTypeText?: (text: string) => void;
  onAddMockFile?: () => string;
  onAssignPanel?: (fileId: string, panel: SearchProduct) => void;
  firstProduct?: SearchProduct | null;
}

export function useOnboardingFlow({
  onClose,
  onTypeText,
  onAddMockFile,
  onAssignPanel,
  firstProduct,
}: UseOnboardingFlowProps) {
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

  // Refs for callbacks (to avoid stale closures)
  const onTypeTextRef = useRef(onTypeText);
  const onAddMockFileRef = useRef(onAddMockFile);
  const onAssignPanelRef = useRef(onAssignPanel);
  onTypeTextRef.current = onTypeText;
  onAddMockFileRef.current = onAddMockFile;
  onAssignPanelRef.current = onAssignPanel;

  // Update positions of elements
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

  // Step 2a: Start search flow
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

  // Step 3: Assign flow with drag animation
  useEffect(() => {
    if (currentStep !== 'assign' || !firstProduct || !mockFileId) return;

    const assignTimer = setTimeout(() => {
      setCurrentStep('assign-animating');

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

  return {
    currentStep,
    searchBarPosition,
    filesPanelPosition,
    fileFlyPosition,
    isDragging,
    dragPosition,
  };
}
