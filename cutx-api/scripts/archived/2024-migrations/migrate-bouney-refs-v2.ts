import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBouneyRefs() {
  console.log('🔄 Migration des références fabricant Bouney...\n');

  try {
    // 1. Disable the trigger that's causing the issue
    console.log('1. Désactivation des triggers...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger;
    `);
    console.log('   ✓ Trigger panel_search_vector_trigger désactivé');

    // 2. Count panels to migrate
    const countResult = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Panel"
      WHERE reference LIKE 'BCB-%'
        AND "manufacturerRef" IS NULL
        AND "colorChoice" IS NOT NULL
    `;
    const count = Number(countResult[0].count);
    console.log(`\n2. ${count} panels Bouney à migrer`);

    if (count > 0) {
      // 3. Update in bulk with raw SQL
      console.log('\n3. Migration des données...');
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "Panel"
        SET "manufacturerRef" = "colorChoice"
        WHERE reference LIKE 'BCB-%'
          AND "manufacturerRef" IS NULL
          AND "colorChoice" IS NOT NULL
      `);
      console.log(`   ✓ ${result} panels mis à jour`);
    }

    // 4. Re-enable the trigger
    console.log('\n4. Réactivation des triggers...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger;
    `);
    console.log('   ✓ Trigger panel_search_vector_trigger réactivé');

    // 5. Verification
    console.log('\n5. Vérification...');
    const sample = await prisma.panel.findMany({
      where: {
        reference: { startsWith: 'BCB-' },
        manufacturerRef: { not: null },
      },
      take: 10,
      select: {
        reference: true,
        name: true,
        manufacturerRef: true,
        colorChoice: true,
      },
    });

    console.log('\n📋 Échantillon après migration:');
    sample.forEach(p => {
      console.log(`   ${p.reference}: manufacturerRef=${p.manufacturerRef}`);
    });

    // Count H1180 panels
    const h1180Count = await prisma.panel.count({
      where: {
        OR: [
          { manufacturerRef: { contains: 'H1180' } },
          { colorChoice: { contains: 'H1180' } },
        ],
      },
    });
    console.log(`\n✅ Total panels H1180 trouvables: ${h1180Count}`);

  } catch (error) {
    console.error('❌ Erreur:', error);

    // Make sure to re-enable the trigger even if there's an error
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger;
      `);
      console.log('   Trigger réactivé après erreur');
    } catch (e) {
      console.error('   Impossible de réactiver le trigger:', e);
    }
  }
}

migrateBouneyRefs().finally(() => prisma.$disconnect());
