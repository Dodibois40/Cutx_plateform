/**
 * SearchService - Handles full-text search, trigram similarity, and ILIKE fallback
 *
 * Extracted from CataloguesService for better separation of concerns.
 * Provides a 3-level search fallback:
 * 1. Full-text search using PostgreSQL tsvector with french_unaccent
 * 2. Trigram similarity search using pg_trgm
 * 3. ILIKE search (signaled by returning total = -1)
 *
 * OPTIMIZATIONS (Phase 3):
 * - Max 10 search terms to prevent DoS and overly complex queries
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FullTextSearchResult, SearchOptions, SearchResult } from './types';

@Injectable()
export class SearchService {
  // Maximum number of search terms to prevent DoS and overly complex queries
  private static readonly MAX_SEARCH_TERMS = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize search query by removing accents
   * This allows "chene" to match "chêne"
   */
  normalizeSearchTerm(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase();
  }

  /**
   * Get sort field SQL with proper NULL handling
   * - Uses COALESCE for price to combine pricePerM2 and pricePerMl
   * - Uses COALESCE for thickness to fallback to thickness[1] when defaultThickness is NULL
   */
  getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      name: 'p.name',
      reference: 'p.reference',
      // Use COALESCE to handle edge bands (pricePerMl) and panels (pricePerM2)
      pricePerM2: 'COALESCE(p."pricePerM2", p."pricePerMl")',
      // Use COALESCE to fallback to thickness[1] (PostgreSQL 1-indexed) when defaultThickness is NULL
      defaultThickness: 'COALESCE(p."defaultThickness", p.thickness[1])',
      stockStatus: 'p."stockStatus"',
    };
    return fieldMap[sortBy] || 'p.name';
  }

  /**
   * Build ORDER BY clause with proper NULL handling
   * NULLs always go at the end, regardless of sort direction
   */
  buildOrderByClause(sortBy: string, sortDirection: string): string {
    const sortField = this.getSortField(sortBy);
    const dir = sortDirection.toUpperCase();
    // NULLs always at the end - users want to see real values first
    return `${sortField} ${dir} NULLS LAST, p.name ASC`;
  }

  /**
   * Full-text search using PostgreSQL tsvector with unaccent support
   * Returns panels ranked by relevance
   * Falls back to trigram similarity search if full-text fails or returns 0 results
   */
  async fullTextSearch(
    searchQuery: string,
    options: SearchOptions,
  ): Promise<SearchResult> {
    // Normalize search query (remove accents)
    const normalizedQuery = this.normalizeSearchTerm(searchQuery);

    // Convert search query to tsquery format
    // Split words and join with & for AND search, handle special chars
    // Limit to MAX_SEARCH_TERMS to prevent DoS attacks with very long queries
    const terms = normalizedQuery
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .map((t) => t.replace(/[^\w]/g, '')) // Only keep alphanumeric
      .filter((t) => t.length > 0)
      .slice(0, SearchService.MAX_SEARCH_TERMS) // Limit number of terms
      .map((t) => `${t}:*`) // Prefix search
      .join(' & ');

    if (!terms) {
      return { panels: [], total: 0 };
    }

    // Build WHERE conditions
    const conditions: string[] = [`p."isActive" = true`, `c."isActive" = true`];
    const params: (string | number | boolean)[] = [terms];
    let paramIndex = 2;

    if (options.catalogueSlug) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(options.catalogueSlug);
      paramIndex++;
    }

    if (options.productType) {
      conditions.push(`p."productType" = $${paramIndex}`);
      params.push(options.productType);
      paramIndex++;
    }

    if (options.sousCategorie) {
      conditions.push(
        `(cat.name = $${paramIndex} OR parent.name = $${paramIndex})`,
      );
      params.push(options.sousCategorie);
      paramIndex++;
    }

    if (options.epaisseur) {
      conditions.push(`$${paramIndex} = ANY(p.thickness)`);
      params.push(options.epaisseur);
      paramIndex++;
    }

    if (options.enStock) {
      conditions.push(`p."stockStatus" = 'EN STOCK'`);
    }

    const whereClause = conditions.join(' AND ');

    // Determine ORDER BY - use rank for relevance when searching
    let orderBy = `ts_rank(p."searchVector", to_tsquery('french_unaccent', $1)) DESC, p.name ASC`;
    if (options.sortBy && options.sortBy !== 'relevance') {
      orderBy = this.buildOrderByClause(
        options.sortBy,
        options.sortDirection || 'asc',
      );
    }

    // Count query - use french_unaccent config for accent-insensitive search
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND p."searchVector" @@ to_tsquery('french_unaccent', $1)
    `;

    // Main query with ranking - use french_unaccent for accent-insensitive search
    const searchQuerySql = `
      SELECT
        p.id,
        p.reference,
        p.name,
        p.description,
        p.thickness,
        p."defaultLength",
        p."defaultWidth",
        p."defaultThickness",
        p."isVariableLength",
        p."pricePerM2",
        p."pricePerMl",
        p."pricePerUnit",
        p."productType",
        p.material,
        p.finish,
        p."colorCode",
        p."imageUrl",
        p."isActive",
        p."stockStatus",
        p."manufacturerRef",
        p."createdAt",
        p."updatedAt",
        p."catalogueId",
        p."categoryId",
        c.name as catalogue_name,
        cat.name as category_name,
        cat.slug as category_slug,
        parent.name as parent_name,
        parent.slug as parent_slug,
        ts_rank(p."searchVector", to_tsquery('french_unaccent', $1)) as rank
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND p."searchVector" @@ to_tsquery('french_unaccent', $1)
      ORDER BY ${orderBy}
      LIMIT ${options.limit}
      OFFSET ${options.offset}
    `;

    try {
      const [countResult, panels] = await Promise.all([
        this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...params),
        this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(
          searchQuerySql,
          ...params,
        ),
      ]);

      const total = Number(countResult[0]?.total || 0);

      // If full-text search found results, return them
      if (total > 0) {
        return { panels, total };
      }

      // If no results, try trigram similarity search as fallback
      console.log(
        'Full-text search returned 0 results, trying trigram similarity for:',
        normalizedQuery,
      );
      return await this.trigramSearch(normalizedQuery, options);
    } catch (error) {
      // If full-text search fails (e.g., french_unaccent not yet created), try trigram
      console.warn('Full-text search failed, trying trigram fallback:', error);
      try {
        return await this.trigramSearch(normalizedQuery, options);
      } catch {
        // Final fallback: signal to use ILIKE
        console.warn('Trigram search also failed, falling back to ILIKE');
        return { panels: [], total: -1 };
      }
    }
  }

  /**
   * Trigram similarity search for fuzzy matching
   * Works even without the french_unaccent configuration
   * Uses pg_trgm extension for "like Google" search experience
   */
  async trigramSearch(
    searchQuery: string,
    options: SearchOptions,
  ): Promise<SearchResult> {
    // Build WHERE conditions
    const conditions: string[] = [`p."isActive" = true`, `c."isActive" = true`];
    const params: (string | number | boolean)[] = [searchQuery];
    let paramIndex = 2;

    if (options.catalogueSlug) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(options.catalogueSlug);
      paramIndex++;
    }

    if (options.productType) {
      conditions.push(`p."productType" = $${paramIndex}`);
      params.push(options.productType);
      paramIndex++;
    }

    if (options.sousCategorie) {
      conditions.push(
        `(cat.name = $${paramIndex} OR parent.name = $${paramIndex})`,
      );
      params.push(options.sousCategorie);
      paramIndex++;
    }

    if (options.epaisseur) {
      conditions.push(`$${paramIndex} = ANY(p.thickness)`);
      params.push(options.epaisseur);
      paramIndex++;
    }

    if (options.enStock) {
      conditions.push(`p."stockStatus" = 'EN STOCK'`);
    }

    const whereClause = conditions.join(' AND ');

    // Trigram similarity search using searchText column or ILIKE with unaccent
    // Threshold 0.2 means 20% similarity required (lower = more results)
    // Search in all reference fields: manufacturerRef, colorChoice, colorCode, supplierCode
    const searchCondition = `(
      similarity(COALESCE(p."searchText", ''), $1) > 0.2 OR
      lower(unaccent(p.name)) LIKE '%' || $1 || '%' OR
      lower(unaccent(p.reference)) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."manufacturerRef", ''))) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."colorChoice", ''))) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."colorCode", ''))) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."supplierCode", ''))) LIKE '%' || $1 || '%'
    )`;

    let orderBy = `similarity(COALESCE(p."searchText", ''), $1) DESC, p.name ASC`;
    if (options.sortBy && options.sortBy !== 'relevance') {
      orderBy = this.buildOrderByClause(
        options.sortBy,
        options.sortDirection || 'asc',
      );
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND ${searchCondition}
    `;

    const searchQuerySql = `
      SELECT
        p.id,
        p.reference,
        p.name,
        p.description,
        p.thickness,
        p."defaultLength",
        p."defaultWidth",
        p."defaultThickness",
        p."isVariableLength",
        p."pricePerM2",
        p."pricePerMl",
        p."pricePerUnit",
        p."productType",
        p.material,
        p.finish,
        p."colorCode",
        p."imageUrl",
        p."isActive",
        p."stockStatus",
        p."manufacturerRef",
        p."createdAt",
        p."updatedAt",
        p."catalogueId",
        p."categoryId",
        c.name as catalogue_name,
        cat.name as category_name,
        cat.slug as category_slug,
        parent.name as parent_name,
        parent.slug as parent_slug,
        similarity(COALESCE(p."searchText", ''), $1) as rank
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND ${searchCondition}
      ORDER BY ${orderBy}
      LIMIT ${options.limit}
      OFFSET ${options.offset}
    `;

    const [countResult, panels] = await Promise.all([
      this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...params),
      this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(
        searchQuerySql,
        ...params,
      ),
    ]);

    return {
      panels,
      total: Number(countResult[0]?.total || 0),
    };
  }
}
