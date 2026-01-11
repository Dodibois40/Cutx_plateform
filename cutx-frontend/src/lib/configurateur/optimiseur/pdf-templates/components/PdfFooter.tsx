/**
 * Composant Footer réutilisable pour les PDF CutX
 * Affiche le numéro de page et le branding
 */

import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/pdf-styles';

export function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>CutX Platform - cutx.fr</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}
