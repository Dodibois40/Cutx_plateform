-- Phase 1: Add missing search indexes for 15k+ products scalability
--
-- This migration adds indexes on existing columns:
-- 1. Index for manufacturerRef (EGGER codes like H1180)
-- 2. Index for colorChoice (Egger codes via Bouney)
-- 3. Index for supplierCode (internal Bouney codes)
-- 4. Composite index for productType + decorCategory
-- 5. Index for stockStatus filter
--
-- SAFE TO RUN: Uses IF NOT EXISTS for all operations

-- ============================================
-- PHASE 1.1: MISSING INDEXES ON EXISTING COLUMNS
-- ============================================

-- Index for manufacturerRef (EGGER codes like H1180, important for autocomplete)
CREATE INDEX IF NOT EXISTS "Panel_manufacturerRef_idx"
    ON "Panel" ("manufacturerRef")
    WHERE "manufacturerRef" IS NOT NULL AND "isActive" = true;

-- Index for colorChoice (Egger codes via Bouney)
CREATE INDEX IF NOT EXISTS "Panel_colorChoice_idx"
    ON "Panel" ("colorChoice")
    WHERE "colorChoice" IS NOT NULL AND "isActive" = true;

-- Index for supplierCode (internal Bouney codes like "81163")
CREATE INDEX IF NOT EXISTS "Panel_supplierCode_idx"
    ON "Panel" ("supplierCode")
    WHERE "supplierCode" IS NOT NULL AND "isActive" = true;

-- Composite index for smart search (productType + decorCategory)
CREATE INDEX IF NOT EXISTS "Panel_productType_decorCategory_idx"
    ON "Panel" ("productType", "decorCategory")
    WHERE "isActive" = true;

-- Index for stockStatus filter ("en stock")
CREATE INDEX IF NOT EXISTS "Panel_stockStatus_idx"
    ON "Panel" ("stockStatus")
    WHERE "isActive" = true AND "stockStatus" IS NOT NULL;

-- ============================================
-- PHASE 1.2: ADD searchVector AND searchText COLUMNS
-- ============================================

-- Add searchVector column for full-text search (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Panel' AND column_name = 'searchVector'
    ) THEN
        ALTER TABLE "Panel" ADD COLUMN "searchVector" tsvector;
        RAISE NOTICE 'Added searchVector column';
    ELSE
        RAISE NOTICE 'searchVector column already exists';
    END IF;
END $$;

-- Add searchText column for trigram search (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Panel' AND column_name = 'searchText'
    ) THEN
        ALTER TABLE "Panel" ADD COLUMN "searchText" text;
        RAISE NOTICE 'Added searchText column';
    ELSE
        RAISE NOTICE 'searchText column already exists';
    END IF;
END $$;

-- ============================================
-- PHASE 1.3: CREATE EXTENSIONS IF NOT EXISTS
-- ============================================

-- Enable unaccent extension (for accent-insensitive search)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enable pg_trgm extension (for trigram similarity search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create french_unaccent text search config (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'french_unaccent') THEN
        CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);
        ALTER TEXT SEARCH CONFIGURATION french_unaccent
            ALTER MAPPING FOR hword, hword_part, word
            WITH unaccent, french_stem;
        RAISE NOTICE 'Created french_unaccent text search configuration';
    ELSE
        RAISE NOTICE 'french_unaccent configuration already exists';
    END IF;
END $$;

-- ============================================
-- PHASE 1.4: INDEXES FOR SEARCH COLUMNS
-- ============================================

-- GIN index for full-text search on searchVector
CREATE INDEX IF NOT EXISTS "Panel_searchVector_idx" ON "Panel" USING GIN ("searchVector");

-- GIN index for trigram similarity on searchText
CREATE INDEX IF NOT EXISTS "Panel_searchText_trgm_idx" ON "Panel" USING GIN ("searchText" gin_trgm_ops);

-- ============================================
-- PHASE 1.5: SEARCH VECTOR TRIGGER FUNCTION
-- ============================================

-- Function to auto-update searchVector and searchText
CREATE OR REPLACE FUNCTION panel_search_vector_update() RETURNS trigger AS $$
BEGIN
    -- Update tsvector with french_unaccent config (removes accents)
    -- Weight A: Primary identifiers (highest priority)
    -- Weight B: Decor and color (medium priority)
    -- Weight C: Type and material (lower priority)
    NEW."searchVector" :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.name, ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.reference, ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."manufacturerRef", ''))), 'A') ||
        -- Weight B: Decor and color
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.decor, ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."colorChoice", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."decorCode", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."decorName", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."finishName", ''))), 'B') ||
        -- Weight C: Type and material
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW."productType", ''))), 'C') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(NEW.material, ''))), 'C');

    -- Update searchText for trigram search (normalized, lowercase, no accents)
    NEW."searchText" := lower(unaccent(
        coalesce(NEW.name, '') || ' ' ||
        coalesce(NEW.reference, '') || ' ' ||
        coalesce(NEW."manufacturerRef", '') || ' ' ||
        coalesce(NEW.decor, '') || ' ' ||
        coalesce(NEW."colorChoice", '') || ' ' ||
        coalesce(NEW."decorCode", '') || ' ' ||
        coalesce(NEW."decorName", '')
    ));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create/update trigger
DROP TRIGGER IF EXISTS panel_search_vector_trigger ON "Panel";
CREATE TRIGGER panel_search_vector_trigger
    BEFORE INSERT OR UPDATE OF name, reference, decor, "colorChoice", "productType",
                               material, "manufacturerRef", "decorCode", "decorName", "finishName"
    ON "Panel"
    FOR EACH ROW
    EXECUTE FUNCTION panel_search_vector_update();

-- ============================================
-- PHASE 1.6: POPULATE SEARCH VECTORS (batched)
-- ============================================

-- Rebuild all search vectors with the new fields
DO $$
DECLARE
    batch_size INT := 1000;
    offset_val INT := 0;
    updated INT;
    total_updated INT := 0;
BEGIN
    RAISE NOTICE 'Starting searchVector population...';
    LOOP
        UPDATE "Panel" SET
            "searchVector" =
                setweight(to_tsvector('french_unaccent', unaccent(coalesce(name, ''))), 'A') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce(reference, ''))), 'A') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce("manufacturerRef", ''))), 'A') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce(decor, ''))), 'B') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce("colorChoice", ''))), 'B') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce("decorCode", ''))), 'B') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce("decorName", ''))), 'B') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce("finishName", ''))), 'B') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce("productType", ''))), 'C') ||
                setweight(to_tsvector('french_unaccent', unaccent(coalesce(material, ''))), 'C'),
            "searchText" = lower(unaccent(
                coalesce(name, '') || ' ' ||
                coalesce(reference, '') || ' ' ||
                coalesce("manufacturerRef", '') || ' ' ||
                coalesce(decor, '') || ' ' ||
                coalesce("colorChoice", '') || ' ' ||
                coalesce("decorCode", '') || ' ' ||
                coalesce("decorName", '')
            ))
        WHERE id IN (
            SELECT id FROM "Panel"
            WHERE "isActive" = true
            ORDER BY id
            LIMIT batch_size OFFSET offset_val
        );
        GET DIAGNOSTICS updated = ROW_COUNT;
        total_updated := total_updated + updated;
        EXIT WHEN updated = 0;
        offset_val := offset_val + batch_size;
        RAISE NOTICE 'Updated % rows (total: %)', updated, total_updated;
    END LOOP;
    RAISE NOTICE 'searchVector population complete. Total updated: %', total_updated;
END $$;

-- Update statistics for query optimizer
ANALYZE "Panel";

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- To rollback indexes:
--   DROP INDEX IF EXISTS "Panel_manufacturerRef_idx";
--   DROP INDEX IF EXISTS "Panel_colorChoice_idx";
--   DROP INDEX IF EXISTS "Panel_supplierCode_idx";
--   DROP INDEX IF EXISTS "Panel_productType_decorCategory_idx";
--   DROP INDEX IF EXISTS "Panel_stockStatus_idx";
--
-- To remove search columns (CAUTION: data loss):
--   ALTER TABLE "Panel" DROP COLUMN IF EXISTS "searchVector";
--   ALTER TABLE "Panel" DROP COLUMN IF EXISTS "searchText";
