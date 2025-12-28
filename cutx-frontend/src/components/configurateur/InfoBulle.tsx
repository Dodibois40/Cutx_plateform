'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoBulleProps {
  titre: string;
  contenu: string;
}

export default function InfoBulle({ titre, contenu }: InfoBulleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position du popup
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 320;
      let leftPos = rect.left + rect.width / 2 + window.scrollX;

      // Éviter le débordement à gauche
      if (leftPos - popupWidth / 2 < 10) {
        leftPos = popupWidth / 2 + 10;
      }
      // Éviter le débordement à droite
      if (leftPos + popupWidth / 2 > window.innerWidth - 10) {
        leftPos = window.innerWidth - popupWidth / 2 - 10;
      }

      setPosition({
        top: rect.bottom + 8 + window.scrollY,
        left: leftPos,
      });
    }
  }, [isOpen]);

  const handleMouseEnter = useCallback(() => {
    // Petit délai avant l'ouverture pour éviter les ouvertures intempestives
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  }, []);

  const popup = isOpen && mounted ? createPortal(
    <div
      ref={popupRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        width: 320,
        background: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-olive-border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '0.625rem 0.875rem',
        borderBottom: '1px solid var(--admin-border-subtle)',
        background: 'var(--admin-bg-elevated)',
        borderRadius: '10px 10px 0 0',
      }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--admin-olive)' }}>{titre}</span>
      </div>
      {/* Content */}
      <div style={{
        padding: '0.75rem 0.875rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        maxHeight: 280,
        overflowY: 'auto',
      }}>
        {contenu.split('\n').filter(p => p.trim()).map((paragraph, i) => (
          <span key={i} style={{
            display: 'block',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: 'var(--admin-text-secondary)',
          }}>
            {paragraph}
          </span>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <span
      ref={triggerRef}
      className="infobulle-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="infobulle-trigger">
        <Info size={10} />
      </span>

      {popup}

      <style jsx>{`
        .infobulle-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-left: 2px;
          cursor: default;
        }

        .infobulle-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 13px;
          height: 13px;
          padding: 0;
          color: var(--admin-text-muted);
          transition: all 0.2s;
          border-radius: 50%;
          opacity: 0.4;
        }

        .infobulle-container:hover .infobulle-trigger {
          color: var(--admin-olive);
          opacity: 1;
        }
      `}</style>
    </span>
  );
}

// === CONTENUS DÉTAILLÉS DES INFOBULLES ===
export const INFOBULLES_CONTENU = {
  etat: {
    titre: 'État de la ligne',
    contenu: `Cet indicateur vous montre l'avancement de votre saisie :

○ Vide - Vous n'avez pas encore commencé à remplir cette ligne.

◐ En cours - Certains champs sont renseignés mais il manque des informations.

● Complète - Tous les champs obligatoires sont renseignés, la ligne est prête.

⚠ Erreur - Il y a un problème à corriger (valeur invalide, champ manquant...).`,
  },
  reference: {
    titre: 'Référence de la pièce',
    contenu: `Donnez un nom ou un code à cette pièce pour l'identifier facilement.

Exemples : "FT1 - Façade tiroir", "Porte cuisine", "Panneau salon"...

Cette référence apparaîtra sur votre devis et bon de commande.`,
  },
  materiau: {
    titre: 'Type de matériau',
    contenu: `Sélectionnez le type de support que vous nous envoyez :

• MDF - Panneau de fibres, parfait pour la laque

• Panneau plaqué bois - Support recouvert d'un placage naturel

• Bois massif - Pièces en chêne, noyer, hêtre, etc.

• Mélaminé - Panneau avec revêtement mélaminé`,
  },
  finition: {
    titre: 'Type de finition',
    contenu: `Choisissez entre deux types de finition :

LAQUE - Peinture opaque qui recouvre entièrement le support. Vous devez nous indiquer un code couleur RAL ou référence fabricant.

VERNIS - Finition transparente ou teintée qui laisse visible le veinage du bois. Idéal pour mettre en valeur les essences nobles.`,
  },
  teinte: {
    titre: 'Teinte / Code couleur',
    contenu: `Si vous avez choisi VERNIS :
Indiquez la teinte souhaitée (Chêne naturel, Noyer foncé, Wengé...). Un supplément de 10€/m² s'applique pour les teintes personnalisées.

Si vous avez choisi LAQUE :
Saisissez le code couleur RAL (ex: RAL 9010) ou la référence fabricant (NCS, Pantone...).`,
  },
  brillance: {
    titre: 'Niveau de brillance',
    contenu: `Choisissez l'aspect de brillance souhaité :

• Soft Touch - Ultra-mat velouté au toucher (premium)

• 0 Gloss Naturel - Mat absolu naturel (vernis uniquement)

• 10 Gloss Mat - Mat avec léger satiné

• 30 Gloss Satiné - Satiné équilibré, reflets doux

• 75 Gloss Brillant - Brillant prononcé

• 90 Gloss Poli Miroir - Ultra-brillant effet miroir (premium)

Le tarif varie selon le niveau choisi.`,
  },
  dimensions: {
    titre: 'Dimensions de la pièce',
    contenu: `Saisissez les dimensions de votre pièce en millimètres :

• Longueur - La plus grande dimension

• Largeur - La dimension perpendiculaire

• Épaisseur - L'épaisseur du panneau (19mm par défaut)

Important : La surface minimum facturée est de 0.25 m² par face. Les petites pièces sont facturées à ce minimum.`,
  },
  faces: {
    titre: 'Nombre de faces',
    contenu: `Combien de faces doivent être traitées ?

1 FACE - Seule la face visible sera laquée/vernie. Choisissez cette option si l'arrière est contre un mur ou caché.

2 FACES - Les deux côtés seront traités. Nécessaire pour les portes, cloisons, ou éléments visibles des deux côtés.

Le prix est doublé si vous choisissez 2 faces.`,
  },
  chants: {
    titre: 'Chants à traiter',
    contenu: `Sélectionnez les bords (chants) à traiter :

• A et C - Les deux côtés sur la longueur

• B et D - Les deux côtés sur la largeur

Par défaut, les 4 chants sont sélectionnés. Décochez ceux qui ne sont pas visibles (contre un mur par exemple).

Tarif : 8€ par mètre linéaire.`,
  },
  usinages: {
    titre: 'Usinages spéciaux',
    contenu: `Options de façonnage supplémentaires :

• Usinage passe-main - Rainure pour ouvrir sans poignée (20€/mL)

• Rainure visible - Rainure décorative (10€/mL)

• Moulure - Profil mouluré décoratif (20€/mL)

Cliquez sur l'icône pour configurer les usinages et indiquer les quantités en mètres linéaires.`,
  },
  percage: {
    titre: 'Perçage',
    contenu: `Option de perçage pour vos panneaux.

AVEC PERÇAGE :
Nous réalisons les perçages nécessaires sur vos panneaux selon vos spécifications.
Forfait : 2€ par pièce.

Le perçage est réalisé avant la finition pour un rendu propre et professionnel.`,
  },
  prix: {
    titre: 'Tarif HT',
    contenu: `Le prix hors taxes est calculé automatiquement en fonction de :

• La surface traitée (minimum 0.25 m² par face)

• Le type de finition (laque ou vernis)

• Le niveau de brillance choisi

• Le nombre de faces (1 ou 2)

• Les chants sélectionnés (8€/mL)

• Les usinages éventuels

• Le ponçage si coché (6€/m²)`,
  },
  actions: {
    titre: 'Actions',
    contenu: `Dupliquer - Crée une copie identique de cette ligne. Pratique pour des pièces similaires avec les mêmes caractéristiques.

Supprimer - Retire cette ligne du devis. Attention, cette action est définitive.`,
  },
} as const;
