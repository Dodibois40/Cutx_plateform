'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const PRODUCT_TYPES = [
  'MELAMINE', 'STRATIFIE', 'PLACAGE', 'BANDE_DE_CHANT', 'COMPACT', 'MDF',
  'CONTREPLAQUE', 'PANNEAU_MASSIF', 'OSB', 'PARTICULE', 'PLAN_DE_TRAVAIL',
  'PANNEAU_DECORATIF', 'PANNEAU_3_PLIS', 'SOLID_SURFACE', 'PANNEAU_SPECIAL',
  'PANNEAU_CONSTRUCTION', 'PANNEAU_ISOLANT', 'CIMENT_BOIS', 'LATTE',
  'PANNEAU_ALVEOLAIRE', 'ALVEOLAIRE', 'PVC', 'SANITAIRE', 'PORTE', 'COLLE',
];

const STOCK_STATUSES = ['EN_STOCK', 'SUR_COMMANDE', 'RUPTURE'];

interface Panel {
  id: string;
  reference: string;
  name: string;
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
  stockStatus?: string;
  catalogue?: { id: string; name: string; slug: string };
  category?: { id: string; name: string; slug: string; parent?: { id: string; name: string; slug: string } };
}

interface Category {
  id: string;
  name: string;
  catalogueId: string;
  parent?: { name: string };
}

interface PanelEditFormProps {
  panel: Panel;
  categories: Category[];
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function PanelEditForm({ panel, categories, onUpdate }: PanelEditFormProps) {
  const [newThickness, setNewThickness] = useState('');

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

  const inputClass = "h-9 bg-[#1a1a1a] border-[#333] text-white text-sm focus:border-amber-500";
  const selectClass = "h-9 px-2 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-sm focus:border-amber-500 focus:outline-none w-full";
  const labelClass = "text-[11px] text-gray-500 mb-1 block uppercase tracking-wide";

  return (
    <div className="p-4 space-y-4">
      {/* Row 1: Name */}
      <div>
        <label className={labelClass}>Nom</label>
        <Input
          value={panel.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Row 2: Type + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Type</label>
          <select
            value={panel.productType || ''}
            onChange={(e) => onUpdate('productType', e.target.value || null)}
            className={selectClass}
          >
            <option value="">—</option>
            {PRODUCT_TYPES.map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Catégorie</label>
          <select
            value={panel.category?.id || ''}
            onChange={(e) => onUpdate('categoryId', e.target.value || null)}
            className={selectClass}
          >
            <option value="">—</option>
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

      {/* Row 3: Dimensions */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Longueur (mm)</label>
          <Input
            type="number"
            value={panel.defaultLength}
            onChange={(e) => onUpdate('defaultLength', parseInt(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Largeur (mm)</label>
          <Input
            type="number"
            value={panel.defaultWidth}
            onChange={(e) => onUpdate('defaultWidth', parseInt(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Ép. défaut</label>
          <Input
            type="number"
            step="0.1"
            value={panel.defaultThickness || ''}
            onChange={(e) => onUpdate('defaultThickness', parseFloat(e.target.value) || null)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 4: Thicknesses */}
      <div>
        <label className={labelClass}>Épaisseurs (mm)</label>
        <div className="flex flex-wrap gap-1.5 items-center">
          {panel.thickness.map(t => (
            <button
              key={t}
              onClick={() => handleThicknessRemove(t)}
              className="px-2 py-1 bg-[#222] rounded text-sm text-white hover:bg-red-600/30 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              {t}
              <X size={12} className="opacity-50" />
            </button>
          ))}
          <div className="flex items-center">
            <Input
              type="number"
              step="0.1"
              placeholder="+"
              value={newThickness}
              onChange={(e) => setNewThickness(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleThicknessAdd()}
              className="w-14 h-7 text-sm bg-[#1a1a1a] border-[#333] text-white text-center"
            />
            <button onClick={handleThicknessAdd} className="ml-1 p-1 text-gray-500 hover:text-white">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Row 5: Prices */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Prix/m²</label>
          <Input
            type="number"
            step="0.01"
            value={panel.pricePerM2 || ''}
            onChange={(e) => onUpdate('pricePerM2', parseFloat(e.target.value) || null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Prix/ml</label>
          <Input
            type="number"
            step="0.01"
            value={panel.pricePerMl || ''}
            onChange={(e) => onUpdate('pricePerMl', parseFloat(e.target.value) || null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Prix/unité</label>
          <Input
            type="number"
            step="0.01"
            value={panel.pricePerUnit || ''}
            onChange={(e) => onUpdate('pricePerUnit', parseFloat(e.target.value) || null)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 6: Material, Finish, Stock */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Matériau</label>
          <Input
            value={panel.material || ''}
            onChange={(e) => onUpdate('material', e.target.value || null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Finition</label>
          <Input
            value={panel.finish || ''}
            onChange={(e) => onUpdate('finish', e.target.value || null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Stock</label>
          <select
            value={panel.stockStatus || ''}
            onChange={(e) => onUpdate('stockStatus', e.target.value || null)}
            className={selectClass}
          >
            <option value="">—</option>
            {STOCK_STATUSES.map(status => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 7: Color info */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Code couleur</label>
          <Input
            value={panel.colorCode || ''}
            onChange={(e) => onUpdate('colorCode', e.target.value || null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Choix couleur</label>
          <Input
            value={panel.colorChoice || ''}
            onChange={(e) => onUpdate('colorChoice', e.target.value || null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Décor</label>
          <Input
            value={panel.decor || ''}
            onChange={(e) => onUpdate('decor', e.target.value || null)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 8: Image URL */}
      <div>
        <label className={labelClass}>URL Image</label>
        <Input
          value={panel.imageUrl || ''}
          onChange={(e) => onUpdate('imageUrl', e.target.value || null)}
          placeholder="https://..."
          className={`${inputClass} font-mono text-xs`}
        />
      </div>
    </div>
  );
}
