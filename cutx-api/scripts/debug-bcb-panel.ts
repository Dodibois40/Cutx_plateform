import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Voir tous les champs d'un panneau problématique
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-79618' }
  });

  console.log('=== DONNÉES COMPLÈTES BCB-79618 ===');
  console.log(JSON.stringify(panel, null, 2));

  // Vérifier si on a des panneaux BCB MDF avec de vraies données
  const goodBcb = await prisma.panel.findFirst({
    where: {
      reference: { startsWith: 'BCB-' },
      name: { not: { contains: 'Panneau Standard' } },
      productType: 'MDF'
    }
  });

  if (goodBcb) {
    console.log('\n=== PANNEAU BCB MDF AVEC BONNES DONNÉES ===');
    console.log(JSON.stringify(goodBcb, null, 2));
  } else {
    console.log('\nAucun panneau BCB MDF avec bonnes données trouvé!');
  }

  // Chercher dans les backups si on en a
  console.log('\n=== VÉRIFICATION BACKUPS ===');
  const fs = await import('fs');
  const path = await import('path');

  const backupDir = path.join(process.cwd(), 'backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    console.log('Fichiers backup trouvés:', files);
  } else {
    console.log('Pas de dossier backups/');
  }

  // Vérifier la date de modification des panneaux
  const recentUpdates = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-' }, productType: 'MDF' },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { reference: true, name: true, updatedAt: true }
  });

  console.log('\n=== DERNIÈRES MISES À JOUR BCB MDF ===');
  for (const p of recentUpdates) {
    console.log(`${p.reference}: ${p.updatedAt} - "${p.name?.substring(0, 30)}"`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
