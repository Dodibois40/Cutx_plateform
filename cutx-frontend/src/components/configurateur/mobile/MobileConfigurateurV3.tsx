'use client';

// Import des styles admin (variables CSS nécessaires pour le configurateur)
import '@/app/admin/admin.css';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Upload,
  Layers,
  AlertTriangle,
  ShoppingCart,
  CheckCircle,
  Tag,
  Lightbulb,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import type { LignePrestationV3, ModalCopieState } from '@/lib/configurateur/types';
import {
  creerNouvelleLigne,
  REGLES,
} from '@/lib/configurateur/constants';
import {
  mettreAJourCalculsLigne,
  calculerTotaux,
  formaterPrix,
} from '@/lib/configurateur/calculs';
import { validerConfigurateur } from '@/lib/configurateur/validation';
import { parseExcelAuto } from '@/lib/configurateur/import';
import MobileLineCard from './MobileLineCard';
import BottomSheetEditor from './BottomSheetEditor';
import ModalCopie from '../dialogs/ModalCopie';
import ModalEtiquettes from '../dialogs/ModalEtiquettes';
import WelcomeModal from '../WelcomeModal';

// Toast types
interface ToastMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  details?: string[];
}

// Interface pour les données envoyées à l'API
interface DevisSubmitData {
  referenceChantier: string;
  title: string;
  description: string;
  surface: number;
  quantity: number;
  estimatedPrice: number;
  devisData: string;
  devisResult: string;
  proposedEndDate: string | null;
  proposedEndDateComment: string | null;
}

// Interface pour les données initiales (import CutX)
interface InitialData {
  referenceChantier: string;
  lignes: LignePrestationV3[];
}

// Props du composant
interface MobileConfigurateurV2Props {
  isClientMode?: boolean;
  onSubmit?: (data: DevisSubmitData) => void;
  onBack?: () => void;
  initialData?: InitialData;
}

export default function MobileConfigurateurV2({ isClientMode = false, onSubmit, onBack, initialData }: MobileConfigurateurV2Props) {
  // === STATE ===
  const [referenceChantier, setReferenceChantier] = useState(initialData?.referenceChantier || '');
  const [lignes, setLignes] = useState<LignePrestationV3[]>(
    initialData?.lignes?.length ? initialData.lignes.map(l => mettreAJourCalculsLigne(l)) : [creerNouvelleLigne()]
  );
  const [editingLigne, setEditingLigne] = useState<LignePrestationV3 | null>(null);
  const [modalCopie, setModalCopie] = useState<ModalCopieState>({
    open: false,
    ligneSource: null,
    nouvelleReference: '',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [modalEtiquettes, setModalEtiquettes] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Champs pour le mode client (soumission devis)
  const [showProjectForm, setShowProjectForm] = useState(false);

  // === CALCULS ===
  const totaux = useMemo(() => calculerTotaux(lignes), [lignes]);

  const state = useMemo(() => ({
    referenceChantier,
    lignes,
    totalFournitureHT: totaux.totalFournitureHT,
    totalPrestationHT: totaux.totalPrestationHT,
    totalHT: totaux.totalHT,
    totalTVA: totaux.totalTVA,
    totalTTC: totaux.totalTTC,
    isValid: false,
    erreurs: [],
  }), [referenceChantier, lignes, totaux]);

  const validation = useMemo(() => validerConfigurateur(state), [state]);

  // === TOAST ===
  const showToast = useCallback((toastData: ToastMessage) => {
    setToast(toastData);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // === HANDLERS ===
  const handleAjouterLigne = useCallback(() => {
    const nouvelleLigne = creerNouvelleLigne();
    setLignes(prev => [...prev, nouvelleLigne]);
    // Ouvrir directement l'éditeur pour la nouvelle ligne
    setEditingLigne(nouvelleLigne);
  }, []);

  const handleSupprimerLigne = useCallback((id: string) => {
    setLignes(prev => {
      const filtered = prev.filter(l => l.id !== id);
      return filtered.length > 0 ? filtered : [creerNouvelleLigne()];
    });
    setEditingLigne(null);
  }, []);

  const handleUpdateLigne = useCallback((id: string, updates: Partial<LignePrestationV3>) => {
    setLignes(prev => prev.map(ligne => {
      if (ligne.id !== id) return ligne;
      const updated = { ...ligne, ...updates };
      return mettreAJourCalculsLigne(updated);
    }));

    // Mettre à jour aussi la ligne en édition
    if (editingLigne && editingLigne.id === id) {
      setEditingLigne(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        return mettreAJourCalculsLigne(updated);
      });
    }
  }, [editingLigne]);

  const handleCopierLigne = useCallback((id: string) => {
    const ligneSource = lignes.find(l => l.id === id);
    if (!ligneSource) return;

    setModalCopie({
      open: true,
      ligneSource,
      nouvelleReference: '',
    });
  }, [lignes]);

  const handleConfirmerCopie = useCallback(() => {
    if (!modalCopie.ligneSource || !modalCopie.nouvelleReference.trim()) {
      showToast({ type: 'error', message: 'La référence est obligatoire' });
      return;
    }

    const nouvelleLigne: LignePrestationV3 = {
      ...modalCopie.ligneSource,
      id: crypto.randomUUID(),
      reference: modalCopie.nouvelleReference.trim(),
    };

    setLignes(prev => [...prev, mettreAJourCalculsLigne(nouvelleLigne)]);
    setModalCopie({ open: false, ligneSource: null, nouvelleReference: '' });
    showToast({ type: 'success', message: 'Ligne dupliquée' });
  }, [modalCopie, showToast]);

  const handleEditLigne = useCallback((id: string) => {
    const ligne = lignes.find(l => l.id === id);
    if (ligne) {
      setEditingLigne(ligne);
    }
  }, [lignes]);

  const handleCloseEditor = useCallback(() => {
    setEditingLigne(null);
  }, []);

  const handleAjouterAuPanier = useCallback(() => {
    if (!validation.isValid) {
      showToast({
        type: 'error',
        message: 'Veuillez compléter toutes les lignes',
        details: validation.erreurs.slice(0, 3),
      });
      return;
    }

    // Mode client : ouvrir le formulaire projet si pas rempli
    if (isClientMode) {
      if (!referenceChantier.trim()) {
        setShowProjectForm(true);
        return;
      }

      // Préparer les données pour l'API
      const lignesValides = lignes.filter(l => l.prixHT > 0);
      const surfaceTotale = lignesValides.reduce((acc, l) => acc + ((l.surfaceM2 || 0) * (l.nombreFaces || 1)), 0);

      const devisData: DevisSubmitData = {
        referenceChantier: referenceChantier.trim(),
        title: referenceChantier.trim(),
        description: 'Prestation de finition', // Description par défaut
        surface: surfaceTotale,
        quantity: lignesValides.length,
        estimatedPrice: totaux.totalHT,
        devisData: JSON.stringify({
          referenceChantier,
          lignes: lignesValides,
          sousTotal: totaux.totalHT,
          totalHT: totaux.totalHT,
          tva: totaux.totalTVA,
          totalTTC: totaux.totalTTC,
        }),
        devisResult: JSON.stringify({
          totalHT: totaux.totalHT,
          tva: totaux.totalTVA,
          totalTTC: totaux.totalTTC,
        }),
        // Note: dates gérées par ModalCommande dans la page parent
        proposedEndDate: null,
        proposedEndDateComment: null,
      };

      if (onSubmit) {
        onSubmit(devisData);
      }
      return;
    }

    // Mode admin : afficher toast
    showToast({ type: 'success', message: 'Ajouté au panier !' });
  }, [validation, showToast, isClientMode, lignes, referenceChantier, totaux, onSubmit]);

  // === IMPORT EXCEL ===
  const handleImportExcel = useCallback(async (file: File) => {
    setIsImporting(true);
    setToast(null);

    try {
      const result = await parseExcelAuto(file);

      if (!result.success || !result.donnees) {
        showToast({
          type: 'error',
          message: result.erreur || 'Erreur lors de l\'import',
          details: result.avertissements,
        });
        setIsImporting(false);
        return;
      }

      const { donnees } = result;

      if (donnees.referenceChantier && !referenceChantier) {
        setReferenceChantier(donnees.referenceChantier);
      }

      const nouvellesLignes: LignePrestationV3[] = [];

      for (const ligneImport of donnees.lignes) {
        for (let i = 1; i <= ligneImport.quantite; i++) {
          const suffixe = ligneImport.quantite > 1 ? ` (${i}/${ligneImport.quantite})` : '';
          const nouvelleLigne = creerNouvelleLigne();

          nouvelleLigne.reference = `${ligneImport.reference}${suffixe}`;
          nouvelleLigne.dimensions = {
            longueur: ligneImport.longueur,
            largeur: ligneImport.largeur,
            epaisseur: donnees.epaisseur,
          };
          nouvelleLigne.chants = { ...ligneImport.chants };

          if (ligneImport.materiau) {
            nouvelleLigne.materiau = ligneImport.materiau;
          } else if (donnees.materiau) {
            nouvelleLigne.materiau = donnees.materiau;
          }

          nouvellesLignes.push(mettreAJourCalculsLigne(nouvelleLigne));
        }
      }

      setLignes(prev => {
        const lignesExistantes = prev.filter(l =>
          l.reference.trim() !== '' ||
          l.materiau !== null ||
          l.finition !== null ||
          l.dimensions.longueur > 0 ||
          l.dimensions.largeur > 0
        );
        return [...lignesExistantes, ...nouvellesLignes];
      });

      showToast({
        type: result.avertissements.length > 0 ? 'warning' : 'success',
        message: `${nouvellesLignes.length} ligne${nouvellesLignes.length > 1 ? 's' : ''} importée${nouvellesLignes.length > 1 ? 's' : ''}`,
        details: result.avertissements.length > 0 ? result.avertissements : undefined,
      });

    } catch (error) {
      showToast({
        type: 'error',
        message: 'Erreur lors de l\'import',
        details: [error instanceof Error ? error.message : 'Erreur inconnue'],
      });
    } finally {
      setIsImporting(false);
      setShowMenu(false);
    }
  }, [referenceChantier, showToast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportExcel(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // === RENDER ===
  return (
    <div className="mobile-configurateur">
      {/* Header mobile */}
      <header className="mobile-header">
        <div className="header-top">
          {isClientMode && onBack ? (
            <button className="btn-back" onClick={onBack}>
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>
          ) : (
            <div className="logo-section">
              <div className="logo-badge">
                <Layers size={18} />
              </div>
              <div className="logo-text">
                <span className="title">Configurateur</span>
                <span className="version">V2</span>
              </div>
            </div>
          )}
          <button className="btn-menu" onClick={() => setShowMenu(true)}>
            <Menu size={24} />
          </button>
        </div>

        {/* Champ référence chantier */}
        <div className="reference-field">
          <input
            type="text"
            value={referenceChantier}
            onChange={(e) => setReferenceChantier(e.target.value)}
            placeholder="Référence chantier (ex: Cuisine Dupont)"
            className="input-reference"
          />
        </div>

        {/* Alerte minimums */}
        <div className="alert-minimum">
          <AlertTriangle size={14} />
          <span>Min : {REGLES.SURFACE_MINIMUM} m²/face OU {REGLES.MINIMUM_COMMANDE_HT}€ HT</span>
        </div>
      </header>

      {/* Menu slide */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <span>Menu</span>
              <button className="btn-close-menu" onClick={() => setShowMenu(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="menu-items">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                className="menu-item"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload size={20} />
                <span>{isImporting ? 'Import...' : 'Importer Excel'}</span>
              </button>
              <button
                className="menu-item"
                onClick={() => { setModalEtiquettes(true); setShowMenu(false); }}
              >
                <Tag size={20} />
                <span>Imprimer étiquettes</span>
              </button>
              <button
                className="menu-item"
                onClick={() => { setShowWelcomeModal(true); setShowMenu(false); }}
              >
                <Lightbulb size={20} />
                <span>Guide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* Liste des cartes */}
      <div className="cards-list">
        {lignes.map((ligne, index) => (
          <MobileLineCard
            key={ligne.id}
            ligne={ligne}
            index={index}
            onEdit={() => handleEditLigne(ligne.id)}
            onCopy={() => handleCopierLigne(ligne.id)}
            onDelete={() => handleSupprimerLigne(ligne.id)}
            canDelete={lignes.length > 1}
          />
        ))}
      </div>

      {/* FAB - Ajouter une ligne */}
      <button className="fab" onClick={handleAjouterLigne}>
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Footer - Récapitulatif */}
      <footer className="mobile-footer">
        <div className="footer-totaux">
          <div className="total-row">
            <span className="label">HT</span>
            <span className="value-ht">{formaterPrix(totaux.totalHT)}</span>
          </div>
          <div className="total-row total-main">
            <span className="label">TTC</span>
            <span className="value-ttc">{formaterPrix(totaux.totalTTC)}</span>
          </div>
        </div>
        <button
          className={`btn-panier ${validation.isValid ? 'btn-active' : 'btn-disabled'}`}
          onClick={handleAjouterAuPanier}
          disabled={!validation.isValid}
        >
          {validation.isValid ? (
            <CheckCircle size={20} />
          ) : (
            <ShoppingCart size={20} />
          )}
          <span>{lignes.length} ligne{lignes.length > 1 ? 's' : ''}</span>
        </button>
      </footer>

      {/* Bottom Sheet Editor */}
      {editingLigne && (
        <BottomSheetEditor
          ligne={editingLigne}
          isOpen={!!editingLigne}
          onClose={handleCloseEditor}
          onUpdate={(updates) => handleUpdateLigne(editingLigne.id, updates)}
          onCopy={() => handleCopierLigne(editingLigne.id)}
          onDelete={() => handleSupprimerLigne(editingLigne.id)}
          canDelete={lignes.length > 1}
        />
      )}

      {/* Modals */}
      <ModalCopie
        open={modalCopie.open}
        ligneSource={modalCopie.ligneSource}
        nouvelleReference={modalCopie.nouvelleReference}
        onReferenceChange={(ref) => setModalCopie(prev => ({ ...prev, nouvelleReference: ref }))}
        onConfirmer={handleConfirmerCopie}
        onAnnuler={() => setModalCopie({ open: false, ligneSource: null, nouvelleReference: '' })}
      />

      <ModalEtiquettes
        open={modalEtiquettes}
        referenceChantier={referenceChantier}
        lignes={lignes}
        onClose={() => setModalEtiquettes(false)}
      />

      <WelcomeModal forceOpen={showWelcomeModal} onForceOpenHandled={() => setShowWelcomeModal(false)} />

      {/* Modal formulaire projet (mode client) - Demande la référence si manquante */}
      {showProjectForm && isClientMode && (
        <div className="project-form-overlay" onClick={() => setShowProjectForm(false)}>
          <div className="project-form-panel" onClick={(e) => e.stopPropagation()}>
            <div className="project-form-header">
              <h3>Référence chantier requise</h3>
              <button className="btn-close-form" onClick={() => setShowProjectForm(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="project-form-content">
              <div className="form-field">
                <label>Référence chantier *</label>
                <input
                  type="text"
                  value={referenceChantier}
                  onChange={(e) => setReferenceChantier(e.target.value)}
                  placeholder="Ex: Cuisine Dupont"
                />
              </div>
              <button
                className="btn-submit-project"
                onClick={() => {
                  if (referenceChantier.trim()) {
                    setShowProjectForm(false);
                    handleAjouterAuPanier();
                  } else {
                    showToast({ type: 'error', message: 'La référence chantier est obligatoire' });
                  }
                }}
              >
                <ShoppingCart size={18} />
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-configurateur {
          min-height: 100vh;
          background: var(--admin-bg-default);
          padding-bottom: 140px;
        }

        /* Header */
        .mobile-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--admin-bg-elevated);
          padding: 1rem;
          border-bottom: 1px solid var(--admin-border-subtle);
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .logo-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          border-radius: 10px;
          color: white;
        }

        .logo-text {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-text-primary);
        }

        .version {
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--admin-olive);
          background: var(--admin-olive-bg);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--admin-text-secondary);
          background: transparent;
          border: 1px solid var(--admin-border-subtle);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-back:hover {
          color: var(--admin-text-primary);
          background: var(--admin-bg-hover);
          border-color: var(--admin-border);
        }

        .btn-menu {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-secondary);
          cursor: pointer;
        }

        .reference-field {
          margin-bottom: 0.75rem;
        }

        .input-reference {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-primary);
        }

        .input-reference:focus {
          outline: none;
          border-color: var(--admin-olive);
        }

        .input-reference::placeholder {
          color: var(--admin-text-muted);
        }

        .alert-minimum {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--admin-sable);
        }

        /* Menu overlay */
        .menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 200;
          animation: fadeIn 0.2s ease;
        }

        .menu-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 280px;
          background: var(--admin-bg-card);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--admin-border-subtle);
          font-weight: 700;
          color: var(--admin-text-primary);
        }

        .btn-close-menu {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          color: var(--admin-text-secondary);
          cursor: pointer;
        }

        .menu-items {
          padding: 0.5rem;
        }

        .menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--admin-text-secondary);
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .menu-item:hover {
          background: var(--admin-bg-hover);
          color: var(--admin-text-primary);
        }

        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 80px;
          left: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 100;
          animation: toastIn 0.3s ease;
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .toast-success {
          background: var(--admin-olive-bg);
          border: 1px solid var(--admin-olive-border);
          color: var(--admin-olive);
        }

        .toast-error {
          background: var(--admin-status-danger-bg);
          border: 1px solid var(--admin-status-danger-border);
          color: var(--admin-status-danger);
        }

        .toast-warning {
          background: var(--admin-status-warning-bg);
          border: 1px solid var(--admin-status-warning-border);
          color: var(--admin-status-warning);
        }

        .toast button {
          background: transparent;
          border: none;
          font-size: 1.25rem;
          color: inherit;
          cursor: pointer;
          padding: 0 0.25rem;
        }

        /* Cards list */
        .cards-list {
          padding: 1rem;
        }

        /* FAB */
        .fab {
          position: fixed;
          bottom: 100px;
          right: 1rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(139, 157, 81, 0.4);
          z-index: 40;
          transition: all 0.2s;
        }

        .fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(139, 157, 81, 0.5);
        }

        .fab:active {
          transform: scale(0.95);
        }

        /* Footer */
        .mobile-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--admin-bg-elevated);
          border-top: 1px solid var(--admin-border-default);
          z-index: 50;
        }

        .footer-totaux {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .total-row {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .total-row .label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
        }

        .value-ht {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-sable);
        }

        .value-ttc {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--admin-text-primary);
        }

        .btn-panier {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-active {
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          color: white;
          border: none;
        }

        .btn-active:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 157, 81, 0.3);
        }

        .btn-disabled {
          background: var(--admin-bg-tertiary);
          color: var(--admin-text-muted);
          border: 1px solid var(--admin-border-default);
        }

        /* Project form modal */
        .project-form-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 300;
          display: flex;
          align-items: flex-end;
          animation: fadeIn 0.2s ease;
        }

        .project-form-panel {
          width: 100%;
          max-height: 90vh;
          background: var(--admin-bg-card);
          border-radius: 20px 20px 0 0;
          animation: slideUp 0.3s ease;
          overflow: hidden;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .project-form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--admin-border-default);
        }

        .project-form-header h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--admin-text-primary);
          margin: 0;
        }

        .btn-close-form {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--admin-bg-tertiary);
          border: none;
          border-radius: 50%;
          color: var(--admin-text-secondary);
          cursor: pointer;
        }

        .project-form-content {
          padding: 1.25rem 1rem 2rem;
          overflow-y: auto;
          max-height: calc(90vh - 70px);
        }

        .form-field {
          margin-bottom: 1rem;
        }

        .form-field label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
          margin-bottom: 0.5rem;
        }

        .form-field input,
        .form-field textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 12px;
          color: var(--admin-text-primary);
          resize: none;
        }

        .form-field input:focus,
        .form-field textarea:focus {
          outline: none;
          border-color: var(--admin-olive);
        }

        .form-field input::placeholder,
        .form-field textarea::placeholder {
          color: var(--admin-text-muted);
        }

        .btn-submit-project {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          margin-top: 1.5rem;
          font-size: 1rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--admin-olive) 0%, var(--admin-olive-dark) 100%);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
