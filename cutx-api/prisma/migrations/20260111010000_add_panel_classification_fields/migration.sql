-- Migration: Add panel classification fields for review system
-- Date: 2026-01-11

-- ============================================
-- 1. CREATE ENUMS
-- ============================================

-- Panel Review Status
DO $$ BEGIN
    CREATE TYPE "PanelReviewStatus" AS ENUM ('NON_VERIFIE', 'VERIFIE', 'A_CORRIGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Category (PANNEAU vs ACCESSOIRE)
DO $$ BEGIN
    CREATE TYPE "ProductCategory" AS ENUM ('PANNEAU', 'ACCESSOIRE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Type (panel types)
DO $$ BEGIN
    CREATE TYPE "ProductType" AS ENUM (
        'MELAMINE', 'STRATIFIE', 'CHANT', 'MDF', 'CONTREPLAQUE',
        'MASSIF', 'AGGLO_BRUT', 'OSB', 'COMPACT', 'SOLID_SURFACE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Sub Type
DO $$ BEGIN
    CREATE TYPE "ProductSubType" AS ENUM (
        'MEL_STANDARD', 'MEL_ULTRA_MAT', 'MEL_BRILLANT',
        'STRAT_HPL', 'STRAT_CPL',
        'CHANT_ABS', 'CHANT_MELAMINE', 'CHANT_MASSIF',
        'MDF_BRUT', 'MDF_LAQUE', 'MDF_PLAQUE',
        'MASSIF_BOIS', 'MASSIF_3_PLIS', 'LAMELLE_COLLE',
        'SS_ACRYLIQUE', 'SS_POLYESTER', 'SS_QUARTZ'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Decor Category
DO $$ BEGIN
    CREATE TYPE "DecorCategory" AS ENUM (
        'UNIS', 'BOIS', 'PIERRE', 'BETON', 'METAL', 'TEXTILE', 'FANTAISIE', 'SANS_DECOR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grain Direction
DO $$ BEGIN
    CREATE TYPE "GrainDirection" AS ENUM ('LENGTH', 'WIDTH', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Core Type
DO $$ BEGIN
    CREATE TYPE "CoreType" AS ENUM (
        'P2', 'P3', 'MDF_STD', 'MDF_HDF', 'CONTREPLAQUE', 'AUCUN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Core Color
DO $$ BEGIN
    CREATE TYPE "CoreColor" AS ENUM ('BLANC', 'NOIR', 'NATUREL', 'AUTRE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lamella Type (for solid wood panels)
DO $$ BEGIN
    CREATE TYPE "LamellaType" AS ENUM ('ABOUTE', 'NON_ABOUTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. ADD COLUMNS TO Panel TABLE
-- ============================================

-- Review fields
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "reviewStatus" "PanelReviewStatus" NOT NULL DEFAULT 'NON_VERIFIE';
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;

-- Classification fields
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "productCategory" "ProductCategory";
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "panelType" "ProductType";
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "panelSubType" "ProductSubType";

-- Decor fields
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "decorCode" TEXT;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "decorName" TEXT;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "decorCategory" "DecorCategory";
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "decorSubCategory" TEXT;

-- Finish fields
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "finishCode" TEXT;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "finishName" TEXT;

-- Technical fields
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "grainDirection" "GrainDirection";
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "coreType" "CoreType";
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "coreColor" "CoreColor";
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "lamellaType" "LamellaType";

-- Boolean flags
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "isHydrofuge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "isIgnifuge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "isPreglued" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Panel" ADD COLUMN IF NOT EXISTS "isSynchronized" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 3. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS "Panel_reviewStatus_idx" ON "Panel" ("reviewStatus");
CREATE INDEX IF NOT EXISTS "Panel_decorCode_idx" ON "Panel" ("decorCode");
CREATE INDEX IF NOT EXISTS "Panel_decorCategory_idx" ON "Panel" ("decorCategory");
CREATE INDEX IF NOT EXISTS "Panel_panelType_idx" ON "Panel" ("panelType");
CREATE INDEX IF NOT EXISTS "Panel_manufacturer_idx" ON "Panel" ("manufacturer");

-- ============================================
-- 4. REFRESH STATISTICS
-- ============================================

ANALYZE "Panel";
