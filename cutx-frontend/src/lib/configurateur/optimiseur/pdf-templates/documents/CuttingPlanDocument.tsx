/**
 * Document PDF: Plan de Découpe
 */

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, formatDate } from '../styles/pdf-styles';
import { PdfHeader } from '../components/PdfHeader';
import { PdfFooter } from '../components/PdfFooter';
import { PdfPanelVisualization } from '../components/PdfPanelVisualization';
import { PdfPiecesTable } from '../components/PdfPiecesTable';
import { PdfStatsBar } from '../components/PdfStatsBar';
import type { CuttingPlanData } from '../types';

interface CuttingPlanDocumentProps {
  data: CuttingPlanData;
}

export function CuttingPlanDocument({ data }: CuttingPlanDocumentProps) {
  return (
    <Document
      title={`Plan de Découpe - ${data.projectName}`}
      author="CutX Platform"
      subject="Plan de découpe optimisé"
      creator="CutX"
    >
      {data.panneaux.map((panneau, index) => (
        <Page
          key={`panneau-${index}`}
          size="A4"
          orientation="landscape"
          style={styles.pageLandscape}
        >
          <PdfHeader
            title="Plan de Découpe"
            projectName={data.projectName}
            date={formatDate(data.generatedAt)}
          />

          <View style={styles.panneauInfo}>
            <Text style={styles.panneauTitle}>
              Panneau {index + 1}/{data.panneaux.length} : {panneau.panneauNom || 'Panneau'}
            </Text>
            <Text style={styles.panneauDimensions}>
              {panneau.dimensions.longueur} × {panneau.dimensions.largeur} × {panneau.dimensions.epaisseur}mm
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flex: 1, marginBottom: 60 }}>
            <View style={{ flex: 2, marginRight: 15 }}>
              <PdfPanelVisualization panneau={panneau} width={450} height={280} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subtitle}>Pièces à découper</Text>
              <PdfPiecesTable pieces={panneau.debitsPlaces || []} />
            </View>
          </View>

          <PdfStatsBar panneau={panneau} />
          <PdfFooter />
        </Page>
      ))}
    </Document>
  );
}
