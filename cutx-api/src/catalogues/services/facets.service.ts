/**
 * FacetsService - Handles search facets aggregation
 *
 * Extracted from CataloguesService for better separation of concerns.
 * Provides optimized facet aggregation for smart search results:
 * - genres, dimensions, thicknesses, decorCategories, manufacturers, properties
 *
 * OPTIMIZATIONS:
 * 1. Reduced from 6 to 2 SQL queries (combined aggregations)
 * 2. 30-second cache on results
 * 3. Graceful error handling (returns empty facets on failure)
 * 4. 5-second timeout to prevent slow queries from blocking responses (Phase 3)
 */

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

export interface FacetsResult {
  genres: { label: string; count: number; searchTerm: string }[];
  dimensions: { label: string; count: number; length: number; width: number }[];
  thicknesses: { value: number; count: number }[];
  decorCategories: { value: string; label: string; count: number }[];
  manufacturers: { value: string; label: string; count: number }[];
  properties: { key: string; label: string; count: number }[];
}

@Injectable()
export class FacetsService {
  // Cache TTL for facets (30 seconds - short enough to stay fresh, long enough to avoid repeated queries)
  private static readonly FACETS_CACHE_TTL = 30000;

  // Query timeout (5 seconds) - prevents slow facet queries from blocking responses
  private static readonly FACETS_QUERY_TIMEOUT = 5000;

  // Labels for decor categories
  private static readonly DECOR_CATEGORY_LABELS: Record<string, string> = {
    UNIS: 'Unis',
    BOIS: 'Bois',
    PIERRE: 'Pierre',
    BETON: 'Béton',
    METAL: 'Métal',
    TEXTILE: 'Textile',
    FANTAISIE: 'Fantaisie',
    SANS_DECOR: 'Sans décor',
  };

  // Genre mapping for aggregation
  private static readonly GENRE_MAP: {
    key: string;
    label: string;
    searchTerm: string;
  }[] = [
    { key: 'genre_hydrofuge', label: 'Hydrofuge', searchTerm: 'hydrofuge' },
    { key: 'genre_standard', label: 'Standard', searchTerm: 'standard' },
    { key: 'genre_ignifuge', label: 'Ignifugé', searchTerm: 'ignifugé' },
    { key: 'genre_teinte', label: 'Teinté masse', searchTerm: 'teinté' },
    { key: 'genre_laque', label: 'Laqué', searchTerm: 'laqué' },
    { key: 'genre_cintrable', label: 'Cintrable', searchTerm: 'cintrable' },
    { key: 'genre_leger', label: 'Léger / Allégé', searchTerm: 'léger' },
    {
      key: 'genre_bouchepores',
      label: 'Bouche-pores',
      searchTerm: 'bouche-pores',
    },
    { key: 'genre_filme', label: 'Filmé / Coffrage', searchTerm: 'filmé' },
    { key: 'genre_ctbx', label: 'CTBX Extérieur', searchTerm: 'ctbx' },
    { key: 'genre_okoume', label: 'Okoumé', searchTerm: 'okoumé' },
    { key: 'genre_bouleau', label: 'Bouleau', searchTerm: 'bouleau' },
    { key: 'genre_peuplier', label: 'Peuplier', searchTerm: 'peuplier' },
  ];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Aggregate smart search facets with caching
   *
   * @param whereClause SQL WHERE clause from smart search
   * @param params Parameters for the WHERE clause
   * @param catalogueCondition Additional catalogue filter condition
   */
  async aggregate(
    whereClause: string,
    params: any[],
    catalogueCondition: string,
  ): Promise<FacetsResult> {
    // Generate cache key based on search parameters
    const cacheKey = `facets:${JSON.stringify({ whereClause, params, catalogueCondition })}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as FacetsResult;
    }

    // COMBINED QUERY 1: Simple aggregations (properties, genres based on name)
    const combinedAggregationsSql = `
      SELECT
        -- Boolean properties
        SUM(CASE WHEN p."isHydrofuge" = true THEN 1 ELSE 0 END) as hydrofuge_count,
        SUM(CASE WHEN p."isIgnifuge" = true THEN 1 ELSE 0 END) as ignifuge_count,
        SUM(CASE WHEN p."isPreglued" = true THEN 1 ELSE 0 END) as preglued_count,
        -- Genres (based on name)
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%hydrofuge%' THEN 1 ELSE 0 END) as genre_hydrofuge,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%standard%' THEN 1 ELSE 0 END) as genre_standard,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%ignifug%' THEN 1 ELSE 0 END) as genre_ignifuge,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%teint%' THEN 1 ELSE 0 END) as genre_teinte,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%laqu%' THEN 1 ELSE 0 END) as genre_laque,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%cintrable%' THEN 1 ELSE 0 END) as genre_cintrable,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%leger%' OR unaccent(lower(p.name)) ILIKE '%allege%' THEN 1 ELSE 0 END) as genre_leger,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%bouche%pore%' THEN 1 ELSE 0 END) as genre_bouchepores,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%filme%' OR unaccent(lower(p.name)) ILIKE '%coffrage%' THEN 1 ELSE 0 END) as genre_filme,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%ctbx%' THEN 1 ELSE 0 END) as genre_ctbx,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%okoume%' THEN 1 ELSE 0 END) as genre_okoume,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%bouleau%' THEN 1 ELSE 0 END) as genre_bouleau,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%peuplier%' THEN 1 ELSE 0 END) as genre_peuplier
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      WHERE ${whereClause}
        ${catalogueCondition}
    `;

    // COMBINED QUERY 2: Grouped facets (dimensions, thicknesses, decor, manufacturers)
    const groupedFacetsSql = `
      WITH base AS (
        SELECT p.id, p.name, p.thickness, p."defaultLength", p."defaultWidth",
               p."productType", p.manufacturer, p."decorCategory",
               p."isHydrofuge", p."isIgnifuge", p."isPreglued",
               c.name as catalogue_name
        FROM "Panel" p
        JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
        WHERE ${whereClause}
          ${catalogueCondition}
      ),
      dim_facets AS (
        SELECT "defaultLength" as length, "defaultWidth" as width, COUNT(*) as count
        FROM base
        WHERE "defaultLength" > 0 AND "defaultWidth" > 0
        GROUP BY "defaultLength", "defaultWidth"
        ORDER BY count DESC
        LIMIT 10
      ),
      thick_facets AS (
        SELECT value, COUNT(*) as count
        FROM (
          SELECT unnest(thickness) as value FROM base
        ) t
        WHERE value > 0 AND value <= 100
        GROUP BY value
        ORDER BY value ASC
        LIMIT 20
      ),
      decor_facets AS (
        SELECT "decorCategory" as value, COUNT(*) as count
        FROM base
        WHERE "decorCategory" IS NOT NULL
        GROUP BY "decorCategory"
        ORDER BY count DESC
        LIMIT 10
      ),
      manu_facets AS (
        SELECT manufacturer as value, COUNT(*) as count
        FROM base
        WHERE manufacturer IS NOT NULL AND manufacturer != ''
        GROUP BY manufacturer
        ORDER BY count DESC
        LIMIT 15
      )
      SELECT
        'dim' as facet_type, length::text as key1, width::text as key2, count
      FROM dim_facets
      UNION ALL
      SELECT
        'thick' as facet_type, value::text as key1, NULL as key2, count
      FROM thick_facets
      UNION ALL
      SELECT
        'decor' as facet_type, value::text as key1, NULL as key2, count
      FROM decor_facets
      UNION ALL
      SELECT
        'manu' as facet_type, value::text as key1, NULL as key2, count
      FROM manu_facets
    `;

    try {
      // Execute only 2 queries in parallel (instead of 6), with timeout protection
      const queriesPromise = Promise.all([
        this.prisma
          .$queryRawUnsafe<
            [Record<string, bigint>]
          >(combinedAggregationsSql, ...params)
          .catch(() => [{}] as [Record<string, bigint>]),
        this.prisma
          .$queryRawUnsafe<
            {
              facet_type: string;
              key1: string | null;
              key2: string | null;
              count: bigint;
            }[]
          >(groupedFacetsSql, ...params)
          .catch(
            () =>
              [] as {
                facet_type: string;
                key1: string | null;
                key2: string | null;
                count: bigint;
              }[],
          ),
      ]);

      // Timeout wrapper - returns empty facets if queries take too long
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Facets query timeout')),
          FacetsService.FACETS_QUERY_TIMEOUT,
        ),
      );

      const [aggregationsResult, groupedResult] = await Promise.race([
        queriesPromise,
        timeoutPromise,
      ]);

      // Parse aggregations
      const aggRow = aggregationsResult[0] || {};

      // Properties
      const properties: { key: string; label: string; count: number }[] = [];
      const hydrofugeCount = Number(aggRow.hydrofuge_count || 0);
      const ignifugeCount = Number(aggRow.ignifuge_count || 0);
      const pregluedCount = Number(aggRow.preglued_count || 0);

      if (hydrofugeCount > 0)
        properties.push({
          key: 'hydrofuge',
          label: 'Hydrofuge',
          count: hydrofugeCount,
        });
      if (ignifugeCount > 0)
        properties.push({
          key: 'ignifuge',
          label: 'Ignifugé',
          count: ignifugeCount,
        });
      if (pregluedCount > 0)
        properties.push({
          key: 'preglued',
          label: 'Pré-collé',
          count: pregluedCount,
        });

      // Genres
      const genres = FacetsService.GENRE_MAP.map((g) => ({
        label: g.label,
        count: Number(aggRow[g.key] || 0),
        searchTerm: g.searchTerm,
      }))
        .filter((g) => g.count > 0)
        .sort((a, b) => b.count - a.count);

      // Parse grouped facets
      const dimensions: {
        label: string;
        count: number;
        length: number;
        width: number;
      }[] = [];
      const thicknesses: { value: number; count: number }[] = [];
      const decorCategories: {
        value: string;
        label: string;
        count: number;
      }[] = [];
      const manufacturers: { value: string; label: string; count: number }[] =
        [];

      for (const row of groupedResult) {
        switch (row.facet_type) {
          case 'dim':
            if (row.key1 && row.key2) {
              dimensions.push({
                length: Number(row.key1),
                width: Number(row.key2),
                label: `${row.key1} × ${row.key2}`,
                count: Number(row.count),
              });
            }
            break;
          case 'thick':
            if (row.key1) {
              thicknesses.push({
                value: Number(row.key1),
                count: Number(row.count),
              });
            }
            break;
          case 'decor':
            if (row.key1 && row.key1 !== 'SANS_DECOR') {
              decorCategories.push({
                value: row.key1,
                label:
                  FacetsService.DECOR_CATEGORY_LABELS[row.key1] || row.key1,
                count: Number(row.count),
              });
            }
            break;
          case 'manu':
            if (row.key1) {
              manufacturers.push({
                value: row.key1,
                label: row.key1,
                count: Number(row.count),
              });
            }
            break;
        }
      }

      const result: FacetsResult = {
        genres,
        dimensions,
        thicknesses,
        decorCategories,
        manufacturers,
        properties,
      };

      // Cache for 30 seconds
      await this.cacheManager.set(
        cacheKey,
        result,
        FacetsService.FACETS_CACHE_TTL,
      );

      return result;
    } catch (error) {
      // On error, return empty facets rather than crashing
      console.error('Error fetching facets:', error);
      return this.getEmptyFacets();
    }
  }

  /**
   * Returns empty facets structure
   */
  getEmptyFacets(): FacetsResult {
    return {
      genres: [],
      dimensions: [],
      thicknesses: [],
      decorCategories: [],
      manufacturers: [],
      properties: [],
    };
  }
}
