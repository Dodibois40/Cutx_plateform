import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDevisDto, CreateDevisLineDto } from './dto';
import { UpdateDevisDto } from './dto/update-devis.dto';
import { DevisStatus, Prisma } from '@prisma/client';

@Injectable()
export class DevisService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère une référence unique pour un devis
   * Format: DEV-YYYY-XXXXX
   */
  private async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DEV-${year}-`;

    // Trouver le dernier numéro de l'année
    const lastDevis = await this.prisma.devis.findFirst({
      where: {
        reference: {
          startsWith: prefix,
        },
      },
      orderBy: {
        reference: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastDevis) {
      const lastNumber = parseInt(lastDevis.reference.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Calcule les totaux d'un devis à partir de ses lignes
   */
  private calculateTotals(
    lines: { totalHT: number }[],
    tvaRate: number,
  ): { totalHT: number; totalTVA: number; totalTTC: number } {
    const totalHT = lines.reduce((sum, line) => sum + line.totalHT, 0);
    const totalTVA = totalHT * (tvaRate / 100);
    const totalTTC = totalHT + totalTVA;

    return {
      totalHT: Math.round(totalHT * 100) / 100,
      totalTVA: Math.round(totalTVA * 100) / 100,
      totalTTC: Math.round(totalTTC * 100) / 100,
    };
  }

  /**
   * Créer un nouveau devis
   */
  async create(userId: string, dto: CreateDevisDto) {
    const reference = await this.generateReference();
    const tvaRate = dto.tvaRate ?? 20;

    // Préparer les lignes avec position
    const linesData = dto.lines?.map((line, index) => ({
      ...line,
      position: line.position ?? index,
    }));

    // Calculer les totaux
    const totals = this.calculateTotals(linesData || [], tvaRate);

    return this.prisma.devis.create({
      data: {
        reference,
        name: dto.name,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone,
        clientAddress: dto.clientAddress,
        tvaRate,
        notes: dto.notes,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        ...totals,
        user: {
          connect: { id: userId },
        },
        lines: linesData
          ? {
              create: linesData,
            }
          : undefined,
      },
      include: {
        lines: {
          orderBy: { position: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Trouver tous les devis d'un utilisateur
   */
  async findAllByUser(
    userId: string,
    options?: {
      status?: DevisStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, search, page = 1, limit = 20 } = options || {};

    const where: Prisma.DevisWhereInput = {
      userId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [devis, total] = await Promise.all([
      this.prisma.devis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { lines: true },
          },
        },
      }),
      this.prisma.devis.count({ where }),
    ]);

    return {
      data: devis,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Trouver un devis par ID
   */
  async findOne(id: string, userId: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { position: 'asc' },
          include: {
            panel: {
              select: {
                id: true,
                reference: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
          },
        },
      },
    });

    if (!devis) {
      throw new NotFoundException(`Devis with ID "${id}" not found`);
    }

    // Vérifier que le devis appartient à l'utilisateur
    if (devis.userId !== userId) {
      throw new ForbiddenException('You do not have access to this devis');
    }

    return devis;
  }

  /**
   * Trouver un devis par référence
   */
  async findByReference(reference: string, userId: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { reference },
      include: {
        lines: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!devis) {
      throw new NotFoundException(`Devis with reference "${reference}" not found`);
    }

    if (devis.userId !== userId) {
      throw new ForbiddenException('You do not have access to this devis');
    }

    return devis;
  }

  /**
   * Mettre à jour un devis
   */
  async update(id: string, userId: string, dto: UpdateDevisDto) {
    const devis = await this.findOne(id, userId);

    // Ne pas modifier un devis converti
    if (devis.status === DevisStatus.CONVERTED) {
      throw new BadRequestException('Cannot update a converted devis');
    }

    return this.prisma.devis.update({
      where: { id },
      data: {
        ...dto,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      include: {
        lines: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Supprimer un devis
   */
  async delete(id: string, userId: string) {
    const devis = await this.findOne(id, userId);

    // Ne pas supprimer un devis converti
    if (devis.status === DevisStatus.CONVERTED) {
      throw new BadRequestException('Cannot delete a converted devis');
    }

    return this.prisma.devis.delete({
      where: { id },
    });
  }

  /**
   * Ajouter une ligne au devis
   */
  async addLine(devisId: string, userId: string, dto: CreateDevisLineDto) {
    const devis = await this.findOne(devisId, userId);

    if (devis.status === DevisStatus.CONVERTED) {
      throw new BadRequestException('Cannot add lines to a converted devis');
    }

    // Trouver la dernière position
    const lastLine = await this.prisma.devisLine.findFirst({
      where: { devisId },
      orderBy: { position: 'desc' },
    });

    const position = dto.position ?? (lastLine ? lastLine.position + 1 : 0);

    // Créer la ligne
    const { panelId, ...lineData } = dto;
    const line = await this.prisma.devisLine.create({
      data: {
        ...lineData,
        position,
        devis: { connect: { id: devisId } },
        panel: panelId ? { connect: { id: panelId } } : undefined,
      },
    });

    // Recalculer les totaux
    await this.recalculateTotals(devisId);

    return line;
  }

  /**
   * Mettre à jour une ligne
   */
  async updateLine(
    devisId: string,
    lineId: string,
    userId: string,
    dto: Partial<CreateDevisLineDto>,
  ) {
    const devis = await this.findOne(devisId, userId);

    if (devis.status === DevisStatus.CONVERTED) {
      throw new BadRequestException('Cannot update lines on a converted devis');
    }

    const line = await this.prisma.devisLine.update({
      where: { id: lineId },
      data: dto,
    });

    // Recalculer les totaux
    await this.recalculateTotals(devisId);

    return line;
  }

  /**
   * Supprimer une ligne
   */
  async deleteLine(devisId: string, lineId: string, userId: string) {
    const devis = await this.findOne(devisId, userId);

    if (devis.status === DevisStatus.CONVERTED) {
      throw new BadRequestException('Cannot delete lines from a converted devis');
    }

    await this.prisma.devisLine.delete({
      where: { id: lineId },
    });

    // Recalculer les totaux
    await this.recalculateTotals(devisId);

    return { success: true };
  }

  /**
   * Recalculer les totaux d'un devis
   */
  async recalculateTotals(devisId: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: { lines: true },
    });

    if (!devis) return;

    const totals = this.calculateTotals(devis.lines, devis.tvaRate);

    return this.prisma.devis.update({
      where: { id: devisId },
      data: totals,
    });
  }

  /**
   * Envoyer un devis au client
   */
  async send(id: string, userId: string) {
    const devis = await this.findOne(id, userId);

    if (devis.status !== DevisStatus.DRAFT) {
      throw new BadRequestException('Only draft devis can be sent');
    }

    if (!devis.clientEmail) {
      throw new BadRequestException('Client email is required to send devis');
    }

    // TODO: Envoyer email au client

    return this.prisma.devis.update({
      where: { id },
      data: {
        status: DevisStatus.SENT,
        validUntil: devis.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      },
    });
  }

  /**
   * Convertir un devis en commande
   */
  async convertToOrder(id: string, userId: string) {
    const devis = await this.findOne(id, userId);

    if (devis.status === DevisStatus.CONVERTED) {
      throw new BadRequestException('Devis already converted');
    }

    if (devis.order) {
      throw new BadRequestException('Devis already has an order');
    }

    // Générer référence commande
    const year = new Date().getFullYear();
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        reference: {
          startsWith: `ORD-${year}-`,
        },
      },
      orderBy: { reference: 'desc' },
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.reference.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    const orderReference = `ORD-${year}-${nextNumber.toString().padStart(5, '0')}`;

    // Créer la commande
    const order = await this.prisma.order.create({
      data: {
        reference: orderReference,
        totalHT: devis.totalHT,
        totalTVA: devis.totalTVA,
        totalTTC: devis.totalTTC,
        deliveryAddress: devis.clientAddress,
        user: { connect: { id: userId } },
        devis: { connect: { id: devis.id } },
      },
    });

    // Mettre à jour le statut du devis
    await this.prisma.devis.update({
      where: { id },
      data: { status: DevisStatus.CONVERTED },
    });

    return order;
  }

  /**
   * Dupliquer un devis
   */
  async duplicate(id: string, userId: string) {
    const original = await this.findOne(id, userId);

    const reference = await this.generateReference();

    return this.prisma.devis.create({
      data: {
        reference,
        name: original.name ? `${original.name} (copie)` : null,
        clientName: original.clientName,
        clientEmail: original.clientEmail,
        clientPhone: original.clientPhone,
        clientAddress: original.clientAddress,
        tvaRate: original.tvaRate,
        totalHT: original.totalHT,
        totalTVA: original.totalTVA,
        totalTTC: original.totalTTC,
        notes: original.notes,
        user: { connect: { id: userId } },
        lines: {
          create: original.lines.map((line, index) => ({
            panelReference: line.panelReference,
            panelName: line.panelName,
            thickness: line.thickness,
            length: line.length,
            width: line.width,
            quantity: line.quantity,
            chantHaut: line.chantHaut,
            chantBas: line.chantBas,
            chantGauche: line.chantGauche,
            chantDroit: line.chantDroit,
            unitPriceHT: line.unitPriceHT,
            totalHT: line.totalHT,
            position: index,
            panelId: line.panelId,
          })),
        },
      },
      include: {
        lines: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }
}
