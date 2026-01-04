import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { UsinagesService } from './usinages.service';
import { CreateUsinageTemplateDto, UpdateUsinageTemplateDto } from './dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import type { ClerkUser } from '../common/decorators/current-user.decorator';

@Controller('usinages')
export class UsinagesController {
  constructor(
    private readonly usinagesService: UsinagesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Verifier que l'utilisateur est admin
   */
  private async checkAdmin(clerkUser: ClerkUser): Promise<void> {
    const user = await this.usersService.findOrCreate({
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    });

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs');
    }
  }

  // =============================================
  // ENDPOINTS PUBLICS (pas d'auth requise)
  // =============================================

  /**
   * GET /api/usinages/templates
   * Lister tous les templates actifs (public)
   */
  @Get('templates')
  async findAllActive() {
    const templates = await this.usinagesService.findAllActive();
    return { templates };
  }

  /**
   * GET /api/usinages/templates/:id
   * Recuperer un template par son ID (public)
   */
  @Get('templates/:id')
  async findOne(@Param('id') id: string) {
    return this.usinagesService.findOne(id);
  }

  /**
   * GET /api/usinages/templates/slug/:slug
   * Recuperer un template par son slug (public)
   */
  @Get('templates/slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.usinagesService.findBySlug(slug);
  }

  // =============================================
  // ENDPOINTS ADMIN (auth requise + role admin)
  // =============================================

  /**
   * GET /api/usinages/admin/templates
   * Lister tous les templates (admin - inclut les inactifs)
   */
  @Get('admin/templates')
  @UseGuards(ClerkAuthGuard)
  async findAllAdmin(@CurrentUser() clerkUser: ClerkUser) {
    await this.checkAdmin(clerkUser);
    const templates = await this.usinagesService.findAll();
    return { templates };
  }

  /**
   * POST /api/usinages/admin/templates
   * Creer un nouveau template (admin)
   */
  @Post('admin/templates')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() clerkUser: ClerkUser,
    @Body() dto: CreateUsinageTemplateDto,
  ) {
    await this.checkAdmin(clerkUser);
    return this.usinagesService.create(dto);
  }

  /**
   * PUT /api/usinages/admin/templates/:id
   * Mettre a jour un template (admin)
   */
  @Put('admin/templates/:id')
  @UseGuards(ClerkAuthGuard)
  async update(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Body() dto: UpdateUsinageTemplateDto,
  ) {
    await this.checkAdmin(clerkUser);
    return this.usinagesService.update(id, dto);
  }

  /**
   * DELETE /api/usinages/admin/templates/:id
   * Supprimer un template (admin)
   */
  @Delete('admin/templates/:id')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    await this.checkAdmin(clerkUser);
    return this.usinagesService.remove(id);
  }

  /**
   * POST /api/usinages/admin/templates/:id/toggle
   * Activer/Desactiver un template (admin)
   */
  @Post('admin/templates/:id/toggle')
  @UseGuards(ClerkAuthGuard)
  async toggleActive(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    await this.checkAdmin(clerkUser);
    return this.usinagesService.toggleActive(id);
  }

  /**
   * POST /api/usinages/admin/templates/reorder
   * Reordonner les templates (admin)
   */
  @Post('admin/templates/reorder')
  @UseGuards(ClerkAuthGuard)
  async reorder(
    @CurrentUser() clerkUser: ClerkUser,
    @Body() body: { ids: string[] },
  ) {
    await this.checkAdmin(clerkUser);
    return this.usinagesService.reorder(body.ids);
  }
}
