-- Optimisations pour la scalabilité du catalogue (100k+ produits)
-- Cette migration ajoute:
-- 1. Trigger pour auto-remplir defaultThickness depuis thickness[1]
-- 2. Index pour améliorer les performances de recherche et filtrage

-- ============================================
-- 1. TRIGGER AUTO-POPULATE defaultThickness
-- ============================================

-- Fonction pour auto-remplir defaultThickness depuis le premier élément de thickness[]
-- Ceci évite les problèmes de tri quand defaultThickness est NULL
CREATE OR REPLACE FUNCTION panel_auto_fill_thickness() RETURNS trigger AS $$
BEGIN
    -- Si defaultThickness est NULL mais thickness[] a des éléments
    IF NEW."defaultThickness" IS NULL AND array_length(NEW.thickness, 1) > 0 THEN
        -- Utiliser la première épaisseur si elle est valide (entre 0.1 et 100mm)
        IF NEW.thickness[1] >= 0.1 AND NEW.thickness[1] <= 100 THEN
            NEW."defaultThickness" := NEW.thickness[1];
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS panel_auto_fill_thickness_trigger ON "Panel";

-- Créer le trigger pour INSERT et UPDATE
CREATE TRIGGER panel_auto_fill_thickness_trigger
    BEFORE INSERT OR UPDATE OF thickness, "defaultThickness"
    ON "Panel"
    FOR EACH ROW
    EXECUTE FUNCTION panel_auto_fill_thickness();

-- ============================================
-- 2. INDEX POUR PERFORMANCES
-- ============================================

-- Index composite pour recherche de catégories par catalogue
-- Améliore: GET /catalogues/:slug avec include categories
CREATE INDEX IF NOT EXISTS "Category_catalogueId_slug_idx"
    ON "Category" ("catalogueId", "slug");

-- Index pour filtrage par type de produit (très fréquent)
-- Utilise un index partiel sur isActive=true pour réduire la taille
CREATE INDEX IF NOT EXISTS "Panel_productType_isActive_idx"
    ON "Panel" ("productType")
    WHERE "isActive" = true;

-- Index pour tri par épaisseur (fréquent dans la bibliothèque)
-- Index partiel excluant les NULL pour performances
CREATE INDEX IF NOT EXISTS "Panel_defaultThickness_idx"
    ON "Panel" ("defaultThickness")
    WHERE "defaultThickness" IS NOT NULL;

-- Index pour filtrage par catalogue + productType (combinaison fréquente)
CREATE INDEX IF NOT EXISTS "Panel_catalogueId_productType_idx"
    ON "Panel" ("catalogueId", "productType")
    WHERE "isActive" = true;

-- Index pour recherche par référence (lookup rapide)
-- Note: reference a déjà un index unique, mais on ajoute un partiel pour isActive
CREATE INDEX IF NOT EXISTS "Panel_reference_active_idx"
    ON "Panel" ("reference")
    WHERE "isActive" = true;

-- ============================================
-- 3. METTRE À JOUR LES DONNÉES EXISTANTES
-- ============================================

-- Appliquer le trigger sur les données existantes
-- Remplir defaultThickness pour les panneaux où il est NULL mais thickness[] existe
UPDATE "Panel"
SET "defaultThickness" = thickness[1]
WHERE "defaultThickness" IS NULL
    AND array_length(thickness, 1) > 0
    AND thickness[1] >= 0.1
    AND thickness[1] <= 100;

-- ============================================
-- 4. STATISTIQUES (pour l'optimiseur de requêtes)
-- ============================================

-- Mettre à jour les statistiques après les changements
ANALYZE "Panel";
ANALYZE "Category";
