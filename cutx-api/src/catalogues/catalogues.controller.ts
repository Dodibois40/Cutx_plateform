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
