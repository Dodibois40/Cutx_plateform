import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { CataloguesService } from './catalogues.service';

@Controller('catalogues')
export class CataloguesController {
  constructor(private readonly cataloguesService: CataloguesService) {}

  @Get()
  async findAll() {
    const catalogues = await this.cataloguesService.findAllCatalogues();
    return { catalogues };
  }

  @Get('search')
  async searchPanels(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.length < 2) {
      return { panels: [] };
    }

    const panels = await this.cataloguesService.searchPanels(
      query,
      limit ? parseInt(limit, 10) : 20,
    );

    return { panels };
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.cataloguesService.autocomplete(
      query,
      limit ? parseInt(limit, 10) : 10,
    );

    return result;
  }

  /**
   * Search Suggestions - Correction de fautes de frappe
   * Utilise pg_trgm pour suggérer des corrections
   *
   * @example
   * GET /catalogues/suggest?q=chataigner
   * Returns: { suggestions: [{ original: "chataigner", suggestion: "châtaignier", confidence: 0.65 }] }
   */
  @Get('suggest')
  async suggest(@Query('q') query: string) {
    if (!query || query.length < 3) {
      return {
        originalQuery: query || '',
        suggestions: [],
        correctedQuery: null,
      };
    }

    return this.cataloguesService.suggest(query);
  }

  /**
   * Sponsored Panels - Panneaux sponsorisés
   * Retourne les panneaux marqués comme sponsorisés (isSponsored = true)
   * et dont la date d'expiration n'est pas dépassée
   */
  @Get('sponsored')
  async getSponsored(
    @Query('limit') limit?: string,
    @Query('q') query?: string,
  ) {
    const panels = await this.cataloguesService.findSponsored(
      limit ? parseInt(limit, 10) : 4,
      query,
    );

    return { panels };
  }

  /**
   * Smart Search - Recherche Intelligente
   * Parse automatiquement les requêtes en langage naturel
   *
   * Exemples:
   * - "mdf 19" → trouve les MDF en 19mm
   * - "méla gris foncé" → trouve les mélaminés gris foncé
   * - "agglo chêne 19" → trouve les agglomérés plaqués chêne en 19mm
   */
  @Get('smart-search')
  async smartSearch(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('catalogue') catalogueSlug?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
    @Query('enStock') enStock?: string,
    // Nouveaux filtres explicites
    @Query('decorCategory') decorCategory?: string,
    @Query('manufacturer') manufacturer?: string,
    @Query('isHydrofuge') isHydrofuge?: string,
    @Query('isIgnifuge') isIgnifuge?: string,
    @Query('isPreglued') isPreglued?: string,
  ) {
    if (!query || query.trim().length < 2) {
      return {
        panels: [],
        total: 0,
        page: 1,
        limit: 100,
        hasMore: false,
        parsed: {
          productTypes: [],
          thickness: null,
          searchTerms: [],
          originalQuery: query || '',
        },
      };
    }

    const result = await this.cataloguesService.smartSearch(query, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
      catalogueSlug,
      sortBy,
      sortDirection: sortDirection as 'asc' | 'desc' | undefined,
      enStock: enStock === 'true',
      // Nouveaux filtres explicites
      decorCategory: decorCategory || undefined,
      manufacturer: manufacturer || undefined,
      isHydrofuge: isHydrofuge === 'true' || undefined,
      isIgnifuge: isIgnifuge === 'true' || undefined,
      isPreglued: isPreglued === 'true' || undefined,
    });

    return result;
  }

  @Get('categories')
  async findAllCategories() {
    const categories = await this.cataloguesService.findAllParentCategories();
    return { categories };
  }

  @Get('panels/by-reference/:reference')
  async findPanelByRef(@Param('reference') reference: string) {
    const panel = await this.cataloguesService.findPanelByReferenceGlobal(reference);
    if (!panel) {
      throw new NotFoundException(`Panel "${reference}" not found`);
    }
    return { panel };
  }

  @Get('panels')
  async findAllPanels(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sousCategorie') sousCategorie?: string,
    @Query('productType') productType?: string,
    @Query('epaisseur') epaisseur?: string,
    @Query('enStock') enStock?: string,
    @Query('catalogue') catalogueSlug?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
  ) {
    const result = await this.cataloguesService.findAllPanels({
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : undefined,
      sousCategorie,
      productType,
      epaisseur: epaisseur ? parseFloat(epaisseur) : undefined,
      enStock: enStock === 'true',
      catalogueSlug,
      sortBy: sortBy as 'name' | 'reference' | 'pricePerM2' | 'defaultThickness' | 'stockStatus' | undefined,
      sortDirection: sortDirection as 'asc' | 'desc' | undefined,
    });

    return {
      panels: result.panels,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    };
  }

  @Get('filter-options')
  async getFilterOptions(@Query('catalogue') catalogueSlug?: string) {
    return this.cataloguesService.getFilterOptions(catalogueSlug);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const catalogue = await this.cataloguesService.findCatalogueBySlug(slug);
    if (!catalogue) {
      throw new NotFoundException(`Catalogue "${slug}" not found`);
    }
    return catalogue;
  }

  @Get(':slug/categories')
  async findCategories(@Param('slug') slug: string) {
    const categories = await this.cataloguesService.findCategoriesByCatalogue(slug);
    return { categories };
  }

  @Get(':slug/panels')
  async findPanels(
    @Param('slug') slug: string,
    @Query('category') categorySlug?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.cataloguesService.findPanelsByCatalogue(slug, {
      categorySlug,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return {
      panels: result.panels,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };
  }

  @Get(':slug/panels/:reference')
  async findPanel(
    @Param('slug') slug: string,
    @Param('reference') reference: string,
  ) {
    const panel = await this.cataloguesService.findPanelByReference(slug, reference);
    if (!panel) {
      throw new NotFoundException(`Panel "${reference}" not found in catalogue "${slug}"`);
    }
    return panel;
  }
}
