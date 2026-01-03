-- Migration: Add unaccent support for accent-insensitive search
-- This enables searching "chene" to find "chêne"

-- 1. Enable the unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Enable pg_trgm for fuzzy/similarity search (like Google)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. Create a custom text search configuration that removes accents
-- This combines French stemming with accent removal
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'french_unaccent') THEN
        CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);
        ALTER TEXT SEARCH CONFIGURATION french_unaccent
            ALTER MAPPING FOR hword, hword_part, word
            WITH unaccent, french_stem;
    END IF;
END $$;

-- 4. Add a normalized search column for trigram similarity search
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Panel' AND column_name = 'searchText'
    ) THEN
        ALTER TABLE "Panel" ADD COLUMN "searchText" text;
    END IF;
END $$;

-- 5. Create GIN index for trigram similarity on searchText
CREATE INDEX IF NOT EXISTS "Panel_searchText_trgm_idx" ON "Panel" USING GIN ("searchText" gin_trgm_ops);

-- 6. Update the search vector function to use unaccent configuration
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

-- 7. Recreate trigger to include searchText
DROP TRIGGER IF EXISTS panel_search_vector_trigger ON "Panel";
CREATE TRIGGER panel_search_vector_trigger
    BEFORE INSERT OR UPDATE OF name, reference, decor, "colorChoice", "productType", material
    ON "Panel"
    FOR EACH ROW
    EXECUTE FUNCTION panel_search_vector_update();

-- 8. Rebuild all search vectors and searchText with the new configuration
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
    ));
