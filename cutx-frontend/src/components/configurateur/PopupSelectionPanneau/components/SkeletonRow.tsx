/**
 * Composant Skeleton Loader pour le tableau des produits
 * Affiche une ligne de chargement avec des placeholders animés
 */
export function SkeletonRow() {
  return (
    <tr className="skeleton-row">
      <td><div className="skeleton skeleton-image" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-lg" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-xs" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-badge" /></td>
    </tr>
  );
}
