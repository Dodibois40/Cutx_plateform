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
} from '@nestjs/common';
import { DevisService } from './devis.service';
import { UsersService } from '../users/users.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { ClerkUser } from '../common/decorators/current-user.decorator';
import { CreateDevisDto, CreateDevisLineDto } from './dto';
import { UpdateDevisDto } from './dto/update-devis.dto';
import { DevisStatus } from '@prisma/client';

@Controller('devis')
@UseGuards(ClerkAuthGuard)
export class DevisController {
  constructor(
    private readonly devisService: DevisService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Récupère l'ID utilisateur à partir du clerkUser
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
   * Créer un nouveau devis
   */
  @Post()
  async create(
    @CurrentUser() clerkUser: ClerkUser,
    @Body() dto: CreateDevisDto,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.create(userId, dto);
  }

  /**
   * Lister tous les devis de l'utilisateur
   */
  @Get()
  async findAll(
    @CurrentUser() clerkUser: ClerkUser,
    @Query('status') status?: DevisStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.findAllByUser(userId, {
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Récupérer un devis par ID
   */
  @Get(':id')
  async findOne(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.findOne(id, userId);
  }

  /**
   * Récupérer un devis par référence
   */
  @Get('reference/:reference')
  async findByReference(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('reference') reference: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.findByReference(reference, userId);
  }

  /**
   * Mettre à jour un devis
   */
  @Put(':id')
  async update(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Body() dto: UpdateDevisDto,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.update(id, userId, dto);
  }

  /**
   * Supprimer un devis
   */
  @Delete(':id')
  async delete(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.delete(id, userId);
  }

  /**
   * Ajouter une ligne au devis
   */
  @Post(':id/lines')
  async addLine(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Body() dto: CreateDevisLineDto,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.addLine(id, userId, dto);
  }

  /**
   * Mettre à jour une ligne du devis
   */
  @Put(':id/lines/:lineId')
  async updateLine(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: Partial<CreateDevisLineDto>,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.updateLine(id, lineId, userId, dto);
  }

  /**
   * Supprimer une ligne du devis
   */
  @Delete(':id/lines/:lineId')
  async deleteLine(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.deleteLine(id, lineId, userId);
  }

  /**
   * Envoyer le devis au client
   */
  @Post(':id/send')
  async send(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.send(id, userId);
  }

  /**
   * Convertir le devis en commande
   */
  @Post(':id/convert')
  async convertToOrder(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.convertToOrder(id, userId);
  }

  /**
   * Dupliquer un devis
   */
  @Post(':id/duplicate')
  async duplicate(
    @CurrentUser() clerkUser: ClerkUser,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(clerkUser);
    return this.devisService.duplicate(id, userId);
  }
}
