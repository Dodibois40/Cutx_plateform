'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
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
} from 'lucide-react';
import { createChute, uploadChuteImage } from '@/lib/services/chutes-api';
import type { CreateChuteInput, ProductType, ChuteCondition, BoostLevel } from '@/types/chutes';
import { PRODUCT_TYPE_LABELS, CONDITION_LABELS, BOOST_LABELS } from '@/types/chutes';
import { CutXAppsMenu } from '@/components/ui/CutXAppsMenu';
import { UserAccountMenu } from '@/components/ui/UserAccountMenu';

// Types pour le wizard
interface WizardStep {
  id: string;
  title: string;
  icon: React.ReactNode;
}

interface FormData {
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
  // Étape 6: Localisation
  city: string;
  postalCode: string;
  // Étape 7: Visibilité
  boostLevel: BoostLevel;
  // Meta
  title: string;
  description: string;
  isDraft: boolean;
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

export default function VendrePage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
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
    city: '',
    postalCode: '',
    boostLevel: 'NONE',
    title: '',
    description: '',
    isDraft: false,
  });

  // Prévisualisation des images
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Mettre à jour le formulaire
  const updateForm = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        acceptsOffers: formData.acceptsOffers,
        minimumOffer: formData.minimumOffer ? (formData.minimumOffer as number) : undefined,
        city: formData.city,
        postalCode: formData.postalCode,
        boostLevel: formData.boostLevel,
        useCatalogImage: formData.useCatalogImage,
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
                        ? 'border-[var(--cx-accent)] bg-[var(--cx-accent)]/10 text-white'
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
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                        ? 'border-[var(--cx-accent)] bg-[var(--cx-accent)]/10 text-white'
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
                      <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--cx-accent)] text-white text-xs rounded">
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

            {formData.images.length === 0 && (
              <div className="p-4 bg-[var(--cx-surface-1)] rounded-lg border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useCatalogImage}
                    onChange={(e) => updateForm('useCatalogImage', e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-transparent"
                  />
                  <div>
                    <p className="text-white font-medium">Utiliser une image du catalogue</p>
                    <p className="text-sm text-white/50">
                      Si vous n&apos;avez pas de photo, nous afficherons une image générique
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
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white text-2xl font-medium placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
              />
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
                  className="w-5 h-5 rounded border-white/30 bg-transparent"
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
                    className="w-full px-4 py-2 bg-[var(--cx-surface-2)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                        ? 'border-[var(--cx-accent)] bg-[var(--cx-accent)]/10'
                        : 'border-white/10 bg-[var(--cx-surface-1)] hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white flex items-center gap-2">
                        {option.value !== 'NONE' && <Star size={16} className="text-yellow-400" />}
                        {BOOST_LABELS[option.value]}
                      </span>
                      <span className={`font-bold ${option.price > 0 ? 'text-[var(--cx-accent)]' : 'text-green-400'}`}>
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
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)]"
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
                  className="w-full px-4 py-3 bg-[var(--cx-surface-1)] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--cx-accent)] resize-none"
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
    <div className="min-h-screen bg-[var(--cx-surface-0)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--cx-surface-0)]/95 backdrop-blur-sm border-b border-white/5">
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
      <div className="bg-[var(--cx-surface-1)] border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex items-center gap-2 transition-all ${
                    index === currentStep
                      ? 'text-[var(--cx-accent)]'
                      : index < currentStep
                        ? 'text-green-400 cursor-pointer'
                        : 'text-white/30 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === currentStep
                        ? 'bg-[var(--cx-accent)] text-white'
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
      <main className="max-w-3xl mx-auto px-4 py-8">
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
            className={`cx-btn cx-btn-secondary flex items-center gap-2 ${
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
              className={`cx-btn cx-btn-primary flex items-center gap-2 ${
                !validateCurrentStep() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Suivant
              <ArrowRight size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="cx-btn cx-btn-secondary"
              >
                Enregistrer brouillon
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || !validateCurrentStep()}
                className="cx-btn cx-btn-primary flex items-center gap-2"
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
      </main>
    </div>
  );
}
