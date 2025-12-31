'use client';

/**
 * Étape 2 : Édition des couches du panneau multicouche
 */

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type { ModeCollage, CoucheMulticouche, TypeCouche } from '@/lib/configurateur-multicouche/types';
import type { ProduitCatalogue } from '@/lib/catalogues';
import { creerNouvelleCouche, REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';
import { LABELS_COUCHE } from '@/lib/configurateur-multicouche/types';
import SelectionPanneauCouche from './SelectionPanneauCouche';
import OptionsMulticouche from './OptionsMulticouche';

interface EditionCouchesProps {
  modeCollage: ModeCollage;
  onBack: () => void;
}

export default function EditionCouches({ modeCollage, onBack }: EditionCouchesProps) {
  // État des couches
  const [couches, setCouches] = useState<CoucheMulticouche[]>([
    creerNouvelleCouche(1, 'parement'),
    creerNouvelleCouche(2, 'ame'),
    creerNouvelleCouche(3, 'contrebalancement'),
  ]);

  // Dimensions
  const [dimensions, setDimensions] = useState({ longueur: 0, largeur: 0 });

  // Options (chants, perçage)
  const [chants, setChants] = useState({ A: false, B: false, C: false, D: false });
  const [percage, setPercage] = useState(false);

  // Couche ouverte pour édition
  const [coucheOuverte, setCoucheOuverte] = useState<string | null>(couches[0]?.id || null);

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

  // Calculer dimensions avec sur-cote
  const surcote = modeCollage === 'client' ? REGLES_MULTICOUCHE.SURCOTE_DEFAUT : 0;
  const dimensionsDecoupe = {
    longueur: dimensions.longueur + surcote * 2,
    largeur: dimensions.largeur + surcote * 2,
  };

  // Surface pour le calcul (avec sur-cote si client)
  const surfaceCalc = modeCollage === 'client'
    ? (dimensionsDecoupe.longueur * dimensionsDecoupe.largeur) / 1_000_000
    : (dimensions.longueur * dimensions.largeur) / 1_000_000;

  // Mètres linéaires de chants
  const metresLineairesChants = (() => {
    let ml = 0;
    const L = dimensions.longueur / 1000; // en mètres
    const l = dimensions.largeur / 1000;
    if (chants.A) ml += L;
    if (chants.C) ml += L;
    if (chants.B) ml += l;
    if (chants.D) ml += l;
    return ml;
  })();

  // Prix des couches
  const prixCouches = couches.reduce((sum, c) => sum + (surfaceCalc * c.prixPanneauM2), 0);

  // Prix des chants (tarif à définir - exemple 8€/ml)
  const TARIF_CHANT_ML = 8; // €/ml - À DÉFINIR
  const prixChants = modeCollage === 'fournisseur' ? metresLineairesChants * TARIF_CHANT_ML : 0;

  // Prix perçage (tarif à définir - exemple 5€)
  const TARIF_PERCAGE = 5; // € - À DÉFINIR
  const prixPercage = modeCollage === 'fournisseur' && percage ? TARIF_PERCAGE : 0;

  // Prix total
  const prixTotal = prixCouches + prixChants + prixPercage;

  // Vérifier si toutes les couches ont un panneau
  const toutesLesCouchesCompletes = couches.every((c) => c.panneauId !== null);

  return (
    <div className="space-y-6">
      {/* Header avec mode */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Changer le mode
        </button>
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          modeCollage === 'fournisseur'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {modeCollage === 'fournisseur' ? '🏭 Collage Fournisseur' : '🔧 Collage par mes soins'}
        </div>
      </div>

      {/* Sur-cote info (si client) */}
      {modeCollage === 'client' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-400 text-sm">
            <strong>Sur-cote de {REGLES_MULTICOUCHE.SURCOTE_DEFAUT}mm</strong> appliquée automatiquement
            pour permettre la recoupe après collage.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Liste des couches */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Couches du panneau
          </h3>

          {couches.map((couche) => {
            const isOpen = coucheOuverte === couche.id;
            const isComplete = couche.panneauId !== null;

            return (
              <div
                key={couche.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  isOpen
                    ? 'bg-white/5 border-amber-500/50'
                    : isComplete
                    ? 'bg-white/5 border-green-500/30'
                    : 'bg-white/[0.02] border-white/10'
                }`}
              >
                {/* Header de la couche */}
                <button
                  onClick={() => setCoucheOuverte(isOpen ? null : couche.id)}
                  className="w-full flex items-center gap-3 p-4"
                >
                  <div className="text-white/30">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    isComplete ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-500'
                  }`}>
                    {couche.ordre}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">
                      {LABELS_COUCHE[couche.type]}
                    </p>
                    {isComplete ? (
                      <p className="text-xs text-white/60">
                        {couche.panneauNom} • {couche.epaisseur}mm
                      </p>
                    ) : (
                      <p className="text-xs text-white/40">
                        Sélectionner un panneau...
                      </p>
                    )}
                  </div>
                  {couches.length > REGLES_MULTICOUCHE.COUCHES_MIN && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        supprimerCouche(couche.id);
                      }}
                      className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </button>

                {/* Contenu de la couche (si ouvert) */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                    {/* Type de couche */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Type de couche</label>
                        <select
                          value={couche.type}
                          onChange={(e) => updateCouche(couche.id, { type: e.target.value as TypeCouche })}
                          className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
                        >
                          {Object.entries(LABELS_COUCHE).map(([value, label]) => (
                            <option key={value} value={value} className="bg-[#1a1a1a]">
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sens du fil (parement uniquement) */}
                      {couche.type === 'parement' && (
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Sens du fil</label>
                          <select
                            value={couche.sensDuFil || 'longueur'}
                            onChange={(e) => updateCouche(couche.id, { sensDuFil: e.target.value as 'longueur' | 'largeur' })}
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
                          >
                            <option value="longueur" className="bg-[#1a1a1a]">↔ Longueur</option>
                            <option value="largeur" className="bg-[#1a1a1a]">↕ Largeur</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Sélection du panneau */}
                    <div>
                      <label className="block text-xs text-white/60 mb-2">Panneau du catalogue</label>
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
            <button
              onClick={ajouterCouche}
              className="w-full py-3 border border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une couche ({couches.length}/{REGLES_MULTICOUCHE.COUCHES_MAX})
            </button>
          )}
        </div>

        {/* Colonne droite : Récapitulatif */}
        <div className="space-y-4">
          {/* Dimensions */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-semibold text-white">Dimensions finales</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Longueur (mm)</label>
                <input
                  type="number"
                  value={dimensions.longueur || ''}
                  onChange={(e) => setDimensions({ ...dimensions, longueur: parseFloat(e.target.value) || 0 })}
                  placeholder="800"
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Largeur (mm)</label>
                <input
                  type="number"
                  value={dimensions.largeur || ''}
                  onChange={(e) => setDimensions({ ...dimensions, largeur: parseFloat(e.target.value) || 0 })}
                  placeholder="600"
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Dimensions de découpe (si sur-cote) */}
            {modeCollage === 'client' && dimensions.longueur > 0 && dimensions.largeur > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                <p className="text-xs text-white/60 mb-1">Dimensions découpe (+{surcote}mm)</p>
                <p className="text-sm font-semibold text-amber-400">
                  {dimensionsDecoupe.longueur} × {dimensionsDecoupe.largeur} mm
                </p>
              </div>
            )}
          </div>

          {/* Résumé */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white">Résumé</h4>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Couches</span>
              <span className="text-white font-medium">{couches.length}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Épaisseur totale</span>
              <span className="text-amber-500 font-bold">{epaisseurTotale.toFixed(1)} mm</span>
            </div>

            {surfaceCalc > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Surface</span>
                <span className="text-white font-medium">{surfaceCalc.toFixed(3)} m²</span>
              </div>
            )}

            {prixCouches > 0 && (
              <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Panneaux</span>
                  <span className="text-white">{prixCouches.toFixed(2)} €</span>
                </div>

                {prixChants > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Chants ({metresLineairesChants.toFixed(2)} ml)</span>
                    <span className="text-white">{prixChants.toFixed(2)} €</span>
                  </div>
                )}

                {prixPercage > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Perçage</span>
                    <span className="text-white">{prixPercage.toFixed(2)} €</span>
                  </div>
                )}

                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Total HT</span>
                    <span className="text-xl font-bold text-amber-500">{prixTotal.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation */}
          {!toutesLesCouchesCompletes && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                Sélectionnez un panneau pour chaque couche
              </p>
            </div>
          )}

          {/* Options (chants, perçage) */}
          {toutesLesCouchesCompletes && dimensions.longueur > 0 && (
            <OptionsMulticouche
              chants={chants}
              percage={percage}
              epaisseurTotale={epaisseurTotale}
              onChantsChange={setChants}
              onPercageChange={setPercage}
              disabled={modeCollage === 'client'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
