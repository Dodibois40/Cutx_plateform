'use client';

import { forwardRef } from 'react';
import { Command } from 'cmdk';
import { Search, Loader2 } from 'lucide-react';

interface CommandInputProps {
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(
  function CommandInput(
    {
      value,
      onValueChange,
      isLoading = false,
      placeholder = 'Rechercher un panneau, une catégorie...',
    },
    ref
  ) {
    return (
      <div className="cutx-command-input-wrapper">
        <Search className="cutx-command-input-icon" />
        <Command.Input
          ref={ref}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          className="cutx-command-input"
          autoFocus
        />
        {isLoading && <Loader2 className="cutx-command-input-loader" />}
      </div>
    );
  }
);
