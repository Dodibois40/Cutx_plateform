/**
 * Visualisation simplifiée du panneau pour le PDF
 */

import React from 'react';
import { View, Svg, Rect, G } from '@react-pdf/renderer';
import { styles, colors } from '../styles/pdf-styles';
import type { PanneauOptimise, DebitPlace, ZoneChute } from '../types';

interface PdfPanelVisualizationProps {
  panneau: PanneauOptimise;
  width?: number;
  height?: number;
}

export function PdfPanelVisualization({
  panneau,
  width = 400,
  height = 280,
}: PdfPanelVisualizationProps) {
  const padding = 10;
  const availableWidth = width - 2 * padding;
  const availableHeight = height - 2 * padding;

  const panneauLongueur = panneau.dimensions.longueur;
  const panneauLargeur = panneau.dimensions.largeur;

  const scaleX = availableWidth / panneauLongueur;
  const scaleY = availableHeight / panneauLargeur;
  const scale = Math.min(scaleX, scaleY);

  const panneauWidth = panneauLongueur * scale;
  const panneauHeight = panneauLargeur * scale;

  const offsetX = padding + (availableWidth - panneauWidth) / 2;
  const offsetY = padding + (availableHeight - panneauHeight) / 2;

  return (
    <View style={styles.visualizationContainer}>
      <Svg width={width} height={height}>
        <Rect
          x={offsetX}
          y={offsetY}
          width={panneauWidth}
          height={panneauHeight}
          fill="#f5f5f5"
          stroke={colors.border}
          strokeWidth={1}
        />
        {panneau.debitsPlaces?.map((piece: DebitPlace, index: number) => {
          // Si rotation, les dimensions visuelles sont inversées
          const pieceW = (piece.rotation ? piece.largeur : piece.longueur) * scale;
          const pieceH = (piece.rotation ? piece.longueur : piece.largeur) * scale;
          return (
            <G key={`piece-${index}`}>
              <Rect
                x={offsetX + piece.x * scale}
                y={offsetY + piece.y * scale}
                width={pieceW}
                height={pieceH}
                fill={colors.piece}
                stroke={colors.pieceStroke}
                strokeWidth={0.5}
              />
              {renderChantIndicators(piece, offsetX, offsetY, scale)}
            </G>
          );
        })}
        {panneau.zonesChute?.map((chute: ZoneChute, index: number) => (
          <Rect
            key={`chute-${index}`}
            x={offsetX + chute.x * scale}
            y={offsetY + chute.y * scale}
            width={chute.longueur * scale}
            height={chute.largeur * scale}
            fill={colors.chuteLight}
            stroke={colors.chute}
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        ))}
      </Svg>
    </View>
  );
}

function renderChantIndicators(
  piece: DebitPlace,
  offsetX: number,
  offsetY: number,
  scale: number
): React.ReactElement[] {
  const chantWidth = 2;
  const indicators: React.ReactElement[] = [];

  const x = offsetX + piece.x * scale;
  const y = offsetY + piece.y * scale;

  // Si rotation, les dimensions visuelles sont inversées
  const w = (piece.rotation ? piece.largeur : piece.longueur) * scale;
  const h = (piece.rotation ? piece.longueur : piece.largeur) * scale;

  // Déterminer quels côtés ont un chant (en tenant compte de la rotation)
  const chants = piece.chants ?? { A: false, B: false, C: false, D: false };
  const chantsVisuels = piece.rotation
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

  // Haut
  if (chantsVisuels.top) {
    indicators.push(
      <Rect key="chant-top" x={x} y={y} width={w} height={chantWidth} fill={colors.chant} />
    );
  }
  // Bas
  if (chantsVisuels.bottom) {
    indicators.push(
      <Rect key="chant-bottom" x={x} y={y + h - chantWidth} width={w} height={chantWidth} fill={colors.chant} />
    );
  }
  // Gauche
  if (chantsVisuels.left) {
    indicators.push(
      <Rect key="chant-left" x={x} y={y} width={chantWidth} height={h} fill={colors.chant} />
    );
  }
  // Droite
  if (chantsVisuels.right) {
    indicators.push(
      <Rect key="chant-right" x={x + w - chantWidth} y={y} width={chantWidth} height={h} fill={colors.chant} />
    );
  }

  return indicators;
}
