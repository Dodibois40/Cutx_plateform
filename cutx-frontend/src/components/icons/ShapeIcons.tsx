// components/icons/ShapeIcons.tsx
// Icônes SVG pour les formes de panneau
// Source: C:\CutX_plateform\Icones_forme\

import React from 'react';
import type { FormePanneau } from '@/lib/configurateur/types';

interface ShapeIconProps {
  size?: number;
  className?: string;
}

// Rectangle (4 côtés) - format compact
export function RectangleIcon({ size = 24, className }: ShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeMiterlimit="10"
    >
      <rect x="3" y="6" width="18" height="12" rx="1" />
    </svg>
  );
}

// Pentagon / L-shape (5 côtés) - format compact avec coin coupé
export function PentagonIcon({ size = 24, className }: ShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeMiterlimit="10"
    >
      {/* L-shape avec coin coupé en haut-gauche */}
      <polygon points="3,18 3,10 9,4 21,4 21,18 3,18" />
    </svg>
  );
}

// Cercle (Rond) - format compact
export function CircleIcon({ size = 24, className }: ShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeMiterlimit="10"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

// Ellipse (Ovale) - format compact
export function EllipseIcon({ size = 24, className }: ShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeMiterlimit="10"
    >
      <ellipse cx="12" cy="12" rx="9" ry="6" />
    </svg>
  );
}

// Triangle - format compact
export function TriangleIcon({ size = 24, className }: ShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeMiterlimit="10"
    >
      <polygon points="12,4 21,19 3,19" />
    </svg>
  );
}

// Forme personnalisée (DXF) - icône de fichier/forme libre
export function CustomShapeIcon({ size = 24, className }: ShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Icône représentant une forme libre/DXF */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="M9 15l3 3 3-3" />
    </svg>
  );
}

// Map forme vers composant icône
export const SHAPE_ICONS: Record<FormePanneau, React.ComponentType<ShapeIconProps>> = {
  rectangle: RectangleIcon,
  pentagon: PentagonIcon,
  circle: CircleIcon,
  ellipse: EllipseIcon,
  triangle: TriangleIcon,
  custom: CustomShapeIcon,
};

// Helper pour obtenir l'icône d'une forme
export function getShapeIcon(forme: FormePanneau): React.ComponentType<ShapeIconProps> {
  return SHAPE_ICONS[forme] || RectangleIcon;
}

// Composant générique qui rend l'icône selon la forme
export function ShapeIcon({ forme, size = 24, className }: { forme: FormePanneau } & ShapeIconProps) {
  const Icon = getShapeIcon(forme);
  return <Icon size={size} className={className} />;
}

export default ShapeIcon;
