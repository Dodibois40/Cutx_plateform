import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { CutxImportService } from './cutx-import.service';
import type { CreateImportDto } from './cutx-import.service';

@Controller('cutx')
export class CutxImportController {
  constructor(private readonly cutxImportService: CutxImportService) {}

  /**
   * POST /api/cutx/import
   * Crée une nouvelle session d'import depuis le plugin SketchUp
   */
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async createImport(
    @Body() dto: CreateImportDto,
    @Req() req: Request,
  ): Promise<{ importId: string }> {
    // Récupérer l'IP client
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress;

    return this.cutxImportService.createImportSession(dto, ipAddress);
  }

  /**
   * GET /api/cutx/import/:id
   * Récupère les données d'une session d'import
   */
  @Get('import/:id')
  async getImport(@Param('id') id: string) {
    return this.cutxImportService.getImportSession(id);
  }
}
