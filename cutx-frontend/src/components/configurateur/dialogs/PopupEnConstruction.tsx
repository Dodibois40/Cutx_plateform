'use client';

import { createPortal } from 'react-dom';
import { Construction } from 'lucide-react';

interface PopupEnConstructionProps {
  open: boolean;
  onClose: () => void;
  titre: string;
}

export default function PopupEnConstruction({ open, onClose, titre }: PopupEnConstructionProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="popup-construction-overlay" onClick={onClose}>
      <div className="popup-construction" onClick={(e) => e.stopPropagation()}>
        <div className="popup-construction-icon">
          <Construction size={48} />
        </div>
        <h3>{titre}</h3>
        <p>Cette fonctionnalité est en cours de développement.</p>
        <p className="popup-construction-sub">Elle sera disponible prochainement !</p>
        <button className="popup-construction-btn" onClick={onClose}>
          Compris
        </button>
      </div>
      <style jsx>{`
        .popup-construction-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }
        .popup-construction {
          background: var(--admin-bg-card, #1e1e1c);
          border: 1px solid var(--admin-border-default, #3a3a38);
          border-radius: 16px;
          padding: 2rem 2.5rem;
          text-align: center;
          max-width: 360px;
          animation: scaleIn 0.25s ease;
        }
        .popup-construction-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.25rem;
          background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 152, 0, 0.1));
          border-radius: 50%;
          color: #ffc107;
        }
        h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--admin-text-primary, #f5f5f3);
          margin: 0 0 0.75rem;
        }
        p {
          font-size: 0.9375rem;
          color: var(--admin-text-secondary, #a5a49f);
          margin: 0 0 0.25rem;
        }
        .popup-construction-sub {
          font-size: 0.8125rem;
          color: var(--admin-text-muted, #7a7a78);
          margin-bottom: 1.5rem;
        }
        .popup-construction-btn {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #8B9A4B 0%, #6d7a3f 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .popup-construction-btn:hover {
          background: linear-gradient(135deg, #9aad5e 0%, #7a894a 100%);
          transform: translateY(-1px);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
