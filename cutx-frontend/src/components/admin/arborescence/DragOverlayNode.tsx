'use client';

import { Folder } from 'lucide-react';
import type { AdminCategory } from './types';

interface Props {
  category: AdminCategory;
}

export function DragOverlayNode({ category }: Props) {
  return (
    <div className="drag-overlay-node">
      <Folder size={18} className="folder-icon" />
      <span className="node-name">{category.name}</span>
      <span className="node-count">{category._count.panels} panneaux</span>
    </div>
  );
}
