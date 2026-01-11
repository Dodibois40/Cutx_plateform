/**
 * Document PDF: Catalogue des Chutes
 *
 * Génère un PDF catalogue pour la marketplace CutX Chutes.
 * Affiche les chutes valorisables (> 200×200mm) avec:
 * - Visuel miniature
 * - Caractéristiques (matériau, dimensions, surface)
 * - Prix estimé
 * - Total et CTA
 */

import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, formatDate, colors } from '../styles/pdf-styles';
import { PdfHeader } from '../components/PdfHeader';
import { PdfFooter } from '../components/PdfFooter';
import { OffcutCard } from '../components/OffcutCard';
import type { OffcutsCatalogData } from '../types';

interface OffcutsCatalogDocumentProps {
  data: OffcutsCatalogData;
}

export function OffcutsCatalogDocument({ data }: OffcutsCatalogDocumentProps) {
  // Si aucune chute valorisable
  if (data.offcuts.length === 0) {
    return (
      <Document
        title={`Catalogue Chutes - ${data.projectName}`}
        author="CutX Platform"
      >
        <Page size="A4" style={styles.page}>
          <PdfHeader
            title="Catalogue Chutes"
            projectName={data.projectName}
            date={formatDate(data.generatedAt)}
          />

          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textLight }}>
              Aucune chute valorisable dans cette optimisation.
            </Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 10 }}>
              Les chutes doivent faire au minimum 200 × 200 mm pour être valorisées.
            </Text>
          </View>

          <PdfFooter />
        </Page>
      </Document>
    );
  }

  // Calculer combien de chutes par page (environ 4-5 par page A4)
  const offcutsPerPage = 5;
  const pages = [];

  for (let i = 0; i < data.offcuts.length; i += offcutsPerPage) {
    pages.push(data.offcuts.slice(i, i + offcutsPerPage));
  }

  return (
    <Document
      title={`Catalogue Chutes - ${data.projectName}`}
      author="CutX Platform"
      subject="Chutes disponibles à la vente"
      creator="CutX"
    >
      {pages.map((pageOffcuts, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
          {/* Header (seulement sur la première page) */}
          {pageIndex === 0 && (
            <PdfHeader
              title="Catalogue Chutes Disponibles"
              projectName={data.projectName}
              date={formatDate(data.generatedAt)}
            />
          )}

          {/* Sous-titre si page suivante */}
          {pageIndex > 0 && (
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.title}>
                Catalogue Chutes - Suite
              </Text>
              <Text style={styles.meta}>
                Projet: {data.projectName}
              </Text>
            </View>
          )}

          {/* Liste des chutes */}
          {pageOffcuts.map((offcut, index) => (
            <OffcutCard
              key={offcut.id}
              offcut={offcut}
              index={pageIndex * offcutsPerPage + index + 1}
            />
          ))}

          {/* Total (seulement sur la dernière page) */}
          {pageIndex === pages.length - 1 && (
            <>
              <View style={styles.totalBar}>
                <View>
                  <Text style={styles.totalText}>
                    Total: {data.offcuts.length} chute{data.offcuts.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.totalText}>
                    Surface totale: {data.totalSurface.toFixed(3)} m²
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.totalValue}>
                    Valeur estimée: ~{data.totalValue.toFixed(0)}€
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.textMuted }}>
                    (prix neuf -30%)
                  </Text>
                </View>
              </View>

              {/* CTA */}
              <View style={styles.cta}>
                <Text style={styles.ctaText}>
                  Vendez vos chutes sur cutx.fr/chutes
                </Text>
              </View>
            </>
          )}

          {/* Footer */}
          <PdfFooter />
        </Page>
      ))}
    </Document>
  );
}
