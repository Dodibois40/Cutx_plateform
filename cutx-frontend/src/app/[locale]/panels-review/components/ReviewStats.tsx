'use client';

import { Check, AlertTriangle, Clock } from 'lucide-react';

interface Stats {
  total: number;
  nonVerifie: number;
  verifie: number;
  aCorriger: number;
  progressPercent: number;
}

interface ReviewStatsProps {
  stats: Stats;
}

export function ReviewStats({ stats }: ReviewStatsProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5 text-[var(--cx-text-muted)]">
        <Clock size={14} />
        <span>{stats.nonVerifie}</span>
      </div>

      <div className="flex items-center gap-1.5 text-green-500">
        <Check size={14} />
        <span>{stats.verifie}</span>
      </div>

      <div className="flex items-center gap-1.5 text-amber-500">
        <AlertTriangle size={14} />
        <span>{stats.aCorriger}</span>
      </div>

      <div className="h-4 w-px bg-[var(--cx-border)]" />

      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-[var(--cx-surface-3)] rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
        <span className="text-[var(--cx-text-muted)] text-xs">
          {stats.progressPercent}%
        </span>
      </div>
    </div>
  );
}
