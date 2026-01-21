/**
 * Panel data structure for the admin panel manager
 * Simplified version of SearchProduct for assignment operations
 */
export interface PanelForAssignment {
  id: string;
  reference: string;
  nom: string;
  epaisseur?: number | null;
  productType?: string | null;
  fournisseur?: string | null;
  categoryId?: string | null;
  imageUrl?: string | null;
  longueur?: number | string | null;
  largeur?: number | null;
  prixAchatM2?: number | null;
  stock?: string | null;
}

/**
 * Result of batch assignment API call
 */
export interface AssignmentResult {
  success: number;
  failed: number;
  categoryId: string;
}

/**
 * Props for the main PanelManager component
 */
export interface PanelManagerProps {
  onAssignComplete?: () => void;
  /** Slug de la catégorie sélectionnée dans l'arborescence */
  selectedCategorySlug?: string | null;
  /** Nom de la catégorie sélectionnée */
  selectedCategoryName?: string | null;
  /** Callback pour effacer la sélection de catégorie */
  onClearCategoryFilter?: () => void;
  /** Incrémenté après un drop réussi pour vider la sélection */
  clearSelectionTrigger?: number;
  /** Fournisseurs actifs (filtrés dans la sidebar) */
  activeSuppliers?: string[];
}
