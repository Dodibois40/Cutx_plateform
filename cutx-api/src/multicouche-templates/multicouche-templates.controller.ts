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
} from '@nestjs/common';
import { MulticoucheTemplatesService } from './multicouche-templates.service';
import { CreateMulticoucheTemplateDto, UpdateMulticoucheTemplateDto } from './dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import type { ClerkUser } from '../common/decorators/current-user.decorator';

@Controller('multicouche-templates')
@UseGuards(ClerkAuthGuard)
export class MulticoucheTemplatesController {
  constructor(
    private readonly templatesService: MulticoucheTemplatesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Récupérer l'ID utilisateur depuis le user Clerk
   */
  private async getUserId(clerkUser: ClerkUser): Promise<string> {
    const user = await this.usersService.findOrCreate({
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    });
    return user.id;
  }

  /**
   * POST /api/multicouche-templates
   * Créer un nouveau template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() clerkUser: ClerkUser,
    @Body() dto: CreateMulticoucheTemplateDto,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.templatesService.create(userId, dto);
  }

  /**
   * GET /api/multicouche-templates
   * Lister tous les templates de l'utilisateur
   */
  @Get()
  async findAll(@CurrentUser() clerkUser: ClerkUser) {
    const userId = await this.getUserId(clerkUser);
    return this.templatesService.findAllByUser(userId);
  }

  /**
   * GET /api/multicouche-templates/:id
   * Récupérer un template par son ID
   */
  @Get(':id')
  async findOne(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.templatesService.findOne(id, userId);
  }

  /**
   * PUT /api/multicouche-templates/:id
   * Mettre à jour un template
   */
  @Put(':id')
  async update(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Body() dto: UpdateMulticoucheTemplateDto,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.templatesService.update(id, userId, dto);
  }

  /**
   * DELETE /api/multicouche-templates/:id
   * Supprimer un template
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.templatesService.remove(id, userId);
  }
}
