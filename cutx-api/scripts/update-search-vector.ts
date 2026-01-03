/**
 * Update search vector to include manufacturerRef
 * This allows searching by Egger decor codes (U963, H3170, etc.)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Updating search vector to include manufacturerRef...\n');

  try {
    // 1. Update the search vector function to include manufacturerRef
    console.log('1. Updating search vector function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION panel_search_vector_update() RETURNS trigger AS $$
      BEGIN
        -- Update tsvector with french_unaccent config (removes accents)
        -- Weight A: name, reference, manufacturerRef (highest priority)
        -- Weight B: decor, colorChoice (medium priority)
        -- Weight C: productType, material (lower priority)
        NEW."searchVector" :=
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.name, ''))), 'A') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.reference, ''))), 'A') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."manufacturerRef", ''))), 'A') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.decor, ''))), 'B') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."colorChoice", ''))), 'B') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."productType", ''))), 'C') ||
          setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.material, ''))), 'C');

        -- Update searchText for trigram search (normalized, lowercase, no accents)
        -- Include manufacturerRef for fuzzy matching on decor codes
        NEW."searchText" := lower(unaccent(
          coalesce(NEW.name, '') || ' ' ||
          coalesce(NEW.reference, '') || ' ' ||
          coalesce(NEW."manufacturerRef", '') || ' ' ||
          coalesce(NEW.decor, '') || ' ' ||
          coalesce(NEW."colorChoice", '') || ' ' ||
          coalesce(NEW."productType", '') || ' ' ||
          coalesce(NEW.material, '')
        ));

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Function updated to include manufacturerRef');

    // 2. Recreate trigger to also watch manufacturerRef changes
    console.log('\n2. Updating trigger...');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS panel_search_vector_trigger ON "Panel";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER panel_search_vector_trigger
        BEFORE INSERT OR UPDATE OF name, reference, "manufacturerRef", decor, "colorChoice", "productType", material
        ON "Panel"
        FOR EACH ROW
        EXECUTE FUNCTION panel_search_vector_update();
    `);
    console.log('   ✓ Trigger updated');

    // 3. Count panels to rebuild
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "Panel"`;
    const totalPanels = Number(countResult[0].count);
    console.log(`\n3. Rebuilding search vectors for ${totalPanels} panels...`);

    // 4. Rebuild search vectors in batches
    const batchSize = 1000;
    let processed = 0;

    while (processed < totalPanels) {
      await prisma.$executeRawUnsafe(`
        UPDATE "Panel" SET
          "searchVector" =
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(name, ''))), 'A') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(reference, ''))), 'A') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce("manufacturerRef", ''))), 'A') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(decor, ''))), 'B') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce("colorChoice", ''))), 'B') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce("productType", ''))), 'C') ||
            setweight(to_tsvector('french_unaccent', unaccent(coalesce(material, ''))), 'C'),
          "searchText" = lower(unaccent(
            coalesce(name, '') || ' ' ||
            coalesce(reference, '') || ' ' ||
            coalesce("manufacturerRef", '') || ' ' ||
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

    // 5. Test the search
    console.log('\n4. Testing search for "U963"...');
    const testResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "Panel" p
      WHERE p."isActive" = true
        AND p."searchVector" @@ to_tsquery('french_unaccent', 'u963:*')
    `;
    console.log(`   Found ${testResult[0].count} panels for "U963"`);

    // Show some results
    const results = await prisma.$queryRaw<{ reference: string; name: string; catalogue_name: string }[]>`
      SELECT p.reference, p.name, c.name as catalogue_name
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND p."searchVector" @@ to_tsquery('french_unaccent', 'u963:*')
      LIMIT 10
    `;
    console.log('\n   Sample results:');
    results.forEach(r => {
      console.log(`   - [${r.catalogue_name}] ${r.reference}: ${r.name.substring(0, 60)}...`);
    });

    console.log('\n✅ Search vector updated successfully!');
    console.log('   manufacturerRef (decor codes like U963, H3170) is now searchable');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
