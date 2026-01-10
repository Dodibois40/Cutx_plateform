'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Loader2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// Helper pour convertir les URLs d'images locales en URLs complètes
const getImageUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  if (url.startsWith('/uploads/')) {
    return `${API_URL}${url}`;
  }
  return url;
};

const PRODUCT_TYPES = [
  'MELAMINE',
  'STRATIFIE',
  'PLACAGE',
  'BANDE_DE_CHANT',
  'COMPACT',
  'MDF',
  'CONTREPLAQUE',
  'PANNEAU_MASSIF',
  'OSB',
  'PARTICULE',
  'PLAN_DE_TRAVAIL',
  'PANNEAU_DECORATIF',
  'PANNEAU_3_PLIS',
  'SOLID_SURFACE',
  'PANNEAU_SPECIAL',
  'PANNEAU_CONSTRUCTION',
  'PANNEAU_ISOLANT',
  'CIMENT_BOIS',
  'LATTE',
  'PANNEAU_ALVEOLAIRE',
  'ALVEOLAIRE',
  'PVC',
  'SANITAIRE',
  'PORTE',
  'COLLE',
];

const STOCK_STATUSES = ['EN_STOCK', 'SUR_COMMANDE', 'RUPTURE'];

interface Panel {
  id: string;
  reference: string;
  name: string;
  description?: string;
  productType?: string;
  thickness: number[];
  defaultThickness?: number;
  defaultLength: number;
  defaultWidth: number;
  pricePerM2?: number;
  pricePerMl?: number;
  pricePerUnit?: number;
  imageUrl?: string;
  material?: string;
  finish?: string;
  colorCode?: string;
  colorChoice?: string;
  decor?: string;
  manufacturerRef?: string;
  stockStatus?: string;
  isActive: boolean;
  reviewStatus: 'NON_VERIFIE' | 'VERIFIE' | 'A_CORRIGER';
  catalogue?: { id: string; name: string; slug: string };
  category?: {
    id: string;
    name: string;
    slug: string;
    parent?: { id: string; name: string; slug: string };
  };
}

interface Category {
  id: string;
  name: string;
  catalogueId: string;
  parent?: { name: string };
}

interface PanelReviewCardProps {
  panel: Panel;
  categories: Category[];
  onUpdate: (field: string, value: unknown) => Promise<void>;
  isSaving: boolean;
}

export function PanelReviewCard({ panel, categories, onUpdate, isSaving }: PanelReviewCardProps) {
  const [newThickness, setNewThickness] = useState('');
  const [imageError, setImageError] = useState(false);

  const handleThicknessAdd = () => {
    const value = parseFloat(newThickness);
    if (!isNaN(value) && value > 0 && !panel.thickness.includes(value)) {
      const newThicknesses = [...panel.thickness, value].sort((a, b) => a - b);
      onUpdate('thickness', newThicknesses);
      setNewThickness('');
    }
  };

  const handleThicknessRemove = (value: number) => {
    const newThicknesses = panel.thickness.filter(t => t !== value);
    onUpdate('thickness', newThicknesses);
  };

  const reviewStatusLabel = {
    NON_VERIFIE: 'NON VÉRIFIÉ',
    VERIFIE: 'VÉRIFIÉ',
    A_CORRIGER: 'À CORRIGER',
  };

  const reviewStatusBadge = {
    NON_VERIFIE: 'bg-gray-600 text-gray-200',
    VERIFIE: 'bg-green-600 text-green-100',
    A_CORRIGER: 'bg-amber-600 text-amber-100',
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
      {/* Image Section - Fixed height */}
      <div className="relative h-72 bg-[#111] flex items-center justify-center">
        {panel.imageUrl && !imageError ? (
          <Image
            src={getImageUrl(panel.imageUrl) || ''}
            alt={panel.name}
            fill
            className="object-contain p-4"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center text-gray-500">
            <ImageIcon size={64} strokeWidth={1} />
            <span className="text-sm mt-3">Pas d&apos;image</span>
          </div>
        )}

        {/* Status badges - Top left */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className={`px-3 py-1.5 rounded-md text-xs font-bold ${reviewStatusBadge[panel.reviewStatus]}`}>
            {reviewStatusLabel[panel.reviewStatus]}
          </span>
          {panel.catalogue && (
            <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-blue-600 text-blue-100">
              {panel.catalogue.name}
            </span>
          )}
        </div>

        {/* Saving indicator - Top right */}
        {isSaving && (
          <div className="absolute top-4 right-4 bg-amber-500/20 rounded-full p-2">
            <Loader2 size={20} className="animate-spin text-amber-500" />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-6 space-y-5">
        {/* Reference & Manufacturer */}
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Réf: </span>
            <span className="font-mono text-white font-medium">{panel.reference}</span>
          </div>
          {panel.manufacturerRef && (
            <div>
              <span className="text-gray-500">Fab: </span>
              <span className="font-mono text-white font-medium">{panel.manufacturerRef}</span>
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block font-medium">Nom</label>
          <Input
            value={panel.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            className="bg-[#222] border-[#444] text-white h-11"
          />
        </div>

        {/* Product Type & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Type de produit</label>
            <select
              value={panel.productType || ''}
              onChange={(e) => onUpdate('productType', e.target.value || null)}
              className="w-full h-11 px-3 rounded-lg bg-[#222] border border-[#444] text-white text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">Non défini</option>
              {PRODUCT_TYPES.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Catégorie</label>
            <select
              value={panel.category?.id || ''}
              onChange={(e) => onUpdate('categoryId', e.target.value || null)}
              className="w-full h-11 px-3 rounded-lg bg-[#222] border border-[#444] text-white text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">Non défini</option>
              {categories
                .filter(c => c.catalogueId === panel.catalogue?.id)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent ? `${cat.parent.name} → ${cat.name}` : cat.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Longueur (mm)</label>
            <Input
              type="number"
              value={panel.defaultLength}
              onChange={(e) => onUpdate('defaultLength', parseInt(e.target.value) || 0)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Largeur (mm)</label>
            <Input
              type="number"
              value={panel.defaultWidth}
              onChange={(e) => onUpdate('defaultWidth', parseInt(e.target.value) || 0)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Épaisseur défaut</label>
            <Input
              type="number"
              step="0.1"
              value={panel.defaultThickness || ''}
              onChange={(e) => onUpdate('defaultThickness', parseFloat(e.target.value) || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
        </div>

        {/* Thicknesses */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block font-medium">Épaisseurs disponibles (mm)</label>
          <div className="flex flex-wrap gap-2 items-center">
            {panel.thickness.map(t => (
              <button
                key={t}
                onClick={() => handleThicknessRemove(t)}
                className="px-3 py-1.5 bg-[#333] rounded-lg text-sm text-white hover:bg-red-600/30 hover:text-red-400 transition-colors group flex items-center gap-1.5"
              >
                {t}
                <X size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                placeholder="+"
                value={newThickness}
                onChange={(e) => setNewThickness(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleThicknessAdd()}
                className="w-16 h-9 text-sm bg-[#222] border-[#444] text-white text-center"
              />
              <Button size="sm" variant="ghost" onClick={handleThicknessAdd} className="h-9 w-9 p-0 text-gray-400 hover:text-white">
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Prix/m²</label>
            <Input
              type="number"
              step="0.01"
              value={panel.pricePerM2 || ''}
              onChange={(e) => onUpdate('pricePerM2', parseFloat(e.target.value) || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Prix/ml</label>
            <Input
              type="number"
              step="0.01"
              value={panel.pricePerMl || ''}
              onChange={(e) => onUpdate('pricePerMl', parseFloat(e.target.value) || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Prix/unité</label>
            <Input
              type="number"
              step="0.01"
              value={panel.pricePerUnit || ''}
              onChange={(e) => onUpdate('pricePerUnit', parseFloat(e.target.value) || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
        </div>

        {/* Material, Finish, Stock */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Matériau</label>
            <Input
              value={panel.material || ''}
              onChange={(e) => onUpdate('material', e.target.value || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Finition</label>
            <Input
              value={panel.finish || ''}
              onChange={(e) => onUpdate('finish', e.target.value || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Stock</label>
            <select
              value={panel.stockStatus || ''}
              onChange={(e) => onUpdate('stockStatus', e.target.value || null)}
              className="w-full h-11 px-3 rounded-lg bg-[#222] border border-[#444] text-white text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">Non défini</option>
              {STOCK_STATUSES.map(status => (
                <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Color info */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Code couleur</label>
            <Input
              value={panel.colorCode || ''}
              onChange={(e) => onUpdate('colorCode', e.target.value || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Choix couleur</label>
            <Input
              value={panel.colorChoice || ''}
              onChange={(e) => onUpdate('colorChoice', e.target.value || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Décor</label>
            <Input
              value={panel.decor || ''}
              onChange={(e) => onUpdate('decor', e.target.value || null)}
              className="bg-[#222] border-[#444] text-white h-11"
            />
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block font-medium">URL Image</label>
          <Input
            value={panel.imageUrl || ''}
            onChange={(e) => {
              setImageError(false);
              onUpdate('imageUrl', e.target.value || null);
            }}
            placeholder="https://..."
            className="bg-[#222] border-[#444] text-white h-11 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
