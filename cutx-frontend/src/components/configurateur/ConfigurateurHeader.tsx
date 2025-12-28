'use client';

import { useRef, useState } from 'react';
import { Layers, Building2, Upload, ArrowLeft, AlertTriangle, Package, ChevronDown } from 'lucide-react';
import { formaterPrix } from '@/lib/configurateur/calculs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { ProduitCatalogue } from '@/lib/catalogues';
import PopupSelectionPanneau from './PopupSelectionPanneau';

interface ConfigurateurHeaderProps {
  referenceChantier: string;
  onReferenceChange: (value: string) => void;
  onImportExcel?: (file: File) => void;
  isImporting?: boolean;
  isClientMode?: boolean;
  onBack?: () => void;
  // V3: Panneau global
  panneauGlobal?: PanneauCatalogue | null;
  panneauxCatalogue?: PanneauCatalogue[];
  onSelectPanneau?: (panneau: PanneauCatalogue | null) => void;
}

export default function ConfigurateurHeader({
  referenceChantier,
  onReferenceChange,
  onImportExcel,
  isImporting = false,
  isClientMode = false,
  onBack,
  panneauGlobal,
  panneauxCatalogue = [],
  onSelectPanneau,
}: ConfigurateurHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPanneauPopup, setShowPanneauPopup] = useState(false);

  // Calcul du prix du panneau brut
  const DIMENSIONS_PANNEAU_BRUT = { longueur: 2800, largeur: 2070 }; // mm
  const surfacePanneauM2 = (DIMENSIONS_PANNEAU_BRUT.longueur * DIMENSIONS_PANNEAU_BRUT.largeur) / 1_000_000;
  const epaisseurDefaut = panneauGlobal?.epaisseurs?.[0]?.toString() || '19';
  const prixM2 = panneauGlobal?.prixM2?.[epaisseurDefaut] || 0;
  const prixPanneauBrut = surfacePanneauM2 * prixM2;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportExcel) {
      onImportExcel(file);
    }
    // Reset input pour permettre de réimporter le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Styles inline pour garantir l'affichage
  const headerStyle: React.CSSProperties = {
    background: '#1a1a18',
    borderBottom: '1px solid #8B9A4B',
    padding: '1rem 1.5rem',
    position: 'relative',
    minHeight: '60px',
  };

  const headerContentStyle: React.CSSProperties = {
    maxWidth: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '2rem',
  };

  const headerLeftStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  const backButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.875rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#E0DFDA',
    background: 'transparent',
    border: '1px solid #2A2826',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const isReferenceEmpty = !referenceChantier.trim();

  const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    background: '#252523',
    border: '1px solid #3a3a38',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '0.875rem',
    color: '#f5f5f3',
    width: '220px',
  };

  const headerCenterStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const titleBadgeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #8B9A4B 0%, #5a5a3a 100%)',
    borderRadius: '10px',
    color: 'white',
  };

  const headerRightStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const importButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#8B9A4B',
    background: 'rgba(139, 154, 75, 0.12)',
    border: '1px solid rgba(139, 154, 75, 0.25)',
    borderRadius: '8px',
    cursor: 'pointer',
  };

  const modeBadgeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#6B6A66',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.375rem 0.75rem',
    background: '#151413',
    borderRadius: '6px',
    border: '1px solid #1E1D1B',
  };

  return (
    <header style={headerStyle}>
        <div style={headerContentStyle}>
        {/* Gauche: Bouton retour (client mode) + Référence chantier */}
        <div style={headerLeftStyle}>
          {isClientMode && onBack && (
            <button onClick={onBack} style={backButtonStyle}>
              <ArrowLeft size={18} />
              <span>Retour</span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={inputWrapperStyle}>
              <Building2 size={16} style={{ color: '#7a7a78', flexShrink: 0 }} />
              <input
                id="reference-chantier"
                type="text"
                value={referenceChantier}
                onChange={(e) => onReferenceChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Votre référence chantier"
                style={inputStyle}
              />
            </div>
            {isReferenceEmpty && (
              <span title="Veuillez renseigner une référence chantier">
                <AlertTriangle
                  size={18}
                  className="blink-icon"
                  style={{ color: '#8B9A4B' }}
                />
              </span>
            )}
          </div>

          {/* Séparateur */}
          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />

          {/* Sélection Panneau Global */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Image du panneau sélectionné */}
            {panneauGlobal && panneauGlobal.imageUrl && (
              <img
                src={panneauGlobal.imageUrl}
                alt={panneauGlobal.nom}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '2px solid #8B9A4B',
                  flexShrink: 0,
                }}
              />
            )}
            {/* Placeholder si pas d'image */}
            {panneauGlobal && !panneauGlobal.imageUrl && (
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: '#252523',
                  border: '2px dashed #3a3a38',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Package size={20} style={{ color: '#5a5a58' }} />
              </div>
            )}
            <button
              onClick={() => setShowPanneauPopup(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: panneauGlobal ? 'rgba(139, 154, 75, 0.15)' : '#252523',
                border: panneauGlobal ? '1px solid rgba(139, 154, 75, 0.5)' : '1px solid #8B9A4B',
                borderRadius: '8px',
                color: panneauGlobal ? '#F5F4F1' : '#A5A49F',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                animation: !panneauGlobal ? 'pulse-border 2s ease-in-out infinite' : 'none',
              }}
            >
              {!panneauGlobal && <Package size={16} style={{ color: '#8B9A4B' }} />}
              <span style={{ fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {panneauGlobal ? panneauGlobal.nom : 'Sélectionner panneau...'}
              </span>
              <ChevronDown size={14} style={{ color: '#7a7a78' }} />
            </button>

            {/* Détails du panneau sélectionné */}
            {panneauGlobal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#A5A49F' }}>
                <span><strong style={{ color: '#E0DFDA' }}>{DIMENSIONS_PANNEAU_BRUT.longueur}×{DIMENSIONS_PANNEAU_BRUT.largeur}</strong> mm</span>
                <span><strong style={{ color: '#E0DFDA' }}>{panneauGlobal.epaisseurs.join('/')}</strong> mm</span>
                <span style={{ color: '#8B9A4B', fontWeight: 600 }}>{formaterPrix(prixPanneauBrut)}/panneau</span>
              </div>
            )}

            {!panneauGlobal && (
              <span title="Veuillez sélectionner un panneau">
                <AlertTriangle
                  size={18}
                  className="blink-icon"
                  style={{ color: '#8B9A4B' }}
                />
              </span>
            )}

            {/* Popup de sélection */}
            <PopupSelectionPanneau
              open={showPanneauPopup}
              panneauxCatalogue={panneauxCatalogue}
              selectedPanneauId={panneauGlobal?.id || null}
              epaisseurActuelle={19}
              onSelect={() => {}}
              onSelectCatalogue={(produit: ProduitCatalogue) => {
                if (onSelectPanneau) {
                  // Le produit vient de l'API et a un id (cast pour TypeScript)
                  const produitAvecId = produit as ProduitCatalogue & { id: string };
                  // Convertir le produit catalogue en PanneauCatalogue
                  const panneau: PanneauCatalogue = {
                    id: produitAvecId.id || produit.reference,
                    nom: `${produit.nom} (${produit.reference})`,
                    categorie: 'agglo_plaque' as const, // Tous les panneaux du catalogue sont des mélaminés/stratifiés
                    essence: null,
                    epaisseurs: produit.epaisseur ? [produit.epaisseur] : [19],
                    prixM2: produit.epaisseur
                      ? { [produit.epaisseur.toString()]: produit.prixVenteM2 || produit.prixAchatM2 || 0 }
                      : { '19': produit.prixVenteM2 || produit.prixAchatM2 || 0 },
                    fournisseur: produit.marque || 'BOUNEY',
                    disponible: produit.stock === 'EN STOCK',
                    description: `${produit.marque} - ${produit.type}`,
                    ordre: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    imageUrl: produit.imageUrl,
                  };
                  onSelectPanneau(panneau);
                }
                setShowPanneauPopup(false);
              }}
              onClose={() => setShowPanneauPopup(false)}
            />
          </div>
        </div>

        {/* Centre: Titre (masqué en mode client) */}
        {!isClientMode && (
          <div style={headerCenterStyle}>
            <div style={titleBadgeStyle}>
              <Layers size={18} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F5F4F1', margin: 0 }}>
                Configurateur <span style={{ fontSize: '0.6875rem', color: '#8B9A4B', background: 'rgba(139, 154, 75, 0.12)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>V2</span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#A5A49F', margin: '0.125rem 0 0 0' }}>Saisie multi-lignes pour commandes volumineuses</p>
            </div>
          </div>
        )}

        {/* Droite: Import + Badge Mode */}
        <div style={headerRightStyle}>
          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Bouton Import Excel */}
          {onImportExcel && (
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              style={importButtonStyle}
              title="Importer une feuille de débits Excel (format Bouney)"
            >
              <Upload size={16} />
              <span>{isImporting ? 'Import...' : 'Importer Excel'}</span>
            </button>
          )}

          <div style={modeBadgeStyle}>
            <span style={{ width: '6px', height: '6px', background: '#8B9A4B', borderRadius: '50%' }}></span>
            <span>Mode tableur</span>
          </div>
        </div>
      </div>
    </header>
  );
}
