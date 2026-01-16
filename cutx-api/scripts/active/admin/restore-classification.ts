import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function restoreClassification() {
  const backupDir = path.join(__dirname, '..', 'backups');

  // Lister les backups disponibles
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('classification-backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('❌ Aucune sauvegarde trouvée dans', backupDir);
    process.exit(1);
  }

  console.log('=== RESTAURATION DE LA CLASSIFICATION ===\n');
  console.log('Sauvegardes disponibles:');
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f}`);
  });

  // Prendre le fichier passé en argument ou le plus récent
  const arg = process.argv[2];
  let backupFile: string;

  if (arg) {
    if (fs.existsSync(arg)) {
      backupFile = arg;
    } else if (fs.existsSync(path.join(backupDir, arg))) {
      backupFile = path.join(backupDir, arg);
    } else {
      const index = parseInt(arg) - 1;
      if (index >= 0 && index < files.length) {
        backupFile = path.join(backupDir, files[index]);
      } else {
        console.log('❌ Fichier non trouvé:', arg);
        process.exit(1);
      }
    }
  } else {
    // Par défaut, utiliser le plus récent
    backupFile = path.join(backupDir, files[0]);
  }

  console.log(`\n📂 Fichier sélectionné: ${path.basename(backupFile)}`);

  // Lire le backup
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log(`📊 Date de la sauvegarde: ${backupData.timestamp}`);
  console.log(`📦 Produits à restaurer: ${backupData.totalPanels}`);

  // Confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    rl.question('\n⚠️  ATTENTION: Cela va écraser la classification actuelle!\nContinuer? (oui/non): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'oui') {
    console.log('❌ Annulé');
    process.exit(0);
  }

  console.log('\n🔄 Restauration en cours...\n');

  let updated = 0;
  let errors = 0;

  for (const panel of backupData.panels) {
    try {
      await prisma.panel.update({
        where: { id: panel.id },
        data: {
          panelType: panel.panelType,
          panelSubType: panel.panelSubType,
          productCategory: panel.productCategory,
          decorCategory: panel.decorCategory,
          decorCode: panel.decorCode,
          decorName: panel.decorName,
          decorSubCategory: panel.decorSubCategory,
          finishCode: panel.finishCode,
          finishName: panel.finishName,
          grainDirection: panel.grainDirection,
          coreType: panel.coreType,
          coreColor: panel.coreColor,
          isHydrofuge: panel.isHydrofuge,
          isIgnifuge: panel.isIgnifuge,
          isPreglued: panel.isPreglued,
          isSynchronized: panel.isSynchronized,
          isFullRoll: panel.isFullRoll,
          lamellaType: panel.lamellaType,
          manufacturer: panel.manufacturer,
          reviewStatus: panel.reviewStatus,
          categoryId: panel.categoryId,
        }
      });
      updated++;
      if (updated % 500 === 0) {
        console.log(`  ${updated}/${backupData.totalPanels} restaurés...`);
      }
    } catch (e) {
      errors++;
      console.error(`  ❌ Erreur pour ${panel.reference}:`, (e as Error).message);
    }
  }

  console.log(`\n✅ Restauration terminée!`);
  console.log(`   - Mis à jour: ${updated}`);
  console.log(`   - Erreurs: ${errors}`);

  await prisma.$disconnect();
}

restoreClassification().catch(console.error);
