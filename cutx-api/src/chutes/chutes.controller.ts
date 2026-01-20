import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { ChutesService } from './chutes.service';
import { CreateChuteDto, UpdateChuteDto, SearchChutesDto } from './dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { ChuteOfferingStatus } from '@prisma/client';

// Type for multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// Extend Request to include user from Clerk auth
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    clerkId: string;
    email: string;
  };
}

@Controller('chutes')
export class ChutesController {
  constructor(private readonly chutesService: ChutesService) {}

  /**
   * Rechercher des chutes (public)
   * GET /api/chutes
   */
  @Get()
  async search(@Query() searchDto: SearchChutesDto) {
    return this.chutesService.search(searchDto);
  }

  /**
   * Récupérer mes annonces (authentifié)
   * GET /api/chutes/my-listings
   */
  @Get('my-listings')
  @UseGuards(ClerkAuthGuard)
  async getMyListings(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    const statuses = status
      ? (status.split(',') as ChuteOfferingStatus[])
      : undefined;
    return this.chutesService.findByUser(req.user.id, statuses);
  }

  /**
   * Récupérer une chute par ID (public)
   * GET /api/chutes/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const chute = await this.chutesService.findOne(id);

    // Incrémenter le compteur de vues (sans attendre)
    this.chutesService.incrementViewCount(id).catch(() => {
      // Ignorer les erreurs d'incrémentation
    });

    return chute;
  }

  /**
   * Créer une nouvelle annonce (authentifié)
   * POST /api/chutes
   */
  @Post()
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createChuteDto: CreateChuteDto,
  ) {
    return this.chutesService.create(req.user.id, createChuteDto);
  }

  /**
   * Mettre à jour une annonce (authentifié, propriétaire)
   * PUT /api/chutes/:id
   */
  @Put(':id')
  @UseGuards(ClerkAuthGuard)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateChuteDto: UpdateChuteDto,
  ) {
    return this.chutesService.update(id, req.user.id, updateChuteDto);
  }

  /**
   * Publier un brouillon (authentifié, propriétaire)
   * POST /api/chutes/:id/publish
   */
  @Post(':id/publish')
  @UseGuards(ClerkAuthGuard)
  async publish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.chutesService.publish(id, req.user.id);
  }

  /**
   * Supprimer (archiver) une annonce (authentifié, propriétaire)
   * DELETE /api/chutes/:id
   */
  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.chutesService.remove(id, req.user.id);
  }

  /**
   * Uploader une image pour une annonce (authentifié, propriétaire)
   * POST /api/chutes/:id/images
   */
  @Post(':id/images')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Seuls les fichiers image sont acceptés'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
    @Query('isPrimary') isPrimary?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.chutesService.addImage(
      id,
      req.user.id,
      file.buffer,
      file.originalname,
      isPrimary === 'true',
    );
  }

  /**
   * Supprimer une image d'une annonce (authentifié, propriétaire)
   * DELETE /api/chutes/:id/images/:imageId
   */
  @Delete(':id/images/:imageId')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.chutesService.removeImage(id, req.user.id, imageId);
  }

  /**
   * Définir une image comme principale (authentifié, propriétaire)
   * PUT /api/chutes/:id/images/:imageId/primary
   */
  @Put(':id/images/:imageId/primary')
  @UseGuards(ClerkAuthGuard)
  async setPrimaryImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.chutesService.setPrimaryImage(id, req.user.id, imageId);
  }
}
