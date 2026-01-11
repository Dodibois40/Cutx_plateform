/**
 * Barre de statistiques pour le PDF Plan de Découpe
 */

import { View, Text } from '@react-pdf/renderer';
import { styles, calculateFillRate } from '../styles/pdf-styles';
import type { PanneauOptimise, DebitPlace, ZoneChute } from '../types';

interface PdfStatsBarProps {
  panneau: PanneauOptimise;
}

export function PdfStatsBar({ panneau }: PdfStatsBarProps) {
  const nbPieces = panneau.debitsPlaces?.length || 0;
  const nbChutes = panneau.zonesChute?.length || 0;

  const surfaceTotale = panneau.dimensions.longueur * panneau.dimensions.largeur;
  const surfaceUtilisee = panneau.debitsPlaces?.reduce(
    (sum: number, d: DebitPlace) => sum + d.longueur * d.largeur,
    0
  ) || 0;
  const tauxRemplissage = calculateFillRate(surfaceUtilisee, surfaceTotale);

  const surfaceChutes = panneau.zonesChute?.reduce(
    (sum: number, c: ZoneChute) => sum + c.longueur * c.largeur,
    0
  ) || 0;
  const surfaceChutesM2 = (surfaceChutes / 1_000_000).toFixed(3);

  const stats = [
    { label: 'Pièces', value: nbPieces.toString() },
    { label: 'Remplissage', value: `${tauxRemplissage}%` },
    { label: 'Chutes', value: nbChutes.toString() },
    { label: 'Surface chutes', value: `${surfaceChutesM2} m²` },
  ];

  return (
    <View style={styles.statsBar}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statItem}>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}
