/**
 * Carte pour afficher une chute dans le catalogue PDF
 */

import { View, Text, Svg, Rect } from '@react-pdf/renderer';
import { styles, colors, fonts } from '../styles/pdf-styles';
import type { OffcutItem } from '../types';

interface OffcutCardProps {
  offcut: OffcutItem;
  index: number;
}

export function OffcutCard({ offcut, index }: OffcutCardProps) {
  return (
    <View style={styles.offcutCard}>
      {/* Visuel miniature */}
      <View style={styles.offcutVisual}>
        <Svg width={60} height={40}>
          {/* Rectangle proportionnel */}
          {renderProportionalRect(offcut.longueur, offcut.largeur, 60, 40)}
        </Svg>
        <Text style={styles.offcutVisualText}>
          {offcut.longueur}×{offcut.largeur}
        </Text>
      </View>

      {/* Informations */}
      <View style={styles.offcutInfo}>
        <Text style={styles.offcutTitle}>CHUTE #{index}</Text>

        <Text style={styles.offcutDetail}>
          Matériau: {offcut.materiau}
        </Text>

        {offcut.decor && (
          <Text style={styles.offcutDetail}>
            Décor: {offcut.decor}
          </Text>
        )}

        <Text style={styles.offcutDetail}>
          Épaisseur: {offcut.epaisseur}mm
        </Text>

        <Text style={styles.offcutDetail}>
          Dimensions: {offcut.longueur} × {offcut.largeur} mm
        </Text>

        <Text style={styles.offcutDetail}>
          Surface: {offcut.surface.toFixed(3)} m²
        </Text>

        <Text style={styles.offcutPrice}>
          Prix estimé: ~{offcut.prixEstime.toFixed(0)}€
        </Text>
      </View>
    </View>
  );
}

/**
 * Dessine un rectangle proportionnel aux dimensions de la chute
 */
function renderProportionalRect(
  longueur: number,
  largeur: number,
  maxWidth: number,
  maxHeight: number
) {
  const ratio = Math.min(maxWidth / longueur, maxHeight / largeur);
  const w = longueur * ratio * 0.8; // 80% pour laisser de la marge
  const h = largeur * ratio * 0.8;

  const x = (maxWidth - w) / 2;
  const y = (maxHeight - h) / 2;

  return (
    <Rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={colors.chuteLight}
      stroke={colors.chute}
      strokeWidth={1}
    />
  );
}
