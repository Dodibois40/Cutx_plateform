/**
 * Styles centralisés pour les PDF CutX
 *
 * FICHIER CLÉ - Toutes les modifications visuelles se font ICI
 *
 * Structure:
 * - colors: Palette de couleurs
 * - fonts: Tailles de police
 * - spacing: Espacements et marges
 * - styles: StyleSheet pour @react-pdf/renderer
 */

import { StyleSheet } from '@react-pdf/renderer';

// ============================================================================
// COULEURS (modifiables en 1 endroit)
// ============================================================================
export const colors = {
  // Marque CutX
  primary: '#f59e0b',      // Ambre CutX
  primaryLight: '#fef3c7',
  primaryDark: '#d97706',

  // Texte
  text: '#1a1a1a',
  textLight: '#666666',
  textMuted: '#999999',
  textInverse: '#ffffff',

  // Bordures
  border: '#e5e5e5',
  borderLight: '#f0f0f0',
  borderDark: '#d1d5db',

  // Fonds
  background: '#ffffff',
  backgroundAlt: '#f9fafb',
  backgroundDark: '#1f1f1e',

  // Éléments métier
  piece: '#e5e7eb',        // Gris clair pour les pièces
  pieceStroke: '#9ca3af',  // Contour des pièces
  chant: '#5d7a28',        // Vert pour les chants
  chute: '#c9a227',        // Ambre pour les chutes
  chuteLight: '#fef3c7',

  // États
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

// ============================================================================
// TYPOGRAPHIE
// ============================================================================
export const fonts = {
  title: 18,
  subtitle: 14,
  body: 10,
  small: 8,
  tiny: 7,
};

// ============================================================================
// ESPACEMENTS
// ============================================================================
export const spacing = {
  page: 25,
  section: 15,
  element: 8,
  small: 4,
};

// ============================================================================
// DIMENSIONS
// ============================================================================
export const dimensions = {
  // A4 Paysage utilisable (en points, 1 point = 1/72 inch)
  pageWidth: 841.89,  // A4 landscape width
  pageHeight: 595.28, // A4 landscape height

  // Zone de contenu (après marges)
  contentWidth: 841.89 - (2 * spacing.page),
  contentHeight: 595.28 - (2 * spacing.page),
};

// ============================================================================
// STYLES RÉUTILISABLES
// ============================================================================
export const styles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────────
  // PAGES
  // ─────────────────────────────────────────────────────────────────────────
  page: {
    padding: spacing.page,
    fontFamily: 'Helvetica',
    fontSize: fonts.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  pageLandscape: {
    padding: spacing.page,
    fontFamily: 'Helvetica',
    fontSize: fonts.body,
    color: colors.text,
    backgroundColor: colors.background,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.section,
    paddingBottom: spacing.element,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontSize: fonts.title,
    fontWeight: 'bold',
    color: colors.primary,
  },
  title: {
    fontSize: fonts.subtitle,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fonts.body,
    fontWeight: 'bold',
    color: colors.text,
  },
  meta: {
    fontSize: fonts.small,
    color: colors.textLight,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONTENU
  // ─────────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PANNEAU INFO
  // ─────────────────────────────────────────────────────────────────────────
  panneauInfo: {
    marginBottom: spacing.element,
    padding: spacing.element,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
  },
  panneauTitle: {
    fontSize: fonts.subtitle,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  panneauDimensions: {
    fontSize: fonts.small,
    color: colors.textLight,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TABLEAUX
  // ─────────────────────────────────────────────────────────────────────────
  table: {
    marginTop: spacing.element,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: colors.backgroundAlt,
  },
  tableCell: {
    fontSize: fonts.small,
    paddingHorizontal: 4,
  },
  tableCellBold: {
    fontSize: fonts.small,
    paddingHorizontal: 4,
    fontWeight: 'bold',
  },
  tableCellRight: {
    fontSize: fonts.small,
    paddingHorizontal: 4,
    textAlign: 'right',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STATS BAR
  // ─────────────────────────────────────────────────────────────────────────
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.element,
    padding: spacing.element,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fonts.subtitle,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: fonts.tiny,
    color: colors.textMuted,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: spacing.page,
    left: spacing.page,
    right: spacing.page,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: fonts.tiny,
    color: colors.textMuted,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.small,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CATALOGUE CHUTES - CARDS
  // ─────────────────────────────────────────────────────────────────────────
  offcutCard: {
    flexDirection: 'row',
    marginBottom: spacing.element,
    padding: spacing.element,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  offcutVisual: {
    width: 80,
    height: 60,
    backgroundColor: colors.chuteLight,
    borderWidth: 1,
    borderColor: colors.chute,
    marginRight: spacing.element,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offcutVisualText: {
    fontSize: fonts.small,
    color: colors.chute,
    fontWeight: 'bold',
  },
  offcutInfo: {
    flex: 1,
  },
  offcutTitle: {
    fontSize: fonts.body,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  offcutDetail: {
    fontSize: fonts.small,
    color: colors.textLight,
    marginBottom: 2,
  },
  offcutPrice: {
    fontSize: fonts.body,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOTAL BAR (Catalogue)
  // ─────────────────────────────────────────────────────────────────────────
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.section,
    padding: spacing.element,
    backgroundColor: colors.primaryLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  totalText: {
    fontSize: fonts.body,
    color: colors.text,
  },
  totalValue: {
    fontSize: fonts.subtitle,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CTA
  // ─────────────────────────────────────────────────────────────────────────
  cta: {
    marginTop: spacing.section,
    padding: spacing.element,
    backgroundColor: colors.primary,
    borderRadius: 4,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: fonts.body,
    color: colors.textInverse,
    fontWeight: 'bold',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VISUALISATION PANNEAU (simplifiée pour PDF)
  // ─────────────────────────────────────────────────────────────────────────
  visualizationContainer: {
    flex: 1,
    padding: spacing.small,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.backgroundAlt,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formate une date pour l'affichage dans le PDF
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une date pour le nom de fichier
 */
export function formatDateFile(date: Date = new Date()): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Calcule le pourcentage de remplissage
 */
export function calculateFillRate(used: number, total: number): string {
  if (total === 0) return '0';
  return ((used / total) * 100).toFixed(1);
}
