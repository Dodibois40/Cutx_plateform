/**
 * AutocompleteService - Handles real-time search suggestions
 *
 * Extracted from CataloguesService for better separation of concerns.
 * Provides fast (<50ms) autocomplete for the search bar with:
 * 1. Exact reference matches (highest priority)
 * 2. Reference prefix matches
 * 3. Name matches
 *
 * OPTIMIZATIONS (Phase 3):
 * - 60-second cache on results to reduce database load
 * - Cache key normalized (lowercase, trimmed) for better hit rate
 */

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

export interface AutocompleteSuggestion {
  id: string;
  reference: string;
  refFabricant: string | null;
  name: string;
  imageUrl: string | null;
  catalogueName: string;
  productType: string | null;
  epaisseur: number | null;
  prix: number | null;
  prixType: 'M2' | 'ML' | null;
}

export interface AutocompleteResult {
  suggestions: AutocompleteSuggestion[];
  totalMatches: number;
}

@Injectable()
export class AutocompleteService {
  // Cache TTL: 60 seconds - short enough to stay fresh, long enough for repeated queries
  private static readonly AUTOCOMPLETE_CACHE_TTL = 60000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Normalize search query by removing accents
   * This allows "chene" to match "chêne"
   */
  private normalizeSearchTerm(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  /**
   * Fast autocomplete search optimized for real-time suggestions
   *
   * Matches against multiple fields with priority scoring:
   * - reference: internal reference
   * - manufacturerRef: Egger/manufacturer ref
   * - colorChoice: Egger ref for Bouney
   * - colorCode: color code
   * - supplierCode: supplier internal code
   * - name: product name (with unaccent)
   *
   * CACHED: Results cached for 60 seconds to reduce database load
   */
  async search(query: string, limit: number = 6): Promise<AutocompleteResult> {
    if (!query || query.length < 2) {
      return { suggestions: [], totalMatches: 0 };
    }

    // Check cache first (normalized key for better hit rate)
    const cacheKey = `autocomplete:${query.toLowerCase().trim()}:${limit}`;
    const cached = await this.cacheManager.get<AutocompleteResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Split query into terms for multi-word search ("chant chêne" → ["chant", "chene"])
    const normalizedQuery = this.normalizeSearchTerm(query);
    const terms = normalizedQuery
      .trim()
      .split(/\s+/)
      .filter((t) => t.length >= 2)
      .map((t) => t.replace(/[^\w]/g, ''))
      .filter((t) => t.length > 0);

    // If no valid terms after filtering, return empty
    if (terms.length === 0) {
      return { suggestions: [], totalMatches: 0 };
    }

    const upperQuery = query.toUpperCase();
    const upperTerms = terms.map((t) => t.toUpperCase());

    // Build dynamic WHERE condition: ALL terms must match at least one field
    const termConditions = terms.map((term, i) => {
      const upperTerm = upperTerms[i];
      // Escape single quotes for SQL safety
      const safeTerm = term.replace(/'/g, "''");
      const safeUpperTerm = upperTerm.replace(/'/g, "''");
      return `(
        lower(unaccent(p.name)) LIKE '%${safeTerm}%'
        OR UPPER(p.reference) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."manufacturerRef", '')) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."colorChoice", '')) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."colorCode", '')) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."supplierCode", '')) LIKE '%${safeUpperTerm}%'
      )`;
    });

    const whereClause = termConditions.join(' AND ');
    const safeUpperQuery = upperQuery.replace(/'/g, "''");
    const safeNormalizedQuery = normalizedQuery.replace(/'/g, "''");

    // Use a single optimized query with CASE for priority scoring
    const results = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        reference: string;
        name: string;
        imageUrl: string | null;
        catalogueName: string;
        productType: string | null;
        manufacturerRef: string | null;
        defaultThickness: number | null;
        pricePerM2: number | null;
        pricePerMl: number | null;
        matchType: number;
      }>
    >(`
      SELECT
        p.id,
        p.reference,
        p.name,
        p."imageUrl",
        c.name as "catalogueName",
        p."productType",
        p."manufacturerRef",
        COALESCE(p."defaultThickness", p.thickness[1]) as "defaultThickness",
        p."pricePerM2",
        p."pricePerMl",
        CASE
          -- Exact reference match (case-insensitive)
          WHEN UPPER(p.reference) = '${safeUpperQuery}' THEN 1
          -- Exact manufacturer reference match (manufacturerRef, colorChoice, colorCode, supplierCode)
          WHEN UPPER(COALESCE(p."manufacturerRef", '')) = '${safeUpperQuery}' THEN 2
          WHEN UPPER(COALESCE(p."colorChoice", '')) = '${safeUpperQuery}' THEN 2
          WHEN UPPER(COALESCE(p."colorCode", '')) = '${safeUpperQuery}' THEN 2
          WHEN UPPER(COALESCE(p."supplierCode", '')) = '${safeUpperQuery}' THEN 2
          -- Reference starts with query
          WHEN UPPER(p.reference) LIKE '${safeUpperQuery}%' THEN 3
          -- Manufacturer/color/supplier ref starts with query
          WHEN UPPER(COALESCE(p."manufacturerRef", '')) LIKE '${safeUpperQuery}%' THEN 4
          WHEN UPPER(COALESCE(p."colorChoice", '')) LIKE '${safeUpperQuery}%' THEN 4
          WHEN UPPER(COALESCE(p."colorCode", '')) LIKE '${safeUpperQuery}%' THEN 4
          WHEN UPPER(COALESCE(p."supplierCode", '')) LIKE '${safeUpperQuery}%' THEN 4
          -- Reference contains full query
          WHEN UPPER(p.reference) LIKE '%${safeUpperQuery}%' THEN 5
          -- Any ref field contains query
          WHEN UPPER(COALESCE(p."colorChoice", '')) LIKE '%${safeUpperQuery}%' THEN 5
          WHEN UPPER(COALESCE(p."colorCode", '')) LIKE '%${safeUpperQuery}%' THEN 5
          WHEN UPPER(COALESCE(p."supplierCode", '')) LIKE '%${safeUpperQuery}%' THEN 5
          -- Name contains full query (normalized for accents)
          WHEN lower(unaccent(p.name)) LIKE '%${safeNormalizedQuery}%' THEN 6
          ELSE 7
        END as "matchType"
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND c."isActive" = true
        AND (${whereClause})
      ORDER BY "matchType" ASC,
        CASE WHEN COALESCE(p."defaultThickness", p.thickness[1]) = 19 THEN 0 ELSE 1 END ASC,
        p."productType" ASC, COALESCE(p."defaultThickness", p.thickness[1]) DESC, p.name ASC
      LIMIT ${limit + 10}
    `);

    // Deduplicate by productType+name combo to show variety (different types of same decor)
    const seen = new Set<string>();
    const suggestions = results
      .filter((r) => {
        // Group by productType + simplified name to avoid duplicates of same product
        const key = `${r.productType || ''}-${r.name.substring(0, 30)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        reference: r.reference,
        name: r.name,
        refFabricant: r.manufacturerRef,
        imageUrl: r.imageUrl,
        catalogueName: r.catalogueName,
        productType: r.productType,
        epaisseur: r.defaultThickness,
        prix: r.pricePerMl || r.pricePerM2,
        prixType: r.pricePerMl
          ? ('ML' as const)
          : r.pricePerM2
            ? ('M2' as const)
            : null,
      }));

    // Get total count for "see all X results"
    const countResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND c."isActive" = true
        AND (${whereClause})
    `);

    const result: AutocompleteResult = {
      suggestions,
      totalMatches: Number(countResult[0]?.count || 0),
    };

    // Cache for 60 seconds
    await this.cacheManager.set(
      cacheKey,
      result,
      AutocompleteService.AUTOCOMPLETE_CACHE_TTL,
    );

    return result;
  }
}
