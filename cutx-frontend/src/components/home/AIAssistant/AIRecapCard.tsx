'use client';

import { Package, Ruler, Layers, Check, Edit2, Loader2 } from 'lucide-react';
import type { ClaudeRecommendation } from '@/lib/services/ai-assistant-api';

interface AIRecapCardProps {
  recap: ClaudeRecommendation;
  onValidate: () => void;
  onModify: () => void;
  isGenerating?: boolean;
}

export function AIRecapCard({ recap, onValidate, onModify, isGenerating }: AIRecapCardProps) {
  if (!recap.recommendation) return null;

  const { panels, debits } = recap.recommendation;
  const totalDebits = debits.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="bg-gradient-to-br from-[var(--cx-surface-2)] to-[var(--cx-surface-3)] rounded-xl border border-[var(--cx-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-[var(--cx-border)]">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--cx-text)]">
          <Package className="w-4 h-4 text-[var(--cx-accent)]" />
          RÉCAP PROJET
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Recap text */}
        <p className="text-sm text-[var(--cx-text-muted)]">{recap.recap}</p>

        {/* Panels */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--cx-text-muted)] uppercase">
            <Layers className="w-3 h-3" />
            Panneaux ({panels.length})
          </div>
          {panels.map((panel, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-[var(--cx-surface)] rounded-lg px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium text-[var(--cx-text)]">
                  {panel.role}
                </div>
                <div className="text-xs text-[var(--cx-text-muted)]">
                  {panel.productType} • {panel.criteria.keywords?.join(', ')}
                  {panel.criteria.thickness && ` • ${panel.criteria.thickness}mm`}
                </div>
              </div>
              {panel.quantity && (
                <div className="text-sm font-medium text-[var(--cx-accent)]">
                  ×{panel.quantity}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Debits summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--cx-text-muted)] uppercase">
            <Ruler className="w-3 h-3" />
            Débits ({totalDebits} pièces)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {debits.slice(0, 4).map((debit, index) => (
              <div
                key={index}
                className="bg-[var(--cx-surface)] rounded-lg px-3 py-2"
              >
                <div className="text-xs font-medium text-[var(--cx-text)]">
                  {debit.reference}
                </div>
                <div className="text-xs text-[var(--cx-text-muted)]">
                  {debit.longueur}×{debit.largeur} • ×{debit.quantity}
                </div>
              </div>
            ))}
          </div>
          {debits.length > 4 && (
            <div className="text-xs text-[var(--cx-text-muted)] text-center">
              +{debits.length - 4} autres débits
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-[var(--cx-surface)] border-t border-[var(--cx-border)] flex gap-2">
        <button
          onClick={onValidate}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--cx-accent)] text-black font-medium rounded-lg hover:bg-[var(--cx-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Valider et créer
            </>
          )}
        </button>
        <button
          onClick={onModify}
          disabled={isGenerating}
          className="px-4 py-2.5 bg-[var(--cx-surface-2)] text-[var(--cx-text)] font-medium rounded-lg hover:bg-[var(--cx-surface-3)] transition-colors border border-[var(--cx-border)] disabled:opacity-50"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
