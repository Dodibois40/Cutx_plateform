'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import type { PanneauOptimise, DebitPlace, ZoneChute } from '@/lib/configurateur/optimiseur/types';

interface VisualisationPanneauProps {
  panneau: PanneauOptimise;
  width?: number;  // Largeur du SVG en pixels (optionnel, auto si non fourni)
  height?: number; // Hauteur du SVG en pixels (optionnel, auto si non fourni)
}

// Couleurs
const COULEUR_PANNEAU = '#2a2a2a';
const COULEUR_DEBIT = '#3d3d3d';
const COULEUR_DEBIT_STROKE = '#555';
const COULEUR_CHANT = '#8b9d51'; // Olive
const COULEUR_TEXTE = '#e0e0e0';
const COULEUR_TEXTE_DIM = '#c8c8c8'; // Plus blanc pour les dimensions
const COULEUR_TEXTE_MUTED = '#888';
const COULEUR_CHUTE = '#c9a227'; // Ambre/sable pour les chutes
const COULEUR_CHUTE_TEXTE = '#f5e6c8'; // Texte chute plus clair/blanc
const COULEUR_CHUTE_STROKE = '#8b7355'; // Bordure chute

export default function VisualisationPanneau({
  panneau,
  width: propWidth,
  height: propHeight,
}: VisualisationPanneauProps) {
  // Ref pour mesurer le container
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Observer la taille du container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    // Mesurer initialement
    updateSize();

    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Utiliser les props si fournies, sinon la taille mesurée
  const width = propWidth ?? containerSize.width;
  const height = propHeight ?? containerSize.height;
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
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 350 }}>
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
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

      {/* Définitions (flèches et patterns) */}
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
        {/* Pattern hachuré pour les zones de chute */}
        <pattern
          id="chutePattern"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke={COULEUR_CHUTE}
            strokeWidth="2"
            strokeOpacity="0.4"
          />
        </pattern>
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

      {/* Zones de chute (espaces libres) */}
      {panneau.zonesChute?.map((chute) => (
        <ChuteRect
          key={chute.id}
          chute={chute}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
        />
      ))}

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
    </div>
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

  // Sécurité: valeurs par défaut pour les propriétés potentiellement undefined
  const reference = debit.reference ?? '';
  const chants = debit.chants ?? { A: false, B: false, C: false, D: false };

  // Déterminer quels côtés ont un chant (en tenant compte de la rotation)
  const chantsVisuels = debit.rotation
    ? {
        top: chants.B,    // B devient le haut
        right: chants.A,  // A devient la droite
        bottom: chants.D, // D devient le bas
        left: chants.C,   // C devient la gauche
      }
    : {
        top: chants.A,    // A = longueur côté 1 (haut)
        right: chants.B,  // B = largeur côté 1 (droite)
        bottom: chants.C, // C = longueur côté 2 (bas)
        left: chants.D,   // D = largeur côté 2 (gauche)
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
        {reference.length > 12 ? reference.substring(0, 10) + '...' : reference}
      </text>

      {/* Dimensions en petit */}
      {w > 50 && h > 35 && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COULEUR_TEXTE_DIM}
          fontSize={Math.min(11, Math.max(9, w / 10))}
          fontFamily="system-ui"
          fontWeight={500}
        >
          {debit.longueur}×{debit.largeur}
        </text>
      )}
    </g>
  );
}

// Composant pour une zone de chute
function ChuteRect({
  chute,
  scale,
  offsetX,
  offsetY,
}: {
  chute: ZoneChute;
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const x = offsetX + chute.x * scale;
  const y = offsetY + chute.y * scale;
  const w = chute.longueur * scale;
  const h = chute.largeur * scale;

  // Ne pas afficher les chutes trop petites visuellement
  if (w < 10 || h < 10) return null;

  // Calculer la taille de police adaptée
  const fontSize = Math.min(11, Math.max(7, Math.min(w, h) / 6));
  const showDimensions = w > 40 && h > 25;

  return (
    <g>
      {/* Fond hachuré */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="url(#chutePattern)"
        stroke={COULEUR_CHUTE_STROKE}
        strokeWidth={1}
        strokeDasharray="4 2"
        rx={1}
      />

      {/* Dimensions au centre */}
      {showDimensions && (
        <text
          x={x + w / 2}
          y={y + h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COULEUR_CHUTE_TEXTE}
          fontSize={Math.min(13, Math.max(9, fontSize + 2))}
          fontFamily="system-ui"
          fontWeight={600}
        >
          {chute.longueur}×{chute.largeur}
        </text>
      )}

      {/* Surface en petit si assez d'espace */}
      {w > 60 && h > 40 && (
        <text
          x={x + w / 2}
          y={y + h / 2 + fontSize + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COULEUR_CHUTE_TEXTE}
          fontSize={8}
          fontFamily="system-ui"
          opacity={0.8}
        >
          {(chute.surface * 10000).toFixed(0)} cm²
        </text>
      )}
    </g>
  );
}
