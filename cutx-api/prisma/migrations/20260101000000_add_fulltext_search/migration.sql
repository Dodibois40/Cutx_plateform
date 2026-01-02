-- Add Full-Text Search to Panel table
-- This migration adds a tsvector column with GIN index and trigger for automatic updates

-- 1. Add the searchVector column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Panel' AND column_name = 'searchVector'
    ) THEN
        ALTER TABLE "Panel" ADD COLUMN "searchVector" tsvector;
    END IF;
END $$;

-- 2. Create the GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "Panel_searchVector_idx" ON "Panel" USING GIN ("searchVector");

-- 3. Create function to update search vector
CREATE OR REPLACE FUNCTION panel_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW."searchVector" :=
        setweight(to_tsvector('french', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(NEW.reference, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(NEW.decor, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(NEW."colorChoice", '')), 'B') ||
        setweight(to_tsvector('french', coalesce(NEW."productType", '')), 'C') ||
        setweight(to_tsvector('french', coalesce(NEW.material, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for automatic updates
DROP TRIGGER IF EXISTS panel_search_vector_trigger ON "Panel";
CREATE TRIGGER panel_search_vector_trigger
    BEFORE INSERT OR UPDATE OF name, reference, decor, "colorChoice", "productType", material
    ON "Panel"
    FOR EACH ROW
    EXECUTE FUNCTION panel_search_vector_update();

-- 5. Populate search vectors for existing data
UPDATE "Panel" SET
    "searchVector" =
        setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(reference, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(decor, '')), 'B') ||
        setweight(to_tsvector('french', coalesce("colorChoice", '')), 'B') ||
        setweight(to_tsvector('french', coalesce("productType", '')), 'C') ||
        setweight(to_tsvector('french', coalesce(material, '')), 'C');
