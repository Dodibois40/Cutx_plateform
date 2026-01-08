'use client';

/**
 * FilesPanel - Right side of the Import Workspace
 * Shows imported files with their assignment status
 * Files are drop targets for panels
 */

import { Upload, FileSpreadsheet, FileCode } from 'lucide-react';
import type { FilesPanelProps } from './types';
import WorkspaceFileCard from './WorkspaceFileCard';

export default function FilesPanel({
  files,
  selectedFileId,
  onSelectFile,
  onRemoveFile,
  onUnassignPanel,
  onAssignPanel,
}: FilesPanelProps) {
  const filesWithoutPanel = files.filter(f => !f.assignedPanel);
  const filesWithPanel = files.filter(f => f.assignedPanel);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-amber-500/70" />
            <h2 className="text-base font-semibold text-[var(--cx-text)]">Fichiers</h2>
          </div>
          <div className="text-xs text-[var(--cx-text-muted)] bg-white/5 px-2 py-1 rounded-full">
            {filesWithPanel.length}/{files.length}
          </div>
        </div>
      </div>

      {/* Files list */}
      <div className="flex-1 overflow-y-auto p-4">
        {files.length === 0 ? (
          <EmptyFilesState />
        ) : (
          <div className="space-y-3">
            {/* Unassigned files first */}
            {filesWithoutPanel.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  En attente d'affectation
                </div>
                {filesWithoutPanel.map((file) => (
                  <WorkspaceFileCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onSelect={() => onSelectFile(file.id)}
                    onRemove={() => onRemoveFile(file.id)}
                    onUnassign={() => onUnassignPanel(file.id)}
                    onDrop={(panel) => onAssignPanel(file.id, panel)}
                  />
                ))}
              </div>
            )}

            {/* Separator */}
            {filesWithoutPanel.length > 0 && filesWithPanel.length > 0 && (
              <div className="my-4 h-px bg-white/5" />
            )}

            {/* Assigned files */}
            {filesWithPanel.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Panneaux affectés
                </div>
                {filesWithPanel.map((file) => (
                  <WorkspaceFileCard
                    key={file.id}
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onSelect={() => onSelectFile(file.id)}
                    onRemove={() => onRemoveFile(file.id)}
                    onUnassign={() => onUnassignPanel(file.id)}
                    onDrop={(panel) => onAssignPanel(file.id, panel)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Empty state when no files are imported
function EmptyFilesState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-[var(--cx-surface-1)] border-2 border-dashed border-[var(--cx-border)] flex items-center justify-center">
          <FileSpreadsheet className="w-10 h-10 text-[var(--cx-text-muted)]/30" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-[var(--cx-surface-1)] border-2 border-dashed border-[var(--cx-border)] flex items-center justify-center">
          <FileCode className="w-5 h-5 text-[var(--cx-text-muted)]/30" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[var(--cx-text)] mb-2">
        Aucun fichier importé
      </h3>
      <p className="text-sm text-[var(--cx-text-muted)] mb-4 max-w-xs">
        Glissez vos fichiers Excel ou DXF sur la zone de recherche à gauche pour les importer.
      </p>

      <div className="flex items-center gap-4 text-xs text-[var(--cx-text-muted)]">
        <span className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          .xlsx, .xls
        </span>
        <span className="flex items-center gap-1.5">
          <FileCode className="w-4 h-4" />
          .dxf
        </span>
      </div>
    </div>
  );
}
