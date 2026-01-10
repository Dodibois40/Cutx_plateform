/**
 * Types for the Split Thickness Modal
 * Modal that allows users to split a file with mixed thicknesses
 * into separate sub-files per thickness
 */

import type { ImportedFileData, ThicknessBreakdown } from '../../hooks/useFileImport';

export interface SplitThicknessModalProps {
  open: boolean;
  file: ImportedFileData | null;
  onSplit: (fileId: string) => void;
  onCancel: () => void;
}

export interface ThicknessGroupProps {
  breakdown: ThicknessBreakdown;
  baseName: string;
}
