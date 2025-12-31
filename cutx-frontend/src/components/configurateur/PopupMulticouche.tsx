'use client';

/**
 * Popup de configuration de panneau multicouche
 * Permet de configurer un panneau composé de plusieurs couches
 * Avec sauvegarde/chargement de templates
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, ArrowLeft, Check, Factory, Wrench, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save, FolderOpen, Loader2, Move } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { ModeCollage, CoucheMulticouche, TypeCouche, PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import { LABELS_COUCHE } from '@/lib/configurateur-multicouche/types';
import { creerNouvelleCouche, REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';
import SelectionPanneauCouche from '../configurateur-multicouche/SelectionPanneauCouche';
import type { ProduitCatalogue } from '@/lib/catalogues';
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  templateToPanneau,
  panneauToTemplateData,
  type MulticoucheTemplate,
} from '@/lib/services/multicouche-templates-api';

interface PopupMulticoucheProps {
  open: boolean;
  panneauxCatalogue: PanneauCatalogue[];
  panneauMulticouche: PanneauMulticouche | null;
  onSave: (panneau: PanneauMulticouche) => void;
  onClose: () => void;
}

export default function PopupMulticouche({
  open,
  panneauMulticouche,
  onSave,
  onClose,
}: PopupMulticoucheProps) {
  const { getToken, isSignedIn } = useAuth();

  // Étape : 'mode' | 'couches' | 'templates'
  const [etape, setEtape] = useState<'mode' | 'couches' | 'templates'>('mode');
  const [modeCollage, setModeCollage] = useState<ModeCollage | null>(panneauMulticouche?.modeCollage || null);

  // Couches
  const [couches, setCouches] = useState<CoucheMulticouche[]>(() => {
    if (panneauMulticouche?.couches) return panneauMulticouche.couches;
    return [
      creerNouvelleCouche(1, 'parement'),
      creerNouvelleCouche(2, 'ame'),
      creerNouvelleCouche(3, 'contrebalancement'),
    ];
  });

  const [coucheOuverte, setCoucheOuverte] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<MulticoucheTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [parementWarning, setParementWarning] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Drag and drop state
  const [draggedCoucheId, setDraggedCoucheId] = useState<string | null>(null);
  const [dragOverCoucheId, setDragOverCoucheId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  // State pour le montage côté client (nécessaire pour le Portal)
  const [mounted, setMounted] = useState(false);

  // Montage côté client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Charger les templates quand le popup s'ouvre
  useEffect(() => {
    if (open && isSignedIn) {
      loadTemplates();
    }
  }, [open, isSignedIn]);

  // Reset quand on ouvre
  useEffect(() => {
    if (open) {
      if (panneauMulticouche) {
        setModeCollage(panneauMulticouche.modeCollage);
        setCouches(panneauMulticouche.couches);
        setEtape('couches');
      } else {
        setModeCollage(null);
        setCouches([
          creerNouvelleCouche(1, 'parement'),
          creerNouvelleCouche(2, 'ame'),
          creerNouvelleCouche(3, 'contrebalancement'),
        ]);
        setEtape('mode');
      }
      setCoucheOuverte(null);
      setShowSaveDialog(false);
      setTemplateName('');
      setDisclaimerAccepted(false);
    }
  }, [open, panneauMulticouche]);

  // Charger les templates depuis l'API
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      // Injecter le token dans window.Clerk pour le service API
      const token = await getToken();
      if (token && typeof window !== 'undefined') {
        (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk = {
          session: { getToken: async () => token },
        };
      }
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Sauvegarder comme template
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !modeCollage) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const token = await getToken();
      if (token && typeof window !== 'undefined') {
        (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk = {
          session: { getToken: async () => token },
        };
      }

      const epaisseurTotale = couches.reduce((sum, c) => sum + c.epaisseur, 0);
      const prixEstimeM2 = couches.reduce((sum, c) => sum + c.prixPanneauM2, 0);

      const panneau: PanneauMulticouche = {
        id: crypto.randomUUID(),
        couches,
        modeCollage,
        epaisseurTotale,
        prixEstimeM2,
      };

      const data = panneauToTemplateData(panneau, templateName.trim());
      await createTemplate(data);
      await loadTemplates();

      // Afficher le succès
      setSaveSuccess(true);

      // Après 1.5s, basculer vers la liste des modèles
      setTimeout(() => {
        setShowSaveDialog(false);
        setTemplateName('');
        setSaveSuccess(false);
        setEtape('templates');
      }, 1500);
    } catch (error) {
      console.error('Erreur sauvegarde template:', error);
      alert('Erreur lors de la sauvegarde du modèle');
      setSaving(false);
    }
  };

  // Charger un template
  const handleLoadTemplate = (template: MulticoucheTemplate) => {
    const panneau = templateToPanneau(template);
    setModeCollage(panneau.modeCollage);
    setCouches(panneau.couches);
    setEtape('couches');
  };

  // Supprimer un template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Supprimer ce modèle ?')) return;

    try {
      const token = await getToken();
      if (token && typeof window !== 'undefined') {
        (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk = {
          session: { getToken: async () => token },
        };
      }
      await deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Erreur suppression template:', error);
    }
  };

  // Ne pas rendre si pas ouvert ou pas monté côté client
  if (!open || !mounted) return null;

  // Sélection du mode
  const handleSelectMode = (mode: ModeCollage) => {
    setModeCollage(mode);
    setEtape('couches');
    setCoucheOuverte(couches[0]?.id || null);
  };

  // Ajouter une couche
  const ajouterCouche = () => {
    if (couches.length >= REGLES_MULTICOUCHE.COUCHES_MAX) return;
    const nouvelleCouche = creerNouvelleCouche(couches.length + 1, 'autre');
    setCouches([...couches, nouvelleCouche]);
    setCoucheOuverte(nouvelleCouche.id);
  };

  // Supprimer une couche
  const supprimerCouche = (id: string) => {
    if (couches.length <= REGLES_MULTICOUCHE.COUCHES_MIN) return;
    const newCouches = couches.filter((c) => c.id !== id).map((c, i) => ({ ...c, ordre: i + 1 }));
    setCouches(newCouches);
    if (coucheOuverte === id) {
      setCoucheOuverte(newCouches[0]?.id || null);
    }
  };

  // Mettre à jour une couche
  const updateCouche = (id: string, updates: Partial<CoucheMulticouche>) => {
    setCouches(couches.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, coucheId: string) => {
    isDraggingRef.current = true;
    // Replier TOUTES les couches au début du drag pour une interface claire
    setCoucheOuverte(null);
    setDraggedCoucheId(coucheId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', coucheId);
  };

  const handleDragOver = (e: React.DragEvent, coucheId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedCoucheId !== coucheId) {
      setDragOverCoucheId(coucheId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCoucheId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCoucheId: string) => {
    e.preventDefault();
    if (!draggedCoucheId || draggedCoucheId === targetCoucheId) {
      setDraggedCoucheId(null);
      setDragOverCoucheId(null);
      return;
    }

    const draggedIndex = couches.findIndex((c) => c.id === draggedCoucheId);
    const targetIndex = couches.findIndex((c) => c.id === targetCoucheId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Réorganiser les couches
    const newCouches = [...couches];
    const [draggedCouche] = newCouches.splice(draggedIndex, 1);
    newCouches.splice(targetIndex, 0, draggedCouche);

    // Réassigner les ordres
    const reorderedCouches = newCouches.map((c, i) => ({ ...c, ordre: i + 1 }));
    setCouches(reorderedCouches);

    setDraggedCoucheId(null);
    setDragOverCoucheId(null);
  };

  const handleDragEnd = () => {
    // Petit délai pour éviter le conflit avec onClick
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
    setDraggedCoucheId(null);
    setDragOverCoucheId(null);
  };

  // Handler pour le clic sur le header (toggle ouverture)
  const handleCoucheHeaderClick = (coucheId: string, isOpen: boolean) => {
    // Ne pas ouvrir/fermer si on est en train de drag
    if (isDraggingRef.current) return;
    setCoucheOuverte(isOpen ? null : coucheId);
  };

  // Changer le type d'une couche avec validation des parements
  const handleChangeTypeCouche = (id: string, newType: TypeCouche) => {
    // Si on essaie de mettre en parement, vérifier qu'il n'y en a pas déjà 2
    if (newType === 'parement') {
      const nbParements = couches.filter((c) => c.type === 'parement' && c.id !== id).length;
      if (nbParements >= 2) {
        setParementWarning('Maximum 2 faces visibles (parements) autorisées dans un panneau multicouche.');
        // Effacer le message après 4 secondes
        setTimeout(() => setParementWarning(null), 4000);
        return; // Ne pas faire le changement
      }
    }
    // Effacer tout avertissement existant
    setParementWarning(null);
    updateCouche(id, { type: newType });
  };

  // Sélection d'un panneau du catalogue
  const handleSelectPanneau = (coucheId: string, produit: ProduitCatalogue) => {
    updateCouche(coucheId, {
      panneauId: produit.reference,
      panneauNom: produit.nom,
      panneauReference: produit.reference,
      panneauImageUrl: produit.imageUrl || null,
      prixPanneauM2: produit.prixVenteM2 || produit.prixAchatM2 || 0,
      epaisseur: produit.epaisseur,
      materiau: produit.type,
    });
  };

  // Effacer le panneau sélectionné
  const handleClearPanneau = (coucheId: string) => {
    updateCouche(coucheId, {
      panneauId: null,
      panneauNom: null,
      panneauReference: null,
      panneauImageUrl: null,
      prixPanneauM2: 0,
    });
  };

  // Calculer l'épaisseur totale
  const epaisseurTotale = couches.reduce((sum, c) => sum + c.epaisseur, 0);
  const prixEstimeM2 = couches.reduce((sum, c) => sum + c.prixPanneauM2, 0);

  // Vérifier si toutes les couches ont un panneau
  const toutesLesCouchesCompletes = couches.every((c) => c.panneauId !== null);

  // Valider le panneau multicouche
  const handleValidate = () => {
    if (!modeCollage || !toutesLesCouchesCompletes) return;

    const panneau: PanneauMulticouche = {
      id: panneauMulticouche?.id || crypto.randomUUID(),
      couches,
      modeCollage,
      epaisseurTotale,
      prixEstimeM2,
    };

    onSave(panneau);
  };

  // Contenu du popup
  const popupContent = (
    <div
      className="popup-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
      }}
    >
      <div
        className="popup-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cx-surface-1, #1a1a1a)',
          border: '1px solid var(--cx-border-default, #333)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: etape === 'couches' ? '950px' : '700px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="popup-header">
          <div className="popup-header-left">
            {(etape === 'couches' || etape === 'templates') && (
              <button onClick={() => setEtape('mode')} className="popup-back-btn">
                <ArrowLeft size={16} />
              </button>
            )}
            <Layers size={20} className="text-amber-500" />
            <h2 className="popup-title">
              {etape === 'mode' ? 'Panneau Multicouche' : etape === 'templates' ? 'Mes modèles' : 'Configurer les couches'}
            </h2>
          </div>
          <div className="popup-header-right">
            {etape === 'mode' && isSignedIn && templates.length > 0 && (
              <button onClick={() => setEtape('templates')} className="popup-templates-btn">
                <FolderOpen size={16} />
                Mes modèles ({templates.length})
              </button>
            )}
            <button onClick={onClose} className="popup-close-btn">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="popup-content">
          {etape === 'mode' ? (
            // Étape 1 : Choix du mode de collage
            <div className="mode-selection">
              <p className="mode-description">
                Comment sera collé ce panneau multicouche ?
              </p>

              <div className="mode-options">
                {/* Collage Fournisseur */}
                <button onClick={() => handleSelectMode('fournisseur')} className="mode-card mode-card--fournisseur">
                  <div className="mode-card-icon">
                    <Factory size={24} />
                  </div>
                  <h3 className="mode-card-title">Collage Fournisseur</h3>
                  <p className="mode-card-desc">
                    Le fournisseur colle les couches et livre un panneau fini aux dimensions exactes.
                  </p>
                  <ul className="mode-card-features">
                    <li><Check size={14} /> Chants disponibles</li>
                    <li><Check size={14} /> Usinages disponibles</li>
                    <li><Check size={14} /> Perçage disponible</li>
                  </ul>
                </button>

                {/* Collage Client */}
                <button onClick={() => handleSelectMode('client')} className="mode-card mode-card--client">
                  <div className="mode-card-icon mode-card-icon--client">
                    <Wrench size={24} />
                  </div>
                  <h3 className="mode-card-title">Collage par mes soins</h3>
                  <p className="mode-card-desc">
                    Je collerai moi-même. Sur-cote de 50mm appliquée pour la recoupe.
                  </p>
                  <ul className="mode-card-features mode-card-features--disabled">
                    <li><X size={14} /> Pas de chants</li>
                    <li><X size={14} /> Pas d'usinages</li>
                    <li><span className="surcote-badge">+50mm</span> Sur-cote auto</li>
                  </ul>
                </button>
              </div>

              {/* Templates rapides si connecté */}
              {isSignedIn && templates.length > 0 && (
                <div className="quick-templates">
                  <p className="quick-templates-label">Ou charger un modèle :</p>
                  <div className="quick-templates-list">
                    {templates.slice(0, 3).map((t) => (
                      <button key={t.id} onClick={() => handleLoadTemplate(t)} className="quick-template-btn">
                        <Layers size={14} />
                        {t.nom}
                      </button>
                    ))}
                    {templates.length > 3 && (
                      <button onClick={() => setEtape('templates')} className="quick-template-btn quick-template-btn--more">
                        +{templates.length - 3} autres
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : etape === 'templates' ? (
            // Liste des templates sauvegardés
            <div className="templates-list">
              {templatesLoading ? (
                <div className="templates-loading">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Chargement...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="templates-empty">
                  <FolderOpen size={48} />
                  <p>Aucun modèle sauvegardé</p>
                  <span>Créez un panneau multicouche et enregistrez-le comme modèle</span>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="template-item">
                    <div className="template-info">
                      <div className="template-header">
                        <span className="template-name">{template.nom}</span>
                        <span className={`template-mode ${template.modeCollage === 'fournisseur' ? 'template-mode--fournisseur' : 'template-mode--client'}`}>
                          {template.modeCollage === 'fournisseur' ? 'Fournisseur' : 'Client'}
                        </span>
                      </div>
                      <div className="template-details">
                        {template.couches.length} couches • {template.epaisseurTotale.toFixed(1)}mm
                        {template.prixEstimeM2 > 0 && ` • ${template.prixEstimeM2.toFixed(2)}€/m²`}
                      </div>
                    </div>
                    <div className="template-actions">
                      <button onClick={() => handleLoadTemplate(template)} className="template-load-btn">
                        Utiliser
                      </button>
                      <button onClick={() => handleDeleteTemplate(template.id)} className="template-delete-btn">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Étape 2 : Configuration des couches (layout 2 colonnes)
            <div className="couches-edition-layout">
              {/* Colonne gauche : Configuration */}
              <div className="couches-edition">
                {/* Mode badge */}
                <div className={`mode-badge ${modeCollage === 'fournisseur' ? 'mode-badge--fournisseur' : 'mode-badge--client'}`}>
                  {modeCollage === 'fournisseur' ? (
                    <img src="/icons/18-layers-3.svg" alt="" className="mode-badge-icon" />
                  ) : (
                    <Wrench size={14} />
                  )}
                  {modeCollage === 'fournisseur' ? 'Collage réalisé par le fournisseur' : 'Collage Client (+50mm sur-cote)'}
                </div>

                {/* Message d'avertissement parement */}
                {parementWarning && (
                  <div className="parement-warning">
                    <span className="parement-warning-icon">!</span>
                    <span>{parementWarning}</span>
                  </div>
                )}

                {/* Indication drag & drop */}
                <div className="drag-instruction">
                  <img src="/icons/20-grip-dots-vertical.svg" alt="" className="drag-instruction-icon" />
                  <span>Glissez les couches pour modifier l'ordre</span>
                </div>

                {/* Liste des couches avec drag & drop */}
                <div className="couches-list">
                  {couches.map((couche) => {
                    const isOpen = coucheOuverte === couche.id;
                    const isComplete = couche.panneauId !== null;
                    const isDragging = draggedCoucheId === couche.id;
                    const isDragOver = dragOverCoucheId === couche.id;

                    return (
                      <div
                        key={couche.id}
                        className={`couche-item ${isOpen ? 'couche-item--open' : ''} ${isComplete ? 'couche-item--complete' : ''} ${isDragging ? 'couche-item--dragging' : ''} ${isDragOver ? 'couche-item--dragover' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, couche.id)}
                        onDragOver={(e) => handleDragOver(e, couche.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, couche.id)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* Header de la couche */}
                        <div
                          onClick={() => handleCoucheHeaderClick(couche.id, isOpen)}
                          className="couche-header"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCoucheHeaderClick(couche.id, isOpen); }}
                        >
                          <img src="/icons/20-grip-dots-vertical.svg" alt="" className="couche-grip-icon" draggable={false} />
                          <div className={`couche-number ${isComplete ? 'couche-number--complete' : ''}`}>
                            {couche.ordre}
                          </div>
                          <div className="couche-info">
                            <span className="couche-type">{LABELS_COUCHE[couche.type]}</span>
                            {isComplete ? (
                              <span className="couche-detail">{couche.panneauNom} • {couche.epaisseur}mm</span>
                            ) : (
                              <span className="couche-detail couche-detail--empty">Sélectionner un panneau...</span>
                            )}
                          </div>
                          {couches.length > REGLES_MULTICOUCHE.COUCHES_MIN && (
                            <button
                              onClick={(e) => { e.stopPropagation(); supprimerCouche(couche.id); }}
                              className="couche-delete"
                              type="button"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>

                        {/* Contenu de la couche */}
                        {isOpen && (
                          <div className="couche-content">
                            <div className="couche-form-field">
                              <label>Type de couche</label>
                              <select
                                value={couche.type}
                                onChange={(e) => handleChangeTypeCouche(couche.id, e.target.value as TypeCouche)}
                              >
                                {Object.entries(LABELS_COUCHE).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="couche-form-field">
                              <label>Panneau du catalogue</label>
                              <SelectionPanneauCouche
                                couche={couche}
                                onSelect={(produit) => handleSelectPanneau(couche.id, produit)}
                                onClear={() => handleClearPanneau(couche.id)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Ajouter couche */}
                  {couches.length < REGLES_MULTICOUCHE.COUCHES_MAX && (
                    <button onClick={ajouterCouche} className="add-couche-btn">
                      <Plus size={16} />
                      Ajouter une couche ({couches.length}/{REGLES_MULTICOUCHE.COUCHES_MAX})
                    </button>
                  )}
                </div>

                {/* Résumé */}
                <div className="couches-summary">
                  <div className="summary-row">
                    <span>Couches</span>
                    <span className="summary-value">{couches.length}</span>
                  </div>
                  <div className="summary-row">
                    <span>Épaisseur totale</span>
                    <span className="summary-value summary-value--accent">{epaisseurTotale.toFixed(1)} mm</span>
                  </div>
                  {prixEstimeM2 > 0 && (
                    <div className="summary-row">
                      <span>Prix estimé</span>
                      <span className="summary-value">{prixEstimeM2.toFixed(2)} €/m²</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Colonne droite : Visualisation simplifiée */}
              <div className="coupe-panel">
                <div className="coupe-title">Coupe du panneau</div>

                <div className="coupe-view">
                  {/* Épaisseur totale */}
                  <div className="coupe-total">
                    <span className="coupe-total-val">{epaisseurTotale.toFixed(1)}</span>
                    <span className="coupe-total-unit">mm</span>
                  </div>

                  {/* Couches empilées */}
                  <div className="coupe-stack">
                    {couches.map((couche) => {
                      const isActive = coucheOuverte === couche.id;
                      const colors: Record<TypeCouche, string> = {
                        parement: '#D4A84B',
                        ame: '#8B6914',
                        contrebalancement: '#4A4A4A',
                        autre: '#666666',
                      };

                      return (
                        <div
                          key={couche.id}
                          className={`coupe-layer ${isActive ? 'coupe-layer--active' : ''}`}
                          style={{ backgroundColor: colors[couche.type] }}
                          onClick={() => setCoucheOuverte(couche.id)}
                        >
                          <span className="coupe-layer-num">{couche.ordre}</span>
                          <span className="coupe-layer-ep">
                            {couche.epaisseur > 0 ? `${couche.epaisseur}` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Légende simple */}
                <div className="coupe-legend">
                  <div><span style={{ background: '#D4A84B' }} /> Parement</div>
                  <div><span style={{ background: '#8B6914' }} /> Âme</div>
                  <div><span style={{ background: '#4A4A4A' }} /> Contre.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {etape === 'couches' && (
          <div className="popup-footer">
            {showSaveDialog ? (
              <div className="save-dialog">
                {saveSuccess ? (
                  <div className="save-success">
                    <div className="save-success-icon">
                      <Check size={24} />
                    </div>
                    <span className="save-success-text">Modèle enregistré !</span>
                    <span className="save-success-subtext">Redirection vers vos modèles...</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Nom du modèle..."
                      className="save-dialog-input"
                      autoFocus
                    />
                    <div className="save-dialog-actions">
                      <button onClick={() => setShowSaveDialog(false)} className="save-dialog-cancel">
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveTemplate}
                        disabled={!templateName.trim() || saving}
                        className="save-dialog-confirm"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Enregistrer
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {!toutesLesCouchesCompletes && (
                  <p className="popup-warning">
                    Sélectionnez un panneau pour chaque couche
                  </p>
                )}

                {/* Disclaimer responsabilité */}
                {toutesLesCouchesCompletes && (
                  <div className="disclaimer-section">
                    <label className="disclaimer-checkbox">
                      <input
                        type="checkbox"
                        checked={disclaimerAccepted}
                        onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      />
                      <span className="disclaimer-checkmark"></span>
                      <span className="disclaimer-text">
                        Je reconnais être entièrement responsable de la conception de ce panneau multicouche.
                        En cas d'erreur de configuration ou de mauvaise demande de fabrication,
                        ni CutX ni le fournisseur ne pourront être tenus responsables.
                      </span>
                    </label>
                  </div>
                )}

                <div className="popup-footer-actions">
                  {isSignedIn && toutesLesCouchesCompletes && (
                    <button onClick={() => setShowSaveDialog(true)} className="popup-save-btn">
                      <Save size={16} />
                      Enregistrer comme modèle
                    </button>
                  )}
                  <button
                    onClick={handleValidate}
                    disabled={!toutesLesCouchesCompletes || !disclaimerAccepted}
                    className="popup-validate-btn"
                  >
                    <Check size={16} />
                    Valider le panneau multicouche
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <style jsx global>{`
          /* Styles globaux pour le popup (rendu via Portal) */
          .popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--cx-border-default);
          }

          .popup-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .popup-header-right {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .popup-back-btn {
            padding: 6px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-secondary);
            cursor: pointer;
            transition: all 0.15s;
          }

          .popup-back-btn:hover {
            background: var(--cx-surface-3);
            color: var(--cx-text-primary);
          }

          .popup-templates-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-secondary);
            font-size: var(--cx-text-sm);
            cursor: pointer;
            transition: all 0.15s;
          }

          .popup-templates-btn:hover {
            background: var(--cx-surface-3);
            color: var(--cx-text-primary);
          }

          .popup-title {
            font-size: var(--cx-text-lg);
            font-weight: 600;
            color: var(--cx-text-primary);
          }

          .popup-close-btn {
            padding: 6px;
            background: transparent;
            border: none;
            color: var(--cx-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .popup-close-btn:hover {
            color: var(--cx-text-primary);
          }

          .popup-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
          }

          /* Mode Selection */
          .mode-selection {
            text-align: center;
          }

          .mode-description {
            color: var(--cx-text-secondary);
            margin-bottom: 24px;
          }

          .mode-options {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .mode-card {
            padding: 20px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-lg);
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
          }

          .mode-card:hover {
            background: var(--cx-surface-3);
            border-color: var(--cx-accent-muted);
          }

          .mode-card-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--cx-surface-3);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-secondary);
            margin-bottom: 12px;
            transition: all 0.2s;
          }

          .mode-card:hover .mode-card-icon {
            background: var(--cx-accent-subtle);
            color: var(--cx-accent);
          }

          .mode-card-title {
            font-size: var(--cx-text-md);
            font-weight: 600;
            color: var(--cx-text-primary);
            margin-bottom: 8px;
          }

          .mode-card-desc {
            font-size: var(--cx-text-sm);
            color: var(--cx-text-tertiary);
            line-height: 1.5;
            margin-bottom: 16px;
          }

          .mode-card-features {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .mode-card-features li {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: var(--cx-text-sm);
            color: var(--cx-text-tertiary);
          }

          .mode-card-features--disabled li {
            color: var(--cx-text-muted);
          }

          .mode-card:hover .mode-card-features:not(.mode-card-features--disabled) li {
            color: var(--cx-accent);
          }

          .surcote-badge {
            font-size: 10px;
            padding: 2px 6px;
            background: var(--cx-accent-subtle);
            color: var(--cx-accent);
            border-radius: 4px;
            font-weight: 600;
          }

          /* Quick Templates */
          .quick-templates {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid var(--cx-border-subtle);
          }

          .quick-templates-label {
            font-size: var(--cx-text-sm);
            color: var(--cx-text-muted);
            margin-bottom: 12px;
          }

          .quick-templates-list {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
          }

          .quick-template-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-secondary);
            font-size: var(--cx-text-sm);
            cursor: pointer;
            transition: all 0.15s;
          }

          .quick-template-btn:hover {
            background: var(--cx-surface-3);
            border-color: var(--cx-accent-muted);
            color: var(--cx-accent);
          }

          .quick-template-btn--more {
            color: var(--cx-text-muted);
          }

          /* Templates List */
          .templates-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .templates-loading,
          .templates-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
            color: var(--cx-text-muted);
            gap: 12px;
          }

          .templates-empty p {
            font-weight: 500;
            color: var(--cx-text-secondary);
          }

          .templates-empty span {
            font-size: var(--cx-text-sm);
          }

          .template-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
          }

          .template-info {
            flex: 1;
          }

          .template-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }

          .template-name {
            font-weight: 500;
            color: var(--cx-text-primary);
          }

          .template-mode {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
          }

          .template-mode--fournisseur {
            background: var(--cx-surface-3);
            color: var(--cx-text-secondary);
          }

          .template-mode--client {
            background: var(--cx-accent-subtle);
            color: var(--cx-accent);
          }

          .template-details {
            font-size: var(--cx-text-xs);
            color: var(--cx-text-muted);
          }

          .template-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .template-load-btn {
            padding: 6px 12px;
            background: var(--cx-accent);
            color: white;
            border: none;
            border-radius: var(--cx-radius-md);
            font-size: var(--cx-text-sm);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .template-load-btn:hover {
            background: var(--cx-accent-hover);
          }

          .template-delete-btn {
            padding: 6px;
            background: transparent;
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .template-delete-btn:hover {
            background: #ef444420;
            border-color: #ef4444;
            color: #ef4444;
          }

          /* Couches Edition - Layout 2 colonnes */
          .couches-edition-layout {
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 24px;
          }

          .couches-edition {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          /* Panneau Preview - Colonne droite */
          .coupe-panel {
            position: sticky;
            top: 0;
          }

          .panneau-3d-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 24px 16px;
            background: var(--cx-surface-1);
            border: 1px solid var(--cx-border-subtle);
            border-radius: var(--cx-radius-md);
          }

          .panneau-3d {
            width: 100%;
          }

          .panneau-stack {
            display: flex;
            flex-direction: column;
            gap: 0;
            border-radius: 6px;
            overflow: hidden;
            box-shadow:
              0 1px 2px rgba(0,0,0,0.1),
              0 4px 12px rgba(0,0,0,0.15),
              inset 0 1px 0 rgba(255,255,255,0.05);
          }

          .panneau-layer {
            position: relative;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            cursor: pointer;
            transition: all 0.15s ease;
            border-bottom: 1px solid rgba(0,0,0,0.15);
          }

          .panneau-layer:last-child {
            border-bottom: none;
          }

          .panneau-layer:hover {
            filter: brightness(1.1);
          }

          .panneau-layer--active {
            box-shadow: inset 0 0 0 2px var(--cx-accent);
            filter: brightness(1.15);
          }

          .wood-grain {
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
              90deg,
              transparent,
              transparent 12px,
              rgba(0,0,0,0.04) 12px,
              rgba(0,0,0,0.04) 14px
            );
            pointer-events: none;
          }

          .layer-number {
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            color: rgba(255,255,255,0.9);
            background: rgba(0,0,0,0.25);
            border-radius: 50%;
            flex-shrink: 0;
          }

          .layer-thickness {
            font-size: 11px;
            font-weight: 600;
            color: rgba(0,0,0,0.6);
            background: rgba(255,255,255,0.25);
            padding: 2px 8px;
            border-radius: 10px;
          }

          /* Épaisseur totale */
          .panneau-total-thickness {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px;
            background: var(--cx-surface-3);
            border-radius: var(--cx-radius-md);
            margin-top: 4px;
          }

          .panneau-total-thickness span {
            font-size: var(--cx-text-sm);
            color: var(--cx-text-tertiary);
          }

          .panneau-total-thickness strong {
            font-size: var(--cx-text-md);
            font-weight: 700;
            color: var(--cx-accent);
            font-family: var(--cx-font-mono);
          }

          /* ========== COUPE PANEL - DESIGN MINIMAL ========== */
          .coupe-panel {
            display: flex;
            flex-direction: column;
            padding: 16px;
            background: #111;
            border: 1px solid #333;
            border-radius: 8px;
          }

          .coupe-title {
            font-size: 11px;
            font-weight: 500;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 16px;
            text-align: center;
          }

          .coupe-view {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .coupe-total {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 0;
          }

          .coupe-total-val {
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            font-variant-numeric: tabular-nums;
          }

          .coupe-total-unit {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
          }

          .coupe-stack {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            max-width: 180px;
          }

          .coupe-layer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 28px;
            padding: 0 10px;
            border-radius: 3px;
            cursor: pointer;
            transition: opacity 0.15s;
          }

          .coupe-layer:hover {
            opacity: 0.85;
          }

          .coupe-layer--active {
            outline: 2px solid var(--cx-accent);
            outline-offset: 1px;
          }

          .coupe-layer-num {
            font-size: 11px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
          }

          .coupe-layer-ep {
            font-size: 11px;
            font-weight: 500;
            color: rgba(255,255,255,0.7);
            font-variant-numeric: tabular-nums;
          }

          .coupe-legend {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #222;
          }

          .coupe-legend > div {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            color: #666;
          }

          .coupe-legend span {
            width: 12px;
            height: 8px;
            border-radius: 2px;
          }

          .drag-hint {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 10px;
            color: var(--cx-text-muted);
            margin: 0;
            padding-top: 8px;
            border-top: 1px solid var(--cx-border-subtle);
          }

          .mode-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: var(--cx-radius-md);
            font-size: var(--cx-text-sm);
            font-weight: 500;
          }

          .mode-badge-icon {
            width: 16px;
            height: 16px;
          }

          .mode-badge--fournisseur {
            background: var(--cx-surface-3);
            color: var(--cx-text-secondary);
            border: 1px solid var(--cx-border-default);
          }

          .mode-badge--client {
            background: var(--cx-accent-subtle);
            color: var(--cx-accent);
            border: 1px solid var(--cx-accent-muted);
          }

          /* Parement Warning */
          .parement-warning {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: var(--cx-radius-md);
            color: #ef4444;
            font-size: var(--cx-text-sm);
            animation: slideIn 0.3s ease-out;
          }

          .parement-warning-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 700;
            flex-shrink: 0;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .drag-instruction {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            background: rgba(196, 168, 124, 0.1);
            border: 1px dashed rgba(196, 168, 124, 0.3);
            border-radius: var(--cx-radius-md);
            font-size: 12px;
            color: var(--cx-accent);
          }

          .drag-instruction-icon {
            width: 14px;
            height: 14px;
            opacity: 0.6;
          }

          .couches-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-top: 8px;
          }

          .couche-item {
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            overflow: hidden;
            transition: all 0.2s ease-out;
            transform-origin: center;
          }

          .couche-item--open {
            border-color: var(--cx-accent-muted);
          }

          .couche-item--complete {
            border-color: var(--cx-border-default);
          }

          .couche-item--dragging {
            opacity: 1;
            transform: scale(1.02);
            border: 2px solid var(--cx-accent);
            background: var(--cx-surface-2);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            z-index: 100;
          }

          .couche-item--dragover {
            position: relative;
            opacity: 0.4;
            transform: scale(0.98);
            border: 2px dashed var(--cx-accent);
            background: var(--cx-accent-subtle);
          }

          .couche-item--dragover::before {
            content: 'Déposer ici';
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(var(--cx-accent-rgb, 196, 168, 124), 0.15);
            color: var(--cx-accent);
            font-size: var(--cx-text-sm);
            font-weight: 600;
            border-radius: var(--cx-radius-md);
            z-index: 10;
            pointer-events: none;
          }

          @keyframes pulseGlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          .couche-header {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: transparent;
            border: none;
            cursor: pointer;
            color: var(--cx-text-primary);
            text-align: left;
          }

          .couche-grip-icon {
            width: 16px;
            height: 16px;
            opacity: 0.4;
            cursor: grab;
            transition: all 0.15s;
            flex-shrink: 0;
          }

          .couche-grip-icon:hover {
            opacity: 0.8;
            transform: scale(1.1);
          }

          .couche-item--dragging .couche-grip-icon {
            cursor: grabbing;
            opacity: 1;
          }

          .couche-item:not(.couche-item--dragging):hover {
            border-color: var(--cx-border-default);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .couche-number {
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--cx-accent);
            color: #1a1a1a;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(212, 168, 75, 0.3);
            flex-shrink: 0;
          }

          .couche-number--complete {
            background: var(--cx-accent);
            color: #1a1a1a;
          }

          .couche-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .couche-type {
            font-size: var(--cx-text-sm);
            font-weight: 500;
          }

          .couche-detail {
            font-size: var(--cx-text-xs);
            color: var(--cx-text-tertiary);
          }

          .couche-detail--empty {
            color: var(--cx-text-muted);
          }

          .couche-delete {
            padding: 6px;
            background: transparent;
            border: none;
            color: var(--cx-text-muted);
            cursor: pointer;
            transition: all 0.15s;
            border-radius: var(--cx-radius-sm);
          }

          .couche-delete:hover {
            background: #ef444420;
            color: #ef4444;
          }

          .couche-content {
            padding: 12px;
            border-top: 1px solid var(--cx-border-subtle);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .couche-form-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .couche-form-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .couche-form-field label {
            font-size: var(--cx-text-xs);
            color: var(--cx-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .couche-form-field select,
          .couche-form-field input {
            padding: 8px 12px;
            background: var(--cx-surface-3);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-primary);
            font-size: var(--cx-text-sm);
          }

          .couche-form-field select:focus,
          .couche-form-field input:focus {
            outline: none;
            border-color: var(--cx-accent);
          }

          .add-couche-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            background: transparent;
            border: 1px dashed var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .add-couche-btn:hover {
            border-color: var(--cx-text-tertiary);
            color: var(--cx-text-secondary);
          }

          /* Summary */
          .couches-summary {
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: var(--cx-text-sm);
            color: var(--cx-text-secondary);
          }

          .summary-value {
            font-weight: 500;
            color: var(--cx-text-primary);
          }

          .summary-value--accent {
            color: var(--cx-accent);
            font-weight: 600;
          }

          /* Footer */
          .popup-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--cx-border-default);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .popup-footer-actions {
            display: flex;
            gap: 12px;
          }

          .popup-warning {
            font-size: var(--cx-text-sm);
            color: #ef4444;
            text-align: center;
          }

          /* Disclaimer Section */
          .disclaimer-section {
            padding: 12px 16px;
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: var(--cx-radius-md);
          }

          .disclaimer-checkbox {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
            user-select: none;
          }

          .disclaimer-checkbox input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
          }

          .disclaimer-checkmark {
            position: relative;
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            background: var(--cx-surface-3);
            border: 2px solid var(--cx-border-default);
            border-radius: 4px;
            transition: all 0.15s;
          }

          .disclaimer-checkbox:hover .disclaimer-checkmark {
            border-color: var(--cx-accent);
          }

          .disclaimer-checkbox input:checked ~ .disclaimer-checkmark {
            background: var(--cx-accent);
            border-color: var(--cx-accent);
          }

          .disclaimer-checkbox input:checked ~ .disclaimer-checkmark::after {
            content: '';
            position: absolute;
            left: 6px;
            top: 2px;
            width: 5px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }

          .disclaimer-text {
            font-size: var(--cx-text-sm);
            color: var(--cx-text-secondary);
            line-height: 1.5;
          }

          .disclaimer-checkbox input:checked ~ .disclaimer-text {
            color: var(--cx-text-primary);
          }

          .popup-save-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 16px;
            background: var(--cx-surface-2);
            color: var(--cx-text-secondary);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .popup-save-btn:hover {
            background: var(--cx-surface-3);
            color: var(--cx-text-primary);
          }

          .popup-validate-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            background: var(--cx-accent);
            color: var(--cx-surface-1);
            border: none;
            border-radius: var(--cx-radius-md);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
          }

          .popup-validate-btn:hover:not(:disabled) {
            background: var(--cx-accent-hover);
          }

          .popup-validate-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* Save Dialog */
          .save-dialog {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .save-dialog-input {
            padding: 12px;
            background: var(--cx-surface-2);
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-primary);
            font-size: var(--cx-text-sm);
          }

          .save-dialog-input:focus {
            outline: none;
            border-color: var(--cx-accent);
          }

          .save-dialog-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }

          .save-dialog-cancel {
            padding: 8px 16px;
            background: transparent;
            border: 1px solid var(--cx-border-default);
            border-radius: var(--cx-radius-md);
            color: var(--cx-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .save-dialog-cancel:hover {
            background: var(--cx-surface-2);
            color: var(--cx-text-secondary);
          }

          .save-dialog-confirm {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--cx-accent);
            color: white;
            border: none;
            border-radius: var(--cx-radius-md);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .save-dialog-confirm:hover:not(:disabled) {
            background: var(--cx-accent-hover);
          }

          .save-dialog-confirm:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* Save Success Animation */
          .save-success {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            gap: 12px;
            animation: fadeIn 0.3s ease-out;
          }

          .save-success-icon {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--cx-accent);
            border-radius: 50%;
            color: var(--cx-surface-1);
            animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .save-success-text {
            font-size: var(--cx-text-lg);
            font-weight: 600;
            color: var(--cx-text-primary);
          }

          .save-success-subtext {
            font-size: var(--cx-text-sm);
            color: var(--cx-text-muted);
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes scaleIn {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}
