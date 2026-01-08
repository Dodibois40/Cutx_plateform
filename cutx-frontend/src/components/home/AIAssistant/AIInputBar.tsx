'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface AIInputBarProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function AIInputBar({ onSend, isLoading, placeholder }: AIInputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !isLoading) {
      onSend(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex items-end gap-2 bg-[var(--cx-surface-2)] rounded-2xl border border-[var(--cx-border)] px-4 py-3 focus-within:border-[var(--cx-accent)] transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Décrivez votre projet...'}
        disabled={isLoading}
        rows={1}
        className="flex-1 bg-transparent text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] resize-none outline-none text-sm min-h-[24px] max-h-[150px]"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--cx-accent)] text-black hover:bg-[var(--cx-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
