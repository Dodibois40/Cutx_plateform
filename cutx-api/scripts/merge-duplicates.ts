/**
 * Script pour détecter et fusionner les doublons de panneaux
 *
 * Problème identifié:
 * - 105083-unilin → a les dimensions mais pas le prix
 * - BCB-105083 → a le prix mais pas les dimensions
 *
 * Solution: Fusionner en gardant le meilleur de chaque
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PanelData {
  id: string;
  reference: string;
  name: string;
  defaultLength: number;
  defaultWidth: number;
  defaultThickness: number | null;
  thickness: number[];
  pricePerM2: number | null;
  imageUrl: string | null;
  material: string | null;
  finish: string | null;
  categoryId: string | null;
}

/**
 * Extrait le code numérique d'une référence
 * Ex: "105083-unilin" → "105083"
 *     "BCB-105083" → "105083"
 *     "BCB-105083-b-comme-bois" → "105083"
 */
function extractNumericCode(reference: string): string | null {
  // Chercher un nombre de 5-6 chiffres
  const match = reference.match(/\b(\d{5,6})\b/);
  return match ? match[1] : null;
}

async function main() {
  console.log('🔍 ANALYSE DES DOUBLONS DE PANNEAUX');
  console.log('='.repeat(60));

  // Récupérer tous les panneaux
  const allPanels = await prisma.panel.findMany({
    select: {
      id: true,
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      thickness: true,
      pricePerM2: true,
      imageUrl: true,
      material: true,
      finish: true,
      categoryId: true,
    }
  });

  console.log(`\n📊 Total panneaux: ${allPanels.length}`);

  // Grouper par code numérique
  const byCode = new Map<string, PanelData[]>();

  for (const panel of allPanels) {
    const code = extractNumericCode(panel.reference);
    if (code) {
      if (!byCode.has(code)) {
        byCode.set(code, []);
      }
      byCode.get(code)!.push(panel as PanelData);
    }
  }

  // Trouver les doublons
  const duplicates: [string, PanelData[]][] = [];
  for (const [code, panels] of byCode) {
    if (panels.length > 1) {
      duplicates.push([code, panels]);
    }
  }

  console.log(`\n🔄 Codes avec doublons: ${duplicates.length}`);

  if (duplicates.length === 0) {
    console.log('✅ Aucun doublon trouvé!');
    await prisma.$disconnect();
    return;
  }

  // Analyser quelques exemples
  console.log('\n📋 Exemples de doublons:');
  for (const [code, panels] of duplicates.slice(0, 5)) {
    console.log(`\n   Code: ${code}`);
    for (const p of panels) {
      const hasDim = p.defaultLength > 0 && p.defaultWidth > 0;
      const hasPrice = p.pricePerM2 !== null && p.pricePerM2 > 0;
      console.log(`      - ${p.reference}`);
      console.log(`        Dimensions: ${hasDim ? `${p.defaultLength}x${p.defaultWidth}` : '❌'}`);
      console.log(`        Prix: ${hasPrice ? `${p.pricePerM2}€` : '❌'}`);
      console.log(`        Image: ${p.imageUrl ? '✅' : '❌'}`);
    }
  }

  // Statistiques
  let canMerge = 0;
  let oneHasDim = 0;
  let oneHasPrice = 0;

  for (const [code, panels] of duplicates) {
    const withDim = panels.filter(p => p.defaultLength > 0 && p.defaultWidth > 0);
    const withPrice = panels.filter(p => p.pricePerM2 !== null && p.pricePerM2 > 0);

    if (withDim.length > 0 && withPrice.length > 0) {
      canMerge++;
    }
    if (withDim.length > 0) oneHasDim++;
    if (withPrice.length > 0) oneHasPrice++;
  }

  console.log('\n📊 Statistiques des doublons:');
  console.log(`   Total groupes de doublons: ${duplicates.length}`);
  console.log(`   Au moins un avec dimensions: ${oneHasDim}`);
  console.log(`   Au moins un avec prix: ${oneHasPrice}`);
  console.log(`   Peuvent être fusionnés (dim + prix): ${canMerge}`);

  // Demander confirmation pour fusionner
  console.log('\n' + '='.repeat(60));
  console.log('🔧 FUSION DES DOUBLONS');
  console.log('='.repeat(60));

  let merged = 0;
  let deleted = 0;
  let errors = 0;

  for (const [code, panels] of duplicates) {
    try {
      // Trouver le meilleur panel pour chaque attribut
      const withDim = panels.find(p => p.defaultLength > 0 && p.defaultWidth > 0);
      const withPrice = panels.find(p => p.pricePerM2 !== null && p.pricePerM2 > 0);
      const withImage = panels.find(p => p.imageUrl && p.imageUrl.length > 0);
      const withThickness = panels.find(p => p.thickness && p.thickness.length > 0);

      // Choisir le panel principal (préférer celui avec le plus de données)
      // Priorité: celui avec dimensions, sinon celui avec prix
      const mainPanel = withDim || withPrice || panels[0];
      const otherPanels = panels.filter(p => p.id !== mainPanel.id);

      // Construire les données fusionnées
      const mergedData: any = {};

      // Dimensions
      if (withDim && mainPanel.defaultLength === 0) {
        mergedData.defaultLength = withDim.defaultLength;
        mergedData.defaultWidth = withDim.defaultWidth;
      }

      // Prix
      if (withPrice && (mainPanel.pricePerM2 === null || mainPanel.pricePerM2 === 0)) {
        mergedData.pricePerM2 = withPrice.pricePerM2;
      }

      // Image (préférer Firebase)
      if (withImage && (!mainPanel.imageUrl || mainPanel.imageUrl.includes('bcommebois'))) {
        const firebaseImage = panels.find(p => p.imageUrl?.includes('firebasestorage'));
        if (firebaseImage) {
          mergedData.imageUrl = firebaseImage.imageUrl;
        }
      }

      // Thickness
      if (withThickness && (!mainPanel.thickness || mainPanel.thickness.length === 0)) {
        mergedData.thickness = withThickness.thickness;
      }

      // Mettre à jour le panel principal si nécessaire
      if (Object.keys(mergedData).length > 0) {
        await prisma.panel.update({
          where: { id: mainPanel.id },
          data: mergedData
        });
        merged++;
      }

      // Supprimer les doublons
      for (const other of otherPanels) {
        await prisma.panel.delete({
          where: { id: other.id }
        });
        deleted++;
      }

    } catch (err) {
      console.error(`   ❌ Erreur pour code ${code}: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log('\n📊 RÉSULTAT DE LA FUSION:');
  console.log(`   ✅ Panneaux mis à jour: ${merged}`);
  console.log(`   🗑️ Doublons supprimés: ${deleted}`);
  console.log(`   ❌ Erreurs: ${errors}`);

  // Vérification finale
  const finalCount = await prisma.panel.count();
  console.log(`\n📊 Total panneaux après fusion: ${finalCount}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
