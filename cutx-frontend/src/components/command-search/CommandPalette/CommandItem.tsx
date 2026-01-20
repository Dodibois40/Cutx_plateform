'use client';

import { Command } from 'cmdk';
import {
  Clock,
  Folder,
  Package,
  Zap,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import type { CommandResult } from '../types';

interface CommandItemProps {
  result: CommandResult;
  onSelect: () => void;
}

const TYPE_ICONS = {
  recent: Clock,
  category: Folder,
  product: Package,
  action: Zap,
};

export function CommandItem({ result, onSelect }: CommandItemProps) {
  const IconComponent = result.icon ? null : TYPE_ICONS[result.type];

  return (
    <Command.Item
      value={`${result.type}-${result.id}-${result.title}`}
      onSelect={onSelect}
      className="cutx-command-item"
      keywords={result.keywords}
    >
      {/* Icon or Image */}
      {result.imageUrl ? (
        <img
          src={result.imageUrl}
          alt=""
          className="cutx-command-item-image"
          loading="lazy"
        />
      ) : result.icon ? (
        <span className="cutx-command-item-icon">{result.icon}</span>
      ) : IconComponent ? (
        <IconComponent className="cutx-command-item-icon" />
      ) : null}

      {/* Content */}
      <div className="cutx-command-item-content">
        <div className="cutx-command-item-title">{result.title}</div>
        {result.subtitle && (
          <div className="cutx-command-item-subtitle">{result.subtitle}</div>
        )}
      </div>

      {/* Metadata */}
      <div className="cutx-command-item-meta">
        {result.metadata?.thickness && (
          <span className="cutx-command-item-badge">
            {result.metadata.thickness}mm
          </span>
        )}
        {result.metadata?.panelCount !== undefined && (
          <span className="cutx-command-item-badge cutx-command-item-badge--accent">
            {result.metadata.panelCount}
          </span>
        )}
        {result.metadata?.stock === 'EN STOCK' && (
          <span className="cutx-command-item-badge cutx-command-item-badge--accent">
            Stock
          </span>
        )}
        {result.type === 'category' ? (
          <ChevronRight className="w-4 h-4 opacity-50" />
        ) : result.type === 'action' ? (
          <ArrowRight className="w-4 h-4 opacity-50" />
        ) : null}
      </div>
    </Command.Item>
  );
}
