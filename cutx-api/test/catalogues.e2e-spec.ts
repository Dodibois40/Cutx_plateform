/**
 * Tests E2E pour les endpoints Catalogues
 *
 * Ces tests vérifient :
 * 1. Les endpoints HTTP retournent les bons codes de status
 * 2. Les shapes de réponse respectent le contrat frontend
 * 3. La recherche fonctionne correctement
 *
 * Note: Ces tests nécessitent une base de données avec des données
 * Ils peuvent être skippés en CI si pas de base de test disponible
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Catalogues (e2e)', () => {
  let app: INestApplication<App>;
  let hasDatabase = true;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    } catch (error) {
      // If database is not available, skip all tests
      console.warn('Database not available, skipping E2E tests');
      hasDatabase = false;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ============================================================================
  // Helper function to skip tests if no database
  // ============================================================================
  const itWithDb = (name: string, fn: () => Promise<void>) => {
    if (hasDatabase) {
      it(name, fn);
    } else {
      it.skip(name, fn);
    }
  };

  // ============================================================================
  // Catalogues Endpoints
  // ============================================================================

  describe('GET /catalogues', () => {
    itWithDb('should return catalogues wrapped in object', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues')
        .expect(200);

      // API returns { catalogues: [...] }
      expect(response.body).toHaveProperty('catalogues');
      expect(Array.isArray(response.body.catalogues)).toBe(true);
      // Each catalogue should have basic fields
      if (response.body.catalogues.length > 0) {
        const catalogue = response.body.catalogues[0];
        expect(catalogue).toHaveProperty('id');
        expect(catalogue).toHaveProperty('slug');
        expect(catalogue).toHaveProperty('name');
      }
    });
  });

  describe('GET /catalogues/:slug', () => {
    itWithDb('should return catalogue by slug', async () => {
      // First get list of catalogues
      const listResponse = await request(app.getHttpServer())
        .get('/catalogues')
        .expect(200);

      if (listResponse.body.catalogues.length > 0) {
        const slug = listResponse.body.catalogues[0].slug;
        const response = await request(app.getHttpServer())
          .get(`/catalogues/${slug}`)
          .expect(200);

        // API returns catalogue directly (not wrapped)
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('slug', slug);
        expect(response.body).toHaveProperty('name');
      }
    });

    itWithDb('should return 404 for non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/catalogues/non-existent-slug-12345')
        .expect(404);
    });
  });

  // ============================================================================
  // Panels Endpoints
  // ============================================================================

  describe('GET /catalogues/panels', () => {
    itWithDb('should return panels with correct response shape', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/panels')
        .expect(200);

      // Verify response shape (FRONTEND CONTRACT)
      expect(response.body).toHaveProperty('panels');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');

      expect(Array.isArray(response.body.panels)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.hasMore).toBe('boolean');
      expect(typeof response.body.page).toBe('number');
      expect(typeof response.body.limit).toBe('number');
    });

    itWithDb('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/panels?page=1&limit=5')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.panels.length).toBeLessThanOrEqual(5);
    });

    itWithDb('should filter by productType', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/panels?productType=MDF')
        .expect(200);

      // All returned panels should be MDF type (if any)
      response.body.panels.forEach((panel: any) => {
        if (panel.productType) {
          expect(panel.productType).toBe('MDF');
        }
      });
    });

    itWithDb('should include required panel fields for frontend', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/panels?limit=1')
        .expect(200);

      if (response.body.panels.length > 0) {
        const panel = response.body.panels[0];

        // Required fields per FRONTEND CONTRACT
        expect(panel).toHaveProperty('id');
        expect(panel).toHaveProperty('reference');
        expect(panel).toHaveProperty('name');
        expect(panel).toHaveProperty('thickness');
        expect(panel).toHaveProperty('defaultLength');
        expect(panel).toHaveProperty('defaultWidth');
        expect(panel).toHaveProperty('defaultThickness');
        expect(panel).toHaveProperty('pricePerM2');
        expect(panel).toHaveProperty('productType');
        expect(panel).toHaveProperty('imageUrl');
        expect(panel).toHaveProperty('stockStatus');
        expect(panel).toHaveProperty('catalogue');

        // Nested catalogue must have name
        expect(panel.catalogue).toHaveProperty('name');
      }
    });
  });

  // ============================================================================
  // Smart Search Endpoint (CRITICAL - Frontend Contract)
  // ============================================================================

  describe('GET /catalogues/smart-search', () => {
    itWithDb('should return correct response shape', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=mdf')
        .expect(200);

      // FRONTEND CONTRACT - All these fields MUST be present
      expect(response.body).toHaveProperty('panels');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('parsed');
      expect(response.body).toHaveProperty('facets');

      // Verify types
      expect(Array.isArray(response.body.panels)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.hasMore).toBe('boolean');
    });

    itWithDb('should return parsed query information', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=mdf%2019')
        .expect(200);

      expect(response.body.parsed).toHaveProperty('productTypes');
      expect(response.body.parsed).toHaveProperty('subcategories');
      expect(response.body.parsed).toHaveProperty('thickness');
      expect(response.body.parsed).toHaveProperty('searchTerms');
      expect(response.body.parsed).toHaveProperty('originalQuery');

      expect(Array.isArray(response.body.parsed.productTypes)).toBe(true);
    });

    itWithDb('should return facets structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=melamine')
        .expect(200);

      expect(response.body.facets).toHaveProperty('genres');
      expect(response.body.facets).toHaveProperty('dimensions');
      expect(response.body.facets).toHaveProperty('thicknesses');
      expect(response.body.facets).toHaveProperty('decorCategories');
      expect(response.body.facets).toHaveProperty('manufacturers');
      expect(response.body.facets).toHaveProperty('properties');

      expect(Array.isArray(response.body.facets.genres)).toBe(true);
      expect(Array.isArray(response.body.facets.thicknesses)).toBe(true);
    });

    itWithDb('should parse productType from query "mdf"', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=mdf')
        .expect(200);

      expect(response.body.parsed.productTypes).toContain('MDF');
    });

    itWithDb('should parse thickness from query "19"', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=19')
        .expect(200);

      expect(response.body.parsed.thickness).toBe(19);
    });

    itWithDb('should parse combined query "mdf 19"', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=mdf%2019')
        .expect(200);

      expect(response.body.parsed.productTypes).toContain('MDF');
      expect(response.body.parsed.thickness).toBe(19);
    });

    itWithDb('should support pagination in smart search', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=panneau&page=1&limit=5')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
    });

    itWithDb('should handle Egger references like H1180', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=H1180')
        .expect(200);

      // H1180 is recognized as a manufacturer reference (EGGER decor code)
      // The parser may recognize it differently, just verify the search works
      expect(response.body).toHaveProperty('panels');
      expect(response.body.parsed.originalQuery).toBe('H1180');
    });

    itWithDb('should handle empty query gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=')
        .expect(200);

      // Should return valid structure even for empty query
      expect(response.body).toHaveProperty('panels');
      expect(response.body).toHaveProperty('total');
    });
  });

  // ============================================================================
  // Autocomplete Endpoint
  // ============================================================================

  describe('GET /catalogues/autocomplete', () => {
    itWithDb('should return autocomplete results', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/autocomplete?q=mdf')
        .expect(200);

      // Autocomplete returns { suggestions, totalMatches }
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('totalMatches');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    itWithDb('should return empty for short query', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/autocomplete?q=a')
        .expect(200);

      expect(response.body.suggestions).toEqual([]);
      expect(response.body.totalMatches).toBe(0);
    });

    itWithDb('should return suggestion items with required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/autocomplete?q=pan')
        .expect(200);

      if (response.body.suggestions.length > 0) {
        const suggestion = response.body.suggestions[0];
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('reference');
        expect(suggestion).toHaveProperty('name');
      }
    });
  });

  // ============================================================================
  // Filter Options Endpoint
  // ============================================================================

  describe('GET /catalogues/filter-options', () => {
    itWithDb('should return filter options', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/filter-options')
        .expect(200);

      // Filter options structure
      expect(response.body).toHaveProperty('productTypes');
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('thicknesses');
      expect(response.body).toHaveProperty('catalogues');

      expect(Array.isArray(response.body.productTypes)).toBe(true);
      expect(Array.isArray(response.body.catalogues)).toBe(true);
    });
  });

  // ============================================================================
  // Popular Panels Endpoint
  // ============================================================================

  describe('GET /catalogues/popular', () => {
    itWithDb('should return popular panels', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/popular')
        .expect(200);

      // API returns { panels: [...] }
      expect(response.body).toHaveProperty('panels');
      expect(Array.isArray(response.body.panels)).toBe(true);
    });
  });

  // ============================================================================
  // Panel by Reference
  // ============================================================================

  describe('GET /catalogues/panels/by-reference/:reference', () => {
    itWithDb('should return panel by reference', async () => {
      // First get a panel to know a valid reference
      const panelsResponse = await request(app.getHttpServer())
        .get('/catalogues/panels?limit=1')
        .expect(200);

      if (panelsResponse.body.panels.length > 0) {
        const reference = panelsResponse.body.panels[0].reference;
        const response = await request(app.getHttpServer())
          .get(`/catalogues/panels/by-reference/${encodeURIComponent(reference)}`)
          .expect(200);

        // API returns { panel: {...} }
        expect(response.body).toHaveProperty('panel');
        expect(response.body.panel).toHaveProperty('id');
        expect(response.body.panel).toHaveProperty('reference', reference);
      }
    });

    itWithDb('should return 404 for non-existent reference', async () => {
      await request(app.getHttpServer())
        .get('/catalogues/panels/by-reference/NON-EXISTENT-REF-12345')
        .expect(404);
    });
  });

  // ============================================================================
  // Search Regression Tests
  // ============================================================================

  describe('Search Regression Tests', () => {
    itWithDb('should find MDF panels with "mdf" query', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=mdf')
        .expect(200);

      // If we have MDF panels, they should be returned
      if (response.body.total > 0) {
        const hasMDF = response.body.panels.some(
          (p: any) => p.productType === 'MDF' || p.name?.toLowerCase().includes('mdf'),
        );
        expect(hasMDF).toBe(true);
      }
    });

    itWithDb('should find panels with thickness "19"', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=19')
        .expect(200);

      expect(response.body.parsed.thickness).toBe(19);
    });

    itWithDb('should handle chant search', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=chant')
        .expect(200);

      expect(response.body.parsed.productTypes).toContain('BANDE_DE_CHANT');
    });

    itWithDb('should handle stratifie search', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=stratifie')
        .expect(200);

      expect(response.body.parsed.productTypes).toContain('STRATIFIE');
    });

    itWithDb('should handle melamine search', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogues/smart-search?q=melamine')
        .expect(200);

      expect(response.body.parsed.productTypes).toContain('MELAMINE');
    });
  });
});
