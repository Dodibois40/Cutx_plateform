'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Copy,
  Wrench,
  Palette,
} from 'lucide-react';
import type { LignePrestationV3, Finition, Brillance, Usinage } from '@/lib/configurateur/types';
import {
  MATERIAUX,
  FINITIONS,
  BRILLANCES,
  REGLES,
  PLACEHOLDERS,
  ETAT_INDICATEURS,
} from '@/lib/configurateur/constants';
import { getEtatLigne, formaterPrix, getNombreChampsRemplis } from '@/lib/configurateur/calculs';
import PopupUsinages from '../dialogs/PopupUsinages';
import PopupLaque from '../dialogs/PopupLaque';

interface BottomSheetEditorProps {
  ligne: LignePrestationV3;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<LignePrestationV3>) => void;
  onCopy: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

type SectionId = 'base' | 'finition' | 'dimensions' | 'options';

export default function BottomSheetEditor({
  ligne,
  isOpen,
  onClose,
  onUpdate,
  onCopy,
  onDelete,
  canDelete,
}: BottomSheetEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<SectionId[]>(['base', 'finition', 'dimensions', 'options']);
  const [showUsinages, setShowUsinages] = useState(false);
  const [showLaque, setShowLaque] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSection = (section: SectionId) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // État de la ligne
  const etat = getEtatLigne(ligne);
  const indicateur = ETAT_INDICATEURS[etat];
  const progression = getNombreChampsRemplis(ligne);

  // Filtrer les brillances selon la finition
  const brillancesDisponibles = BRILLANCES.filter(b => {
    if (ligne.finition === 'laque') {
      return b.prixLaque !== null;
    }
    return true;
  });

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={`sheet-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div
        className={`sheet-container ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="sheet-header">
          <div className="header-left">
            <span className="etat-dot" style={{ backgroundColor: indicateur.couleur }} />
            <div className="header-title">
              <h2>{ligne.reference || 'Nouvelle ligne'}</h2>
              <span className="header-progress">{progression.remplis}/{progression.total} champs</span>
            </div>
          </div>
          <button className="btn-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="sheet-body">
          {/* Section : Base */}
          <Section
            title="Référence & Matériau"
            icon="📋"
            isExpanded={expandedSections.includes('base')}
            onToggle={() => toggleSection('base')}
          >
            {/* Référence */}
            <div className="field">
              <label>Référence de la pièce</label>
              <input
                type="text"
                value={ligne.reference}
                onChange={(e) => onUpdate({ reference: e.target.value })}
                placeholder={PLACEHOLDERS.reference}
                className="input-large"
              />
            </div>

            {/* Matériau */}
            <div className="field">
              <label>Matériau</label>
              <div className="chips-group">
                {MATERIAUX.map(m => (
                  <button
                    key={m.value}
                    className={`chip ${ligne.materiau === m.value ? 'chip-active' : ''}`}
                    onClick={() => onUpdate({ materiau: m.value })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={MATERIAUX.some(m => m.value === ligne.materiau) ? '' : ligne.materiau || ''}
                onChange={(e) => onUpdate({ materiau: e.target.value || null })}
                placeholder="Ou saisissez un matériau..."
                className="input-secondary"
              />
            </div>
          </Section>

          {/* Section : Finition */}
          <Section
            title="Finition & Couleur"
            icon="🎨"
            isExpanded={expandedSections.includes('finition')}
            onToggle={() => toggleSection('finition')}
          >
            {/* Finition */}
            <div className="field">
              <label>Type de finition</label>
              <div className="radio-cards">
                {FINITIONS.map(f => (
                  <button
                    key={f.value}
                    className={`radio-card ${ligne.finition === f.value ? 'radio-card-active' : ''}`}
                    onClick={() => {
                      let newBrillance = ligne.brillance;
                      if (f.value === 'laque' && ligne.brillance === 'gloss_naturel') {
                        newBrillance = null;
                      }
                      onUpdate({
                        finition: f.value,
                        brillance: newBrillance,
                        teinte: f.value === 'laque' ? null : ligne.teinte,
                        codeCouleurLaque: f.value === 'vernis' ? null : ligne.codeCouleurLaque,
                      });
                    }}
                  >
                    <span className="radio-icon">
                      {f.value === 'laque' ? '🎨' : '✨'}
                    </span>
                    <span className="radio-label">{f.label}</span>
                    <span className="radio-desc">
                      {f.value === 'laque' ? 'Couleur opaque' : 'Transparent/teinté'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Teinte ou Code couleur */}
            {ligne.finition === 'vernis' && (
              <div className="field">
                <label>Teinte du vernis</label>
                <input
                  type="text"
                  value={ligne.teinte || ''}
                  onChange={(e) => onUpdate({ teinte: e.target.value || null })}
                  placeholder={PLACEHOLDERS.teinte}
                  className="input-large"
                />
                <span className="field-hint">Supplément +{REGLES.PRIX_TEINTE_VERNIS}€/m² si teinte</span>
              </div>
            )}

            {ligne.finition === 'laque' && (
              <div className="field">
                <label>Code couleur / RAL</label>
                <button
                  className="btn-color-picker-large"
                  onClick={() => setShowLaque(true)}
                >
                  <Palette size={20} />
                  <span>{ligne.codeCouleurLaque || 'Sélectionner une couleur'}</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            )}

            {/* Brillance */}
            {ligne.finition && (
              <div className="field">
                <label>Brillance</label>
                <div className="select-cards">
                  {brillancesDisponibles.map(b => {
                    const prix = ligne.finition === 'laque' ? b.prixLaque : b.prixVernis;
                    return (
                      <button
                        key={b.value}
                        className={`select-card ${ligne.brillance === b.value ? 'select-card-active' : ''}`}
                        onClick={() => onUpdate({ brillance: b.value })}
                      >
                        <span className="select-card-label">{b.label}</span>
                        <span className="select-card-price">{prix}€/m²</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* Section : Dimensions */}
          <Section
            title="Dimensions"
            icon="📐"
            isExpanded={expandedSections.includes('dimensions')}
            onToggle={() => toggleSection('dimensions')}
          >
            <div className="dimensions-grid">
              <div className="field">
                <label>Longueur (mm)</label>
                <input
                  type="number"
                  value={ligne.dimensions.longueur || ''}
                  onChange={(e) => onUpdate({
                    dimensions: { ...ligne.dimensions, longueur: Number(e.target.value) || 0 }
                  })}
                  placeholder="0"
                  className="input-dimension"
                />
              </div>

              <div className="field">
                <label>Largeur (mm)</label>
                <input
                  type="number"
                  value={ligne.dimensions.largeur || ''}
                  onChange={(e) => onUpdate({
                    dimensions: { ...ligne.dimensions, largeur: Number(e.target.value) || 0 }
                  })}
                  placeholder="0"
                  className="input-dimension"
                />
              </div>

              <div className="field">
                <label>Épaisseur (mm)</label>
                <input
                  type="number"
                  value={ligne.dimensions.epaisseur || ''}
                  onChange={(e) => onUpdate({
                    dimensions: { ...ligne.dimensions, epaisseur: Number(e.target.value) || 0 }
                  })}
                  placeholder="19"
                  className="input-dimension"
                />
              </div>
            </div>

            {/* Surface calculée */}
            {ligne.surfaceM2 > 0 && (
              <div className="surface-info">
                Surface : <strong>{ligne.surfaceM2.toFixed(3)} m²</strong>
                {ligne.surfaceFacturee !== ligne.surfaceM2 && (
                  <span className="surface-min"> (facturée : {ligne.surfaceFacturee.toFixed(3)} m²)</span>
                )}
              </div>
            )}
          </Section>

          {/* Section : Options */}
          <Section
            title="Options"
            icon="⚙️"
            isExpanded={expandedSections.includes('options')}
            onToggle={() => toggleSection('options')}
          >
            {/* Nombre de faces */}
            <div className="field">
              <label>Nombre de faces à traiter</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${ligne.nombreFaces === 1 ? 'toggle-active' : ''}`}
                  onClick={() => onUpdate({ nombreFaces: 1 })}
                >
                  1 face
                </button>
                <button
                  className={`toggle-btn ${ligne.nombreFaces === 2 ? 'toggle-active' : ''}`}
                  onClick={() => onUpdate({ nombreFaces: 2 })}
                >
                  2 faces
                </button>
              </div>
            </div>

            {/* Chants */}
            <div className="field">
              <label>Chants à traiter</label>
              <div className="chants-visual">
                <div className="chant-diagram">
                  <button
                    className={`chant-btn chant-a ${ligne.chants.A ? 'chant-active' : ''}`}
                    onClick={() => onUpdate({ chants: { ...ligne.chants, A: !ligne.chants.A } })}
                  >
                    A
                  </button>
                  <button
                    className={`chant-btn chant-b ${ligne.chants.B ? 'chant-active' : ''}`}
                    onClick={() => onUpdate({ chants: { ...ligne.chants, B: !ligne.chants.B } })}
                  >
                    B
                  </button>
                  <button
                    className={`chant-btn chant-c ${ligne.chants.C ? 'chant-active' : ''}`}
                    onClick={() => onUpdate({ chants: { ...ligne.chants, C: !ligne.chants.C } })}
                  >
                    C
                  </button>
                  <button
                    className={`chant-btn chant-d ${ligne.chants.D ? 'chant-active' : ''}`}
                    onClick={() => onUpdate({ chants: { ...ligne.chants, D: !ligne.chants.D } })}
                  >
                    D
                  </button>
                  <div className="chant-center">
                    <span>Panneau</span>
                  </div>
                </div>
                <div className="chant-legend">
                  <span>A/C = longueurs</span>
                  <span>B/D = largeurs</span>
                </div>
              </div>
            </div>

            {/* Usinages */}
            <div className="field">
              <label>Usinages</label>
              <button
                className="btn-option-large"
                onClick={() => setShowUsinages(true)}
              >
                <Wrench size={20} />
                <span>
                  {ligne.usinages.length > 0
                    ? `${ligne.usinages.length} usinage(s) configuré(s)`
                    : 'Configurer les usinages'
                  }
                </span>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Perçage */}
            <div className="field">
              <label className={`checkbox-percage-styled ${ligne.percage ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={ligne.percage}
                  onChange={(e) => onUpdate({ percage: e.target.checked })}
                />
                <span className="checkbox-visual">
                  {ligne.percage && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="percage-text">Perçage</span>
                <span className="price-badge">+{REGLES.PRIX_PERCAGE_UNITE}€</span>
              </label>
            </div>
          </Section>

          {/* Actions secondaires */}
          <div className="secondary-actions">
            <button className="btn-secondary" onClick={onCopy}>
              <Copy size={18} />
              <span>Dupliquer</span>
            </button>
            <button
              className="btn-secondary btn-danger"
              onClick={onDelete}
              disabled={!canDelete}
            >
              <Trash2 size={18} />
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        {/* Footer sticky avec prix */}
        <div className="sheet-footer">
          <div className="footer-prices">
            <div className="price-row">
              <span>HT</span>
              <span className="price-ht">{formaterPrix(ligne.prixHT)}</span>
            </div>
            <div className="price-row price-main">
              <span>TTC</span>
              <span className="price-ttc">{formaterPrix(ligne.prixTTC)}</span>
            </div>
          </div>
          <button className="btn-validate" onClick={handleClose}>
            <Check size={20} />
            <span>Valider</span>
          </button>
        </div>
      </div>

      {/* Popups */}
      <PopupUsinages
        open={showUsinages}
        usinages={ligne.usinages}
        onUpdate={(usinages: Usinage[]) => onUpdate({ usinages })}
        onClose={() => setShowUsinages(false)}
      />

      <PopupLaque
        open={showLaque}
        codeCouleurActuel={ligne.codeCouleurLaque}
        onUpdate={(codeCouleur) => onUpdate({ codeCouleurLaque: codeCouleur })}
        onClose={() => setShowLaque(false)}
      />

      <style jsx>{`
        /* Overlay */
        .sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .sheet-overlay.closing {
          animation: fadeOut 0.3s ease forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* Container */
        .sheet-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 95vh;
          background: var(--admin-bg-card);
          border-radius: 24px 24px 0 0;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        .sheet-container.closing {
          animation: slideDown 0.3s ease forwards;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }

        /* Header */
        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          position: sticky;
          top: 0;
          background: var(--admin-bg-card);
          border-radius: 24px 24px 0 0;
          z-index: 10;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .etat-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .header-title h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-text-primary);
        }

        .header-progress {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .btn-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--admin-bg-tertiary);
          border: none;
          border-radius: 12px;
          color: var(--admin-text-secondary);
          cursor: pointer;
        }

        /* Body */
        .sheet-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          padding-bottom: 100px;
        }

        /* Sections */
        .field {
          margin-bottom: 1.25rem;
        }

        .field label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
          margin-bottom: 0.5rem;
        }

        /* Inputs */
        .input-large {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-primary);
        }

        .input-large:focus {
          outline: none;
          border-color: var(--admin-olive);
          box-shadow: 0 0 0 3px var(--admin-olive-bg);
        }

        .input-secondary {
          width: 100%;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 10px;
          color: var(--admin-text-primary);
          margin-top: 0.5rem;
        }

        .input-dimension {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 1.25rem;
          font-family: 'Space Grotesk', monospace;
          font-weight: 600;
          text-align: center;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-primary);
        }

        /* Chips */
        .chips-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .chip {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 20px;
          color: var(--admin-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .chip:hover {
          border-color: var(--admin-olive);
        }

        .chip-active {
          background: var(--admin-olive);
          border-color: var(--admin-olive);
          color: white;
        }

        .chip-large {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1rem;
          min-width: 72px;
          font-size: 1.25rem;
          gap: 0.25rem;
          border-radius: 12px;
        }

        .chip-large span {
          font-size: 0.75rem;
        }

        /* Radio cards */
        .radio-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .radio-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background: var(--admin-bg-tertiary);
          border: 2px solid var(--admin-border-default);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .radio-card:hover {
          border-color: var(--admin-olive);
        }

        .radio-card-active {
          border-color: var(--admin-olive);
          background: var(--admin-olive-bg);
        }

        .radio-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .radio-label {
          font-size: 1rem;
          font-weight: 700;
          color: var(--admin-text-primary);
        }

        .radio-desc {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        /* Select cards pour brillance */
        .select-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .select-card {
          display: flex;
          flex-direction: column;
          padding: 0.75rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .select-card:hover {
          border-color: var(--admin-olive);
        }

        .select-card-active {
          border-color: var(--admin-olive);
          background: var(--admin-olive-bg);
        }

        .select-card-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-primary);
        }

        .select-card-price {
          font-size: 0.75rem;
          color: var(--admin-sable);
          font-weight: 500;
        }

        /* Dimensions grid */
        .dimensions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .surface-info {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: var(--admin-bg-tertiary);
          border-radius: 10px;
          font-size: 0.875rem;
          color: var(--admin-text-secondary);
        }

        .surface-min {
          color: var(--admin-sable);
        }

        /* Toggle group */
        .toggle-group {
          display: flex;
          background: var(--admin-bg-tertiary);
          border-radius: 12px;
          padding: 0.25rem;
        }

        .toggle-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          font-weight: 600;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: var(--admin-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-active {
          background: var(--admin-olive);
          color: white;
        }

        .toggle-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Chants visual */
        .chants-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .chant-diagram {
          position: relative;
          width: 200px;
          height: 140px;
        }

        .chant-btn {
          position: absolute;
          background: var(--admin-bg-tertiary);
          border: 2px solid var(--admin-border-default);
          color: var(--admin-text-muted);
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chant-btn.chant-active {
          background: var(--admin-olive);
          border-color: var(--admin-olive);
          color: white;
        }

        .chant-a {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 32px;
          border-radius: 8px 8px 0 0;
        }

        .chant-c {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 32px;
          border-radius: 0 0 8px 8px;
        }

        .chant-b {
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 76px;
          border-radius: 0 8px 8px 0;
        }

        .chant-d {
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 76px;
          border-radius: 8px 0 0 8px;
        }

        .chant-center {
          position: absolute;
          top: 32px;
          left: 32px;
          right: 32px;
          bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-bg-elevated);
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .chant-legend {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        /* Option buttons */
        .btn-option-large,
        .btn-color-picker-large {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-secondary);
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-option-large:hover,
        .btn-color-picker-large:hover {
          border-color: var(--admin-olive);
        }

        .btn-option-large span,
        .btn-color-picker-large span {
          flex: 1;
          text-align: left;
        }

        /* Checkbox */
        .checkbox-field {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-size: 0.9375rem;
          color: var(--admin-text-primary);
        }

        .checkbox-field input {
          width: 22px;
          height: 22px;
          accent-color: var(--admin-olive);
        }

        /* Perçage - Checkbox stylisée */
        .checkbox-percage-styled {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.875rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .checkbox-percage-styled:active {
          transform: scale(0.98);
        }

        .checkbox-percage-styled.checked {
          background: var(--admin-olive-bg);
          border-color: var(--admin-olive);
        }

        .checkbox-percage-styled input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-percage-styled .checkbox-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--admin-bg-card);
          border: 2px solid var(--admin-border-default);
          border-radius: 6px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .checkbox-percage-styled.checked .checkbox-visual {
          background: var(--admin-olive);
          border-color: var(--admin-olive);
          color: white;
        }

        .checkbox-percage-styled .percage-text {
          flex: 1;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--admin-text-secondary);
        }

        .checkbox-percage-styled.checked .percage-text {
          color: var(--admin-text-primary);
        }

        .price-badge {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--admin-sable);
          background: var(--admin-sable-bg);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        /* Field hints */
        .field-hint {
          display: block;
          margin-top: 0.375rem;
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .field-warning {
          display: block;
          margin-top: 0.375rem;
          font-size: 0.75rem;
          color: var(--admin-status-warning);
        }

        /* Secondary actions */
        .secondary-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--admin-border-subtle);
        }

        .btn-secondary {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: var(--admin-bg-hover);
        }

        .btn-danger {
          color: var(--admin-status-danger);
        }

        .btn-danger:hover {
          background: var(--admin-status-danger-bg);
        }

        .btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Footer */
        .sheet-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: var(--admin-bg-elevated);
          border-top: 1px solid var(--admin-border-default);
          position: sticky;
          bottom: 0;
        }

        .footer-prices {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .price-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }

        .price-row.price-main {
          font-size: 0.875rem;
        }

        .price-ht {
          font-weight: 600;
          color: var(--admin-sable);
        }

        .price-ttc {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--admin-text-primary);
        }

        .btn-validate {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-validate:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--admin-olive-bg);
        }
      `}</style>
    </div>,
    document.body
  );
}

// Composant Section (accordéon)
function Section({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <button className="section-header" onClick={onToggle}>
        <span className="section-icon">{icon}</span>
        <span className="section-title">{title}</span>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isExpanded && <div className="section-content">{children}</div>}

      <style jsx>{`
        .section {
          background: var(--admin-bg-elevated);
          border: 1px solid var(--admin-border-subtle);
          border-radius: 16px;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }

        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--admin-text-primary);
        }

        .section-icon {
          font-size: 1.25rem;
        }

        .section-title {
          flex: 1;
          text-align: left;
          font-size: 1rem;
          font-weight: 600;
        }

        .section-content {
          padding: 0 1rem 1rem;
          animation: expandIn 0.2s ease;
        }

        @keyframes expandIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
