'use client';

import { useState } from 'react';

// Couleurs Tendances 2026 - Inspiration Farrow & Ball / Ressource
export interface TrendColor {
  name: string;
  hex: string;
  description: string;
}

export const TREND_COLORS_2026: TrendColor[] = [
  { name: 'Vert Empire', hex: '#4A5D54', description: 'Vert de gris profond' },
  { name: 'Terre Cuite', hex: '#B8725C', description: 'Terracotta éteint' },
  { name: 'Bleu Abysse', hex: '#2B4857', description: 'Bleu canard profond' },
  { name: 'Ocre Sauvage', hex: '#C1954A', description: 'Ocre moutarde raffiné' },
  { name: 'Greige Parisien', hex: '#A69B8E', description: 'Gris-beige intemporel' },
  { name: 'Noir Charbon', hex: '#2C2C2C', description: 'Noir charbon mat' },
];

interface ColorTrendsProps {
  onSelectColor: (hex: string) => void;
}

export default function ColorTrends({ onSelectColor }: ColorTrendsProps) {
  const [hoveredTrend, setHoveredTrend] = useState<TrendColor | null>(null);

  return (
    <>
      <div className="trends-section">
        <h4 className="section-title-trend">Tendances 2026</h4>
        <div className="trends-grid">
          {TREND_COLORS_2026.map((trendColor) => (
            <button
              key={trendColor.hex}
              className="trend-swatch"
              style={{ backgroundColor: trendColor.hex }}
              onClick={() => onSelectColor(trendColor.hex)}
              onMouseEnter={() => setHoveredTrend(trendColor)}
              onMouseLeave={() => setHoveredTrend(null)}
            >
              {hoveredTrend?.hex === trendColor.hex && (
                <span className="trend-name">{trendColor.name}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .trends-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title-trend {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--admin-noyer);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .trends-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1rem;
        }

        .trend-swatch {
          position: relative;
          aspect-ratio: 1;
          border-radius: 10px;
          border: 1px solid var(--admin-border-subtle);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .trend-swatch:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          border-color: var(--admin-noyer);
        }

        .trend-swatch:active {
          transform: translateY(-2px) scale(1.02);
        }

        .trend-name {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.6) 50%,
            transparent 100%
          );
          color: white;
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 1rem 0.5rem 0.5rem 0.5rem;
          text-align: center;
          line-height: 1.2;
          letter-spacing: 0.02em;
          animation: fadeInUp 0.2s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hidden on mobile */
        @media (max-width: 768px) {
          .trends-section {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
