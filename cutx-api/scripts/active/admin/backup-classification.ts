import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupClassification() {
  console.log('=== SAUVEGARDE DE LA CLASSIFICATION DU CATALOGUE ===\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'backups');

  // Créer le dossier backups s'il n'existe pas
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Récupérer toutes les données de classification
  const panels = await prisma.panel.findMany({
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
      panelSubType: true,
      productCategory: true,
      decorCategory: true,
      decorCode: true,
      decorName: true,
      decorSubCategory: true,
      finishCode: true,
      finishName: true,
      grainDirection: true,
      coreType: true,
      coreColor: true,
      isHydrofuge: true,
      isIgnifuge: true,
      isPreglued: true,
      isSynchronized: true,
      isFullRoll: true,
      lamellaType: true,
      manufacturer: true,
      reviewStatus: true,
      categoryId: true,
      thickness: true,
      defaultThickness: true,
      pricePerM2: true,
      pricePerMl: true,
      pricePerUnit: true,
      pricePerPanel: true,
    }
  });

  console.log(`📦 ${panels.length} produits à sauvegarder`);

  // Créer le fichier de backup
  const backupFile = path.join(backupDir, `classification-backup-${timestamp}.json`);

  const backupData = {
    timestamp: new Date().toISOString(),
    totalPanels: panels.length,
    version: '1.0',
    panels: panels
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`✅ Sauvegarde créée: ${backupFile}`);

  // Créer aussi un fichier de stats pour référence rapide
  const statsFile = path.join(backupDir, `classification-stats-${timestamp}.txt`);

  const stats: string[] = [];
  stats.push(`=== STATISTIQUES DE CLASSIFICATION - ${new Date().toISOString()} ===\n`);
  stats.push(`Total produits: ${panels.length}\n`);

  // Par panelType
  const byType: Record<string, number> = {};
  panels.forEach(p => {
    const key = p.panelType || 'NULL';
    byType[key] = (byType[key] || 0) + 1;
  });
  stats.push('\nPar panelType:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    stats.push(`  ${k}: ${v}`);
  });

  // Par decorCategory
  const byDecor: Record<string, number> = {};
  panels.forEach(p => {
    const key = p.decorCategory || 'NULL';
    byDecor[key] = (byDecor[key] || 0) + 1;
  });
  stats.push('\n\nPar decorCategory:');
  Object.entries(byDecor).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    stats.push(`  ${k}: ${v}`);
  });

  // Par reviewStatus
  const byStatus: Record<string, number> = {};
  panels.forEach(p => {
    const key = p.reviewStatus || 'NULL';
    byStatus[key] = (byStatus[key] || 0) + 1;
  });
  stats.push('\n\nPar reviewStatus:');
  Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    stats.push(`  ${k}: ${v}`);
  });

  fs.writeFileSync(statsFile, stats.join('\n'));
  console.log(`📊 Stats créées: ${statsFile}`);

  // Afficher le chemin absolu pour référence
  console.log(`\n📁 Dossier de backup: ${backupDir}`);
  console.log(`\n✨ Sauvegarde terminée avec succès!`);

  await prisma.$disconnect();
}

backupClassification().catch(console.error);
