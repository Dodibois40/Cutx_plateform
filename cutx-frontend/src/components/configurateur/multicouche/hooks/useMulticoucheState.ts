'use client';

/**
 * Hook custom pour la gestion d'etat du popup multicouche
 * Centralise tous les etats et handlers
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { ModeCollage, CoucheMulticouche, TypeCouche, PanneauMulticouche } from '@/lib/configurateur-multicouche/types';
import { creerNouvelleCouche, REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';
import type { ProduitCatalogue } from '@/lib/catalogues';
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  templateToPanneau,
  panneauToTemplateData,
  type MulticoucheTemplate,
} from '@/lib/services/multicouche-templates-api';

export type EtapeMulticouche = 'mode' | 'couches' | 'templates';

interface UseMulticoucheStateProps {
  open: boolean;
  panneauMulticouche: PanneauMulticouche | null;
  onSave: (panneau: PanneauMulticouche) => void;
}

export interface UseMulticoucheStateReturn {
  // Auth
  isSignedIn: boolean | undefined;

  // Etape
  etape: EtapeMulticouche;
  setEtape: (etape: EtapeMulticouche) => void;

  // Mode collage
  modeCollage: ModeCollage | null;
  setModeCollage: (mode: ModeCollage | null) => void;
  handleSelectMode: (mode: ModeCollage) => void;

  // Couches
  couches: CoucheMulticouche[];
  setCouches: (couches: CoucheMulticouche[]) => void;
  coucheOuverte: string | null;
  setCoucheOuverte: (id: string | null) => void;
  ajouterCouche: () => void;
  supprimerCouche: (id: string) => void;
  updateCouche: (id: string, updates: Partial<CoucheMulticouche>) => void;
  handleChangeTypeCouche: (id: string, newType: TypeCouche) => void;
  handleSelectPanneau: (coucheId: string, produit: ProduitCatalogue) => void;
  handleClearPanneau: (coucheId: string) => void;
  handleCoucheHeaderClick: (coucheId: string, isOpen: boolean) => void;

  // Drag and drop
  draggedCoucheId: string | null;
  dragOverCoucheId: string | null;
  isDraggingRef: React.MutableRefObject<boolean>;
  handleDragStart: (e: React.DragEvent, coucheId: string) => void;
  handleDragOver: (e: React.DragEvent, coucheId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, targetCoucheId: string) => void;
  handleDragEnd: () => void;

  // Dropdown type
  openTypeDropdown: string | null;
  setOpenTypeDropdown: (id: string | null) => void;

  // Templates
  templates: MulticoucheTemplate[];
  templatesLoading: boolean;
  loadTemplates: () => Promise<void>;
  handleLoadTemplate: (template: MulticoucheTemplate) => void;
  handleDeleteTemplate: (id: string) => Promise<void>;

  // Save dialog
  showSaveDialog: boolean;
  setShowSaveDialog: (show: boolean) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  saving: boolean;
  saveSuccess: boolean;
  handleSaveTemplate: () => Promise<void>;

  // Disclaimer
  disclaimerAccepted: boolean;
  setDisclaimerAccepted: (accepted: boolean) => void;

  // Warning
  parementWarning: string | null;

  // Valeurs calculees
  epaisseurTotale: number;
  prixEstimeM2: number;
  toutesLesCouchesCompletes: boolean;

  // Validation
  handleValidate: () => void;

  // Montage
  mounted: boolean;
}

export function useMulticoucheState({
  open,
  panneauMulticouche,
  onSave,
}: UseMulticoucheStateProps): UseMulticoucheStateReturn {
  const { getToken, isSignedIn } = useAuth();

  // Etape
  const [etape, setEtape] = useState<EtapeMulticouche>('mode');
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

  // Dropdown type de couche ouvert
  const [openTypeDropdown, setOpenTypeDropdown] = useState<string | null>(null);

  // State pour le montage cote client
  const [mounted, setMounted] = useState(false);

  // Montage cote client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Charger les templates quand le popup s'ouvre
  useEffect(() => {
    if (open && isSignedIn) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
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
  }, [getToken]);

  // Sauvegarder comme template
  const handleSaveTemplate = useCallback(async () => {
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

      setSaveSuccess(true);

      setTimeout(() => {
        setShowSaveDialog(false);
        setTemplateName('');
        setSaveSuccess(false);
        setEtape('templates');
      }, 1500);
    } catch (error) {
      console.error('Erreur sauvegarde template:', error);
      alert('Erreur lors de la sauvegarde du modele');
      setSaving(false);
    }
  }, [templateName, modeCollage, couches, getToken, loadTemplates]);

  // Charger un template
  const handleLoadTemplate = useCallback((template: MulticoucheTemplate) => {
    const panneau = templateToPanneau(template);
    setModeCollage(panneau.modeCollage);
    setCouches(panneau.couches);
    setEtape('couches');
  }, []);

  // Supprimer un template
  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce modele ?')) return;

    try {
      const token = await getToken();
      if (token && typeof window !== 'undefined') {
        (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk = {
          session: { getToken: async () => token },
        };
      }
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Erreur suppression template:', error);
    }
  }, [getToken]);

  // Selection du mode
  const handleSelectMode = useCallback((mode: ModeCollage) => {
    setModeCollage(mode);
    setEtape('couches');
    setCoucheOuverte(() => {
      // Ouvrir la premiere couche si aucune n'est ouverte
      return couches[0]?.id || null;
    });
  }, [couches]);

  // Ajouter une couche
  const ajouterCouche = useCallback(() => {
    if (couches.length >= REGLES_MULTICOUCHE.COUCHES_MAX) return;
    const nouvelleCouche = creerNouvelleCouche(couches.length + 1, 'autre');
    setCouches((prev) => [...prev, nouvelleCouche]);
    setCoucheOuverte(nouvelleCouche.id);
  }, [couches.length]);

  // Supprimer une couche
  const supprimerCouche = useCallback((id: string) => {
    setCouches((prev) => {
      if (prev.length <= REGLES_MULTICOUCHE.COUCHES_MIN) return prev;
      const newCouches = prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, ordre: i + 1 }));
      return newCouches;
    });
    setCoucheOuverte((prevOuverte) => {
      if (prevOuverte === id) {
        return couches.find((c) => c.id !== id)?.id || null;
      }
      return prevOuverte;
    });
  }, [couches]);

  // Mettre a jour une couche
  const updateCouche = useCallback((id: string, updates: Partial<CoucheMulticouche>) => {
    setCouches((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  // Changer le type d'une couche avec validation des parements
  const handleChangeTypeCouche = useCallback((id: string, newType: TypeCouche) => {
    setCouches((prev) => {
      if (newType === 'parement') {
        const nbParements = prev.filter((c) => c.type === 'parement' && c.id !== id).length;
        if (nbParements >= 2) {
          setParementWarning('Maximum 2 faces visibles (parements) autorisees dans un panneau multicouche.');
          setTimeout(() => setParementWarning(null), 4000);
          return prev;
        }
      }
      setParementWarning(null);
      return prev.map((c) => (c.id === id ? { ...c, type: newType } : c));
    });
  }, []);

  // Selection d'un panneau du catalogue
  const handleSelectPanneau = useCallback((coucheId: string, produit: ProduitCatalogue) => {
    updateCouche(coucheId, {
      panneauId: produit.reference,
      panneauNom: produit.nom,
      panneauReference: produit.reference,
      panneauImageUrl: produit.imageUrl || null,
      panneauLongueur: produit.longueur || null,
      panneauLargeur: produit.largeur || null,
      prixPanneauM2: produit.prixVenteM2 || produit.prixAchatM2 || 0,
      epaisseur: produit.epaisseur,
      materiau: produit.type,
    });
  }, [updateCouche]);

  // Effacer le panneau selectionne
  const handleClearPanneau = useCallback((coucheId: string) => {
    updateCouche(coucheId, {
      panneauId: null,
      panneauNom: null,
      panneauReference: null,
      panneauImageUrl: null,
      panneauLongueur: null,
      panneauLargeur: null,
      prixPanneauM2: 0,
    });
  }, [updateCouche]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, coucheId: string) => {
    isDraggingRef.current = true;
    setCoucheOuverte(null);
    setDraggedCoucheId(coucheId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', coucheId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, coucheId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCoucheId((prev) => {
      if (draggedCoucheId !== coucheId) {
        return coucheId;
      }
      return prev;
    });
  }, [draggedCoucheId]);

  const handleDragLeave = useCallback(() => {
    setDragOverCoucheId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetCoucheId: string) => {
    e.preventDefault();
    if (!draggedCoucheId || draggedCoucheId === targetCoucheId) {
      setDraggedCoucheId(null);
      setDragOverCoucheId(null);
      return;
    }

    setCouches((prev) => {
      const draggedIndex = prev.findIndex((c) => c.id === draggedCoucheId);
      const targetIndex = prev.findIndex((c) => c.id === targetCoucheId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newCouches = [...prev];
      const [draggedCouche] = newCouches.splice(draggedIndex, 1);
      newCouches.splice(targetIndex, 0, draggedCouche);

      return newCouches.map((c, i) => ({ ...c, ordre: i + 1 }));
    });

    setDraggedCoucheId(null);
    setDragOverCoucheId(null);
  }, [draggedCoucheId]);

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
    setDraggedCoucheId(null);
    setDragOverCoucheId(null);
  }, []);

  // Handler pour le clic sur le header
  const handleCoucheHeaderClick = useCallback((coucheId: string, isOpen: boolean) => {
    if (isDraggingRef.current) return;
    setCoucheOuverte(isOpen ? null : coucheId);
  }, []);

  // Valeurs calculees
  const epaisseurTotale = couches.reduce((sum, c) => sum + c.epaisseur, 0);
  const prixEstimeM2 = couches.reduce((sum, c) => sum + c.prixPanneauM2, 0);
  const toutesLesCouchesCompletes = couches.every((c) => c.panneauId !== null);

  // Valider le panneau multicouche
  const handleValidate = useCallback(() => {
    if (!modeCollage || !toutesLesCouchesCompletes) return;

    const panneau: PanneauMulticouche = {
      id: panneauMulticouche?.id || crypto.randomUUID(),
      couches,
      modeCollage,
      epaisseurTotale,
      prixEstimeM2,
    };

    onSave(panneau);
  }, [modeCollage, toutesLesCouchesCompletes, couches, epaisseurTotale, prixEstimeM2, panneauMulticouche?.id, onSave]);

  return {
    isSignedIn,
    etape,
    setEtape,
    modeCollage,
    setModeCollage,
    handleSelectMode,
    couches,
    setCouches,
    coucheOuverte,
    setCoucheOuverte,
    ajouterCouche,
    supprimerCouche,
    updateCouche,
    handleChangeTypeCouche,
    handleSelectPanneau,
    handleClearPanneau,
    handleCoucheHeaderClick,
    draggedCoucheId,
    dragOverCoucheId,
    isDraggingRef,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    openTypeDropdown,
    setOpenTypeDropdown,
    templates,
    templatesLoading,
    loadTemplates,
    handleLoadTemplate,
    handleDeleteTemplate,
    showSaveDialog,
    setShowSaveDialog,
    templateName,
    setTemplateName,
    saving,
    saveSuccess,
    handleSaveTemplate,
    disclaimerAccepted,
    setDisclaimerAccepted,
    parementWarning,
    epaisseurTotale,
    prixEstimeM2,
    toutesLesCouchesCompletes,
    handleValidate,
    mounted,
  };
}
