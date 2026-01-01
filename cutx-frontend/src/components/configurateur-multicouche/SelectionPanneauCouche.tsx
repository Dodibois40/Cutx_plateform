'use client';

/**
 * Bouton de sélection de panneau pour une couche
 * Ouvre le popup de sélection existant
 * Avec présélection des filtres selon le type de couche :
 * - Âme : Panneau basique + technique
 * - Contrebalancement : recherche "contrebalancement"
 * - Parement / Autre : tout afficher
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Package } from 'lucide-react';
import type { CoucheMulticouche, TypeCouche } from '@/lib/configurateur-multicouche/types';
import type { ProduitCatalogue } from '@/lib/catalogues';
import PopupSelectionPanneau from '@/components/configurateur/PopupSelectionPanneau';

// Mapping type de couche → filtres initiaux
// Note: Les catégories doivent correspondre aux catégories parentes en base
// Structure actuelle (après mise à jour catalogue B comme Bois):
// - "Panneaux Basiques & Techniques" → Agglomérés, MDF, Contreplaqués, OSB, Lattés
// - "Stratifiés - Mélaminés - Compacts - Chants" → Unis, Bois, Fantaisies, Mélaminés, Chants
// - "Panneaux Déco" → Panneaux décoratifs
function getInitialFiltersForType(type: TypeCouche): { search: string; categories: string[] } {
  switch (type) {
    case 'ame':
      // Panneaux techniques pour l'âme (MDF, Agglo, CP, etc.)
      return { search: '', categories: ['Panneaux Basiques & Techniques'] };
    case 'contrebalancement':
      // Recherche par mot-clé pour trouver les panneaux de contrebalancement
      return { search: 'contrebalancement', categories: ['Panneaux Basiques & Techniques'] };
    case 'parement':
      // Panneaux décoratifs pour le parement
      return { search: '', categories: ['Stratifiés - Mélaminés - Compacts - Chants'] };
    case 'autre':
    default:
      // Pas de filtre par défaut
      return { search: '', categories: [] };
  }
}

interface SelectionPanneauCoucheProps {
  couche: CoucheMulticouche;
  onSelect: (produit: ProduitCatalogue) => void;
  onClear: () => void;
}

export default function SelectionPanneauCouche({
  couche,
  onSelect,
  onClear,
}: SelectionPanneauCoucheProps) {
  const t = useTranslations('dialogs.multilayer');
  const [showPopup, setShowPopup] = useState(false);

  const hasPanneau = couche.panneauId !== null;

  // Filtres initiaux selon le type de couche
  const initialFilters = useMemo(() => getInitialFiltersForType(couche.type), [couche.type]);

  const handleSelect = (produit: ProduitCatalogue) => {
    onSelect(produit);
    setShowPopup(false);
  };

  return (
    <>
      {hasPanneau ? (
        // Panneau sélectionné
        <div className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg p-2">
          {couche.panneauImageUrl && (
            <img
              src={couche.panneauImageUrl}
              alt={couche.panneauNom || ''}
              className="w-10 h-10 rounded object-cover border border-white/10"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">
              {couche.panneauNom}
            </p>
            <p className="text-xs text-white/60">
              {couche.panneauReference} • {couche.epaisseur}mm • {couche.prixPanneauM2.toFixed(2)}€/m²
            </p>
          </div>
          <button
            onClick={onClear}
            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Bouton pour sélectionner
        <button
          onClick={() => setShowPopup(true)}
          className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-amber-500/50 rounded-lg p-3 transition-all"
        >
          <div className="w-10 h-10 rounded bg-amber-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm text-white/80">{t('selectPanelButton')}</p>
            <p className="text-xs text-white/40">{t('fromCatalog')}</p>
          </div>
          <Search className="w-4 h-4 text-white/40" />
        </button>
      )}

      {/* Popup de sélection avec filtres présélectionnés */}
      <PopupSelectionPanneau
        open={showPopup}
        panneauxCatalogue={[]}
        selectedPanneauId={couche.panneauId}
        epaisseurActuelle={couche.epaisseur}
        onSelect={() => {}}
        onSelectCatalogue={handleSelect}
        onClose={() => setShowPopup(false)}
        initialSearch={initialFilters.search}
        initialSousCategories={initialFilters.categories}
      />
    </>
  );
}
