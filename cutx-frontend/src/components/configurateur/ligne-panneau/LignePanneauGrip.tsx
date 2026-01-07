'use client';

import { useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface LignePanneauGripProps {
  // État indicateur
  indicateurCouleur: string;
  indicateurIcone: React.ReactNode;

  // Sélection
  isSelected: boolean;
  selectedCount: number;
  onToggleSelection?: () => void;

  // Drag & Drop (optionnel)
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;

  // Tooltip état
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  etatRef?: React.RefObject<HTMLSpanElement | null>;
}

export default function LignePanneauGrip({
  indicateurCouleur,
  indicateurIcone,
  isSelected,
  selectedCount,
  onToggleSelection,
  dragAttributes,
  dragListeners,
  onMouseEnter,
  onMouseLeave,
  etatRef,
}: LignePanneauGripProps) {
  // Détection click vs drag sur le grip handle
  const pointerDownTimeRef = useRef<number>(0);
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const CLICK_THRESHOLD_MS = 200;
  const MOVE_THRESHOLD_PX = 5;

  const handleGripPointerDown = (e: React.PointerEvent) => {
    pointerDownTimeRef.current = Date.now();
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleGripPointerUp = (e: React.PointerEvent) => {
    const elapsed = Date.now() - pointerDownTimeRef.current;
    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    const moved = dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX;

    if (elapsed < CLICK_THRESHOLD_MS && !moved && onToggleSelection) {
      onToggleSelection();
    }
  };

  return (
    <>
      <div className="etat-grip-container">
        {dragListeners ? (
          <button
            className={`grip-handle ${isSelected ? 'selected' : ''}`}
            style={{ color: isSelected ? 'var(--cx-accent)' : indicateurCouleur }}
            {...(dragAttributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            {...(dragListeners as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            onPointerDown={(e) => {
              handleGripPointerDown(e);
              if (dragListeners?.onPointerDown) {
                (dragListeners.onPointerDown as (e: React.PointerEvent) => void)(e);
              }
            }}
            onPointerUp={handleGripPointerUp}
          >
            {isSelected && selectedCount > 1 ? (
              <span className="selection-badge">{selectedCount}</span>
            ) : (
              <GripVertical size={16} />
            )}
          </button>
        ) : (
          <span
            ref={etatRef}
            className="etat-indicateur"
            style={{ color: indicateurCouleur }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {indicateurIcone}
          </span>
        )}
      </div>

      <style jsx>{`
        .etat-grip-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .grip-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: grab;
          transition: all 0.15s;
        }

        .grip-handle:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }

        .grip-handle:active {
          cursor: grabbing;
          transform: scale(0.95);
        }

        .grip-handle.selected {
          background: var(--cx-accent-muted);
          border: 1px solid var(--cx-accent);
        }

        .selection-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: var(--cx-accent);
          color: white;
          border-radius: 50%;
          font-size: 0.65rem;
          font-weight: 700;
        }

        .etat-indicateur {
          cursor: help;
          font-size: 1rem;
        }
      `}</style>
    </>
  );
}
