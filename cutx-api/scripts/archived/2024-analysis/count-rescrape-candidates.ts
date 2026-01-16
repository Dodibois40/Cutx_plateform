/**
 * Compter les candidats pour le rescraping
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function count() {
  // Tous les produits sans dimensions (utiliser findMany + length)
  const allMissing = await prisma.panel.findMany({
    where: {
      productType: { in: ['PLAN_DE_TRAVAIL', 'COMPACT', 'SOLID_SURFACE'] },
      defaultLength: 0,  // Int obligatoire, valeur par défaut = 0
    },
    select: { reference: true },
  });

  // Avec ID numérique (URL constructible)
  const withNumericId = allMissing.filter(p => !p.reference.includes('REF-'));

  // Avec référence REF-timestamp
  const withRefTimestamp = allMissing.filter(p => p.reference.includes('REF-'));

  console.log('📊 CANDIDATS AU RESCRAPING\n');
  console.log(`Total sans dimensions: ${allMissing.length}`);
  console.log(`   ✅ Avec ID numérique (URL possible): ${withNumericId.length}`);
  console.log(`   ⏭️  Avec REF-timestamp (pas d'URL): ${withRefTimestamp.length}`);

  // Exemples de chaque type
  console.log('\n📋 Exemples avec ID numérique:');
  withNumericId.slice(0, 5).forEach(p => {
    console.log(`   ${p.reference}`);
  });

  console.log('\n📋 Exemples avec REF-timestamp:');
  withRefTimestamp.slice(0, 5).forEach(p => {
    console.log(`   ${p.reference}`);
  });
}

count()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
