// vues-techniques/VueFace.tsx
// Vue de face du caisson (Hauteur x Largeur)

import { useMemo } from 'react';
import { CotationH, CotationV } from './CotationLine';
import {
  COULEURS,
  STROKE_WIDTH,
  PADDING,
  FONT_SIZE,
  DASH_PATTERNS,
  calculerEchelle,
} from './constants';
import type { ConfigCaisson } from '@/lib/caissons/types';

interface VueFaceProps {
  config: ConfigCaisson;
  width?: number;
  height?: number;
  showDimensions?: boolean;
  showRainure?: boolean;
}

export default function VueFace({
  config,
  width = 280,
  height = 300,
  showDimensions = true,
  showRainure = true,
}: VueFaceProps) {
  // Dimensions du caisson
  const H = config.hauteur;
  const L = config.largeur;
  const ep = config.epaisseurStructure;
  const epFond = config.epaisseurFond;

  // Calculer l'echelle pour adapter le dessin
  const echelle = useMemo(() => {
    const paddingTotal = PADDING.cotation * 2 + PADDING.vue * 2;
    const scaleH = (height - paddingTotal) / H;
    const scaleL = (width - paddingTotal) / L;
    return Math.min(scaleH, scaleL, 0.5); // Max 0.5 pour lisibilite
  }, [width, height, H, L]);

  // Dimensions a l'echelle
  const hEchelle = H * echelle;
  const lEchelle = L * echelle;
  const epEchelle = ep * echelle;

  // Position de depart (centre le dessin)
  const startX = (width - lEchelle) / 2;
  const startY = (height - hEchelle) / 2;

  // Largeur interieure
  const interieurL = lEchelle - 2 * epEchelle;

  // Position rainure (si applicable)
  const showRainureLines = showRainure &&
    (config.typeFond === 'rainure' || config.typeFond === 'encastre');
  const profondeurRainure = config.profondeurRainure * echelle;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="vue-face"
    >
      {/* Fond */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={COULEURS.background}
      />

      {/* Titre */}
      <text
        x={width / 2}
        y={16}
        textAnchor="middle"
        fontSize={FONT_SIZE.titre}
        fontWeight={600}
        fill={COULEURS.cotationText}
      >
        VUE DE FACE
      </text>

      {/* Groupe principal du caisson */}
      <g transform={`translate(${startX}, ${startY})`}>
        {/* Contour exterieur complet */}
        <rect
          x={0}
          y={0}
          width={lEchelle}
          height={hEchelle}
          fill="none"
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.contour}
        />

        {/* Cote gauche */}
        <rect
          x={0}
          y={0}
          width={epEchelle}
          height={hEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Cote droit */}
        <rect
          x={lEchelle - epEchelle}
          y={0}
          width={epEchelle}
          height={hEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Panneau haut */}
        <rect
          x={epEchelle}
          y={0}
          width={interieurL}
          height={epEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Panneau bas */}
        <rect
          x={epEchelle}
          y={hEchelle - epEchelle}
          width={interieurL}
          height={epEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Rainure du fond (si applicable) */}
        {showRainureLines && (
          <>
            {/* Rainure gauche */}
            <line
              x1={epEchelle - profondeurRainure}
              y1={epEchelle}
              x2={epEchelle - profondeurRainure}
              y2={hEchelle - epEchelle}
              stroke={COULEURS.rainure}
              strokeWidth={STROKE_WIDTH.rainure}
              strokeDasharray={DASH_PATTERNS.rainure}
            />
            {/* Rainure droite */}
            <line
              x1={lEchelle - epEchelle + profondeurRainure}
              y1={epEchelle}
              x2={lEchelle - epEchelle + profondeurRainure}
              y2={hEchelle - epEchelle}
              stroke={COULEURS.rainure}
              strokeWidth={STROKE_WIDTH.rainure}
              strokeDasharray={DASH_PATTERNS.rainure}
            />
            {/* Rainure haut */}
            <line
              x1={epEchelle}
              y1={epEchelle - profondeurRainure}
              x2={lEchelle - epEchelle}
              y2={epEchelle - profondeurRainure}
              stroke={COULEURS.rainure}
              strokeWidth={STROKE_WIDTH.rainure}
              strokeDasharray={DASH_PATTERNS.rainure}
            />
            {/* Rainure bas */}
            <line
              x1={epEchelle}
              y1={hEchelle - epEchelle + profondeurRainure}
              x2={lEchelle - epEchelle}
              y2={hEchelle - epEchelle + profondeurRainure}
              stroke={COULEURS.rainure}
              strokeWidth={STROKE_WIDTH.rainure}
              strokeDasharray={DASH_PATTERNS.rainure}
            />
          </>
        )}

        {/* Facade en pointilles (si presente) */}
        {config.avecFacade && (
          <rect
            x={config.jeuFacade * echelle / 2}
            y={config.jeuFacade * echelle / 2}
            width={lEchelle - config.jeuFacade * echelle}
            height={hEchelle - config.jeuFacade * echelle}
            fill={COULEURS.facadeFill}
            stroke={COULEURS.facadeStroke}
            strokeWidth={STROKE_WIDTH.facade}
            strokeDasharray={DASH_PATTERNS.facade}
          />
        )}

        {/* Labels d'epaisseur */}
        <text
          x={epEchelle / 2}
          y={hEchelle / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={FONT_SIZE.label}
          fill={COULEURS.annotation}
          transform={`rotate(-90, ${epEchelle / 2}, ${hEchelle / 2})`}
        >
          {ep}
        </text>

        <text
          x={lEchelle - epEchelle / 2}
          y={hEchelle / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={FONT_SIZE.label}
          fill={COULEURS.annotation}
          transform={`rotate(-90, ${lEchelle - epEchelle / 2}, ${hEchelle / 2})`}
        >
          {ep}
        </text>
      </g>

      {/* Cotations */}
      {showDimensions && (
        <g>
          {/* Cotation hauteur (gauche) */}
          <CotationV
            x={startX}
            y={startY}
            height={hEchelle}
            value={H}
            offset={-35}
            markerId="vue-face-h"
          />

          {/* Cotation largeur (bas) */}
          <CotationH
            x={startX}
            y={startY + hEchelle}
            width={lEchelle}
            value={L}
            offset={25}
            markerId="vue-face-l"
          />

          {/* Cotation epaisseur structure (si assez grand) */}
          {epEchelle > 15 && (
            <CotationH
              x={startX}
              y={startY}
              width={epEchelle}
              value={ep}
              offset={-18}
              showUnit={false}
              fontSize={FONT_SIZE.label}
              markerId="vue-face-ep"
            />
          )}

          {/* Cotation largeur interieure */}
          <CotationH
            x={startX + epEchelle}
            y={startY + hEchelle - epEchelle}
            width={interieurL}
            value={L - 2 * ep}
            offset={-12}
            showUnit={false}
            fontSize={FONT_SIZE.label}
            color={COULEURS.annotation}
            markerId="vue-face-int"
          />
        </g>
      )}

      {/* Legende rainure */}
      {showRainureLines && (
        <g transform={`translate(${width - 80}, ${height - 30})`}>
          <line
            x1={0}
            y1={0}
            x2={20}
            y2={0}
            stroke={COULEURS.rainure}
            strokeWidth={STROKE_WIDTH.rainure}
            strokeDasharray={DASH_PATTERNS.rainure}
          />
          <text
            x={25}
            y={4}
            fontSize={FONT_SIZE.label - 1}
            fill={COULEURS.rainure}
          >
            Rainure {config.profondeurRainure}mm
          </text>
        </g>
      )}
    </svg>
  );
}
