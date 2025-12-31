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
import { Search, X, Package } from 'lucide-react';
import type { CoucheMulticouche, TypeCouche } from '@/lib/configurateur-multicouche/types';
import type { ProduitCatalogue } from '@/lib/catalogues';
import PopupSelectionPanneau from '@/components/configurateur/PopupSelectionPanneau';

// Mapping type de couche → filtres initiaux
// Note: Les catégories doivent correspondre EXACTEMENT aux valeurs de l'API
function getInitialFiltersForType(type: TypeCouche): { search: string; categories: string[] } {
  switch (type) {
    case 'ame':
      // L'API retourne "Panneaux Basiques & Techniques" comme une seule catégorie
      return { search: '', categories: ['Panneaux Basiques & Techniques'] };
    case 'contrebalancement':
      return { search: 'contrebalancement', categories: [] };
    case 'parement':
    case 'autre':
    default:
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
            <p className="text-sm text-white/80">Sélectionner un panneau</p>
            <p className="text-xs text-white/40">Depuis le catalogue</p>
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
