import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Type for uploaded file (from @types/multer)
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
};
import { PanelsReviewService } from './panels-review.service';
import { UpdatePanelDto, MarkCorrectionDto } from './dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import type { ClerkUser } from '../common/decorators/current-user.decorator';
import {
  PanelReviewStatus,
  ProductCategory,
  ProductType,
  ProductSubType,
  DecorCategory,
  GrainDirection,
  CoreType,
  CoreColor,
  LamellaType,
} from '@prisma/client';

@Controller('panels-review')
@UseGuards(ClerkAuthGuard)
export class PanelsReviewController {
  constructor(
    private readonly panelsReviewService: PanelsReviewService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Check if user is admin
   */
  private async checkAdmin(clerkUser: ClerkUser): Promise<string> {
    const user = await this.usersService.findOrCreate({
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    });

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs');
    }

    return user.clerkId;
  }

  /**
   * GET /api/panels-review/stats
   * Get review statistics
   */
  @Get('stats')
  async getStats(@CurrentUser() clerkUser: ClerkUser) {
    await this.checkAdmin(clerkUser);
    return this.panelsReviewService.getStats();
  }

  /**
   * GET /api/panels-review/categories
   * Get all categories for dropdown
   */
  @Get('categories')
  async getCategories(@CurrentUser() clerkUser: ClerkUser) {
    await this.checkAdmin(clerkUser);
    return this.panelsReviewService.getCategories();
  }

  /**
   * GET /api/panels-review/enums
   * Get all enum values for classification dropdowns
   */
  @Get('enums')
  async getEnums(@CurrentUser() clerkUser: ClerkUser) {
    await this.checkAdmin(clerkUser);

    return {
      productCategories: Object.values(ProductCategory),
      productTypes: Object.values(ProductType),
      productSubTypes: Object.values(ProductSubType),
      decorCategories: Object.values(DecorCategory),
      grainDirections: Object.values(GrainDirection),
      coreTypes: Object.values(CoreType),
      coreColors: Object.values(CoreColor),
      lamellaTypes: Object.values(LamellaType),
    };
  }

  /**
   * GET /api/panels-review/to-correct
   * Get panels marked for correction
   */
  @Get('to-correct')
  async getPanelsToCorrect(
    @CurrentUser() clerkUser: ClerkUser,
    @Query('limit') limit?: string,
  ) {
    await this.checkAdmin(clerkUser);
    const panels = await this.panelsReviewService.getPanelsToCorrect(
      limit ? parseInt(limit, 10) : 50,
    );
    return { panels };
  }

  /**
   * GET /api/panels-review/random
   * Get a random panel for review
   */
  @Get('random')
  async getRandomPanel(
    @CurrentUser() clerkUser: ClerkUser,
    @Query('status') status?: string,
  ) {
    await this.checkAdmin(clerkUser);

    const validStatuses: PanelReviewStatus[] = [
      'NON_VERIFIE',
      'VERIFIE',
      'A_CORRIGER',
    ];
    const reviewStatus =
      status && validStatuses.includes(status as PanelReviewStatus)
        ? (status as PanelReviewStatus)
        : undefined;

    const panel = await this.panelsReviewService.getRandomPanel(reviewStatus);
    const stats = await this.panelsReviewService.getStats();

    return { panel, stats };
  }

  /**
   * GET /api/panels-review/:id
   * Get a specific panel
   */
  @Get(':id')
  async getPanel(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    await this.checkAdmin(clerkUser);
    return this.panelsReviewService.getPanel(id);
  }

  /**
   * PATCH /api/panels-review/:id
   * Update a panel
   */
  @Patch(':id')
  async updatePanel(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Body() dto: UpdatePanelDto,
  ) {
    await this.checkAdmin(clerkUser);
    return this.panelsReviewService.updatePanel(id, dto);
  }

  /**
   * POST /api/panels-review/:id/verify
   * Mark panel as verified and get next
   */
  @Post(':id/verify')
  async verifyPanel(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.checkAdmin(clerkUser);
    return this.panelsReviewService.verifyPanel(id, userId);
  }

  /**
   * POST /api/panels-review/:id/mark-correction
   * Mark panel for correction
   */
  @Post(':id/mark-correction')
  async markForCorrection(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Body() dto: MarkCorrectionDto,
  ) {
    const userId = await this.checkAdmin(clerkUser);
    return this.panelsReviewService.markForCorrection(id, userId, dto.notes);
  }

  /**
   * POST /api/panels-review/:id/reset
   * Reset review status to non-verified
   */
  @Post(':id/reset')
  async resetReviewStatus(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    await this.checkAdmin(clerkUser);
    return this.panelsReviewService.resetReviewStatus(id);
  }

  /**
   * POST /api/panels-review/:id/upload-image
   * Upload an image for a panel
   */
  @Post(':id/upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/panels',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `panel-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
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
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
  ) {
    await this.checkAdmin(clerkUser);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Build the URL for the uploaded image
    const imageUrl = `/uploads/panels/${file.filename}`;

    // Update the panel with the new image URL
    return this.panelsReviewService.updatePanel(id, { imageUrl });
  }
}
