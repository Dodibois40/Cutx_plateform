// vues-techniques/VueDessus.tsx
// Vue de dessus du caisson (Largeur x Profondeur)

import { useMemo } from 'react';
import { CotationH, CotationV } from './CotationLine';
import {
  COULEURS,
  STROKE_WIDTH,
  PADDING,
  FONT_SIZE,
  DASH_PATTERNS,
  SYSTEM32,
  CHARNIERES,
} from './constants';
import type { ConfigCaisson } from '@/lib/caissons/types';

interface VueDessusProps {
  config: ConfigCaisson;
  width?: number;
  height?: number;
  showDimensions?: boolean;
  showDrillings?: boolean;
  showHinges?: boolean;
}

export default function VueDessus({
  config,
  width = 300,
  height = 200,
  showDimensions = true,
  showDrillings = true,
  showHinges = true,
}: VueDessusProps) {
  // Dimensions du caisson
  const L = config.largeur;
  const P = config.profondeur;
  const ep = config.epaisseurStructure;
  const H = config.hauteur;

  // Calculer l'echelle pour adapter le dessin
  const echelle = useMemo(() => {
    const paddingTotal = PADDING.cotation * 2 + PADDING.vue * 2;
    const scaleL = (width - paddingTotal) / L;
    const scaleP = (height - paddingTotal) / P;
    return Math.min(scaleL, scaleP, 0.5);
  }, [width, height, L, P]);

  // Dimensions a l'echelle
  const lEchelle = L * echelle;
  const pEchelle = P * echelle;
  const epEchelle = ep * echelle;

  // Position de depart (centre le dessin)
  const startX = (width - lEchelle) / 2;
  const startY = (height - pEchelle) / 2;

  // Lignes System 32 a l'echelle
  const ligne32Avant = SYSTEM32.distanceBordAvant * echelle;
  const ligne32Arriere = SYSTEM32.distanceBordArriere * echelle;

  // Calcul nombre de charnieres
  const nombreCharnieres = useMemo(() => {
    if (!config.avecFacade) return 0;
    if (H <= 600) return 2;
    if (H <= 1000) return 3;
    if (H <= 1400) return 4;
    if (H <= 1800) return 5;
    return 6;
  }, [H, config.avecFacade]);

  // Position charnieres (cercles)
  const positionCharniere = config.positionCharniere === 'gauche' ? 'left' : 'right';
  const distanceBordCharniere = CHARNIERES.distanceBord * echelle;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="vue-dessus"
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
        VUE DE DESSUS
      </text>

      {/* Groupe principal du caisson */}
      <g transform={`translate(${startX}, ${startY})`}>
        {/* Contour exterieur */}
        <rect
          x={0}
          y={0}
          width={lEchelle}
          height={pEchelle}
          fill="none"
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.contour}
        />

        {/* Cote gauche */}
        <rect
          x={0}
          y={0}
          width={epEchelle}
          height={pEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Cote droit */}
        <rect
          x={lEchelle - epEchelle}
          y={0}
          width={epEchelle}
          height={pEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Panneau haut (vue de dessus = largeur interieure) */}
        <rect
          x={epEchelle}
          y={0}
          width={lEchelle - 2 * epEchelle}
          height={epEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Fond en transparence */}
        <rect
          x={epEchelle}
          y={0}
          width={lEchelle - 2 * epEchelle}
          height={pEchelle}
          fill={COULEURS.fondFill}
          fillOpacity={0.3}
          stroke="none"
        />

        {/* Lignes de percage System 32 */}
        {showDrillings && (
          <g className="system32-lines">
            {/* Ligne avant gauche */}
            <line
              x1={epEchelle}
              y1={pEchelle - ligne32Avant}
              x2={epEchelle + 8}
              y2={pEchelle - ligne32Avant}
              stroke={COULEURS.lignePercage}
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={pEchelle - ligne32Avant}
              x2={epEchelle}
              y2={pEchelle - ligne32Avant}
              stroke={COULEURS.percage}
              strokeWidth={STROKE_WIDTH.percage}
              strokeDasharray="2,2"
            />

            {/* Ligne avant droite */}
            <line
              x1={lEchelle - epEchelle - 8}
              y1={pEchelle - ligne32Avant}
              x2={lEchelle - epEchelle}
              y2={pEchelle - ligne32Avant}
              stroke={COULEURS.lignePercage}
              strokeWidth={1}
            />
            <line
              x1={lEchelle - epEchelle}
              y1={pEchelle - ligne32Avant}
              x2={lEchelle}
              y2={pEchelle - ligne32Avant}
              stroke={COULEURS.percage}
              strokeWidth={STROKE_WIDTH.percage}
              strokeDasharray="2,2"
            />

            {/* Ligne arriere gauche */}
            <line
              x1={epEchelle}
              y1={ligne32Arriere}
              x2={epEchelle + 8}
              y2={ligne32Arriere}
              stroke={COULEURS.lignePercage}
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={ligne32Arriere}
              x2={epEchelle}
              y2={ligne32Arriere}
              stroke={COULEURS.percage}
              strokeWidth={STROKE_WIDTH.percage}
              strokeDasharray="2,2"
            />

            {/* Ligne arriere droite */}
            <line
              x1={lEchelle - epEchelle - 8}
              y1={ligne32Arriere}
              x2={lEchelle - epEchelle}
              y2={ligne32Arriere}
              stroke={COULEURS.lignePercage}
              strokeWidth={1}
            />
            <line
              x1={lEchelle - epEchelle}
              y1={ligne32Arriere}
              x2={lEchelle}
              y2={ligne32Arriere}
              stroke={COULEURS.percage}
              strokeWidth={STROKE_WIDTH.percage}
              strokeDasharray="2,2"
            />

            {/* Labels 37mm */}
            <text
              x={lEchelle + 5}
              y={pEchelle - ligne32Avant + 3}
              fontSize={FONT_SIZE.label - 2}
              fill={COULEURS.percage}
            >
              37
            </text>
            <text
              x={lEchelle + 5}
              y={ligne32Arriere + 3}
              fontSize={FONT_SIZE.label - 2}
              fill={COULEURS.percage}
            >
              37
            </text>
          </g>
        )}

        {/* Position des charnieres */}
        {showHinges && config.avecFacade && nombreCharnieres > 0 && (
          <g className="hinges">
            {/* Cercles charnieres */}
            {Array.from({ length: nombreCharnieres }).map((_, i) => {
              const cx = positionCharniere === 'left'
                ? distanceBordCharniere
                : lEchelle - distanceBordCharniere;

              // Espacement uniforme des charnieres
              const espacement = nombreCharnieres > 1
                ? (pEchelle - 2 * CHARNIERES.distanceHautBas * echelle) / (nombreCharnieres - 1)
                : 0;
              const cy = CHARNIERES.distanceHautBas * echelle + i * espacement;

              return (
                <g key={i}>
                  {/* Cercle cup 35mm */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={(CHARNIERES.diametreCup / 2) * echelle}
                    fill={COULEURS.charniereFill}
                    stroke={COULEURS.charniere}
                    strokeWidth={STROKE_WIDTH.charniere}
                  />
                  {/* Centre */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={1.5}
                    fill={COULEURS.charniere}
                  />
                </g>
              );
            })}

            {/* Ligne axe charnieres */}
            <line
              x1={positionCharniere === 'left' ? distanceBordCharniere : lEchelle - distanceBordCharniere}
              y1={0}
              x2={positionCharniere === 'left' ? distanceBordCharniere : lEchelle - distanceBordCharniere}
              y2={pEchelle}
              stroke={COULEURS.charniere}
              strokeWidth={0.5}
              strokeDasharray={DASH_PATTERNS.axe}
              opacity={0.5}
            />

            {/* Label distance du bord */}
            <text
              x={positionCharniere === 'left' ? distanceBordCharniere : lEchelle - distanceBordCharniere}
              y={pEchelle + 12}
              textAnchor="middle"
              fontSize={FONT_SIZE.label - 1}
              fill={COULEURS.charniere}
            >
              {CHARNIERES.distanceBord}mm
            </text>
          </g>
        )}

        {/* Facade en pointilles */}
        {config.avecFacade && (
          <line
            x1={0}
            y1={pEchelle}
            x2={lEchelle}
            y2={pEchelle}
            stroke={COULEURS.facadeStroke}
            strokeWidth={STROKE_WIDTH.facade}
            strokeDasharray={DASH_PATTERNS.facade}
          />
        )}
      </g>

      {/* Cotations */}
      {showDimensions && (
        <g>
          {/* Cotation largeur (haut) */}
          <CotationH
            x={startX}
            y={startY}
            width={lEchelle}
            value={L}
            offset={-25}
            markerId="vue-dessus-l"
          />

          {/* Cotation profondeur (droite) */}
          <CotationV
            x={startX + lEchelle}
            y={startY}
            height={pEchelle}
            value={P}
            offset={25}
            textPosition="right"
            markerId="vue-dessus-p"
          />

          {/* Cotation largeur interieure */}
          <CotationH
            x={startX + epEchelle}
            y={startY + epEchelle}
            width={lEchelle - 2 * epEchelle}
            value={L - 2 * ep}
            offset={8}
            showUnit={false}
            fontSize={FONT_SIZE.label}
            color={COULEURS.annotation}
            markerId="vue-dessus-int"
          />
        </g>
      )}

      {/* Legende */}
      <g transform={`translate(10, ${height - 30})`}>
        {showDrillings && (
          <>
            <line x1={0} y1={0} x2={15} y2={0} stroke={COULEURS.percage} strokeWidth={1} strokeDasharray="2,2" />
            <text x={20} y={4} fontSize={FONT_SIZE.label - 1} fill={COULEURS.percage}>
              System 32
            </text>
          </>
        )}
        {showHinges && config.avecFacade && (
          <>
            <circle cx={7} cy={16} r={5} fill={COULEURS.charniereFill} stroke={COULEURS.charniere} strokeWidth={0.5} />
            <text x={20} y={19} fontSize={FONT_SIZE.label - 1} fill={COULEURS.charniere}>
              Charnieres ({nombreCharnieres})
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
