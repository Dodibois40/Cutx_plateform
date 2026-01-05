'use client';

// components/configurateur/SelecteurFinition.tsx
// Dropdown de sélection de type de finition - style cohérent avec SelecteurForme

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronDown, Plus, Paintbrush } from 'lucide-react';
import type { TypeFinition } from '@/lib/configurateur/types';
import { TYPES_FINITION_VALUES, TYPES_FINITION_TRANSLATION_KEYS } from '@/lib/configurateur/constants';

interface SelecteurFinitionProps {
  onSelect: (typeFinition: TypeFinition) => void;
  disabled?: boolean;
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export default function SelecteurFinition({
  onSelect,
  disabled = false,
  className = '',
}: SelecteurFinitionProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 150 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculer la position du menu par rapport au bouton trigger
  const updateMenuPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 150;

      // Vérifier si le menu dépasse à droite de l'écran
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = rect.right - menuWidth;
      }

      setMenuPosition({
        top: rect.bottom + 4,
        left,
        width: menuWidth,
      });
    }
  }, []);

  // Fermer le menu si clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Mettre à jour la position lors du scroll ou resize
  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();

      const handleScrollOrResize = () => {
        updateMenuPosition();
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updateMenuPosition]);

  const handleToggle = () => {
    if (disabled) return;

    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (typeFinition: TypeFinition) => {
    onSelect(typeFinition);
    setIsOpen(false);
  };

  // Menu rendu via portal pour éviter les problèmes de scroll
  const renderMenu = () => {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
      <div
        ref={menuRef}
        className="selecteur-finition-menu-portal"
        style={{
          position: 'fixed',
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 9999,
        }}
        role="listbox"
      >
        {TYPES_FINITION_VALUES.map((typeFinition) => (
          <button
            key={typeFinition}
            type="button"
            className="selecteur-finition-option"
            onClick={() => handleSelect(typeFinition)}
            role="option"
          >
            <Paintbrush size={14} className="option-icon" />
            <span className="option-label">{t(TYPES_FINITION_TRANSLATION_KEYS[typeFinition])}</span>
          </button>
        ))}

        <style jsx>{`
          .selecteur-finition-menu-portal {
            background: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 0.5rem;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            min-width: 140px;
          }

          .selecteur-finition-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: none;
            border: none;
            color: var(--cx-text-secondary, rgba(255, 255, 255, 0.85));
            cursor: pointer;
            transition: background 0.1s ease;
            text-align: left;
            font-size: 0.8125rem;
          }

          .selecteur-finition-option:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .selecteur-finition-option :global(.option-icon) {
            flex-shrink: 0;
            opacity: 0.7;
          }

          .selecteur-finition-option:hover :global(.option-icon) {
            opacity: 1;
            color: var(--admin-olive, #a3b763);
          }

          .option-label {
            flex: 1;
          }
        `}</style>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className={`selecteur-finition ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          className="selecteur-finition-trigger"
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Plus size={12} className="trigger-icon" />
          <span className="trigger-label">{t('configurateur.finish.addFinish')}</span>
          <ChevronDown
            size={12}
            className={`trigger-chevron ${isOpen ? 'rotated' : ''}`}
          />
        </button>

        <style jsx>{`
          .selecteur-finition {
            position: relative;
            display: inline-flex;
            width: 100%;
          }

          .selecteur-finition.disabled {
            opacity: 0.5;
            pointer-events: none;
          }

          .selecteur-finition-trigger {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            width: 100%;
            padding: 0.3rem 0.5rem;
            background: var(--cx-surface-1, rgba(255, 255, 255, 0.03));
            border: 1px solid var(--cx-border-subtle, rgba(255, 255, 255, 0.08));
            border-radius: 6px;
            color: var(--cx-text-tertiary, rgba(255, 255, 255, 0.6));
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 0.6875rem;
          }

          .selecteur-finition-trigger:hover {
            background: var(--cx-surface-2, rgba(255, 255, 255, 0.06));
            border-color: var(--cx-border-default, rgba(255, 255, 255, 0.12));
            color: var(--cx-text-secondary, rgba(255, 255, 255, 0.85));
          }

          .selecteur-finition.open .selecteur-finition-trigger {
            background: var(--cx-surface-2, rgba(255, 255, 255, 0.06));
            border-color: var(--cx-accent, #a3b763);
          }

          .selecteur-finition-trigger :global(.trigger-icon) {
            flex-shrink: 0;
            opacity: 0.7;
          }

          .trigger-label {
            flex: 1;
            text-align: left;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .selecteur-finition-trigger :global(.trigger-chevron) {
            flex-shrink: 0;
            opacity: 0.5;
            transition: transform 0.2s ease;
          }

          .selecteur-finition-trigger :global(.trigger-chevron.rotated) {
            transform: rotate(180deg);
          }
        `}</style>
      </div>

      {/* Menu rendu via portal */}
      {renderMenu()}
    </>
  );
}
