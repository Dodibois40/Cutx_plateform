import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBouneyRefs() {
  console.log('🔄 Migration des références fabricant Bouney...\n');

  // 1. Trouver tous les panels Bouney avec colorChoice mais sans manufacturerRef
  const bouneyPanels = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      manufacturerRef: null,
      colorChoice: { not: null },
    },
    select: {
      id: true,
      reference: true,
      colorChoice: true,
    },
  });

  console.log(`📊 Trouvé ${bouneyPanels.length} panels Bouney à migrer\n`);

  if (bouneyPanels.length === 0) {
    console.log('✅ Aucune migration nécessaire');
    return;
  }

  // 2. Migrer chaque panel individuellement (pour éviter les problèmes de trigger)
  let migrated = 0;
  let errors = 0;

  for (const panel of bouneyPanels) {
    try {
      await prisma.panel.update({
        where: { id: panel.id },
        data: { manufacturerRef: panel.colorChoice },
      });
      migrated++;

      if (migrated % 100 === 0) {
        console.log(`  Migré ${migrated}/${bouneyPanels.length}...`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Erreur pour ${panel.reference}: ${error}`);
    }
  }

  console.log(`\n✅ Migration terminée:`);
  console.log(`   - ${migrated} panels migrés`);
  console.log(`   - ${errors} erreurs`);

  // 3. Vérification
  const sample = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      manufacturerRef: { not: null },
    },
    take: 5,
    select: {
      reference: true,
      manufacturerRef: true,
      colorChoice: true,
    },
  });

  console.log('\n📋 Échantillon après migration:');
  sample.forEach(p => {
    console.log(`   ${p.reference}: manufacturerRef=${p.manufacturerRef}, colorChoice=${p.colorChoice}`);
  });
}

migrateBouneyRefs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
