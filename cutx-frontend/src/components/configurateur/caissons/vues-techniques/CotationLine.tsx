// vues-techniques/CotationLine.tsx
// Composant de ligne de cotation avec fleches et valeur

import { COULEURS, STROKE_WIDTH, FLECHE, FONT_SIZE, formaterDimension } from './constants';

interface CotationLineProps {
  // Points de depart et fin de la cotation
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Valeur a afficher (en mm)
  value: number;
  // Orientation de la cotation
  orientation: 'horizontal' | 'vertical';
  // Decalage de la ligne par rapport aux points (perpendiculaire)
  offset?: number;
  // Afficher les lignes d'extension
  showExtensions?: boolean;
  // Longueur des lignes d'extension
  extensionLength?: number;
  // ID unique pour les markers
  markerId?: string;
  // Couleur personnalisee
  color?: string;
  // Position du texte
  textPosition?: 'above' | 'below' | 'left' | 'right' | 'center';
  // Afficher l'unite
  showUnit?: boolean;
  // Taille du texte
  fontSize?: number;
}

export default function CotationLine({
  x1,
  y1,
  x2,
  y2,
  value,
  orientation,
  offset = 0,
  showExtensions = true,
  extensionLength = 8,
  markerId,
  color = COULEURS.cotation,
  textPosition = 'center',
  showUnit = true,
  fontSize = FONT_SIZE.dimension,
}: CotationLineProps) {
  // Calculer les points de la ligne de cotation (avec offset)
  let lineX1 = x1;
  let lineY1 = y1;
  let lineX2 = x2;
  let lineY2 = y2;

  if (orientation === 'horizontal') {
    lineY1 = y1 + offset;
    lineY2 = y2 + offset;
  } else {
    lineX1 = x1 + offset;
    lineX2 = x2 + offset;
  }

  // Calculer le centre pour le texte
  const centerX = (lineX1 + lineX2) / 2;
  const centerY = (lineY1 + lineY2) / 2;

  // Position du texte selon l'orientation
  let textX = centerX;
  let textY = centerY;
  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  let textRotation = 0;

  if (orientation === 'horizontal') {
    textY = centerY - 6;
    if (textPosition === 'below') textY = centerY + fontSize + 2;
  } else {
    textX = centerX - 6;
    textRotation = -90;
    if (textPosition === 'right') textX = centerX + fontSize + 2;
  }

  // Generer un ID unique pour les markers si non fourni
  const id = markerId || `arrow-${x1}-${y1}-${x2}-${y2}`;
  const startMarkerId = `${id}-start`;
  const endMarkerId = `${id}-end`;

  // Texte a afficher
  const displayText = showUnit ? `${formaterDimension(value)} mm` : formaterDimension(value);

  return (
    <g className="cotation-line">
      {/* Definitions des fleches */}
      <defs>
        {/* Fleche de fin (pointe vers la droite/bas) */}
        <marker
          id={endMarkerId}
          markerWidth={FLECHE.width}
          markerHeight={FLECHE.height * 2}
          refX={FLECHE.width - 1}
          refY={FLECHE.height}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points={`0,0 ${FLECHE.width},${FLECHE.height} 0,${FLECHE.height * 2}`}
            fill={color}
          />
        </marker>

        {/* Fleche de debut (pointe vers la gauche/haut) */}
        <marker
          id={startMarkerId}
          markerWidth={FLECHE.width}
          markerHeight={FLECHE.height * 2}
          refX={1}
          refY={FLECHE.height}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points={`${FLECHE.width},0 0,${FLECHE.height} ${FLECHE.width},${FLECHE.height * 2}`}
            fill={color}
          />
        </marker>
      </defs>

      {/* Lignes d'extension */}
      {showExtensions && (
        <>
          {orientation === 'horizontal' ? (
            <>
              <line
                x1={x1}
                y1={y1}
                x2={lineX1}
                y2={lineY1 + (offset > 0 ? extensionLength : -extensionLength)}
                stroke={color}
                strokeWidth={STROKE_WIDTH.extension}
                opacity={0.5}
              />
              <line
                x1={x2}
                y1={y2}
                x2={lineX2}
                y2={lineY2 + (offset > 0 ? extensionLength : -extensionLength)}
                stroke={color}
                strokeWidth={STROKE_WIDTH.extension}
                opacity={0.5}
              />
            </>
          ) : (
            <>
              <line
                x1={x1}
                y1={y1}
                x2={lineX1 + (offset > 0 ? extensionLength : -extensionLength)}
                y2={lineY1}
                stroke={color}
                strokeWidth={STROKE_WIDTH.extension}
                opacity={0.5}
              />
              <line
                x1={x2}
                y1={y2}
                x2={lineX2 + (offset > 0 ? extensionLength : -extensionLength)}
                y2={lineY2}
                stroke={color}
                strokeWidth={STROKE_WIDTH.extension}
                opacity={0.5}
              />
            </>
          )}
        </>
      )}

      {/* Ligne de cotation principale avec fleches */}
      <line
        x1={lineX1}
        y1={lineY1}
        x2={lineX2}
        y2={lineY2}
        stroke={color}
        strokeWidth={STROKE_WIDTH.cotation}
        markerStart={`url(#${startMarkerId})`}
        markerEnd={`url(#${endMarkerId})`}
      />

      {/* Fond blanc pour le texte */}
      <rect
        x={textX - (displayText.length * fontSize * 0.3)}
        y={textY - fontSize * 0.8}
        width={displayText.length * fontSize * 0.6}
        height={fontSize * 1.2}
        fill="white"
        opacity={0.9}
        rx={2}
        transform={textRotation !== 0 ? `rotate(${textRotation}, ${textX}, ${textY})` : undefined}
      />

      {/* Texte de la dimension */}
      <text
        x={textX}
        y={textY}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight={500}
        fill={COULEURS.cotationText}
        transform={textRotation !== 0 ? `rotate(${textRotation}, ${textX}, ${textY})` : undefined}
      >
        {displayText}
      </text>
    </g>
  );
}

// Composant simplifie pour cotation horizontale
export function CotationH({
  x,
  y,
  width,
  value,
  offset = -25,
  ...props
}: Omit<CotationLineProps, 'x1' | 'y1' | 'x2' | 'y2' | 'orientation'> & {
  x: number;
  y: number;
  width: number;
}) {
  return (
    <CotationLine
      x1={x}
      y1={y}
      x2={x + width}
      y2={y}
      value={value}
      orientation="horizontal"
      offset={offset}
      {...props}
    />
  );
}

// Composant simplifie pour cotation verticale
export function CotationV({
  x,
  y,
  height,
  value,
  offset = -25,
  ...props
}: Omit<CotationLineProps, 'x1' | 'y1' | 'x2' | 'y2' | 'orientation'> & {
  x: number;
  y: number;
  height: number;
}) {
  return (
    <CotationLine
      x1={x}
      y1={y}
      x2={x}
      y2={y + height}
      value={value}
      orientation="vertical"
      offset={offset}
      {...props}
    />
  );
}
