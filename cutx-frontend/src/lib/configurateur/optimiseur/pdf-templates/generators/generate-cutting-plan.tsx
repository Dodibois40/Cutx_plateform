/**
 * Générateur pour le PDF Plan de Découpe
 */

import { pdf } from '@react-pdf/renderer';
import { CuttingPlanDocument } from '../documents/CuttingPlanDocument';
import { formatDateFile } from '../styles/pdf-styles';
import type { PanneauOptimise, CuttingPlanData } from '../types';

/**
 * Génère le PDF Plan de Découpe et retourne un Blob
 */
export async function generateCuttingPlanPdf(
  panneaux: PanneauOptimise[],
  projectName: string = 'Sans nom'
): Promise<Blob> {
  const data: CuttingPlanData = {
    panneaux,
    projectName,
    generatedAt: new Date(),
  };

  const doc = <CuttingPlanDocument data={data} />;
  const blob = await pdf(doc).toBlob();

  return blob;
}

/**
 * Génère et télécharge le PDF Plan de Découpe
 */
export async function downloadCuttingPlanPdf(
  panneaux: PanneauOptimise[],
  projectName?: string
): Promise<void> {
  const name = projectName || 'CutX';
  const blob = await generateCuttingPlanPdf(panneaux, name);

  // Créer le lien de téléchargement
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Plan_Decoupe_${sanitizeFilename(name)}_${formatDateFile()}.pdf`;

  // Déclencher le téléchargement
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libérer la mémoire
  URL.revokeObjectURL(url);
}

/**
 * Nettoie un nom de fichier (supprime les caractères spéciaux)
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\-_\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}
