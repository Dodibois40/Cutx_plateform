'use client';

import { useMemo } from 'react';
import type { PanneauOptimise, DebitPlace } from '@/lib/configurateur/optimiseur/types';

interface VisualisationPanneauProps {
  panneau: PanneauOptimise;
  width?: number;  // Largeur du SVG en pixels
  height?: number; // Hauteur du SVG en pixels
}

// Couleurs
const COULEUR_PANNEAU = '#2a2a2a';
const COULEUR_DEBIT = '#3d3d3d';
const COULEUR_DEBIT_STROKE = '#555';
const COULEUR_CHANT = '#8b9d51'; // Olive
const COULEUR_TEXTE = '#e0e0e0';
const COULEUR_TEXTE_MUTED = '#888';

export default function VisualisationPanneau({
  panneau,
  width = 600,
  height = 400,
}: VisualisationPanneauProps) {
  // Calculer l'échelle pour que le panneau rentre dans le SVG
  const scale = useMemo(() => {
    const padding = 60; // Marge pour les labels
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scaleX = availableWidth / panneau.dimensions.longueur;
    const scaleY = availableHeight / panneau.dimensions.largeur;

    return Math.min(scaleX, scaleY);
  }, [width, height, panneau.dimensions]);

  // Dimensions du panneau à l'échelle
  const panneauWidth = panneau.dimensions.longueur * scale;
  const panneauHeight = panneau.dimensions.largeur * scale;

  // Position du panneau (centré)
  const offsetX = (width - panneauWidth) / 2;
  const offsetY = (height - panneauHeight) / 2;

  // Épaisseur des traits de chant
  const chantStroke = 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ maxWidth: width, maxHeight: height }}
    >
      {/* Fond */}
      <rect x={0} y={0} width={width} height={height} fill="#1a1a1a" />

      {/* Label "Longueur" en haut */}
      <text
        x={width / 2}
        y={offsetY - 25}
        textAnchor="middle"
        fill={COULEUR_TEXTE_MUTED}
        fontSize={11}
        fontFamily="system-ui"
      >
        Longueur • sens du fil • {panneau.dimensions.longueur} mm
      </text>

      {/* Flèche longueur */}
      <line
        x1={offsetX + 20}
        y1={offsetY - 10}
        x2={offsetX + panneauWidth - 20}
        y2={offsetY - 10}
        stroke={COULEUR_TEXTE_MUTED}
        strokeWidth={1}
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead-start)"
      />

      {/* Label "Largeur" à gauche (vertical) */}
      <text
        x={offsetX - 25}
        y={height / 2}
        textAnchor="middle"
        fill={COULEUR_TEXTE_MUTED}
        fontSize={11}
        fontFamily="system-ui"
        transform={`rotate(-90, ${offsetX - 25}, ${height / 2})`}
      >
        Largeur • {panneau.dimensions.largeur} mm
      </text>

      {/* Définitions (flèches) */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 6 3, 0 6" fill={COULEUR_TEXTE_MUTED} />
        </marker>
        <marker
          id="arrowhead-start"
          markerWidth="6"
          markerHeight="6"
          refX="1"
          refY="3"
          orient="auto-start-reverse"
        >
          <polygon points="6 0, 0 3, 6 6" fill={COULEUR_TEXTE_MUTED} />
        </marker>
      </defs>

      {/* Panneau brut (fond) */}
      <rect
        x={offsetX}
        y={offsetY}
        width={panneauWidth}
        height={panneauHeight}
        fill={COULEUR_PANNEAU}
        stroke="#444"
        strokeWidth={2}
        rx={2}
      />

      {/* Débits placés */}
      {panneau.debitsPlaces.map((debit) => (
        <DebitRect
          key={debit.id}
          debit={debit}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
          chantStroke={chantStroke}
        />
      ))}

      {/* Taux de remplissage */}
      <text
        x={width - 10}
        y={height - 10}
        textAnchor="end"
        fill={COULEUR_TEXTE_MUTED}
        fontSize={10}
        fontFamily="system-ui"
      >
        Remplissage: {panneau.tauxRemplissage.toFixed(1)}%
      </text>
    </svg>
  );
}

// Composant pour un débit
function DebitRect({
  debit,
  scale,
  offsetX,
  offsetY,
  chantStroke,
}: {
  debit: DebitPlace;
  scale: number;
  offsetX: number;
  offsetY: number;
  chantStroke: number;
}) {
  const x = offsetX + debit.x * scale;
  const y = offsetY + debit.y * scale;
  // Si rotation, les dimensions visuelles sont inversées
  const w = (debit.rotation ? debit.largeur : debit.longueur) * scale;
  const h = (debit.rotation ? debit.longueur : debit.largeur) * scale;

  // Déterminer quels côtés ont un chant (en tenant compte de la rotation)
  const chantsVisuels = debit.rotation
    ? {
        top: debit.chants.B,    // B devient le haut
        right: debit.chants.A,  // A devient la droite
        bottom: debit.chants.D, // D devient le bas
        left: debit.chants.C,   // C devient la gauche
      }
    : {
        top: debit.chants.A,    // A = longueur côté 1 (haut)
        right: debit.chants.B,  // B = largeur côté 1 (droite)
        bottom: debit.chants.C, // C = longueur côté 2 (bas)
        left: debit.chants.D,   // D = largeur côté 2 (gauche)
      };

  return (
    <g>
      {/* Rectangle du débit */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={COULEUR_DEBIT}
        stroke={COULEUR_DEBIT_STROKE}
        strokeWidth={1}
        rx={1}
      />

      {/* Chants (lignes vertes sur les côtés) */}
      {/* Haut (A) */}
      {chantsVisuels.top && (
        <line
          x1={x}
          y1={y}
          x2={x + w}
          y2={y}
          stroke={COULEUR_CHANT}
          strokeWidth={chantStroke}
          strokeLinecap="round"
        />
      )}

      {/* Droite (B) */}
      {chantsVisuels.right && (
        <line
          x1={x + w}
          y1={y}
          x2={x + w}
          y2={y + h}
          stroke={COULEUR_CHANT}
          strokeWidth={chantStroke}
          strokeLinecap="round"
        />
      )}

      {/* Bas (C) */}
      {chantsVisuels.bottom && (
        <line
          x1={x}
          y1={y + h}
          x2={x + w}
          y2={y + h}
          stroke={COULEUR_CHANT}
          strokeWidth={chantStroke}
          strokeLinecap="round"
        />
      )}

      {/* Gauche (D) */}
      {chantsVisuels.left && (
        <line
          x1={x}
          y1={y}
          x2={x}
          y2={y + h}
          stroke={COULEUR_CHANT}
          strokeWidth={chantStroke}
          strokeLinecap="round"
        />
      )}

      {/* Référence au centre */}
      <text
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={COULEUR_TEXTE}
        fontSize={Math.min(12, Math.max(8, w / 8))}
        fontFamily="system-ui"
        fontWeight={500}
      >
        {debit.reference.length > 12
          ? debit.reference.substring(0, 10) + '...'
          : debit.reference}
      </text>

      {/* Dimensions en petit */}
      {w > 60 && h > 40 && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COULEUR_TEXTE_MUTED}
          fontSize={8}
          fontFamily="system-ui"
        >
          {debit.longueur}×{debit.largeur}
        </text>
      )}
    </g>
  );
}
