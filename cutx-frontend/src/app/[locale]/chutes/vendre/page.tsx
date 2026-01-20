'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Ruler,
  Shield,
  Camera,
  Tag,
  Zap,
  AlertCircle,
  Upload,
  X,
  Star,
  FolderTree,
  Search,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { createChute, uploadChuteImage } from '@/lib/services/chutes-api';
import type { CreateChuteInput, ProductType, ChuteCondition, BoostLevel } from '@/types/chutes';
import { PRODUCT_TYPE_LABELS, CONDITION_LABELS, BOOST_LABELS } from '@/types/chutes';
import { CutXAppsMenu } from '@/components/ui/CutXAppsMenu';
import { UserAccountMenu } from '@/components/ui/UserAccountMenu';
import { useTreeNavigation } from '@/components/command-search/hooks/useTreeNavigation';
import type { CategoryTreeNode, BreadcrumbItem } from '@/components/command-search/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// Types pour le wizard
interface WizardStep {
  id: string;
  title: string;
  icon: React.ReactNode;
}

interface FormData {
  // Panneau source (optionnel)
  catalogPanelId: string | null;
  catalogPanelName: string | null;
  catalogPanelImage: string | null;
  // Étape 1: Type
  productType: ProductType | '';
  material: string;
  // Étape 2: Dimensions
  thickness: number | '';
  length: number | '';
  width: number | '';
  quantity: number;
  // Étape 3: État
  condition: ChuteCondition | '';
  certificationChecks: string[];
  // Étape 4: Photos
  images: File[];
  useCatalogImage: boolean;
  // Étape 5: Prix
  price: number | '';
  acceptsOffers: boolean;
  minimumOffer: number | '';
  originalPanelPrice: number | '';
  // Étape 6: Localisation
  city: string;
  postalCode: string;
  // Étape 7: Visibilité
  boostLevel: BoostLevel;
  // Meta
  title: string;
  description: string;
  isDraft: boolean;
  categoryId: string | null;
}

interface Panel {
  id: string;
  name: string;
  reference: string | null;
  thickness: number | null;
  productType: string | null;
  decor: string | null;
  finish: string | null;
  imageUrl: string | null;
  price: number | null;
}

const STEPS: WizardStep[] = [
  { id: 'type', title: 'Type', icon: <Package size={18} /> },
  { id: 'dimensions', title: 'Dimensions', icon: <Ruler size={18} /> },
  { id: 'condition', title: 'État', icon: <Shield size={18} /> },
  { id: 'photos', title: 'Photos', icon: <Camera size={18} /> },
  { id: 'price', title: 'Prix', icon: <Tag size={18} /> },
  { id: 'location', title: 'Localisation', icon: <Package size={18} /> },
  { id: 'boost', title: 'Visibilité', icon: <Zap size={18} /> },
];

const CERTIFICATION_OPTIONS = [
  { value: 'no_scratch', label: 'Aucune rayure sur les faces' },
  { value: 'no_chip', label: 'Aucun éclat sur les chants' },
  { value: 'no_glue', label: "Pas de colle ou d'adhésif" },
  { value: 'not_warped', label: 'Non gondolé' },
];

const PRODUCT_TYPES: ProductType[] = [
  'MELAMINE',
  'MDF',
  'CONTREPLAQUE',
  'STRATIFIE',
  'AGGLO_BRUT',
  'OSB',
  'MASSIF',
  'PLACAGE',
];

const CONDITIONS: ChuteCondition[] = ['PARFAIT', 'BON', 'CORRECT', 'A_NETTOYER'];

const BOOST_OPTIONS: { value: BoostLevel; price: number; description: string }[] = [
  { value: 'NONE', price: 0, description: 'Annonce standard, commission 5%' },
  { value: 'STANDARD', price: 2, description: 'Badge Boost, commission 8%' },
  { value: 'PREMIUM', price: 5, description: 'Top résultats + notifications, commission 10%' },
  { value: 'URGENT', price: 10, description: 'Bannière rouge + push, commission 12%' },
];

// Map productType from database to our ProductType enum
function mapProductType(dbProductType: string | null): ProductType | '' {
  if (!dbProductType) return '';
  const mapping: Record<string, ProductType> = {
    MELAMINE: 'MELAMINE',
    STRATIFIE: 'STRATIFIE',
    MDF: 'MDF',
    CONTREPLAQUE: 'CONTREPLAQUE',
    AGGLO_BRUT: 'AGGLO_BRUT',
    OSB: 'OSB',
    MASSIF: 'MASSIF',
    PLACAGE: 'PLACAGE',
    PANNEAU_MASSIF: 'MASSIF',
    PANNEAU_DECO: 'MELAMINE',
    COMPACT: 'STRATIFIE',
  };
  return mapping[dbProductType] || '';
}

// Tree Node Component (simplified for this page)
function TreeNodeItem({
  node,
  level,
  expandedNodes,
  selectedSlug,
  onToggle,
  onSelect,
}: {
  node: CategoryTreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedSlug: string | null;
  onToggle: (slug: string) => void;
  onSelect: (slug: string, name: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.slug);
  const isSelected = selectedSlug === node.slug;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(node.slug);
          }
          onSelect(node.slug, node.name);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors ${
          isSelected
            ? 'bg-green-500/20 text-green-400'
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren && (
          <ChevronRight
            size={14}
            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
        {!hasChildren && <div className="w-3.5" />}
        <span className="truncate flex-1 text-left">{node.name}</span>
        {node.panelCount > 0 && (
          <span className="text-xs text-white/40">{node.panelCount}</span>
        )}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.slug}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedSlug={selectedSlug}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VendrePage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tree navigation state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [panelSearchQuery, setPanelSearchQuery] = useState('');

  const {
    tree,
    isLoading: isTreeLoading,
    expandedNodes,
    toggleNode,
  } = useTreeNavigation({ catalogueSlug: 'cutx', enabled: true });

  // Fetch panels for selected category
  const { data: panels = [], isLoading: isPanelsLoading } = useQuery({
    queryKey: ['category-panels', selectedCategory, panelSearchQuery],
    queryFn: async (): Promise<Panel[]> => {
      if (!selectedCategory) return [];
      const params = new URLSearchParams({
        categorySlug: selectedCategory,
        limit: '50',
      });
      if (panelSearchQuery) {
        params.set('q', panelSearchQuery);
      }
      const res = await fetch(`${API_URL}/api/catalogues/smart-search?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name || p.reference || 'Sans nom',
        reference: p.reference,
        thickness: p.thickness,
        productType: p.productType,
        decor: p.decor,
        finish: p.finish,
        imageUrl: p.imageUrl,
        price: p.prixM2 || p.price,
      }));
    },
    enabled: !!selectedCategory,
    staleTime: 30 * 1000,
  });

  const [formData, setFormData] = useState<FormData>({
    catalogPanelId: null,
    catalogPanelName: null,
    catalogPanelImage: null,
    productType: '',
    material: '',
    thickness: '',
    length: '',
    width: '',
    quantity: 1,
    condition: '',
    certificationChecks: [],
    images: [],
    useCatalogImage: false,
    price: '',
    acceptsOffers: true,
    minimumOffer: '',
    originalPanelPrice: '',
    city: '',
    postalCode: '',
    boostLevel: 'NONE',
    title: '',
    description: '',
    isDraft: false,
    categoryId: null,
  });

  // Prévisualisation des images
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Mettre à jour le formulaire
  const updateForm = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Sélectionner un panneau du catalogue
  const handlePanelSelect = useCallback((panel: Panel) => {
    setFormData((prev) => ({
      ...prev,
      catalogPanelId: panel.id,
      catalogPanelName: panel.name,
      catalogPanelImage: panel.imageUrl,
      productType: mapProductType(panel.productType),
      material: [panel.decor, panel.finish].filter(Boolean).join(' ') || '',
      thickness: panel.thickness || '',
      originalPanelPrice: panel.price || '',
      useCatalogImage: !!panel.imageUrl,
    }));
    // Passer à l'étape suivante automatiquement si on est à l'étape type
    if (currentStep === 0) {
      setCurrentStep(1);
    }
  }, [currentStep]);

  // Désélectionner le panneau
  const clearPanelSelection = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      catalogPanelId: null,
      catalogPanelName: null,
      catalogPanelImage: null,
      useCatalogImage: false,
    }));
  }, []);

  // Gérer l'upload d'images
  const handleImageAdd = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - formData.images.length);
    if (newFiles.length === 0) return;

    // Créer les previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    updateForm('images', [...formData.images, ...newFiles]);
  }, [formData.images, updateForm]);

  // Supprimer une image
  const handleImageRemove = useCallback((index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, images: newImages }));
    setImagePreviews(newPreviews);
  }, [formData.images, imagePreviews]);

  // Valider l'étape courante
  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Type
        return !!formData.productType;
      case 1: // Dimensions
        return (
          !!formData.thickness &&
          !!formData.length &&
          !!formData.width &&
          formData.quantity > 0
        );
      case 2: // État
        return !!formData.condition;
      case 3: // Photos
        return formData.images.length > 0 || formData.useCatalogImage;
      case 4: // Prix
        return !!formData.price && (formData.price as number) > 0;
      case 5: // Localisation
        return (
          formData.city.length >= 2 &&
          formData.postalCode.length === 5
        );
      case 6: // Boost
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Générer le titre automatiquement
  const generateTitle = useCallback((): string => {
    const parts: string[] = [];
    if (formData.productType) {
      parts.push(PRODUCT_TYPE_LABELS[formData.productType as ProductType]);
    }
    if (formData.material) {
      parts.push(formData.material);
    }
    if (formData.thickness) {
      parts.push(`${formData.thickness}mm`);
    }
    if (formData.length && formData.width) {
      const l = formData.length as number;
      const w = formData.width as number;
      parts.push(`${l >= 100 ? (l / 10).toFixed(0) : l}×${w >= 100 ? (w / 10).toFixed(0) : w}${l >= 100 || w >= 100 ? 'cm' : 'mm'}`);
    }
    return parts.join(' ') || 'Chute de panneau';
  }, [formData]);

  // Soumettre le formulaire
  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isSignedIn) {
      setError('Vous devez être connecté pour publier une annonce');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Token non disponible');
      }

      // Préparer les données
      const chuteData: CreateChuteInput = {
        title: formData.title || generateTitle(),
        description: formData.description || undefined,
        productType: formData.productType as ProductType,
        material: formData.material || undefined,
        thickness: formData.thickness as number,
        length: formData.length as number,
        width: formData.width as number,
        quantity: formData.quantity,
        condition: formData.condition as ChuteCondition,
        certificationChecks: formData.certificationChecks,
        price: formData.price as number,
        originalPanelPrice: formData.originalPanelPrice ? (formData.originalPanelPrice as number) : undefined,
        acceptsOffers: formData.acceptsOffers,
        minimumOffer: formData.minimumOffer ? (formData.minimumOffer as number) : undefined,
        city: formData.city,
        postalCode: formData.postalCode,
        boostLevel: formData.boostLevel,
        useCatalogImage: formData.useCatalogImage,
        catalogPanelId: formData.catalogPanelId || undefined,
        categoryId: formData.categoryId || undefined,
        isDraft,
      };

      // Créer l'annonce
      const chute = await createChute(chuteData, token);

      // Uploader les images
      if (formData.images.length > 0) {
        for (let i = 0; i < formData.images.length; i++) {
          await uploadChuteImage(chute.id, formData.images[i], token, i === 0);
        }
      }

      // Rediriger vers la page de l'annonce
      router.push(`/chutes/${chute.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la publication');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation
  const goNext = () => {
    if (validateCurrentStep() && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Rendu des étapes
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Type de produit
        return (
          <div className="space-y-6">
            {/* Panneau sélectionné */}
            {formData.catalogPanelId && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-4">
                  {formData.catalogPanelImage && (
                    <img
                      src={formData.catalogPanelImage}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-green-400 font-medium">Panneau sélectionné</p>
                    <p className="text-white">{formData.catalogPanelName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPanelSelection}
                    className="p-2 text-white/50 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Type de panneau *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRODUCT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateForm('productType', type)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      formData.productType === type
                        ? 'border-green-500 bg-green-500/10 text-white'
                        : 'border-white/10 bg-[var(--cx-surface-1)] text-white/70 hover:border-white/30'
                    }`}
                  >
                    {PRODUCT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Décor / Couleur / Finition (optionnel)
              </label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => updateForm('material', e.target.value)}
                placeholder="Ex: Blanc mat, Chêne naturel, U104..."
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        );

      case 1: // Dimensions
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Épaisseur (mm) *
                </label>
                <input
                  type="number"
                  value={formData.thickness}
                  onChange={(e) => updateForm('thickness', e.target.value ? Number(e.target.value) : '')}
                  min="1"
                  max="100"
                  placeholder="19"
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Longueur (mm) *
                </label>
                <input
                  type="number"
                  value={formData.length}
                  onChange={(e) => updateForm('length', e.target.value ? Number(e.target.value) : '')}
                  min="50"
                  max="5000"
                  placeholder="1200"
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Largeur (mm) *
                </label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => updateForm('width', e.target.value ? Number(e.target.value) : '')}
                  min="50"
                  max="3000"
                  placeholder="800"
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Quantité *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => updateForm('quantity', Math.max(1, Number(e.target.value)))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {formData.length && formData.width && (
              <div className="p-4 bg-[var(--cx-surface-1)] rounded-lg">
                <p className="text-white/70">
                  Surface:{' '}
                  <span className="text-white font-medium">
                    {((formData.length as number) * (formData.width as number) / 1000000).toFixed(2)} m²
                  </span>
                  {formData.quantity > 1 && (
                    <span className="text-white/50">
                      {' '}
                      (total: {(((formData.length as number) * (formData.width as number) / 1000000) * formData.quantity).toFixed(2)} m²)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        );

      case 2: // État
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                État général *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => updateForm('condition', condition)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      formData.condition === condition
                        ? 'border-green-500 bg-green-500/10 text-white'
                        : 'border-white/10 bg-[var(--cx-surface-1)] text-white/70 hover:border-white/30'
                    }`}
                  >
                    {CONDITION_LABELS[condition]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Certification qualité (optionnel)
              </label>
              <p className="text-sm text-white/50 mb-4">
                Certifiez l&apos;état de votre chute pour rassurer les acheteurs
              </p>
              <div className="space-y-2">
                {CERTIFICATION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      formData.certificationChecks.includes(option.value)
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-white/10 bg-[var(--cx-surface-1)] hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.certificationChecks.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateForm('certificationChecks', [...formData.certificationChecks, option.value]);
                        } else {
                          updateForm('certificationChecks', formData.certificationChecks.filter((v) => v !== option.value));
                        }
                      }}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      formData.certificationChecks.includes(option.value)
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/30'
                    }`}>
                      {formData.certificationChecks.includes(option.value) && (
                        <Check size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-white">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Photos
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Photos de la chute (1 à 5)
              </label>
              <p className="text-sm text-white/50 mb-4">
                Ajoutez des photos pour montrer l&apos;état réel de la chute.
                Pensez à photographier les chants !
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="aspect-square relative rounded-lg overflow-hidden border border-white/10"
                  >
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                        Principale
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleImageRemove(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-500"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 5 && (
                  <label className="aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-[var(--cx-surface-1)] cursor-pointer hover:border-white/40 transition-colors">
                    <Upload size={24} className="text-white/50 mb-2" />
                    <span className="text-xs text-white/50">Ajouter</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => handleImageAdd(e.target.files)}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>

            {formData.images.length === 0 && formData.catalogPanelImage && (
              <div className="p-4 bg-[var(--cx-surface-1)] rounded-lg border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useCatalogImage}
                    onChange={(e) => updateForm('useCatalogImage', e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-transparent accent-green-500"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <img
                      src={formData.catalogPanelImage}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-white font-medium">Utiliser l&apos;image du catalogue</p>
                      <p className="text-sm text-white/50">
                        L&apos;image du panneau source sera affichée avec un badge
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            )}

            {formData.images.length === 0 && !formData.catalogPanelImage && (
              <div className="p-4 bg-[var(--cx-surface-1)] rounded-lg border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useCatalogImage}
                    onChange={(e) => updateForm('useCatalogImage', e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-transparent accent-green-500"
                  />
                  <div>
                    <p className="text-white font-medium">Pas de photo disponible</p>
                    <p className="text-sm text-white/50">
                      Une image générique sera affichée (vous pourrez ajouter des photos plus tard)
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        );

      case 4: // Prix
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Prix de vente (€) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => updateForm('price', e.target.value ? Number(e.target.value) : '')}
                min="1"
                max="10000"
                placeholder="35"
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white text-2xl font-medium placeholder:text-white/30 focus:outline-none focus:border-green-500"
              />
              {formData.originalPanelPrice && formData.length && formData.width && (
                <p className="text-sm text-white/50 mt-2">
                  Prix neuf estimé: ~{((formData.originalPanelPrice as number) * ((formData.length as number) * (formData.width as number) / 1000000)).toFixed(0)}€
                </p>
              )}
            </div>

            <div className="p-4 bg-[var(--cx-surface-1)] rounded-lg border border-white/10">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-white font-medium">Accepter les offres</p>
                  <p className="text-sm text-white/50">
                    Les acheteurs pourront proposer un prix inférieur
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.acceptsOffers}
                  onChange={(e) => updateForm('acceptsOffers', e.target.checked)}
                  className="w-5 h-5 rounded border-white/30 bg-transparent accent-green-500"
                />
              </label>

              {formData.acceptsOffers && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <label className="block text-sm text-white/70 mb-2">
                    Offre minimum acceptée (optionnel)
                  </label>
                  <input
                    type="number"
                    value={formData.minimumOffer}
                    onChange={(e) => updateForm('minimumOffer', e.target.value ? Number(e.target.value) : '')}
                    min="1"
                    max={formData.price || 10000}
                    placeholder="25"
                    className="w-full px-4 py-2 bg-[var(--cx-surface-2)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 5: // Localisation
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Ville *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateForm('city', e.target.value)}
                placeholder="Lyon"
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Code postal *
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => updateForm('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="69003"
                maxLength={5}
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Retrait sur place uniquement.</strong> Les acheteurs viendront
                chercher la chute à l&apos;adresse que vous communiquerez après la vente.
              </p>
            </div>
          </div>
        );

      case 6: // Visibilité (Boost)
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Niveau de visibilité
              </label>
              <div className="space-y-3">
                {BOOST_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('boostLevel', option.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      formData.boostLevel === option.value
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/10 bg-[var(--cx-surface-1)] hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white flex items-center gap-2">
                        {option.value !== 'NONE' && <Star size={16} className="text-yellow-400" />}
                        {BOOST_LABELS[option.value]}
                      </span>
                      <span className={`font-bold ${option.price > 0 ? 'text-green-400' : 'text-green-400'}`}>
                        {option.price > 0 ? `${option.price}€/sem` : 'Gratuit'}
                      </span>
                    </div>
                    <p className="text-sm text-white/50">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Titre et description (optionnel) */}
            <div className="pt-4 border-t border-white/10">
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Titre personnalisé (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder={generateTitle()}
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-white/40 mt-1">
                  Laissez vide pour utiliser : &quot;{generateTitle()}&quot;
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={3}
                  placeholder="Ajoutez des détails supplémentaires..."
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--cx-background)] flex">
      {/* Left sidebar - Tree Navigation */}
      <div className="w-80 flex-shrink-0 bg-[var(--cx-surface-0)] border-r border-white/5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <FolderTree size={20} className="text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Catalogue</h2>
              <p className="text-xs text-white/50">Sélectionnez votre panneau</p>
            </div>
          </div>
          {/* Search in tree */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={panelSearchQuery}
              onChange={(e) => setPanelSearchQuery(e.target.value)}
              placeholder="Rechercher un panneau..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {isTreeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeNodeItem
                  key={node.slug}
                  node={node}
                  level={0}
                  expandedNodes={expandedNodes}
                  selectedSlug={selectedCategory}
                  onToggle={toggleNode}
                  onSelect={(slug, name) => {
                    setSelectedCategory(slug);
                    setSelectedCategoryName(name);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panels list when category selected */}
        {selectedCategory && (
          <div className="border-t border-white/5 max-h-[40%] overflow-y-auto">
            <div className="p-3 bg-[var(--cx-surface-1)] border-b border-white/5 sticky top-0">
              <p className="text-xs text-white/50 uppercase tracking-wide font-medium">
                {selectedCategoryName}
              </p>
            </div>
            {isPanelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
              </div>
            ) : panels.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">
                Aucun panneau dans cette catégorie
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {panels.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => handlePanelSelect(panel)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      formData.catalogPanelId === panel.id
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {panel.imageUrl ? (
                      <img
                        src={panel.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[var(--cx-surface-2)] flex items-center justify-center flex-shrink-0">
                        <Layers size={16} className="text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{panel.name}</p>
                      <p className="text-xs text-white/40">
                        {panel.thickness && `${panel.thickness}mm`}
                        {panel.reference && ` • ${panel.reference}`}
                      </p>
                    </div>
                    {formData.catalogPanelId === panel.id && (
                      <Check size={16} className="text-green-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-[var(--cx-surface-0)]/95 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link
                href="/chutes"
                className="flex items-center gap-2 text-white/70 hover:text-white"
              >
                <ArrowLeft size={20} />
                <span>Retour</span>
              </Link>

              <h1 className="font-semibold text-white">Vendre une chute</h1>

              <div className="flex items-center gap-2">
                <CutXAppsMenu />
                <UserAccountMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Progress */}
        <div className="flex-shrink-0 bg-[var(--cx-surface-1)] border-b border-white/5">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => index < currentStep && setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={`flex items-center gap-2 transition-all ${
                      index === currentStep
                        ? 'text-green-400'
                        : index < currentStep
                          ? 'text-green-400 cursor-pointer'
                          : 'text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === currentStep
                          ? 'bg-green-500 text-white'
                          : index < currentStep
                            ? 'bg-green-500 text-white'
                            : 'bg-white/10 text-white/30'
                      }`}
                    >
                      {index < currentStep ? <Check size={16} /> : index + 1}
                    </div>
                    <span className="hidden sm:inline text-sm">{step.title}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-8 sm:w-12 h-0.5 mx-2 ${
                        index < currentStep ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-2">
                {STEPS[currentStep].title}
              </h2>
            </div>

            {renderStepContent()}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={goBack}
                disabled={currentStep === 0}
                className={`cx-btn cx-btn--secondary flex items-center gap-2 ${
                  currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ArrowLeft size={18} />
                Précédent
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!validateCurrentStep()}
                  className={`cx-btn cx-btn--primary flex items-center gap-2 ${
                    !validateCurrentStep() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    background: validateCurrentStep() ? 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)' : undefined,
                    borderColor: validateCurrentStep() ? '#22c55e' : undefined,
                  }}
                >
                  Suivant
                  <ArrowRight size={18} />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className="cx-btn cx-btn--secondary"
                  >
                    Enregistrer brouillon
                  </button>
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting || !validateCurrentStep()}
                    className="cx-btn cx-btn--primary flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
                      borderColor: '#22c55e',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                        Publication...
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Publier l&apos;annonce
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
