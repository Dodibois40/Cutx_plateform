/**
 * Script to apply the unaccent search migration
 * Run with: npx tsx scripts/apply-unaccent-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Applying unaccent search migration...\n');

  try {
    // 1. Enable the unaccent extension
    console.log('1. Enabling unaccent extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
    console.log('   ✓ unaccent extension enabled');

    // 2. Enable pg_trgm for fuzzy/similarity search
    console.log('2. Enabling pg_trgm extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    console.log('   ✓ pg_trgm extension enabled');

    // 3. Create french_unaccent text search configuration
    console.log('3. Creating french_unaccent text search config...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'french_unaccent') THEN
          CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);
          ALTER TEXT SEARCH CONFIGURATION french_unaccent
            ALTER MAPPING FOR hword, hword_part, word
            WITH unaccent, french_stem;
        END IF;
      END $$;
    `);
    console.log('   ✓ french_unaccent config created');

    // 4. Add searchVector column if it doesn't exist
    console.log('4. Adding searchVector column...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Panel' AND column_name = 'searchVector'
        ) THEN
          ALTER TABLE "Panel" ADD COLUMN "searchVector" tsvector;
        END IF;
      END $$;
    `);
    console.log('   ✓ searchVector column added');

    // 5. Add searchText column if it doesn't exist
    console.log('5. Adding searchText column...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Panel' AND column_name = 'searchText'
        ) THEN
          ALTER TABLE "Panel" ADD COLUMN "searchText" text;
        END IF;
      END $$;
    `);
    console.log('   ✓ searchText column added');

    // 6. Create GIN index for searchVector
    console.log('6. Creating searchVector GIN index...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Panel_searchVector_idx"
      ON "Panel" USING GIN ("searchVector");
    `);
    console.log('   ✓ searchVector index created');

    // 7. Create GIN index for trigram similarity
    console.log('7. Creating trigram GIN index...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Panel_searchText_trgm_idx"
      ON "Panel" USING GIN ("searchText" gin_trgm_ops);
    `);
    console.log('   ✓ trigram index created');

    // 8. Update the search vector function to use unaccent
    console.log('8. Updating search vector function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION panel_search_vector_update() RETURNS trigger AS $$
      BEGIN
        -- Update tsvector with french_unaccent config (removes accents)
        NEW."searchVector" :=
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.name, ''))), 'A') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.reference, ''))), 'A') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.decor, ''))), 'B') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."colorChoice", ''))), 'B') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."productType", ''))), 'C') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.material, ''))), 'C');

        -- Update searchText for trigram search (normalized, lowercase, no accents)
        NEW."searchText" := lower(unaccent(
          coalesce(NEW.name, '') || ' ' ||
          coalesce(NEW.reference, '') || ' ' ||
          coalesce(NEW.decor, '') || ' ' ||
          coalesce(NEW."colorChoice", '') || ' ' ||
          coalesce(NEW."productType", '') || ' ' ||
          coalesce(NEW.material, '')
        ));

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ search vector function updated');

    // 9. Recreate trigger
    console.log('9. Recreating search trigger...');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS panel_search_vector_trigger ON "Panel";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER panel_search_vector_trigger
        BEFORE INSERT OR UPDATE OF name, reference, decor, "colorChoice", "productType", material
        ON "Panel"
        FOR EACH ROW
        EXECUTE FUNCTION panel_search_vector_update();
    `);
    console.log('   ✓ trigger recreated');

    // 10. Count panels to rebuild
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "Panel"`;
    const totalPanels = Number(countResult[0].count);
    console.log(`\n10. Rebuilding search vectors for ${totalPanels} panels...`);

    // 11. Rebuild search vectors in batches
    const batchSize = 1000;
    let processed = 0;

    while (processed < totalPanels) {
      await prisma.$executeRawUnsafe(`
        UPDATE "Panel" SET
          "searchVector" =
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(name, ''))), 'A') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(reference, ''))), 'A') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(decor, ''))), 'B') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce("colorChoice", ''))), 'B') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce("productType", ''))), 'C') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(material, ''))), 'C'),
          "searchText" = lower(unaccent(
            coalesce(name, '') || ' ' ||
            coalesce(reference, '') || ' ' ||
            coalesce(decor, '') || ' ' ||
            coalesce("colorChoice", '') || ' ' ||
            coalesce("productType", '') || ' ' ||
            coalesce(material, '')
          ))
        WHERE id IN (
          SELECT id FROM "Panel"
          ORDER BY id
          LIMIT ${batchSize}
          OFFSET ${processed}
        )
      `);

      processed += batchSize;
      const progress = Math.min(processed, totalPanels);
      console.log(`   Processed ${progress}/${totalPanels} panels (${Math.round(progress / totalPanels * 100)}%)`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nThe search now supports:');
    console.log('  - Accent-insensitive search: "chene" will find "chêne"');
    console.log('  - Fuzzy matching: typos and similar words will be found');
    console.log('  - Full-text search with French stemming');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
