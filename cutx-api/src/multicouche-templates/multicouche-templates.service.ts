import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMulticoucheTemplateDto, UpdateMulticoucheTemplateDto } from './dto';

@Injectable()
export class MulticoucheTemplatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un nouveau template
   */
  async create(userId: string, dto: CreateMulticoucheTemplateDto) {
    return this.prisma.panneauMulticoucheTemplate.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        modeCollage: dto.modeCollage,
        couches: JSON.stringify(dto.couches),
        epaisseurTotale: dto.epaisseurTotale,
        prixEstimeM2: dto.prixEstimeM2,
        userId,
      },
    });
  }

  /**
   * Récupérer tous les templates d'un utilisateur
   */
  async findAllByUser(userId: string) {
    const templates = await this.prisma.panneauMulticoucheTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Parser les couches JSON pour chaque template
    return templates.map((t) => ({
      ...t,
      couches: JSON.parse(t.couches),
    }));
  }

  /**
   * Récupérer un template par son ID
   */
  async findOne(id: string, userId: string) {
    const template = await this.prisma.panneauMulticoucheTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('Access denied to this template');
    }

    return {
      ...template,
      couches: JSON.parse(template.couches),
    };
  }

  /**
   * Mettre à jour un template
   */
  async update(id: string, userId: string, dto: UpdateMulticoucheTemplateDto) {
    // Vérifier l'ownership
    await this.findOne(id, userId);

    const updateData: Record<string, unknown> = {};
    if (dto.nom !== undefined) updateData.nom = dto.nom;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.modeCollage !== undefined) updateData.modeCollage = dto.modeCollage;
    if (dto.couches !== undefined) updateData.couches = JSON.stringify(dto.couches);
    if (dto.epaisseurTotale !== undefined) updateData.epaisseurTotale = dto.epaisseurTotale;
    if (dto.prixEstimeM2 !== undefined) updateData.prixEstimeM2 = dto.prixEstimeM2;

    const updated = await this.prisma.panneauMulticoucheTemplate.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      couches: JSON.parse(updated.couches),
    };
  }

  /**
   * Supprimer un template
   */
  async remove(id: string, userId: string) {
    // Vérifier l'ownership
    await this.findOne(id, userId);

    await this.prisma.panneauMulticoucheTemplate.delete({
      where: { id },
    });

    return { success: true };
  }
}
