'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileImage, FileCode, X } from 'lucide-react';

interface ImportedFile {
  data: string;
  type: 'dxf' | 'dwg' | 'image';
  filename: string;
}

interface Props {
  importedFile: ImportedFile | null;
  onImport: (file: ImportedFile) => void;
  onClear: () => void;
}

const ACCEPTED_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'image',
  '.dxf': 'dxf',
  '.dwg': 'dwg',
} as const;

export function UsinageImportButton({ importedFile, onImport, onClear }: Props) {
  const t = useTranslations('dialogs.machining');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determiner le type de fichier
    let fileType: 'dxf' | 'dwg' | 'image' = 'image';
    const extension = file.name.toLowerCase().split('.').pop();

    if (extension === 'dxf') {
      fileType = 'dxf';
    } else if (extension === 'dwg') {
      fileType = 'dwg';
    }

    // Lire le fichier en base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onImport({
        data: base64,
        type: fileType,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="import-section">
      <style jsx>{`
        .import-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--admin-border-subtle, #f0f0f0);
        }

        .import-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem;
          background: var(--admin-bg-tertiary, #f5f5f0);
          border: 2px dashed var(--admin-border-default, #e0e0e0);
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--admin-text-secondary, #666);
          transition: all 0.2s;
        }

        .import-button:hover {
          background: var(--admin-bg-hover, #e8e8e0);
          border-color: var(--admin-olive, #6b7c4c);
          color: var(--admin-olive, #6b7c4c);
        }

        .import-hint {
          font-size: 0.7rem;
          color: var(--admin-text-muted, #999);
          text-align: center;
          margin-top: 0.5rem;
        }

        .imported-file {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--admin-olive-bg, #f0f2e8);
          border: 1px solid var(--admin-olive-border, #d4d6c8);
          border-radius: 8px;
        }

        .file-icon {
          flex-shrink: 0;
          color: var(--admin-olive, #6b7c4c);
        }

        .file-info {
          flex: 1;
          overflow: hidden;
        }

        .file-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-primary, #1a1a1a);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-type {
          font-size: 0.7rem;
          color: var(--admin-olive, #6b7c4c);
          text-transform: uppercase;
        }

        .btn-clear {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: var(--admin-text-muted, #999);
          transition: all 0.2s;
        }

        .btn-clear:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
        }

        input[type="file"] {
          display: none;
        }
      `}</style>

      <input
        ref={inputRef}
        type="file"
        accept=".dxf,.dwg,.jpg,.jpeg,.png,.gif,.webp,.pdf"
        onChange={handleFileChange}
      />

      {importedFile ? (
        <div className="imported-file">
          {importedFile.type === 'image' ? (
            <FileImage size={24} className="file-icon" />
          ) : (
            <FileCode size={24} className="file-icon" />
          )}
          <div className="file-info">
            <div className="file-name">{importedFile.filename}</div>
            <div className="file-type">{importedFile.type.toUpperCase()}</div>
          </div>
          <button className="btn-clear" onClick={onClear} title="Supprimer">
            <X size={18} />
          </button>
        </div>
      ) : (
        <>
          <button className="import-button" onClick={handleClick}>
            <Upload size={20} />
            {t('importButton')}
          </button>
          <p className="import-hint">{t('importHint')}</p>
        </>
      )}
    </div>
  );
}
