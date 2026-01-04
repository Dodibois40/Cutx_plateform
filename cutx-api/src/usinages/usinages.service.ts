import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsinageTemplateDto, UpdateUsinageTemplateDto } from './dto';

@Injectable()
export class UsinagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generer un slug a partir du nom
   */
  private generateSlug(nom: string): string {
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Creer un nouveau template d'usinage
   */
  async create(dto: CreateUsinageTemplateDto) {
    const slug = this.generateSlug(dto.nom);

    // Verifier que le slug n'existe pas deja
    const existing = await this.prisma.usinageTemplate.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Un usinage avec le slug "${slug}" existe deja`);
    }

    return this.prisma.usinageTemplate.create({
      data: {
        nom: dto.nom,
        slug,
        description: dto.description,
        iconSvg: dto.iconSvg,
        configSchema: JSON.stringify(dto.configSchema),
        technicalSvg: dto.technicalSvg,
        pricingType: dto.pricingType,
        priceHT: dto.priceHT,
        category: dto.category,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Recuperer tous les templates actifs (public)
   */
  async findAllActive() {
    const templates = await this.prisma.usinageTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nom: 'asc' }],
    });

    return templates.map((t) => ({
      ...t,
      configSchema: JSON.parse(t.configSchema),
    }));
  }

  /**
   * Recuperer tous les templates (admin)
   */
  async findAll() {
    const templates = await this.prisma.usinageTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nom: 'asc' }],
    });

    return templates.map((t) => ({
      ...t,
      configSchema: JSON.parse(t.configSchema),
    }));
  }

  /**
   * Recuperer un template par son ID
   */
  async findOne(id: string) {
    const template = await this.prisma.usinageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template d'usinage avec ID "${id}" non trouve`);
    }

    return {
      ...template,
      configSchema: JSON.parse(template.configSchema),
    };
  }

  /**
   * Recuperer un template par son slug
   */
  async findBySlug(slug: string) {
    const template = await this.prisma.usinageTemplate.findUnique({
      where: { slug },
    });

    if (!template) {
      throw new NotFoundException(`Template d'usinage avec slug "${slug}" non trouve`);
    }

    return {
      ...template,
      configSchema: JSON.parse(template.configSchema),
    };
  }

  /**
   * Mettre a jour un template
   */
  async update(id: string, dto: UpdateUsinageTemplateDto) {
    // Verifier que le template existe
    await this.findOne(id);

    const updateData: Record<string, unknown> = {};

    if (dto.nom !== undefined) {
      updateData.nom = dto.nom;
      updateData.slug = this.generateSlug(dto.nom);

      // Verifier que le nouveau slug n'existe pas deja
      const existing = await this.prisma.usinageTemplate.findFirst({
        where: {
          slug: updateData.slug as string,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Un usinage avec le slug "${updateData.slug}" existe deja`);
      }
    }

    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.iconSvg !== undefined) updateData.iconSvg = dto.iconSvg;
    if (dto.configSchema !== undefined) updateData.configSchema = JSON.stringify(dto.configSchema);
    if (dto.technicalSvg !== undefined) updateData.technicalSvg = dto.technicalSvg;
    if (dto.pricingType !== undefined) updateData.pricingType = dto.pricingType;
    if (dto.priceHT !== undefined) updateData.priceHT = dto.priceHT;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.usinageTemplate.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      configSchema: JSON.parse(updated.configSchema),
    };
  }

  /**
   * Supprimer un template
   */
  async remove(id: string) {
    // Verifier que le template existe
    await this.findOne(id);

    await this.prisma.usinageTemplate.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Activer/Desactiver un template
   */
  async toggleActive(id: string) {
    const template = await this.findOne(id);

    const updated = await this.prisma.usinageTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });

    return {
      ...updated,
      configSchema: JSON.parse(updated.configSchema),
    };
  }

  /**
   * Reordonner les templates
   */
  async reorder(ids: string[]) {
    const updates = ids.map((id, index) =>
      this.prisma.usinageTemplate.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }
}
