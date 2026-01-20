'use client';

import { Search, X } from 'lucide-react';

interface TreeSearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TreeSearchFilter({
  value,
  onChange,
  placeholder = 'Filtrer...',
}: TreeSearchFilterProps) {
  return (
    <div className="relative px-2 py-2">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--cx-text-muted)]"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-8 pr-7 py-1.5
          text-xs
          bg-[var(--cx-surface-2)]
          border border-[var(--cx-border-subtle)]
          rounded-md
          text-[var(--cx-text)]
          placeholder:text-[var(--cx-text-muted)]
          focus:outline-none focus:border-[var(--cx-border-accent)]
          transition-colors
        "
        aria-label="Filtrer les catégories"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded transition-colors"
          aria-label="Effacer le filtre"
        >
          <X className="w-3 h-3 text-[var(--cx-text-muted)]" />
        </button>
      )}
    </div>
  );
}
