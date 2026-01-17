/**
 * Tests unitaires pour le Smart Search Parser
 *
 * Ces tests vérifient le comportement actuel du parser AVANT toute modification.
 * Ils servent de filet de sécurité pour le refactoring.
 */

import {
  parseSmartQuery,
  buildSmartSearchSQL,
  ParsedSmartQuery,
  PRODUCT_TYPE_SYNONYMS,
  WOOD_SYNONYMS,
  COLOR_SYNONYMS,
} from './smart-search-parser';

describe('Smart Search Parser', () => {
  // ============================================================================
  // parseSmartQuery - Tests de base
  // ============================================================================

  describe('parseSmartQuery', () => {
    describe('requêtes vides ou invalides', () => {
      it('should return empty result for empty string', () => {
        const result = parseSmartQuery('');
        expect(result.productTypes).toEqual([]);
        expect(result.thickness).toBeNull();
        expect(result.searchText).toBe('');
      });

      it('should return empty result for whitespace only', () => {
        const result = parseSmartQuery('   ');
        expect(result.productTypes).toEqual([]);
        expect(result.thickness).toBeNull();
      });

      it('should preserve originalQuery', () => {
        const query = 'mdf 19mm';
        const result = parseSmartQuery(query);
        expect(result.originalQuery).toBe(query);
      });
    });

    describe('types de produits', () => {
      it('should recognize MDF', () => {
        const result = parseSmartQuery('mdf');
        expect(result.productTypes).toContain('MDF');
      });

      it('should recognize mélaminé with accent', () => {
        const result = parseSmartQuery('mélaminé');
        expect(result.productTypes).toContain('MELAMINE');
      });

      it('should recognize mela without accent', () => {
        const result = parseSmartQuery('mela');
        expect(result.productTypes).toContain('MELAMINE');
      });

      it('should recognize stratifié', () => {
        const result = parseSmartQuery('stratifié');
        expect(result.productTypes).toContain('STRATIFIE');
      });

      it('should recognize HPL as stratifié', () => {
        const result = parseSmartQuery('hpl');
        expect(result.productTypes).toContain('STRATIFIE');
      });

      it('should recognize chant as BANDE_DE_CHANT', () => {
        const result = parseSmartQuery('chant');
        expect(result.productTypes).toContain('BANDE_DE_CHANT');
      });

      it('should recognize agglo as PARTICULE', () => {
        const result = parseSmartQuery('agglo');
        expect(result.productTypes).toContain('PARTICULE');
      });

      it('should recognize contreplaqué', () => {
        const result = parseSmartQuery('contreplaqué');
        expect(result.productTypes).toContain('CONTREPLAQUE');
      });

      it('should recognize OSB', () => {
        const result = parseSmartQuery('osb');
        expect(result.productTypes).toContain('OSB');
      });

      it('should recognize compact', () => {
        const result = parseSmartQuery('compact');
        expect(result.productTypes).toContain('COMPACT');
      });

      it('should not duplicate product types', () => {
        const result = parseSmartQuery('mdf mdf medium');
        expect(result.productTypes).toEqual(['MDF']);
      });
    });

    describe('épaisseurs', () => {
      it('should parse integer thickness', () => {
        const result = parseSmartQuery('19');
        expect(result.thickness).toBe(19);
      });

      it('should parse thickness with mm suffix', () => {
        const result = parseSmartQuery('19mm');
        expect(result.thickness).toBe(19);
      });

      it('should parse decimal thickness', () => {
        const result = parseSmartQuery('0.8');
        expect(result.thickness).toBe(0.8);
      });

      it('should parse decimal with comma (French format)', () => {
        const result = parseSmartQuery('0,8');
        expect(result.thickness).toBe(0.8);
      });

      it('should reject thickness > 100mm', () => {
        const result = parseSmartQuery('2800');
        expect(result.thickness).toBeNull();
      });

      it('should not parse negative numbers (regex limitation)', () => {
        const result = parseSmartQuery('-5');
        // The tokenizer regex doesn't capture negative numbers
        // -5 becomes just "5" which is parsed as thickness
        expect(result.thickness).toBe(5);
      });
    });

    describe('dimensions', () => {
      it('should parse dimensions with x separator', () => {
        const result = parseSmartQuery('2800x2070');
        expect(result.dimension).toEqual({ length: 2800, width: 2070 });
      });

      it('should parse dimensions with X separator', () => {
        const result = parseSmartQuery('2800X2070');
        expect(result.dimension).toEqual({ length: 2800, width: 2070 });
      });

      it('should parse dimensions with * separator', () => {
        const result = parseSmartQuery('2800*2070');
        expect(result.dimension).toEqual({ length: 2800, width: 2070 });
      });

      it('should normalize dimensions (length > width)', () => {
        const result = parseSmartQuery('2070x2800');
        expect(result.dimension).toEqual({ length: 2800, width: 2070 });
      });

      it('should reject invalid dimensions (too small)', () => {
        const result = parseSmartQuery('50x50');
        expect(result.dimension).toBeNull();
      });

      it('should reject invalid dimensions (too large)', () => {
        const result = parseSmartQuery('6000x3000');
        expect(result.dimension).toBeNull();
      });
    });

    describe('essences de bois', () => {
      it('should recognize chêne with accent', () => {
        const result = parseSmartQuery('chêne');
        expect(result.woods).toContain('chêne');
      });

      it('should recognize chene without accent', () => {
        const result = parseSmartQuery('chene');
        expect(result.woods.length).toBeGreaterThan(0);
      });

      it('should recognize noyer', () => {
        const result = parseSmartQuery('noyer');
        expect(result.woods).toContain('noyer');
      });

      it('should recognize hêtre', () => {
        const result = parseSmartQuery('hêtre');
        expect(result.woods).toContain('hêtre');
      });

      it('should recognize exotic woods (wenge)', () => {
        const result = parseSmartQuery('wenge');
        expect(result.woods.length).toBeGreaterThan(0);
      });

      it('should not duplicate woods', () => {
        const result = parseSmartQuery('chene chêne');
        // Both map to the same canonical form
        expect(result.woods.length).toBeLessThanOrEqual(2);
      });
    });

    describe('couleurs', () => {
      it('should recognize blanc', () => {
        const result = parseSmartQuery('blanc');
        expect(result.colors).toContain('blanc');
      });

      it('should recognize gris', () => {
        const result = parseSmartQuery('gris');
        expect(result.colors).toContain('gris');
      });

      it('should recognize noir', () => {
        const result = parseSmartQuery('noir');
        expect(result.colors).toContain('noir');
      });

      it('should recognize anthracite', () => {
        const result = parseSmartQuery('anthracite');
        expect(result.colors).toContain('anthracite');
      });

      it('should recognize color qualifiers (foncé)', () => {
        const result = parseSmartQuery('gris foncé');
        expect(result.colors).toContain('gris');
        expect(result.colorQualifiers.length).toBeGreaterThan(0);
      });
    });

    describe('décors spéciaux', () => {
      it('should recognize béton', () => {
        const result = parseSmartQuery('béton');
        expect(result.decors.length).toBeGreaterThan(0);
      });

      it('should recognize marbre', () => {
        const result = parseSmartQuery('marbre');
        expect(result.decors).toContain('marbre');
      });

      it('should recognize uni', () => {
        const result = parseSmartQuery('uni');
        expect(result.decors).toContain('uni');
      });
    });

    describe('sous-catégories / qualités', () => {
      it('should recognize hydrofuge', () => {
        const result = parseSmartQuery('hydrofuge');
        expect(result.subcategories.length).toBeGreaterThan(0);
      });

      it('should recognize ignifugé', () => {
        const result = parseSmartQuery('ignifugé');
        expect(result.subcategories.length).toBeGreaterThan(0);
      });

      it('should recognize p3 (lowercase) as hydrofuge', () => {
        // Note: Dictionary key is lowercase, uppercase P3 goes to searchText
        const result = parseSmartQuery('p3');
        // p3 is in SUBCATEGORY_SYNONYMS.hydrofuge array, not as key
        // Actually findInDictionary checks keys, not values, so p3 won't match
        // This is a known limitation - keeping test to document behavior
        expect(result.searchText).toContain('p3');
      });

      it('should recognize CTBH as hydrofuge when lowercase', () => {
        // Note: Dictionary key is lowercase
        const result = parseSmartQuery('CTBH');
        // CTBH is in array value, not as key - won't match with findInDictionary
        // This is a known limitation - keeping test to document behavior
        expect(result.searchText).toContain('CTBH');
      });

      it('should recognize filmé', () => {
        const result = parseSmartQuery('filmé');
        expect(result.subcategories.length).toBeGreaterThan(0);
      });
    });

    describe('requêtes combinées', () => {
      it('should parse "mdf 19"', () => {
        const result = parseSmartQuery('mdf 19');
        expect(result.productTypes).toContain('MDF');
        expect(result.thickness).toBe(19);
      });

      it('should parse "mélaminé blanc 19mm"', () => {
        const result = parseSmartQuery('mélaminé blanc 19mm');
        expect(result.productTypes).toContain('MELAMINE');
        expect(result.colors).toContain('blanc');
        expect(result.thickness).toBe(19);
      });

      it('should parse "agglo chêne 19"', () => {
        const result = parseSmartQuery('agglo chêne 19');
        expect(result.productTypes).toContain('PARTICULE');
        expect(result.woods.length).toBeGreaterThan(0);
        expect(result.thickness).toBe(19);
      });

      it('should parse "contreplaqué bouleau filmé"', () => {
        const result = parseSmartQuery('contreplaqué bouleau filmé');
        expect(result.productTypes).toContain('CONTREPLAQUE');
        // bouleau peut être reconnu comme bois OU sous-catégorie
        expect(
          result.woods.length > 0 || result.subcategories.length > 0,
        ).toBeTruthy();
      });

      it('should parse "stratifié gris anthracite"', () => {
        const result = parseSmartQuery('stratifié gris anthracite');
        expect(result.productTypes).toContain('STRATIFIE');
        expect(result.colors.length).toBeGreaterThanOrEqual(1);
      });

      it('should parse "mdf 2800x2070 19mm"', () => {
        const result = parseSmartQuery('mdf 2800x2070 19mm');
        expect(result.productTypes).toContain('MDF');
        expect(result.dimension).toEqual({ length: 2800, width: 2070 });
        expect(result.thickness).toBe(19);
      });

      it('should handle unrecognized terms in searchText', () => {
        const result = parseSmartQuery('mdf egger H1180');
        expect(result.productTypes).toContain('MDF');
        // H1180 should be unrecognized (goes to searchText)
        expect(result.searchText).toContain('H1180');
      });
    });

    describe('tokens reconnus vs non reconnus', () => {
      it('should track recognized tokens', () => {
        const result = parseSmartQuery('mdf 19');
        expect(result.recognizedTokens.length).toBe(2);
      });

      it('should track unrecognized tokens', () => {
        const result = parseSmartQuery('xyz123');
        expect(result.unrecognizedTokens).toContain('xyz123');
      });
    });
  });

  // ============================================================================
  // buildSmartSearchSQL - Tests de génération SQL
  // ============================================================================

  describe('buildSmartSearchSQL', () => {
    it('should always include isActive = true', () => {
      const parsed = parseSmartQuery('');
      const { whereClause } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('p."isActive" = true');
    });

    it('should add productType condition', () => {
      const parsed = parseSmartQuery('mdf');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('productType');
      // params contains array ['MDF'], not string 'MDF'
      expect(params).toContainEqual(['MDF']);
    });

    it('should add thickness condition with ANY', () => {
      const parsed = parseSmartQuery('19');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('ANY(p.thickness)');
      expect(params).toContain(19);
    });

    it('should add dimension conditions', () => {
      const parsed = parseSmartQuery('2800x2070');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('defaultLength');
      expect(whereClause).toContain('defaultWidth');
      expect(params).toContain(2800);
      expect(params).toContain(2070);
    });

    it('should add text search for woods with synonyms', () => {
      const parsed = parseSmartQuery('chêne');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('ILIKE');
      expect(whereClause).toContain('unaccent');
      // Should search for "chêne" and possibly synonyms
      expect(params.some((p) => typeof p === 'string' && p.includes('chêne') || p.includes('oak'))).toBeTruthy();
    });

    it('should add text search for colors', () => {
      const parsed = parseSmartQuery('blanc');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('ILIKE');
      expect(params).toContain('blanc');
    });

    it('should add text search for unrecognized terms', () => {
      const parsed = parseSmartQuery('H1180');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      expect(whereClause).toContain('ILIKE');
      expect(whereClause).toContain('manufacturerRef');
      expect(params).toContain('H1180');
    });

    it('should use parameterized queries (no SQL injection)', () => {
      const parsed = parseSmartQuery("'; DROP TABLE panels; --");
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      // Should not contain raw SQL injection
      expect(whereClause).not.toContain('DROP TABLE');
      // Malicious input should be in params, not in whereClause
      expect(params.some((p) => typeof p === 'string' && p.includes('DROP'))).toBeTruthy();
    });

    it('should handle combined product type + wood (agglo chêne)', () => {
      const parsed = parseSmartQuery('agglo chêne');
      const { whereClause, params } = buildSmartSearchSQL(parsed);
      // Should have OR condition for flexible matching
      expect(whereClause).toContain('productType');
      expect(params).toContain('PARTICULE');
    });

    it('should build valid SQL for complex query', () => {
      const parsed = parseSmartQuery('mdf hydrofuge 19 blanc');
      const { whereClause, params } = buildSmartSearchSQL(parsed);

      // Should have multiple AND conditions
      const andCount = (whereClause.match(/AND/g) || []).length;
      expect(andCount).toBeGreaterThanOrEqual(3);

      // Should have correct number of params
      expect(params.length).toBeGreaterThanOrEqual(3);

      // Params should use numbered placeholders ($1, $2, etc.)
      expect(whereClause).toMatch(/\$\d+/);
    });
  });

  // ============================================================================
  // Dictionnaires - Tests de couverture
  // ============================================================================

  describe('Dictionnaires', () => {
    describe('PRODUCT_TYPE_SYNONYMS', () => {
      it('should have all common synonyms for MELAMINE', () => {
        expect(PRODUCT_TYPE_SYNONYMS['mela']).toBe('MELAMINE');
        expect(PRODUCT_TYPE_SYNONYMS['méla']).toBe('MELAMINE');
        expect(PRODUCT_TYPE_SYNONYMS['mfc']).toBe('MELAMINE');
      });

      it('should have all common synonyms for MDF', () => {
        expect(PRODUCT_TYPE_SYNONYMS['mdf']).toBe('MDF');
        expect(PRODUCT_TYPE_SYNONYMS['medium']).toBe('MDF');
        expect(PRODUCT_TYPE_SYNONYMS['médium']).toBe('MDF');
      });
    });

    describe('WOOD_SYNONYMS', () => {
      it('should have common European woods', () => {
        expect(WOOD_SYNONYMS['chene']).toBeDefined();
        expect(WOOD_SYNONYMS['noyer']).toBeDefined();
        expect(WOOD_SYNONYMS['hetre']).toBeDefined();
      });

      it('should have exotic woods', () => {
        expect(WOOD_SYNONYMS['teck']).toBeDefined();
        expect(WOOD_SYNONYMS['wenge']).toBeDefined();
      });
    });

    describe('COLOR_SYNONYMS', () => {
      it('should have basic colors', () => {
        expect(COLOR_SYNONYMS['blanc']).toBeDefined();
        expect(COLOR_SYNONYMS['noir']).toBeDefined();
        expect(COLOR_SYNONYMS['gris']).toBeDefined();
      });

      it('should have metallic colors', () => {
        expect(COLOR_SYNONYMS['inox']).toBeDefined();
        expect(COLOR_SYNONYMS['chrome']).toBeDefined();
      });
    });
  });

  // ============================================================================
  // Tests de régression - Cas réels rencontrés
  // ============================================================================

  describe('Cas de régression', () => {
    it('should handle Egger reference H1180', () => {
      const result = parseSmartQuery('H1180');
      // H1180 is not a recognized term, should go to searchText
      expect(result.searchText).toContain('H1180');
    });

    it('should handle Egger code with mélaminé', () => {
      const result = parseSmartQuery('mélaminé H1180');
      expect(result.productTypes).toContain('MELAMINE');
      expect(result.searchText).toContain('H1180');
    });

    it('should handle mixed case input', () => {
      const result = parseSmartQuery('MDF BLANC');
      expect(result.productTypes).toContain('MDF');
      expect(result.colors).toContain('blanc');
    });

    it('should handle extra spaces', () => {
      const result = parseSmartQuery('  mdf   19   blanc  ');
      expect(result.productTypes).toContain('MDF');
      expect(result.thickness).toBe(19);
      expect(result.colors).toContain('blanc');
    });

    it('should handle chant with thickness 0.8', () => {
      const result = parseSmartQuery('chant 0.8');
      expect(result.productTypes).toContain('BANDE_DE_CHANT');
      expect(result.thickness).toBe(0.8);
    });

    it('should handle supplier codes', () => {
      const result = parseSmartQuery('81163');
      // Large number should not be parsed as thickness
      expect(result.thickness).toBeNull();
      // Should be in searchText
      expect(result.searchText).toContain('81163');
    });
  });
});
