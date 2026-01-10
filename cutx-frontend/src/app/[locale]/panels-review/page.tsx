'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from '@/i18n/routing';
import { ArrowLeft, Loader2, Check, AlertTriangle, Shuffle, ChevronLeft, ChevronRight, ImageIcon, Plus, X, Copy, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// Helper pour convertir les URLs d'images locales en URLs complètes
const getImageUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  // Si l'URL commence par /uploads/, c'est une image uploadée localement
  if (url.startsWith('/uploads/')) {
    return `${API_URL}${url}`;
  }
  return url;
};

const PRODUCT_TYPES = [
  'BANDE_DE_CHANT',
  'COMPACT',
  'CONTREPLAQUE',
  'MDF',
  'MELAMINE',
  'OSB',
  'PANNEAU_3_PLIS',
  'PANNEAU_DECORATIF',
  'PANNEAU_MASSIF',
  'PANNEAU_SPECIAL',
  'PARTICULE',
  'PLACAGE',
  'PLAN_DE_TRAVAIL',
  'SOLID_SURFACE',
  'STRATIFIE',
];

const MATERIALS = [
  'Aggloméré',
  'Bois massif',
  'Chêne',
  'Compact',
  'Contreplaqué',
  'Frêne',
  'Hêtre',
  'MDF',
  'Mélaminé',
  'Noyer',
  'OSB',
  'Panneau décoratif',
  'Particule',
  'Placage',
  'Placage Chêne',
  'Placage Frêne',
  'Placage Hêtre',
  'Placage Noyer',
  'Plan de travail',
  'PVC',
  'Solid Surface',
  'Stratifié',
];

const FINITIONS = [
  // Textures générales
  'Brillant',
  'Brut',
  'Givré',
  'Lisse',
  'Mat',
  'Satin',
  'Soft Touch',
  // Egger ST codes
  'ST2',
  'ST7',
  'ST9',
  'ST10',
  'ST12',
  'ST15',
  'ST19',
  'ST20',
  'ST22',
  'ST28',
  'ST32',
  'ST36',
  'ST37',
  'ST38',
  'ST40',
  // Autres codes
  'BST',
  'BST Topmat',
  'CST',
  'CST Soft Pearl',
  'EPM',
  'ESA',
  'Essencia',
  'Extramat',
  'Linimat',
  'MST',
  'MST Supermat',
  'NTM',
  'Pearl',
  'Selva',
  'Silk',
  'SM',
  'Touch',
  'V1A',
  'V2A',
  'V8A',
  'V9A',
  'XM',
  // Spécifiques
  'Hydrofuge',
  'Ignifugé',
  'Laqué',
  'Pré-encollé',
  'Vernis',
];

const SUPPORTS = [
  // Chants
  'ABS non encollé',
  'ABS préencollé',
  'Bois non encollé',
  'Bois préencollé',
  'Mélamine non encollé',
  'Mélamine préencollé',
  'PVC',
  // HPL / CPL
  'CPL',
  'HPL',
  'HPL contrebalancement',
  'HPL noyau gris',
  'HPL teinté masse',
  'Compact HPL âme colorée',
  // Particules
  'Particules P2 standard',
  'Particules P3 hydrofuge',
  'Particules P4',
  'Particules hydrofuge CPL',
  'Particules hydrofuge HPL',
  'Particules Superpan',
  // MDF
  'MDF standard',
  'MDF hydrofuge',
  'MDF ignifugé',
  // Autres
  'Composite aluminium',
  'Support hydrofuge',
  'Milieu humide',
];

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
  imageUrl?: string;
  material?: string;
  finish?: string;
  decor?: string;
  supportQuality?: string;
  manufacturerRef?: string;
  reviewStatus: 'NON_VERIFIE' | 'VERIFIE' | 'A_CORRIGER';
  catalogue?: { id: string; name: string; slug: string };
  category?: { id: string; name: string; slug: string; parent?: { id: string; name: string; slug: string } };
  // Nouvelle classification CutX
  productCategory?: string;  // PANNEAU ou ACCESSOIRE
  panelType?: string;
  panelSubType?: string;
  decorCode?: string;
  decorName?: string;
  decorCategory?: string;
  decorSubCategory?: string;
  manufacturer?: string;
  grainDirection?: string;
  coreType?: string;
  coreColor?: string;
  finishCode?: string;
  finishName?: string;
  isSynchronized?: boolean;
  isHydrofuge?: boolean;
  isIgnifuge?: boolean;
  isPreglued?: boolean;
  isFullRoll?: boolean;  // Vente en rouleau complet (pas au mètre)
  lamellaType?: string;  // ABOUTE ou NON_ABOUTE (pour panneaux massifs)
}

interface Enums {
  productCategories: string[];  // PANNEAU, ACCESSOIRE
  productTypes: string[];
  productSubTypes: string[];
  decorCategories: string[];
  grainDirections: string[];
  coreTypes: string[];
  coreColors: string[];
  lamellaTypes: string[];  // ABOUTE, NON_ABOUTE
}

interface Stats {
  total: number;
  nonVerifie: number;
  verifie: number;
  aCorriger: number;
  progressPercent: number;
}

// ===== AUTO-FILL INTELLIGENT =====
function autoFillClassification(panel: Panel): Partial<Panel> {
  const suggestions: Partial<Panel> = {};
  const name = panel.name?.toLowerCase() || '';
  const ref = panel.reference?.toLowerCase() || '';
  const decor = panel.decor?.toLowerCase() || '';
  const productType = panel.productType?.toUpperCase() || '';
  const supportQuality = panel.supportQuality?.toLowerCase() || '';

  // 0. Détecter CATÉGORIE PRODUIT (PANNEAU vs ACCESSOIRE)
  if (!panel.productCategory) {
    // Accessoires = produits finis non découpables
    const accessoireKeywords = ['vasque', 'évier', 'lavabo', 'cuve', 'bac', 'robinet', 'mitigeur', 'siphon', 'bonde', 'crédence prête', 'plan vasque'];
    if (accessoireKeywords.some(k => name.includes(k))) {
      suggestions.productCategory = 'ACCESSOIRE';
    } else {
      // Par défaut = panneau (matière à découper)
      suggestions.productCategory = 'PANNEAU';
    }
  }

  // 0b. Détecter SOLID SURFACE (Kerrock, Corian, Hi-Macs, Krion, etc.)
  const solidSurfaceBrands = ['kerrock', 'corian', 'hi-macs', 'himacs', 'krion', 'staron', 'avonite', 'montelli', 'hanex', 'tristone', 'silestone', 'dekton'];
  const isSolidSurface = solidSurfaceBrands.some(b => name.includes(b)) || productType === 'SOLID_SURFACE';

  // 1. Détecter le TYPE DE PANNEAU
  if (!panel.panelType) {
    // Solid surface d'abord (car peut être vasque OU plan de travail)
    if (isSolidSurface) {
      suggestions.panelType = 'SOLID_SURFACE';
    } else if (name.includes('chant') || name.includes('bande de chant') || productType === 'BANDE_DE_CHANT') {
      suggestions.panelType = 'CHANT';
    } else if (name.includes('stratifié') || name.includes('feuille de stratifié') || name.includes('hpl') || productType === 'STRATIFIE') {
      suggestions.panelType = 'STRATIFIE';
    } else if (name.includes('compact') || productType === 'COMPACT') {
      suggestions.panelType = 'COMPACT';
    } else if (name.includes('mélaminé') || name.includes('melamine') || productType === 'MELAMINE') {
      suggestions.panelType = 'MELAMINE';
    } else if (name.includes('mdf') || productType === 'MDF') {
      suggestions.panelType = 'MDF';
    } else if (name.includes('osb') || productType === 'OSB') {
      suggestions.panelType = 'OSB';
    } else if (name.includes('contreplaqué') || name.includes('multiplis') || productType === 'CONTREPLAQUE') {
      suggestions.panelType = 'CONTREPLAQUE';
    } else if (name.includes('placage') || productType === 'PLACAGE') {
      suggestions.panelType = 'PLACAGE';
    } else if (name.includes('aggloméré') || name.includes('agglo') || name.includes('particule') || productType === 'PARTICULE') {
      suggestions.panelType = 'AGGLO_BRUT';
    } else if (name.includes('massif') || name.includes('3 plis') || name.includes('3-plis') || productType.includes('MASSIF') || productType.includes('3_PLIS')) {
      suggestions.panelType = 'MASSIF';
    }
  }

  // 2. Détecter le SOUS-TYPE
  if (!panel.panelSubType) {
    const type = suggestions.panelType || panel.panelType;
    if (type === 'STRATIFIE') {
      if (name.includes('hpl') || supportQuality.includes('hpl')) suggestions.panelSubType = 'HPL';
      else if (name.includes('cpl') || supportQuality.includes('cpl')) suggestions.panelSubType = 'CPL';
    } else if (type === 'CHANT') {
      if (name.includes('abs') || supportQuality.includes('abs')) suggestions.panelSubType = 'CHANT_ABS';
      else if (name.includes('pvc') || supportQuality.includes('pvc')) suggestions.panelSubType = 'CHANT_PVC';
      else if (name.includes('mélamine') || supportQuality.includes('mélamine')) suggestions.panelSubType = 'CHANT_MELAMINE';
      else if (name.includes('bois')) suggestions.panelSubType = 'CHANT_BOIS';
    } else if (type === 'MDF') {
      if (name.includes('laqué')) suggestions.panelSubType = 'MDF_LAQUE';
      else if (name.includes('plaqué')) suggestions.panelSubType = 'MDF_PLAQUE';
      else suggestions.panelSubType = 'MDF_BRUT';
    } else if (type === 'MASSIF') {
      if (name.includes('3 plis') || name.includes('3-plis')) suggestions.panelSubType = 'MASSIF_3_PLIS';
      else if (name.includes('lamellé')) suggestions.panelSubType = 'LAMELLE_COLLE';
      else suggestions.panelSubType = 'MASSIF_BOIS';
    } else if (type === 'SOLID_SURFACE') {
      // Sous-types solid surface
      if (name.includes('silestone') || name.includes('dekton') || name.includes('quartz')) {
        suggestions.panelSubType = 'SS_QUARTZ';
      } else if (name.includes('kerrock') || name.includes('polyester')) {
        suggestions.panelSubType = 'SS_POLYESTER';
      } else {
        // Corian, Hi-Macs, Krion, Staron = acrylique
        suggestions.panelSubType = 'SS_ACRYLIQUE';
      }
    }
  }

  // 3. Extraire le CODE DÉCOR (pattern: lettres + chiffres, ex: H1180, G029, U999, H438)
  // Pour les plans de travail, la référence combine souvent decorCode + finishCode (ex: R20348NW)
  if (!panel.decorCode || !panel.finishCode) {
    // Codes finition courants pour plans de travail/stratifiés
    const worktopFinishCodes = ['NW', 'NS', 'VL', 'SM', 'XM', 'G1', 'G2', 'G3', 'VV', 'XT', 'MA', 'GL'];

    // Pattern pour références combinées type "R20348NW" ou "F2255XM"
    const combinedRefPattern = /\b([A-Z]\d{4,5})(NW|NS|VL|SM|XM|G[1-3]|VV|XT|MA|GL)\b/i;

    // Chercher d'abord les références combinées
    const sources = [panel.manufacturerRef, panel.name, panel.decor, panel.reference];
    for (const src of sources) {
      if (!src) continue;
      const combinedMatch = src.match(combinedRefPattern);
      if (combinedMatch) {
        if (!panel.decorCode) suggestions.decorCode = combinedMatch[1].toUpperCase();
        if (!panel.finishCode) suggestions.finishCode = combinedMatch[2].toUpperCase();
        break;
      }
    }

    // Si pas de référence combinée trouvée, chercher le decorCode seul
    if (!suggestions.decorCode && !panel.decorCode) {
      const decorCodePatterns = [
        /\b([A-Z]{1,2}\d{3,5})\b/i,  // H1180, G029, U999, H438 (1-2 lettres + 3-5 chiffres)
        /\b(\d{5,6})\b/,              // 542287 (code numérique long uniquement)
      ];
      // Codes finition à exclure
      const finishCodePattern = /^(ST\d+|V\d+A|BST|CST|MST|EPM|ESA|NTM|SM|XM)$/i;

      for (const src of sources) {
        if (!src) continue;
        for (const pattern of decorCodePatterns) {
          const match = src.match(pattern);
          if (match && !finishCodePattern.test(match[1])) {
            suggestions.decorCode = match[1].toUpperCase();
            break;
          }
        }
        if (suggestions.decorCode) break;
      }
    }
  }

  // 3b. Extraire le NOM DÉCOR depuis le nom du panneau
  if (!panel.decorName && panel.name) {
    // Plusieurs patterns possibles:
    // 1. "H3165 Chêne Vicenza clair ST12" → nom entre code et finition
    // 2. "H438 V9A -280x207cm - ép. 19mm Heritage Oak medium brown" → nom après dimensions
    const decorCode = suggestions.decorCode || panel.decorCode;

    // Essayer d'abord de trouver le nom après les dimensions (format Dispano)
    // Pattern: "- ép. XXmm NOM" ou "ép.XXmm NOM" ou après dimensions "XXXxXXXcm - NOM"
    const afterDimPattern = /(?:ép\.?\s*\d+(?:[,.]\d+)?mm\s+|(?:\d{2,4}\s*x\s*\d{2,4}\s*(?:mm|cm)\s*-?\s*))([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-Za-zà-ü]+)*)\s*(?:-\s*Support|$)/i;
    const afterDimMatch = panel.name.match(afterDimPattern);
    if (afterDimMatch && afterDimMatch[1]) {
      const candidateName = afterDimMatch[1].trim();
      // Vérifier que ce n'est pas un mot technique
      if (candidateName.length > 3 && !/^(Support|Particule|Standard|Mélaminé)$/i.test(candidateName)) {
        suggestions.decorName = candidateName;
      }
    }

    // Si pas trouvé et on a un code décor, chercher après le code
    if (!suggestions.decorName && decorCode) {
      // Chercher après le code décor, en sautant les codes finition (V9A, ST37)
      const afterCodeRegex = new RegExp(
        `${decorCode}\\s+(?:V\\d+A\\s+|ST\\d+\\s+)?(.+?)(?:\\s+ST\\d+|\\s+V\\d+A|\\s*-?\\s*\\d{2,4}\\s*x|\\s*-\\s*ép|$)`,
        'i'
      );
      const match = panel.name.match(afterCodeRegex);
      if (match && match[1]) {
        const decorName = match[1].trim();
        // Ne pas prendre si c'est juste des chiffres, trop court, ou un code finition
        if (decorName.length > 3 && !/^\d+$/.test(decorName) && !/^(V\d+A|ST\d+)$/i.test(decorName)) {
          suggestions.decorName = decorName;
        }
      }
    }
  }

  // 4. Détecter la CATÉGORIE DÉCOR
  if (!panel.decorCategory) {
    // Unis (couleurs) - FR + EN
    const unisKeywords = ['blanc', 'noir', 'gris', 'beige', 'crème', 'anthracite', 'taupe', 'sable', 'ivoire', 'tourterelle', 'rouge', 'bleu', 'vert', 'jaune', 'orange', 'white', 'black', 'grey', 'gray', 'cream', 'snow', 'red', 'blue', 'green', 'yellow'];
    const boisKeywords = ['chêne', 'noyer', 'hêtre', 'frêne', 'érable', 'merisier', 'pin', 'sapin', 'teck', 'wengé', 'zebrano', 'orme', 'bois', 'oak', 'walnut', 'wood'];
    const pierreKeywords = ['marbre', 'granit', 'ardoise', 'travertin', 'pierre', 'marble', 'stone', 'granite'];
    const betonKeywords = ['béton', 'concrete', 'ciment'];
    const metalKeywords = ['métal', 'acier', 'aluminium', 'cuivre', 'rouille', 'inox', 'metal', 'steel'];
    const textileKeywords = ['lin', 'cuir', 'tissu', 'textile', 'leather', 'fabric'];

    const searchText = `${name} ${decor}`.toLowerCase();

    if (boisKeywords.some(k => searchText.includes(k))) {
      suggestions.decorCategory = 'BOIS';
      // Sous-catégorie bois
      if (!panel.decorSubCategory) {
        if (searchText.includes('chêne') || searchText.includes('oak')) suggestions.decorSubCategory = 'Chêne';
        else if (searchText.includes('noyer') || searchText.includes('walnut')) suggestions.decorSubCategory = 'Noyer';
        else if (searchText.includes('hêtre')) suggestions.decorSubCategory = 'Hêtre';
        else if (searchText.includes('frêne')) suggestions.decorSubCategory = 'Frêne';
        else if (searchText.includes('érable')) suggestions.decorSubCategory = 'Érable';
        else if (searchText.includes('pin') || searchText.includes('sapin')) suggestions.decorSubCategory = 'Pin / Sapin';
      }
    } else if (pierreKeywords.some(k => searchText.includes(k))) {
      suggestions.decorCategory = 'PIERRE';
      if (!panel.decorSubCategory) {
        if (searchText.includes('marbre')) suggestions.decorSubCategory = 'Marbre';
        else if (searchText.includes('granit')) suggestions.decorSubCategory = 'Granit';
        else if (searchText.includes('ardoise')) suggestions.decorSubCategory = 'Ardoise';
      }
    } else if (betonKeywords.some(k => searchText.includes(k))) {
      suggestions.decorCategory = 'BETON';
    } else if (metalKeywords.some(k => searchText.includes(k))) {
      suggestions.decorCategory = 'METAL';
    } else if (textileKeywords.some(k => searchText.includes(k))) {
      suggestions.decorCategory = 'TEXTILE';
    } else if (unisKeywords.some(k => searchText.includes(k))) {
      suggestions.decorCategory = 'UNIS';
      // Sous-catégorie unis (FR + EN)
      if (!panel.decorSubCategory) {
        if (searchText.includes('blanc') || searchText.includes('white') || searchText.includes('snow')) suggestions.decorSubCategory = 'Blanc';
        else if (searchText.includes('noir') || searchText.includes('black')) suggestions.decorSubCategory = 'Noir';
        else if (searchText.includes('gris') || searchText.includes('tourterelle') || searchText.includes('anthracite') || searchText.includes('grey') || searchText.includes('gray')) suggestions.decorSubCategory = 'Gris';
        else if (searchText.includes('beige') || searchText.includes('sable') || searchText.includes('taupe') || searchText.includes('cream')) suggestions.decorSubCategory = 'Beige';
      }
    } else {
      // Si c'est un panneau brut sans décor
      const type = suggestions.panelType || panel.panelType;
      if (type === 'AGGLO_BRUT' || type === 'OSB' || type === 'MDF') {
        suggestions.decorCategory = 'SANS_DECOR';
      }
    }
  }

  // 5. TYPE DE SUPPORT (basé sur le type de panneau)
  if (!panel.coreType) {
    const type = suggestions.panelType || panel.panelType;
    if (type === 'STRATIFIE' || type === 'CHANT' || type === 'SOLID_SURFACE' || type === 'COMPACT') {
      suggestions.coreType = 'AUCUN';  // Ces types n'ont pas de support séparé
    } else if (type === 'MELAMINE') {
      if (supportQuality.includes('p3') || supportQuality.includes('hydrofuge') || name.includes('hydrofuge')) {
        suggestions.coreType = 'P3';
      } else {
        suggestions.coreType = 'P2';
      }
    } else if (type === 'MDF') {
      if (supportQuality.includes('hydrofuge') || name.includes('hydrofuge')) {
        suggestions.coreType = 'MDF_H';
      } else if (supportQuality.includes('ignifugé') || name.includes('ignifugé')) {
        suggestions.coreType = 'MDF_FR';
      } else {
        suggestions.coreType = 'MDF_STD';
      }
    } else if (type === 'CONTREPLAQUE') {
      suggestions.coreType = 'CONTREPLAQUE';
    }
  }

  // 6. SENS DU FIL (basé sur la catégorie décor et le type)
  if (!panel.grainDirection) {
    const type = suggestions.panelType || panel.panelType;
    const decorCat = suggestions.decorCategory || panel.decorCategory;
    // Solid surface et compact sont homogènes → pas de fil
    if (type === 'SOLID_SURFACE' || type === 'COMPACT') {
      suggestions.grainDirection = 'NONE';
    } else if (decorCat === 'BOIS') {
      suggestions.grainDirection = 'LENGTH'; // Par défaut fil en longueur
    } else if (decorCat === 'UNIS' || decorCat === 'SANS_DECOR') {
      suggestions.grainDirection = 'NONE';
    }
  }

  // 7. FABRICANT (depuis manufacturerRef ou name - PAS le catalogue qui est le revendeur)
  if (!panel.manufacturer) {
    // Important: ne PAS utiliser le nom du catalogue comme fabricant
    // Le catalogue (ex: "Chez Booney", "Dispano") est le revendeur, pas le fabricant
    const manuRef = panel.manufacturerRef?.toLowerCase() || '';

    // Panneaux classiques - chercher dans name et manufacturerRef uniquement
    if (name.includes('egger') || manuRef.includes('egger')) suggestions.manufacturer = 'Egger';
    else if (name.includes('kronospan') || manuRef.includes('kronospan')) suggestions.manufacturer = 'Kronospan';
    else if (name.includes('finsa') || manuRef.includes('finsa')) suggestions.manufacturer = 'Finsa';
    else if (name.includes('polyrey') || manuRef.includes('polyrey')) suggestions.manufacturer = 'Polyrey';
    else if (name.includes('unilin') || manuRef.includes('unilin')) suggestions.manufacturer = 'Unilin';
    else if (name.includes('pfleiderer') || manuRef.includes('pfleiderer')) suggestions.manufacturer = 'Pfleiderer';
    else if (name.includes('kaindl') || manuRef.includes('kaindl')) suggestions.manufacturer = 'Kaindl';
    else if (name.includes('swiss krono') || manuRef.includes('swiss krono')) suggestions.manufacturer = 'Swiss Krono';
    else if (name.includes('sonae') || manuRef.includes('sonae')) suggestions.manufacturer = 'Sonae Arauco';
    // Solid Surface
    else if (name.includes('kerrock')) suggestions.manufacturer = 'Kerrock';
    else if (name.includes('corian')) suggestions.manufacturer = 'DuPont Corian';
    else if (name.includes('hi-macs') || name.includes('himacs')) suggestions.manufacturer = 'LG Hi-Macs';
    else if (name.includes('krion')) suggestions.manufacturer = 'Porcelanosa Krion';
    else if (name.includes('staron')) suggestions.manufacturer = 'Samsung Staron';
    else if (name.includes('silestone')) suggestions.manufacturer = 'Cosentino Silestone';
    else if (name.includes('dekton')) suggestions.manufacturer = 'Cosentino Dekton';
  }

  // 8. CODE FINITION (extraire ST codes, V codes ou autres depuis finish OU name)
  if (!panel.finishCode) {
    // Chercher d'abord dans finish, puis dans name, puis dans manufacturerRef
    const textToSearch = `${panel.finish || ''} ${panel.name || ''} ${panel.manufacturerRef || ''}`;

    // Patterns pour codes finition courants
    const finishPatterns = [
      /\b(ST\d+)\b/i,       // Egger: ST2, ST9, ST12, ST19, ST37, etc.
      /\b(V\d+A)\b/i,       // V1A, V2A, V8A, V9A
      /\b(BST|CST|MST)\b/i, // Autres codes
      /\b(EPM|ESA|NTM|SM|XM)\b/i, // Codes spéciaux
    ];

    for (const pattern of finishPatterns) {
      const match = textToSearch.match(pattern);
      if (match) {
        suggestions.finishCode = match[1].toUpperCase();
        break;
      }
    }
  }

  // 9. ATTRIBUTS TECHNIQUES
  // HPI = Hydrofuge Perméable à la vapeur d'eau Intérieure
  // P3 = Panneau de particules hydrofuge
  if (!panel.isHydrofuge && (
    supportQuality.includes('hydrofuge') || name.includes('hydrofuge') ||
    supportQuality.includes('p3') || name.includes(' p3 ') || name.includes(' p3,') ||
    supportQuality.includes('hpi') || name.includes(' hpi') || name.includes('/hpi')
  )) {
    suggestions.isHydrofuge = true;
  }
  if (!panel.isIgnifuge && (supportQuality.includes('ignifugé') || name.includes('ignifugé') || supportQuality.includes('m1') || name.includes(' m1 '))) {
    suggestions.isIgnifuge = true;
  }
  if (!panel.isPreglued && (supportQuality.includes('préencollé') || supportQuality.includes('pré-encollé') || name.includes('préencollé'))) {
    suggestions.isPreglued = true;
  }
  // Vérifier isSynchronized avec le finishCode existant OU suggéré
  if (!panel.isSynchronized) {
    const finishToCheck = panel.finishCode || suggestions.finishCode;
    if (finishToCheck) {
      const syncFinishes = ['ST19', 'ST28', 'ST37', 'ST38'];
      if (syncFinishes.includes(finishToCheck.toUpperCase())) {
        suggestions.isSynchronized = true;
      }
    }
  }

  // 9b. VENTE EN ROULEAU COMPLET (pour chants)
  if (!panel.isFullRoll && (name.includes('rouleau complet') || name.includes('rouleau de'))) {
    suggestions.isFullRoll = true;
  }

  // 10. TYPE DE LAMELLES (pour panneaux massifs / lamellé-collé)
  if (!panel.lamellaType) {
    const type = suggestions.panelType || panel.panelType;
    // Applicable uniquement aux panneaux massifs
    if (type === 'MASSIF' || name.includes('lamellé') || name.includes('lamelle')) {
      if (name.includes('non abouté') || name.includes('non-abouté') || name.includes('non aboute')) {
        suggestions.lamellaType = 'NON_ABOUTE';
      } else if (name.includes('abouté') || name.includes('aboute') || name.includes('finger')) {
        suggestions.lamellaType = 'ABOUTE';
      }
    }
  }

  return suggestions;
}

function PanelsReviewContent() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [panel, setPanel] = useState<Panel | null>(null);
  const [history, setHistory] = useState<Panel[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; catalogueId: string; parent?: { name: string }; catalogue?: { id: string; name: string } }>>([]);
  const [enums, setEnums] = useState<Enums | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [newThickness, setNewThickness] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!panel || !e.target.files?.length) return;
    const file = e.target.files[0];
    try {
      setIsUploading(true);
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_URL}/api/panels-review/${panel.id}/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPanel(updated);
      setImageError(false);
      setHistory(prev => prev.map((p, i) => i === historyIndex ? updated : p));
    } catch { /* ignore */ } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchRandom = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setImageError(false);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/random?status=NON_VERIFIE`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 403) { setError('admin'); return; }
        throw new Error('Erreur');
      }
      const data = await res.json();
      setStats(data.stats);
      if (data.panel) {
        setPanel(data.panel);
        setHistory(prev => [...prev, data.panel]);
        setHistoryIndex(prev => prev + 1);
      } else {
        setPanel(null);
      }
    } catch {
      setError('error');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const fetchCategories = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCategories(await res.json());
    } catch { /* ignore */ }
  }, [getToken]);

  const fetchEnums = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/enums`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setEnums(await res.json());
    } catch { /* ignore */ }
  }, [getToken]);

  useEffect(() => {
    fetchRandom();
    fetchCategories();
    fetchEnums();
  }, [fetchRandom, fetchCategories, fetchEnums]);

  const update = async (field: string, value: unknown) => {
    if (!panel) return;
    try {
      setIsSaving(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/${panel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPanel(updated);
      if (field === 'imageUrl') setImageError(false);
      setHistory(prev => prev.map((p, i) => i === historyIndex ? updated : p));
    } catch { /* ignore */ } finally {
      setIsSaving(false);
    }
  };

  const verify = async () => {
    if (!panel) return;
    try {
      setIsSaving(true);
      setImageError(false);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/${panel.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data.stats);
      if (data.nextPanel) {
        setPanel(data.nextPanel);
        setHistory(prev => [...prev, data.nextPanel]);
        setHistoryIndex(prev => prev + 1);
      } else {
        setPanel(null);
      }
    } catch { /* ignore */ } finally {
      setIsSaving(false);
    }
  };

  const markCorrection = async () => {
    if (!panel) return;
    try {
      setIsSaving(true);
      setImageError(false);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/${panel.id}/mark-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.nextPanel) {
        setPanel(data.nextPanel);
        setHistory(prev => [...prev, data.nextPanel]);
        setHistoryIndex(prev => prev + 1);
      } else {
        fetchRandom();
      }
    } catch { /* ignore */ } finally {
      setIsSaving(false);
    }
  };

  const goPrev = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPanel(history[historyIndex - 1]);
      setImageError(false);
    }
  };

  const goNext = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPanel(history[historyIndex + 1]);
      setImageError(false);
    } else {
      fetchRandom();
    }
  };

  const addThickness = () => {
    const v = parseFloat(newThickness);
    if (!isNaN(v) && v > 0 && panel && !panel.thickness.includes(v)) {
      update('thickness', [...panel.thickness, v].sort((a, b) => a - b));
      setNewThickness('');
    }
  };

  const removeThickness = (v: number) => {
    if (panel) update('thickness', panel.thickness.filter(t => t !== v));
  };

  // Auto-remplir les champs de classification
  const applyAutoFill = async () => {
    if (!panel) return;
    const suggestions = autoFillClassification(panel);
    if (Object.keys(suggestions).length === 0) return;

    try {
      setIsSaving(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/panels-review/${panel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(suggestions),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPanel(updated);
      setHistory(prev => prev.map((p, i) => i === historyIndex ? updated : p));
    } catch { /* ignore */ } finally {
      setIsSaving(false);
    }
  };

  // Compter les suggestions disponibles
  const getSuggestionsCount = () => {
    if (!panel) return 0;
    return Object.keys(autoFillClassification(panel)).length;
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Enter' && !e.shiftKey) verify();
      if (e.key === 'r' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fetchRandom(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [historyIndex, history, panel]);

  if (error === 'admin') {
    return (
      <div className="h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <p className="text-white text-xl">Accès réservé aux administrateurs</p>
          <Button onClick={() => router.push('/')} className="mt-6" size="lg">Retour</Button>
        </div>
      </div>
    );
  }

  const statusColor = { NON_VERIFIE: 'bg-gray-600', VERIFIE: 'bg-green-600', A_CORRIGER: 'bg-amber-600' };
  const statusLabel = { NON_VERIFIE: 'NON VÉRIFIÉ', VERIFIE: 'VÉRIFIÉ', A_CORRIGER: 'À CORRIGER' };

  return (
    <div className="h-screen bg-[#080808] flex items-center justify-center p-8">
      {isLoading ? (
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      ) : !panel ? (
        <div className="text-center">
          <Check className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <p className="text-white text-2xl">Tous vérifiés !</p>
          <Button onClick={fetchRandom} className="mt-6" size="lg" variant="outline">
            <Shuffle size={20} className="mr-2" />Voir un aléatoire
          </Button>
        </div>
      ) : (
        /* GRANDE CARTE CARRÉE */
        <div className="bg-[#111] rounded-2xl border-2 border-[#333] w-[1200px] h-[700px] flex flex-col shadow-2xl">

          {/* Header minimaliste dans la carte */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#222]">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-white"><ArrowLeft size={24} /></Link>
              <span className="text-white text-lg font-medium">Review</span>
              {stats && (
                <div className="flex items-center gap-4 text-sm text-gray-400 ml-4">
                  <span>⏱ {stats.nonVerifie}</span>
                  <span className="text-green-500">✓ {stats.verifie}</span>
                  <span className="text-amber-500">⚠ {stats.aCorriger}</span>
                  <div className="w-32 h-2 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${stats.progressPercent}%` }} />
                  </div>
                  <span>{stats.progressPercent}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goPrev} disabled={historyIndex <= 0} className="h-9 px-3 text-gray-400"><ChevronLeft size={20} /></Button>
              <Button variant="ghost" size="sm" onClick={fetchRandom} className="h-9 px-3 text-gray-400"><Shuffle size={18} /></Button>
              <Button variant="ghost" size="sm" onClick={goNext} className="h-9 px-3 text-gray-400"><ChevronRight size={20} /></Button>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 flex min-h-0">
            {/* GAUCHE: Image grande */}
            <div className="w-[450px] flex-shrink-0 relative bg-[#0a0a0a] flex items-center justify-center border-r border-[#222]">
              {panel.imageUrl && !imageError ? (
                <a href={getImageUrl(panel.imageUrl) || '#'} target="_blank" rel="noopener noreferrer" className="absolute inset-4">
                  <Image src={getImageUrl(panel.imageUrl) || ''} alt="" fill className="object-contain cursor-pointer hover:opacity-90" onError={() => setImageError(true)} unoptimized />
                </a>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <ImageIcon size={80} className="text-gray-700" strokeWidth={0.8} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#222] hover:bg-[#333] text-gray-300 rounded-lg transition-colors"
                  >
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {isUploading ? 'Upload...' : 'Uploader une image'}
                  </button>
                </div>
              )}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className={`px-3 py-1 rounded text-sm font-bold text-white ${statusColor[panel.reviewStatus]}`}>
                  {statusLabel[panel.reviewStatus]}
                </span>
                {panel.catalogue && (
                  <span className="px-3 py-1 rounded text-sm font-bold bg-blue-600 text-white">{panel.catalogue.name}</span>
                )}
              </div>
              {/* Bouton upload en haut à droite (quand il y a déjà une image) */}
              {panel.imageUrl && !imageError && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute top-4 right-4 p-2 bg-[#222] hover:bg-[#333] rounded-lg transition-colors"
                  title="Changer l'image"
                >
                  {isUploading ? <Loader2 size={20} className="animate-spin text-amber-500" /> : <Upload size={20} className="text-gray-400" />}
                </button>
              )}
              {isSaving && !isUploading && <Loader2 size={24} className="absolute top-4 right-14 animate-spin text-amber-500" />}
              {/* Input file caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* DROITE: Formulaire */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Refs avec copie */}
              <div className="flex items-center gap-6 text-base mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Réf:</span>
                  <span className="font-mono text-white text-lg">{panel.reference}</span>
                  <button onClick={() => navigator.clipboard.writeText(panel.reference)} className="p-1 text-gray-600 hover:text-white"><Copy size={16} /></button>
                </div>
                {panel.manufacturerRef && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Fab:</span>
                    <span className="font-mono text-white text-lg">{panel.manufacturerRef}</span>
                    <button onClick={() => navigator.clipboard.writeText(panel.manufacturerRef!)} className="p-1 text-gray-600 hover:text-white"><Copy size={16} /></button>
                  </div>
                )}
              </div>

              {/* Nom */}
              <Input value={panel.name} onChange={e => update('name', e.target.value)} className="h-12 bg-[#1a1a1a] border-[#333] text-white text-lg mb-4" />

              {/* Type + Catégorie */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <select value={panel.productType || ''} onChange={e => update('productType', e.target.value || null)} className="h-12 px-4 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-base">
                  <option value="">Type de produit...</option>
                  {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={panel.category?.id || ''} onChange={e => update('categoryId', e.target.value || null)} className="h-12 px-4 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-base">
                  <option value="">Catégorie...</option>
                  {/* Group categories by catalogue, sorted alphabetically */}
                  {Array.from(new Set(categories.map(c => c.catalogueId)))
                    .map(catId => ({ catId, name: categories.find(c => c.catalogueId === catId)?.catalogue?.name || 'Autre' }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(({ catId, name: catalogueName }) => {
                      const catCats = categories
                        .filter(c => c.catalogueId === catId)
                        .sort((a, b) => {
                          const nameA = a.parent ? `${a.parent.name} → ${a.name}` : a.name;
                          const nameB = b.parent ? `${b.parent.name} → ${b.name}` : b.name;
                          return nameA.localeCompare(nameB);
                        });
                      return (
                        <optgroup key={catId || 'none'} label={catalogueName}>
                          {catCats.map(c => (
                            <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} → ${c.name}` : c.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                </select>
              </div>

              {/* Dimensions + Prix */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Longueur</label>
                  <input
                    type="number"
                    defaultValue={panel.defaultLength}
                    key={`length-${panel.id}`}
                    onBlur={e => update('defaultLength', +e.target.value || 0)}
                    className="h-10 w-full px-3 rounded-md bg-[#1a1a1a] border border-[#333] text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Largeur</label>
                  <input
                    type="number"
                    defaultValue={panel.defaultWidth}
                    key={`width-${panel.id}`}
                    onBlur={e => update('defaultWidth', +e.target.value || 0)}
                    className="h-10 w-full px-3 rounded-md bg-[#1a1a1a] border border-[#333] text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Épaisseur</label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={panel.defaultThickness || ''}
                    key={`thickness-${panel.id}`}
                    onBlur={e => update('defaultThickness', +e.target.value || null)}
                    className="h-10 w-full px-3 rounded-md bg-[#1a1a1a] border border-[#333] text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Prix/m²</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={panel.pricePerM2 || ''}
                    key={`price-${panel.id}`}
                    onBlur={e => update('pricePerM2', +e.target.value || null)}
                    className="h-10 w-full px-3 rounded-md bg-[#1a1a1a] border border-[#333] text-white"
                  />
                </div>
              </div>

              {/* Épaisseurs */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <span className="text-xs text-gray-500 uppercase">Épaisseurs:</span>
                {panel.thickness.map(t => (
                  <button key={t} onClick={() => removeThickness(t)} className="px-3 py-1.5 bg-[#222] rounded-lg text-base text-white hover:bg-red-600/30 flex items-center gap-2">
                    {t}<X size={14} />
                  </button>
                ))}
                <Input type="number" step="0.1" placeholder="+" value={newThickness} onChange={e => setNewThickness(e.target.value)} onKeyDown={e => e.key === 'Enter' && addThickness()} className="w-20 h-9 bg-[#1a1a1a] border-[#333] text-white text-center" />
                <button onClick={addThickness} className="text-gray-500 hover:text-white"><Plus size={18} /></button>
              </div>

              {/* === CLASSIFICATION CUTX === */}
              <div className="border border-amber-600/30 rounded-lg p-3 mb-4 bg-amber-600/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-amber-500 font-bold uppercase">📊 Nouvelle Classification CutX</div>
                  {getSuggestionsCount() > 0 && (
                    <button
                      onClick={applyAutoFill}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Wand2 size={14} />
                      Auto-remplir ({getSuggestionsCount()})
                    </button>
                  )}
                </div>

                {/* Ligne 0: Catégorie produit (PANNEAU vs ACCESSOIRE) */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Catégorie</label>
                    <select value={panel.productCategory || ''} onChange={e => update('productCategory', e.target.value || null)} className={`h-9 w-full px-2 rounded bg-[#1a1a1a] border text-sm font-medium ${panel.productCategory === 'ACCESSOIRE' ? 'border-purple-500 text-purple-400' : 'border-[#333] text-white'}`}>
                      <option value="">—</option>
                      {enums?.productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Type Produit</label>
                    <select value={panel.panelType || ''} onChange={e => update('panelType', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm">
                      <option value="">—</option>
                      {enums?.productTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Sous-type</label>
                    <select value={panel.panelSubType || ''} onChange={e => update('panelSubType', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm">
                      <option value="">—</option>
                      {enums?.productSubTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Catégorie Décor</label>
                    <select value={panel.decorCategory || ''} onChange={e => update('decorCategory', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm">
                      <option value="">—</option>
                      {enums?.decorCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Ligne 2: Décor code + nom + sous-catégorie + fabricant */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Code Décor</label>
                    <input type="text" defaultValue={panel.decorCode || ''} key={`dcode-${panel.id}`} onBlur={e => update('decorCode', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm font-mono" placeholder="H1180" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Nom Décor</label>
                    <input type="text" defaultValue={panel.decorName || ''} key={`dname-${panel.id}`} onBlur={e => update('decorName', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm" placeholder="Halifax Chêne" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Sous-cat.</label>
                    <input type="text" defaultValue={panel.decorSubCategory || ''} key={`dsub-${panel.id}`} onBlur={e => update('decorSubCategory', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm" placeholder="Chêne" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Fabricant</label>
                    <input type="text" defaultValue={panel.manufacturer || ''} key={`manuf-${panel.id}`} onBlur={e => update('manufacturer', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm" placeholder="Egger" />
                  </div>
                </div>

                {/* Ligne 3: Sens du fil + Support + Finition code */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Sens du fil</label>
                    <select value={panel.grainDirection || ''} onChange={e => update('grainDirection', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm">
                      <option value="">—</option>
                      {enums?.grainDirections.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Type Support</label>
                    <select value={panel.coreType || ''} onChange={e => update('coreType', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm">
                      <option value="">—</option>
                      {enums?.coreTypes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Code Finition</label>
                    <input type="text" defaultValue={panel.finishCode || ''} key={`fcode-${panel.id}`} onBlur={e => update('finishCode', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm font-mono" placeholder="ST37" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Nom Finition</label>
                    <input type="text" defaultValue={panel.finishName || ''} key={`fname-${panel.id}`} onBlur={e => update('finishName', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#333] text-white text-sm" placeholder="Feelwood" />
                  </div>
                </div>

                {/* Ligne 4: Checkboxes */}
                <div className="flex items-center gap-6 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={panel.isSynchronized || false} onChange={e => update('isSynchronized', e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-gray-300">Pores synchronisés</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={panel.isHydrofuge || false} onChange={e => update('isHydrofuge', e.target.checked)} className="w-4 h-4 accent-blue-500" />
                    <span className="text-gray-300">Hydrofuge</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={panel.isIgnifuge || false} onChange={e => update('isIgnifuge', e.target.checked)} className="w-4 h-4 accent-red-500" />
                    <span className="text-gray-300">Ignifugé</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={panel.isPreglued || false} onChange={e => update('isPreglued', e.target.checked)} className="w-4 h-4 accent-green-500" />
                    <span className="text-gray-300">Pré-encollé</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={panel.isFullRoll || false} onChange={e => update('isFullRoll', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                    <span className="text-gray-300">Rouleau complet</span>
                  </label>
                </div>

                {/* Ligne 5: Type de lamelles (affiché uniquement pour panneaux massifs) */}
                {(panel.panelType === 'MASSIF' || panel.name?.toLowerCase().includes('lamellé')) && (
                  <div className="mt-3 pt-3 border-t border-[#333]">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-orange-400 uppercase mb-1 block">Type lamelles</label>
                        <select value={panel.lamellaType || ''} onChange={e => update('lamellaType', e.target.value || null)} className={`h-9 w-full px-2 rounded bg-[#1a1a1a] border text-sm font-medium ${panel.lamellaType === 'NON_ABOUTE' ? 'border-green-500 text-green-400' : panel.lamellaType === 'ABOUTE' ? 'border-yellow-500 text-yellow-400' : 'border-[#333] text-white'}`}>
                          <option value="">—</option>
                          {enums?.lamellaTypes?.map(t => <option key={t} value={t}>{t === 'NON_ABOUTE' ? 'Non abouté (lamelles continues)' : t === 'ABOUTE' ? 'Abouté (finger-jointed)' : t}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3 flex items-end text-xs text-gray-500">
                        <span>Non abouté = lamelles continues (plus noble) | Abouté = lamelles collées bout à bout</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Champs legacy (compacté) */}
              <div className="grid grid-cols-4 gap-3 mb-4 opacity-60">
                <div>
                  <label className="text-xs text-gray-600 uppercase mb-1 block">Matériau (legacy)</label>
                  <select value={panel.material || ''} onChange={e => update('material', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#222] text-gray-400 text-xs">
                    <option value="">—</option>
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 uppercase mb-1 block">Finition (legacy)</label>
                  <select value={panel.finish || ''} onChange={e => update('finish', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#222] text-gray-400 text-xs">
                    <option value="">—</option>
                    {FINITIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 uppercase mb-1 block">Support (legacy)</label>
                  <select value={panel.supportQuality || ''} onChange={e => update('supportQuality', e.target.value || null)} className="h-9 w-full px-2 rounded bg-[#1a1a1a] border border-[#222] text-gray-400 text-xs">
                    <option value="">—</option>
                    {SUPPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 uppercase mb-1 block">Décor (legacy)</label>
                  <Input value={panel.decor || ''} onChange={e => update('decor', e.target.value || null)} className="h-9 bg-[#1a1a1a] border-[#222] text-gray-400 text-xs" />
                </div>
              </div>

              {/* URL Image */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-3">
                  URL Image
                  {panel.imageUrl && <a href={getImageUrl(panel.imageUrl) || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline normal-case">ouvrir ↗</a>}
                </label>
                <Input value={panel.imageUrl || ''} onChange={e => { setImageError(false); update('imageUrl', e.target.value || null); }} className="h-10 bg-[#1a1a1a] border-[#333] text-white font-mono text-sm" />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* BOUTONS D'ACTION - EN BAS DU FORMULAIRE */}
              <div className="flex items-center justify-between pt-4 border-t border-[#222]">
                <div className="text-sm text-gray-600">
                  ← → naviguer | Entrée = vérifier
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="lg" onClick={markCorrection} disabled={isSaving} className="h-14 px-8 text-lg border-amber-600 text-amber-500 hover:bg-amber-600/20">
                    <AlertTriangle size={20} className="mr-2" />À corriger
                  </Button>
                  <Button size="lg" onClick={verify} disabled={isSaving} className="h-14 px-10 text-lg bg-green-600 hover:bg-green-500 text-white font-semibold">
                    {isSaving ? <Loader2 size={20} className="mr-2 animate-spin" /> : <Check size={20} className="mr-2" />}
                    Vérifier
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PanelsReviewPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#080808] flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-amber-500" /></div>}>
      <PanelsReviewContent />
    </Suspense>
  );
}
