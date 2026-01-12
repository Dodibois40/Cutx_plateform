/**
 * Générateur pour le PDF Catalogue Chutes
 */

import { pdf } from '@react-pdf/renderer';
import { OffcutsCatalogDocument } from '../documents/OffcutsCatalogDocument';
import { formatDateFile } from '../styles/pdf-styles';
import type { PanneauOptimise, OffcutItem, OffcutsCatalogData, ZoneChute } from '../types';

// Prix par défaut si le panneau n'a pas de prix défini
const DEFAULT_PRICE_PER_M2 = 50;
// Ratio pour les chutes (70% du prix neuf = -30%)
const OFFCUT_PRICE_RATIO = 0.7;

export function collectOffcuts(panneaux: PanneauOptimise[]): OffcutItem[] {
  const offcuts: OffcutItem[] = [];
  const minSize = 200;

  panneaux.forEach((panneau: PanneauOptimise, panneauIndex: number) => {
    if (!panneau.zonesChute) return;

    // Utiliser le prix réel du panneau ou le prix par défaut
    const prixM2 = panneau.prixM2 ?? DEFAULT_PRICE_PER_M2;

    panneau.zonesChute.forEach((chute: ZoneChute, chuteIndex: number) => {
      if (chute.longueur < minSize || chute.largeur < minSize) return;

      const surface = (chute.longueur * chute.largeur) / 1_000_000;
      // Prix estimé = surface × prix au m² × ratio chute (70%)
      const prixEstime = surface * prixM2 * OFFCUT_PRICE_RATIO;

      offcuts.push({
        id: `chute-${panneauIndex}-${chuteIndex}`,
        materiau: panneau.panneauNom || 'Mélaminé',
        decor: '',
        epaisseur: panneau.dimensions.epaisseur || 18,
        longueur: chute.longueur,
        largeur: chute.largeur,
        surface,
        prixEstime,
        panneauIndex,
      });
    });
  });

  offcuts.sort((a, b) => b.surface - a.surface);
  return offcuts;
}

export async function generateOffcutsCatalogPdf(
  panneaux: PanneauOptimise[],
  projectName: string = 'Sans nom'
): Promise<Blob> {
  const offcuts = collectOffcuts(panneaux);

  const data: OffcutsCatalogData = {
    offcuts,
    projectName,
    generatedAt: new Date(),
    totalSurface: offcuts.reduce((sum, o) => sum + o.surface, 0),
    totalValue: offcuts.reduce((sum, o) => sum + o.prixEstime, 0),
  };

  const doc = <OffcutsCatalogDocument data={data} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}

export async function downloadOffcutsCatalogPdf(
  panneaux: PanneauOptimise[],
  projectName?: string
): Promise<void> {
  const name = projectName || 'CutX';
  const blob = await generateOffcutsCatalogPdf(panneaux, name);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Catalogue_Chutes_${sanitizeFilename(name)}_${formatDateFile()}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}
