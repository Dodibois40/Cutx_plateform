'use client';

import { useMemo } from 'react';
import type { UsinageTemplate, TechnicalSvgData } from '@/lib/configurateur/types';

interface Props {
  template: UsinageTemplate;
  configValues: Record<string, number>;
}

// Composant de ligne de cote style AutoCAD/DXF
function DimensionLine({
  start,
  end,
  value,
  unit = 'mm',
  offset = 0,
}: {
  start: [number, number];
  end: [number, number];
  value: number;
  unit?: string;
  offset?: number;
}) {
  const [x1, y1] = start;
  const [x2, y2] = end;

  const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Offset pour la ligne de cote
  const offsetX = isHorizontal ? 0 : offset;
  const offsetY = isHorizontal ? offset : 0;

  return (
    <g className="dimension-line">
      {/* Ligne de cote */}
      <line
        x1={x1 + offsetX}
        y1={y1 + offsetY}
        x2={x2 + offsetX}
        y2={y2 + offsetY}
        stroke="#e74c3c"
        strokeWidth="0.5"
      />

      {/* Fleches */}
      <polygon
        points={
          isHorizontal
            ? `${x1 + offsetX},${y1 + offsetY - 2} ${x1 + offsetX + 4},${y1 + offsetY} ${x1 + offsetX},${y1 + offsetY + 2}`
            : `${x1 + offsetX - 2},${y1 + offsetY} ${x1 + offsetX},${y1 + offsetY + 4} ${x1 + offsetX + 2},${y1 + offsetY}`
        }
        fill="#e74c3c"
      />
      <polygon
        points={
          isHorizontal
            ? `${x2 + offsetX},${y2 + offsetY - 2} ${x2 + offsetX - 4},${y2 + offsetY} ${x2 + offsetX},${y2 + offsetY + 2}`
            : `${x2 + offsetX - 2},${y2 + offsetY} ${x2 + offsetX},${y2 + offsetY - 4} ${x2 + offsetX + 2},${y2 + offsetY}`
        }
        fill="#e74c3c"
      />

      {/* Lignes d'extension */}
      <line
        x1={x1}
        y1={y1}
        x2={x1 + offsetX}
        y2={y1 + offsetY}
        stroke="#e74c3c"
        strokeWidth="0.3"
        strokeDasharray="2,1"
      />
      <line
        x1={x2}
        y1={y2}
        x2={x2 + offsetX}
        y2={y2 + offsetY}
        stroke="#e74c3c"
        strokeWidth="0.3"
        strokeDasharray="2,1"
      />

      {/* Texte de la valeur */}
      <text
        x={midX + offsetX}
        y={midY + offsetY - 3}
        textAnchor="middle"
        fontSize="8"
        fill="#e74c3c"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        {value} {unit}
      </text>
    </g>
  );
}

export function UsinageTechnicalSvg({ template, configValues }: Props) {
  // Parser le technicalSvg JSON
  const svgData = useMemo<TechnicalSvgData | null>(() => {
    if (!template.technicalSvg) return null;
    try {
      return JSON.parse(template.technicalSvg);
    } catch {
      return null;
    }
  }, [template.technicalSvg]);

  // Rendu d'un element SVG
  const renderElement = (el: Record<string, unknown>, index: number) => {
    switch (el.type) {
      case 'rect':
        return (
          <rect
            key={index}
            x={el.x as number}
            y={el.y as number}
            width={el.width as number}
            height={el.height as number}
            stroke={el.stroke as string || '#333'}
            strokeWidth={el.strokeWidth as number || 1}
            fill={el.fill as string || 'none'}
          />
        );
      case 'line':
        return (
          <line
            key={index}
            x1={el.x1 as number}
            y1={el.y1 as number}
            x2={el.x2 as number}
            y2={el.y2 as number}
            stroke={el.stroke as string || '#333'}
            strokeWidth={el.strokeWidth as number || 1}
            strokeDasharray={el.strokeDasharray as string}
          />
        );
      case 'circle':
        return (
          <circle
            key={index}
            cx={el.cx as number}
            cy={el.cy as number}
            r={el.r as number}
            stroke={el.stroke as string || '#333'}
            strokeWidth={el.strokeWidth as number || 1}
            fill={el.fill as string || 'none'}
          />
        );
      case 'path':
        return (
          <path
            key={index}
            d={el.d as string}
            stroke={el.stroke as string || '#333'}
            strokeWidth={el.strokeWidth as number || 1}
            fill={el.fill as string || 'none'}
          />
        );
      case 'polyline':
        return (
          <polyline
            key={index}
            points={el.points as string}
            stroke={el.stroke as string || '#333'}
            strokeWidth={el.strokeWidth as number || 1}
            fill={el.fill as string || 'none'}
          />
        );
      default:
        return null;
    }
  };

  // Si pas de dessin technique, afficher un placeholder
  if (!svgData) {
    return (
      <div className="technical-svg-placeholder">
        <style jsx>{`
          .technical-svg-placeholder {
            width: 100%;
            height: 200px;
            background: var(--admin-bg-tertiary, #f5f5f0);
            border: 1px dashed var(--admin-border-default, #e0e0e0);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--admin-text-muted, #999);
          }

          .placeholder-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 0.5rem;
            opacity: 0.5;
          }

          .placeholder-text {
            font-size: 0.875rem;
          }
        `}</style>

        <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          <path d="M4 9h16M9 4v16" />
        </svg>
        <span className="placeholder-text">Dessin technique</span>
      </div>
    );
  }

  return (
    <div className="technical-svg-container">
      <style jsx>{`
        .technical-svg-container {
          width: 100%;
          background: white;
          border: 1px solid var(--admin-border-default, #e0e0e0);
          border-radius: 8px;
          padding: 1rem;
        }

        .technical-svg {
          width: 100%;
          height: auto;
          max-height: 250px;
        }

        .technical-svg :global(.dimension-line) {
          pointer-events: none;
        }
      `}</style>

      <svg
        className="technical-svg"
        viewBox={svgData.viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grille de fond */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Elements du dessin */}
        {svgData.elements.map((el, index) => renderElement(el as Record<string, unknown>, index))}

        {/* Lignes de cote */}
        {svgData.dimensions.map((dim, index) => (
          <DimensionLine
            key={dim.key}
            start={dim.start}
            end={dim.end}
            value={configValues[dim.key] || 0}
            unit={dim.unit || 'mm'}
            offset={15 + index * 12}
          />
        ))}
      </svg>
    </div>
  );
}
