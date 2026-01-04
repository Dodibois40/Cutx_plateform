// vues-techniques/VueCote.tsx
// Vue de cote du caisson (Hauteur x Profondeur) avec percages embases

import { useMemo } from 'react';
import { CotationH, CotationV } from './CotationLine';
import {
  COULEURS,
  STROKE_WIDTH,
  PADDING,
  FONT_SIZE,
  DASH_PATTERNS,
} from './constants';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { TypeEmbaseBlum } from '@/lib/caissons/blum-hardware';
import {
  calculerTousPercagesCharnieres,
  type PercageAbsolu,
} from '@/lib/caissons/calcul-percages';

// Couleurs specifiques percages embases
const COULEURS_EMBASE = {
  pilote: '#38a169',          // Vert pour trous pilotes 10mm
  piloteFill: 'rgba(56, 161, 105, 0.3)',
  vis: '#d69e2e',             // Or pour trous vis 5mm
  visFill: 'rgba(214, 158, 46, 0.3)',
};

interface VueCoteProps {
  config: ConfigCaisson;
  typeEmbase?: TypeEmbaseBlum;
  width?: number;
  height?: number;
  showDimensions?: boolean;
  showFond?: boolean;
  showEmbaseDrillings?: boolean;
}

export default function VueCote({
  config,
  typeEmbase = 'EXPANDO_0mm',
  width = 200,
  height = 300,
  showDimensions = true,
  showFond = true,
  showEmbaseDrillings = true,
}: VueCoteProps) {
  // Dimensions du caisson
  const H = config.hauteur;
  const P = config.profondeur;
  const ep = config.epaisseurStructure;
  const epFond = config.epaisseurFond;

  // Calculer les percages embases
  const percages = useMemo(() => {
    if (!showEmbaseDrillings || !config.avecFacade) return null;
    return calculerTousPercagesCharnieres(config, typeEmbase);
  }, [config, typeEmbase, showEmbaseDrillings]);

  // Calculer l'echelle pour adapter le dessin
  const echelle = useMemo(() => {
    const paddingTotal = PADDING.cotation * 2 + PADDING.vue * 2;
    const scaleH = (height - paddingTotal) / H;
    const scaleP = (width - paddingTotal) / P;
    return Math.min(scaleH, scaleP, 0.5);
  }, [width, height, H, P]);

  // Dimensions a l'echelle
  const hEchelle = H * echelle;
  const pEchelle = P * echelle;
  const epEchelle = ep * echelle;
  const epFondEchelle = epFond * echelle;

  // Position de depart (centre le dessin)
  const startX = (width - pEchelle) / 2;
  const startY = (height - hEchelle) / 2;

  // Calcul position du fond selon le type
  const getFondPosition = () => {
    switch (config.typeFond) {
      case 'applique':
        // Fond visse a l'arriere
        return {
          x: 0,
          width: epFondEchelle,
          label: 'Applique',
        };
      case 'rainure':
      case 'encastre':
        // Fond dans rainure
        const profRainure = config.profondeurRainure * echelle;
        return {
          x: profRainure - epFondEchelle,
          width: epFondEchelle,
          rainureDepth: profRainure,
          label: 'Rainure',
        };
      case 'feuillure':
        // Fond en feuillure
        return {
          x: 0,
          width: epFondEchelle,
          feuillure: true,
          label: 'Feuillure',
        };
      default:
        return { x: 0, width: epFondEchelle, label: '' };
    }
  };

  const fondPos = getFondPosition();

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="vue-cote"
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
        VUE DE COTE
      </text>

      {/* Groupe principal du caisson */}
      <g transform={`translate(${startX}, ${startY})`}>
        {/* Contour du cote (profil) */}
        <rect
          x={0}
          y={0}
          width={pEchelle}
          height={hEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.contour}
        />

        {/* Panneau haut (visible en coupe) */}
        <rect
          x={0}
          y={0}
          width={pEchelle}
          height={epEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Panneau bas (visible en coupe) */}
        <rect
          x={0}
          y={hEchelle - epEchelle}
          width={pEchelle}
          height={epEchelle}
          fill={COULEURS.structureFill}
          stroke={COULEURS.structureStroke}
          strokeWidth={STROKE_WIDTH.structure}
        />

        {/* Fond du caisson */}
        {showFond && (
          <g>
            <rect
              x={fondPos.x}
              y={epEchelle}
              width={fondPos.width}
              height={hEchelle - 2 * epEchelle}
              fill={COULEURS.fondFill}
              stroke={COULEURS.fondStroke}
              strokeWidth={STROKE_WIDTH.fond}
            />

            {/* Rainure visible si type rainure/encastre */}
            {fondPos.rainureDepth && (
              <>
                {/* Rainure haut */}
                <rect
                  x={0}
                  y={epEchelle - fondPos.rainureDepth}
                  width={fondPos.rainureDepth}
                  height={fondPos.rainureDepth}
                  fill="none"
                  stroke={COULEURS.rainure}
                  strokeWidth={STROKE_WIDTH.rainure}
                />
                {/* Rainure bas */}
                <rect
                  x={0}
                  y={hEchelle - epEchelle}
                  width={fondPos.rainureDepth}
                  height={fondPos.rainureDepth}
                  fill="none"
                  stroke={COULEURS.rainure}
                  strokeWidth={STROKE_WIDTH.rainure}
                />
              </>
            )}
          </g>
        )}

        {/* Facade en pointilles (si presente) */}
        {config.avecFacade && (
          <rect
            x={pEchelle - config.epaisseurFacade * echelle}
            y={config.jeuFacade * echelle / 2}
            width={config.epaisseurFacade * echelle}
            height={hEchelle - config.jeuFacade * echelle}
            fill={COULEURS.facadeFill}
            stroke={COULEURS.facadeStroke}
            strokeWidth={STROKE_WIDTH.facade}
            strokeDasharray={DASH_PATTERNS.facade}
          />
        )}

        {/* Percages embases */}
        {showEmbaseDrillings && percages && (
          <g>
            {/* Obtenir les percages du cote concerne */}
            {(config.positionCharniere === 'gauche'
              ? percages.percages.coteGauche
              : percages.percages.coteDroit
            ).map((percage: PercageAbsolu) => {
              // Convertir position: X = distance depuis bord arriere, Y depuis le bas
              const svgX = percage.x * echelle;
              const svgY = hEchelle - percage.y * echelle;
              const rayon = (percage.diametre / 2) * echelle;
              const isPilote = percage.type === 'pilote_10mm';

              return (
                <g key={percage.id}>
                  {/* Cercle du percage */}
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={rayon}
                    fill={isPilote ? COULEURS_EMBASE.piloteFill : COULEURS_EMBASE.visFill}
                    stroke={isPilote ? COULEURS_EMBASE.pilote : COULEURS_EMBASE.vis}
                    strokeWidth={STROKE_WIDTH.percage}
                  />
                  {/* Point central */}
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={1}
                    fill={isPilote ? COULEURS_EMBASE.pilote : COULEURS_EMBASE.vis}
                  />
                </g>
              );
            })}

            {/* Ligne a 37mm du bord avant (ligne System32) */}
            <line
              x1={pEchelle - 37 * echelle}
              y1={0}
              x2={pEchelle - 37 * echelle}
              y2={hEchelle}
              stroke={COULEURS.lignePercage}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.5}
            />
          </g>
        )}

        {/* Ligne d'axe centrale */}
        <line
          x1={pEchelle / 2}
          y1={epEchelle + 10}
          x2={pEchelle / 2}
          y2={hEchelle - epEchelle - 10}
          stroke={COULEURS.extension}
          strokeWidth={0.5}
          strokeDasharray={DASH_PATTERNS.axe}
        />

        {/* Label type fond */}
        {showFond && fondPos.label && (
          <text
            x={fondPos.x + fondPos.width / 2}
            y={hEchelle / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={FONT_SIZE.label - 1}
            fill={COULEURS.fond}
            transform={`rotate(-90, ${fondPos.x + fondPos.width / 2}, ${hEchelle / 2})`}
          >
            {epFond}
          </text>
        )}
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
            markerId="vue-cote-h"
          />

          {/* Cotation profondeur (bas) */}
          <CotationH
            x={startX}
            y={startY + hEchelle}
            width={pEchelle}
            value={P}
            offset={25}
            markerId="vue-cote-p"
          />

          {/* Cotation epaisseur fond */}
          {showFond && epFondEchelle > 5 && (
            <CotationH
              x={startX + fondPos.x}
              y={startY + hEchelle / 2}
              width={fondPos.width}
              value={epFond}
              offset={-12}
              showUnit={false}
              fontSize={FONT_SIZE.label}
              color={COULEURS.fond}
              markerId="vue-cote-fond"
            />
          )}

          {/* Cotation profondeur rainure (si applicable) */}
          {fondPos.rainureDepth && (
            <CotationH
              x={startX}
              y={startY + epEchelle}
              width={fondPos.rainureDepth}
              value={config.profondeurRainure}
              offset={-10}
              showUnit={false}
              fontSize={FONT_SIZE.label - 1}
              color={COULEURS.rainure}
              markerId="vue-cote-rainure"
            />
          )}
        </g>
      )}

      {/* Legende */}
      <g transform={`translate(10, ${height - 65})`}>
        {/* Fond */}
        <rect x={0} y={0} width={12} height={8} fill={COULEURS.fondFill} stroke={COULEURS.fondStroke} strokeWidth={0.5} />
        <text x={16} y={7} fontSize={FONT_SIZE.label - 1} fill={COULEURS.cotationText}>
          Fond ({config.typeFond})
        </text>

        {/* Facade */}
        {config.avecFacade && (
          <>
            <line x1={0} y1={18} x2={12} y2={18} stroke={COULEURS.facadeStroke} strokeWidth={1} strokeDasharray={DASH_PATTERNS.facade} />
            <text x={16} y={21} fontSize={FONT_SIZE.label - 1} fill={COULEURS.cotationText}>
              Facade
            </text>
          </>
        )}

        {/* Percages embases */}
        {showEmbaseDrillings && percages && (
          <>
            <circle cx={6} cy={35} r={4} fill={COULEURS_EMBASE.piloteFill} stroke={COULEURS_EMBASE.pilote} strokeWidth={0.5} />
            <text x={16} y={38} fontSize={FONT_SIZE.label - 1} fill={COULEURS.cotationText}>
              Embase ({typeEmbase.replace('_', ' ')})
            </text>
          </>
        )}
      </g>

      {/* Info cotation 37mm */}
      {showEmbaseDrillings && percages && (
        <text
          x={width - 10}
          y={height - 10}
          textAnchor="end"
          fontSize={FONT_SIZE.label - 2}
          fill={COULEURS.annotation}
        >
          Ligne System32: 37mm du bord avant
        </text>
      )}
    </svg>
  );
}
