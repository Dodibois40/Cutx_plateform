/**
 * Composant Header réutilisable pour les PDF CutX
 */

import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/pdf-styles';

interface PdfHeaderProps {
  title: string;
  projectName?: string;
  date: string;
}

export function PdfHeader({ title, projectName, date }: PdfHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Logo + Titre */}
      <View style={styles.headerLeft}>
        <Text style={styles.logo}>CutX</Text>
        <View>
          <Text style={styles.title}>{title}</Text>
          {projectName && (
            <Text style={styles.meta}>Projet: {projectName}</Text>
          )}
        </View>
      </View>

      {/* Date */}
      <Text style={styles.meta}>{date}</Text>
    </View>
  );
}
