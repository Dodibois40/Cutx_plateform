'use client';

// components/configurateur/SelecteurForme.tsx
// Dropdown de sélection de forme de panneau avec icônes
// Utilise createPortal pour éviter les problèmes de scroll dans la table

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import type { FormePanneau, ChantsConfig } from '@/lib/configurateur/types';
import { FORMES_PANNEAU_VALUES, DEFAULT_CHANTS_BY_SHAPE } from '@/lib/configurateur/constants';
import { ShapeIcon } from '@/components/icons/ShapeIcons';

interface SelecteurFormeProps {
  forme: FormePanneau;
  onChange: (forme: FormePanneau, chantsConfig: ChantsConfig) => void;
  onCustomSelect?: () => void; // Callback pour ouvrir popup DXF
  disabled?: boolean;
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export default function SelecteurForme({
  forme,
  onChange,
  onCustomSelect,
  disabled = false,
  className = '',
}: SelecteurFormeProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 140 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculer la position du menu par rapport au bouton trigger
  const updateMenuPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4, // 4px de marge
        left: rect.left,
        width: Math.max(rect.width, 140),
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

  const handleSelect = (selectedForme: FormePanneau) => {
    if (selectedForme === 'custom') {
      // Pour forme custom, ouvrir le popup DXF au lieu de changer directement
      if (onCustomSelect) {
        onCustomSelect();
      }
      setIsOpen(false);
      return;
    }

    const chantsConfig = DEFAULT_CHANTS_BY_SHAPE[selectedForme];
    onChange(selectedForme, chantsConfig);
    setIsOpen(false);
  };

  const getFormeLabel = (f: FormePanneau): string => {
    const key = `configurateur.shapes.${f}`;
    try {
      return t(key);
    } catch {
      // Fallback si traduction non trouvée
      const fallbacks: Record<FormePanneau, string> = {
        rectangle: 'Rectangle',
        pentagon: 'L (5 côtés)',
        circle: 'Rond',
        ellipse: 'Ovale',
        triangle: 'Triangle',
        custom: 'Autre (DXF)',
      };
      return fallbacks[f];
    }
  };

  // Menu rendu via portal pour éviter les problèmes de scroll
  const renderMenu = () => {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
      <div
        ref={menuRef}
        className="selecteur-forme-menu-portal"
        style={{
          position: 'fixed',
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 9999,
        }}
        role="listbox"
      >
        {FORMES_PANNEAU_VALUES.map((f) => (
          <button
            key={f}
            type="button"
            className={`selecteur-forme-option ${f === forme ? 'active' : ''}`}
            onClick={() => handleSelect(f)}
            role="option"
            aria-selected={f === forme}
          >
            <ShapeIcon forme={f} size={18} className="selecteur-forme-option-icon" />
            <span className="selecteur-forme-option-label">{getFormeLabel(f)}</span>
            {f === forme && <span className="selecteur-forme-check">✓</span>}
          </button>
        ))}

        <style jsx>{`
          .selecteur-forme-menu-portal {
            background: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 0.5rem;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            min-width: 140px;
          }

          .selecteur-forme-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.5rem 0.625rem;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.85);
            cursor: pointer;
            transition: background 0.1s ease;
            text-align: left;
          }

          .selecteur-forme-option:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .selecteur-forme-option.active {
            background: rgba(212, 168, 75, 0.15);
            color: var(--color-primary, #D4A84B);
          }

          .selecteur-forme-option :global(.selecteur-forme-option-icon) {
            flex-shrink: 0;
            opacity: 0.9;
          }

          .selecteur-forme-option-label {
            flex: 1;
            font-size: 0.8125rem;
          }

          .selecteur-forme-check {
            font-size: 0.75rem;
            opacity: 0.8;
          }

          /* Séparateur avant "Autre (DXF)" */
          .selecteur-forme-option:last-child {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 0.25rem;
            padding-top: 0.625rem;
          }
        `}</style>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className={`selecteur-forme ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}>
        {/* Bouton trigger - Icône seule + chevron */}
        <button
          ref={triggerRef}
          type="button"
          className="selecteur-forme-trigger"
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={getFormeLabel(forme)}
        >
          <ShapeIcon forme={forme} size={20} className="selecteur-forme-icon" />
          <ChevronDown
            size={12}
            className={`selecteur-forme-chevron ${isOpen ? 'rotated' : ''}`}
          />
        </button>

        <style jsx>{`
          .selecteur-forme {
            position: relative;
            display: inline-flex;
            flex-direction: column;
          }

          .selecteur-forme.disabled {
            opacity: 0.5;
            pointer-events: none;
          }

          .selecteur-forme-trigger {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            padding: 0.375rem 0.5rem;
            background: var(--admin-bg-tertiary, rgba(255, 255, 255, 0.05));
            border: 1px solid var(--admin-border-default, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            color: var(--admin-olive, #a3b763);
            cursor: pointer;
            transition: all 0.15s ease;
            min-width: auto;
          }

          .selecteur-forme-trigger:hover {
            background: var(--admin-bg-hover, rgba(255, 255, 255, 0.1));
            border-color: var(--admin-olive-border, rgba(163, 183, 99, 0.5));
          }

          .selecteur-forme.open .selecteur-forme-trigger {
            background: var(--admin-olive-bg, rgba(163, 183, 99, 0.1));
            border-color: var(--admin-olive, #a3b763);
          }

          .selecteur-forme-trigger :global(.selecteur-forme-icon) {
            flex-shrink: 0;
            color: var(--admin-olive, #a3b763);
            max-width: 32px;
            height: auto;
          }

          .selecteur-forme-chevron {
            flex-shrink: 0;
            opacity: 0.7;
            transition: transform 0.2s ease;
            color: var(--admin-olive, #a3b763);
          }

          .selecteur-forme-chevron.rotated {
            transform: rotate(180deg);
          }
        `}</style>
      </div>

      {/* Menu rendu via portal */}
      {renderMenu()}
    </>
  );
}
