import { Controller, Get, Param, Query } from '@nestjs/common';
import { PanelsService } from './panels.service';

@Controller('panels')
export class PanelsController {
  constructor(private readonly panelsService: PanelsService) {}

  /**
   * GET /api/panels/:id
   * Get full panel details - public endpoint
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.panelsService.findOne(id);
  }

  /**
   * GET /api/panels/:id/related
   * Get related panels (same decor, different types)
   */
  @Get(':id/related')
  async findRelated(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.panelsService.findRelated(id, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * GET /api/panels/:id/suggested-decor
   * Get suggested decor for a panel (for pre-filling chant search)
   */
  @Get(':id/suggested-decor')
  async getSuggestedDecor(@Param('id') id: string) {
    return this.panelsService.getSuggestedDecor(id);
  }

  /**
   * GET /api/panels/:id/best-matching-chant
   * Find the best matching edge band for a panel based on material and decor
   */
  @Get(':id/best-matching-chant')
  async findBestMatchingChant(@Param('id') id: string) {
    return this.panelsService.findBestMatchingChant(id);
  }
}
