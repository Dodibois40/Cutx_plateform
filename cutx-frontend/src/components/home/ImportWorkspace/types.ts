/**
 * Types for the Import Workspace component
 * Split-screen layout for panel assignment workflow
 */

import type { SearchProduct } from '../types';
import type { ImportedFileData } from '../hooks/useFileImport';

// File card states for visual feedback
export type FileCardState = 'waiting' | 'drag-over' | 'assigned';

// Files panel props
export interface FilesPanelProps {
  files: ImportedFileData[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string | null) => void;
  onRemoveFile: (fileId: string) => void;
  onUnassignPanel: (fileId: string) => void;
  onAssignPanel: (fileId: string, panel: SearchProduct) => void;
  // File drop for adding more files
  onFileDrop?: (file: File) => void;
  isImporting?: boolean;
}

// Workspace file card props (larger, with drop zone)
export interface WorkspaceFileCardProps {
  file: ImportedFileData;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUnassign: () => void;
  onDrop: (panel: SearchProduct) => void;
}

// Bottom bar props
export interface WorkspaceBottomBarProps {
  totalFiles: number;
  assignedFiles: number;
  totalPieces: number;
  allAssigned: boolean;
  onConfigureAll: () => void;
  onReset: () => void;
}

// Main workspace props
export interface ImportWorkspaceProps {
  // File import state
  files: ImportedFileData[];
  isImporting: boolean;
  importError: string | null;
  // File actions
  onFileDrop: (file: File) => void;
  onRemoveFile: (fileId: string) => void;
  onAssignPanel: (fileId: string, panel: SearchProduct) => void;
  onUnassignPanel: (fileId: string) => void;
  onReset: () => void;
  onConfigureAll: () => void;
  // Computed state
  allFilesHavePanel: boolean;
  totalLines: number;
}
