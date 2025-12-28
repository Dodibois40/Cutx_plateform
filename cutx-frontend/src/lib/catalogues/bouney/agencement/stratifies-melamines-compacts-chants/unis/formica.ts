// Catalogue Bouney - Unis - FORMICA
// Source: B comme Bois (bcommebois.fr)
// Formica - Leader mondial des stratifiés décoratifs

import type { MarqueData } from './types';

export const FORMICA_UNIS: MarqueData = {
  marque: 'Formica',
  images: {
    'M4896': 'https://www.bcommebois.fr/media/catalog/product/cache/f2d50050c3efa9786230e32651e641be/7/9/79133-74488-n005-noir-polyrey_16.jpg',
    'M3091': 'https://www.bcommebois.fr/media/catalog/product/cache/f2d50050c3efa9786230e32651e641be/8/4/84779-aluminium-brosse-m4896-formica.jpg',
    'M2253': 'https://www.bcommebois.fr/media/catalog/product/cache/f2d50050c3efa9786230e32651e641be/8/5/85050-8206-magnetic-white-glossy-homapal.jpg',
    'F2253': 'https://www.bcommebois.fr/media/catalog/product/cache/f2d50050c3efa9786230e32651e641be/9/3/93223-93366-f229-marbre-cremona-egger.jpg'
  },
  produits: [
    // ============================================
    // Gamme Vita - Bois (sera peut-être déplacée dans catégorie Bois)
    // ============================================
    { nom: 'Vita Elegant Oak HPL 0.7mm', reference: 'F5374', longueur: 3050, largeur: 1300, epaisseur: 0.7, type: 'Stratifié HPL', codeArticle: 'FORM-F5374', stock: 'Sur commande', marque: 'Formica' },

    // ============================================
    // Gamme DecoMetal - Métallisés
    // ============================================
    { nom: 'DecoMetal Aluminium Brossé HPL 0.7mm', reference: 'M4896', longueur: 3050, largeur: 1300, epaisseur: 0.7, type: 'Stratifié HPL DecoMetal', codeArticle: 'FORM-M4896', stock: 'Sur commande', marque: 'Formica' },

    // ============================================
    // Gamme Magnetic - Surfaces magnétiques
    // ============================================
    { nom: 'Magnetic Crystal White HPL 1mm', reference: 'M3091', longueur: 3050, largeur: 1300, epaisseur: 1.0, type: 'Stratifié HPL Magnetic', codeArticle: 'FORM-M3091', stock: 'Sur commande', marque: 'Formica' },
    { nom: 'Magnetic Diamond Black HPL 1mm', reference: 'M2253', longueur: 3050, largeur: 1300, epaisseur: 1.0, type: 'Stratifié HPL Magnetic', codeArticle: 'FORM-M2253', stock: 'Sur commande', marque: 'Formica' },

    // ============================================
    // Coloris Unis classiques Formica (basés sur gamme standard)
    // ============================================
    { nom: 'Blanc Absolu HPL 0.8mm', reference: 'F0949', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F0949', stock: 'Sur commande', marque: 'Formica' },
    // F2253 Diamond Black - Prix B comme Bois
    { nom: 'Diamond Black Compact 4mm Matte 58 Âme noire', reference: 'F2253', longueur: 3050, largeur: 1300, epaisseur: 4, type: 'Compact Formica', codeArticle: '89935', stock: 'EN STOCK', marque: 'Formica', prixAchatM2: 33.11 },
    { nom: 'Gris Titane HPL 0.8mm', reference: 'F0737', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F0737', stock: 'Sur commande', marque: 'Formica' },
    { nom: 'Gris Souris HPL 0.8mm', reference: 'F1858', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F1858', stock: 'Sur commande', marque: 'Formica' },
    { nom: 'Anthracite HPL 0.8mm', reference: 'F0512', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F0512', stock: 'Sur commande', marque: 'Formica' },
    { nom: 'Beige Sahara HPL 0.8mm', reference: 'F1143', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F1143', stock: 'Sur commande', marque: 'Formica' },
    { nom: 'Bordeaux HPL 0.8mm', reference: 'F7966', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F7966', stock: 'Sur commande', marque: 'Formica' },
    { nom: 'Bleu Marine HPL 0.8mm', reference: 'F5687', longueur: 3050, largeur: 1300, epaisseur: 0.8, type: 'Stratifié HPL', codeArticle: 'FORM-F5687', stock: 'Sur commande', marque: 'Formica' },
  ],
};
