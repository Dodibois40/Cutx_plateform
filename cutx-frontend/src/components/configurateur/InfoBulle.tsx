'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoBulleProps {
  titre: string;
  contenu: string;
}

export default function InfoBulle({ titre, contenu }: InfoBulleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position du popup
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 320;
      let leftPos = rect.left + rect.width / 2 + window.scrollX;

      // Éviter le débordement à gauche
      if (leftPos - popupWidth / 2 < 10) {
        leftPos = popupWidth / 2 + 10;
      }
      // Éviter le débordement à droite
      if (leftPos + popupWidth / 2 > window.innerWidth - 10) {
        leftPos = window.innerWidth - popupWidth / 2 - 10;
      }

      setPosition({
        top: rect.bottom + 8 + window.scrollY,
        left: leftPos,
      });
    }
  }, [isOpen]);

  const handleMouseEnter = useCallback(() => {
    // Petit délai avant l'ouverture pour éviter les ouvertures intempestives
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  }, []);

  const popup = isOpen && mounted ? createPortal(
    <div
      ref={popupRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        width: 320,
        background: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-olive-border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '0.625rem 0.875rem',
        borderBottom: '1px solid var(--admin-border-subtle)',
        background: 'var(--admin-bg-elevated)',
        borderRadius: '10px 10px 0 0',
      }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--admin-olive)' }}>{titre}</span>
      </div>
      {/* Content */}
      <div style={{
        padding: '0.75rem 0.875rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        maxHeight: 280,
        overflowY: 'auto',
      }}>
        {contenu.split('\n').filter(p => p.trim()).map((paragraph, i) => (
          <span key={i} style={{
            display: 'block',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: 'var(--admin-text-secondary)',
          }}>
            {paragraph}
          </span>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <span
      ref={triggerRef}
      className="infobulle-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="infobulle-trigger">
        <Info size={10} />
      </span>

      {popup}

      <style jsx>{`
        .infobulle-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-left: 2px;
          cursor: default;
        }

        .infobulle-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 13px;
          height: 13px;
          padding: 0;
          color: var(--admin-text-muted);
          transition: all 0.2s;
          border-radius: 50%;
          opacity: 0.4;
        }

        .infobulle-container:hover .infobulle-trigger {
          color: var(--admin-olive);
          opacity: 1;
        }
      `}</style>
    </span>
  );
}

// === CONTENUS DÉTAILLÉS DES INFOBULLES ===
// @deprecated - These are no longer used. Use translation keys from configurateur.infobulles instead.
// The InfoBulle component now receives titre and contenu as props with translated values.
export const INFOBULLES_CONTENU = {} as const;
