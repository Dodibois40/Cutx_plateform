import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../r2-storage/r2-storage.service';
import { CreateChuteDto, UpdateChuteDto, SearchChutesDto } from './dto';
import {
  ChuteOfferingWithRelations,
  ChuteCard,
  ChuteSearchResult,
  DEFAULT_OFFERING_DURATION_DAYS,
  COMMISSION_RATES,
  MAX_IMAGES_PER_OFFERING,
} from './entities/chute.entity';
import { ChuteOfferingStatus, ChuteImage, Prisma } from '@prisma/client';

@Injectable()
export class ChutesService {
  constructor(
    private prisma: PrismaService,
    private r2Storage: R2StorageService,
  ) {}

  /**
   * Créer une nouvelle annonce de chute
   */
  async create(
    userId: string,
    createChuteDto: CreateChuteDto,
  ): Promise<ChuteOfferingWithRelations> {
    const { isDraft, ...data } = createChuteDto;

    // Extraire le département du code postal
    const departement = data.departement || data.postalCode.substring(0, 2);

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_OFFERING_DURATION_DAYS);

    const offering = await this.prisma.chuteOffering.create({
      data: {
        ...data,
        departement,
        expiresAt,
        status: isDraft ? ChuteOfferingStatus.DRAFT : ChuteOfferingStatus.ACTIVE,
        seller: { connect: { id: userId } },
        ...(data.categoryId && {
          category: { connect: { id: data.categoryId } },
        }),
      },
      include: {
        images: true,
        seller: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { offers: true, favorites: true, messages: true },
        },
      },
    });

    return offering;
  }

  /**
   * Rechercher des chutes avec filtres
   */
  async search(dto: SearchChutesDto): Promise<ChuteSearchResult> {
    const {
      q,
      productTypes,
      thicknessMin,
      thicknessMax,
      lengthMin,
      lengthMax,
      widthMin,
      widthMax,
      conditions,
      certifiedOnly,
      priceMin,
      priceMax,
      acceptsOffersOnly,
      postalCode,
      departement,
      radius,
      userLat,
      userLng,
      verifiedSellersOnly,
      categoryId,
      statuses,
      sortBy = 'date_desc',
      page = 1,
      limit = 20,
      includeFacets,
    } = dto;

    // Construction des conditions WHERE
    const where: Prisma.ChuteOfferingWhereInput = {
      // Par défaut, seulement les annonces actives (sauf si statuts spécifiés)
      status: statuses?.length
        ? { in: statuses }
        : ChuteOfferingStatus.ACTIVE,
    };

    // Filtre texte
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { material: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filtres produit
    if (productTypes?.length) {
      where.productType = { in: productTypes };
    }

    if (thicknessMin !== undefined || thicknessMax !== undefined) {
      where.thickness = {
        ...(thicknessMin !== undefined && { gte: thicknessMin }),
        ...(thicknessMax !== undefined && { lte: thicknessMax }),
      };
    }

    if (lengthMin !== undefined || lengthMax !== undefined) {
      where.length = {
        ...(lengthMin !== undefined && { gte: lengthMin }),
        ...(lengthMax !== undefined && { lte: lengthMax }),
      };
    }

    if (widthMin !== undefined || widthMax !== undefined) {
      where.width = {
        ...(widthMin !== undefined && { gte: widthMin }),
        ...(widthMax !== undefined && { lte: widthMax }),
      };
    }

    // Filtres état
    if (conditions?.length) {
      where.condition = { in: conditions };
    }

    if (certifiedOnly) {
      where.certificationChecks = { isEmpty: false };
    }

    // Filtres prix
    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {
        ...(priceMin !== undefined && { gte: priceMin }),
        ...(priceMax !== undefined && { lte: priceMax }),
      };
    }

    if (acceptsOffersOnly) {
      where.acceptsOffers = true;
    }

    // Filtres localisation
    if (departement) {
      where.departement = departement;
    } else if (postalCode) {
      // Si code postal sans rayon, chercher dans le département
      where.departement = postalCode.substring(0, 2);
    }

    // Filtre catégorie
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Construction du ORDER BY
    let orderBy: Prisma.ChuteOfferingOrderByWithRelationInput[] = [];

    // Toujours mettre les boosts en premier
    orderBy.push({ boostLevel: 'desc' });

    switch (sortBy) {
      case 'price_asc':
        orderBy.push({ price: 'asc' });
        break;
      case 'price_desc':
        orderBy.push({ price: 'desc' });
        break;
      case 'date_asc':
        orderBy.push({ createdAt: 'asc' });
        break;
      case 'popularity':
        orderBy.push({ viewCount: 'desc' });
        break;
      case 'boost':
        // Déjà géré
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'date_desc':
      default:
        orderBy.push({ createdAt: 'desc' });
        break;
    }

    // Exécution de la requête
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.chuteOffering.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              sellerProfile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  isVerified: true,
                  averageRating: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.chuteOffering.count({ where }),
    ]);

    // Transformer en ChuteCard
    const cards: ChuteCard[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      productType: item.productType,
      material: item.material,
      thickness: item.thickness,
      length: item.length,
      width: item.width,
      condition: item.condition,
      price: item.price,
      acceptsOffers: item.acceptsOffers,
      boostLevel: item.boostLevel,
      city: item.city,
      postalCode: item.postalCode,
      departement: item.departement,
      status: item.status,
      viewCount: item.viewCount,
      favoriteCount: item.favoriteCount,
      createdAt: item.createdAt,
      primaryImage: item.images[0]?.url || null,
      useCatalogImage: item.useCatalogImage,
      catalogPanelId: item.catalogPanelId,
      seller: item.seller.sellerProfile
        ? {
            id: item.seller.id,
            displayName: item.seller.sellerProfile.displayName,
            avatarUrl: item.seller.sellerProfile.avatarUrl,
            isVerified: item.seller.sellerProfile.isVerified,
            averageRating: item.seller.sellerProfile.averageRating,
          }
        : {
            id: item.seller.id,
            displayName:
              item.seller.company ||
              `${item.seller.firstName || ''} ${item.seller.lastName || ''}`.trim() ||
              'Vendeur',
            avatarUrl: null,
            isVerified: false,
            averageRating: null,
          },
    }));

    return {
      items: cards,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * Récupérer une chute par son ID
   */
  async findOne(id: string): Promise<ChuteOfferingWithRelations> {
    const offering = await this.prisma.chuteOffering.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            sellerProfile: {
              select: {
                displayName: true,
                bio: true,
                avatarUrl: true,
                isVerified: true,
                averageRating: true,
                ratingCount: true,
                responseRate: true,
                responseTime: true,
                totalSales: true,
              },
            },
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { offers: true, favorites: true, messages: true },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException(`Chute avec l'ID "${id}" non trouvée`);
    }

    return offering as ChuteOfferingWithRelations;
  }

  /**
   * Mettre à jour une chute
   */
  async update(
    id: string,
    userId: string,
    updateChuteDto: UpdateChuteDto,
  ): Promise<ChuteOfferingWithRelations> {
    // Vérifier que l'annonce existe et appartient à l'utilisateur
    const existing = await this.prisma.chuteOffering.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Chute avec l'ID "${id}" non trouvée`);
    }

    if (existing.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette annonce",
      );
    }

    // Ne pas permettre de modifier une annonce vendue
    if (existing.status === ChuteOfferingStatus.SOLD) {
      throw new BadRequestException(
        'Impossible de modifier une annonce vendue',
      );
    }

    const { categoryId, ...data } = updateChuteDto;

    const updated = await this.prisma.chuteOffering.update({
      where: { id },
      data: {
        ...data,
        ...(categoryId !== undefined && {
          category: categoryId
            ? { connect: { id: categoryId } }
            : { disconnect: true },
        }),
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        seller: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { offers: true, favorites: true, messages: true },
        },
      },
    });

    return updated as ChuteOfferingWithRelations;
  }

  /**
   * Supprimer (archiver) une chute
   */
  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.chuteOffering.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Chute avec l'ID "${id}" non trouvée`);
    }

    if (existing.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer cette annonce",
      );
    }

    // Archiver plutôt que supprimer
    await this.prisma.chuteOffering.update({
      where: { id },
      data: { status: ChuteOfferingStatus.ARCHIVED },
    });
  }

  /**
   * Incrémenter le compteur de vues
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.chuteOffering.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  /**
   * Récupérer les annonces d'un vendeur
   */
  async findByUser(
    userId: string,
    statuses?: ChuteOfferingStatus[],
  ): Promise<ChuteCard[]> {
    const where: Prisma.ChuteOfferingWhereInput = {
      sellerId: userId,
    };

    if (statuses?.length) {
      where.status = { in: statuses };
    }

    const items = await this.prisma.chuteOffering.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: { offers: true, favorites: true },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      productType: item.productType,
      material: item.material,
      thickness: item.thickness,
      length: item.length,
      width: item.width,
      condition: item.condition,
      price: item.price,
      acceptsOffers: item.acceptsOffers,
      boostLevel: item.boostLevel,
      city: item.city,
      postalCode: item.postalCode,
      departement: item.departement,
      status: item.status,
      viewCount: item.viewCount,
      favoriteCount: item.favoriteCount,
      createdAt: item.createdAt,
      primaryImage: item.images[0]?.url || null,
      useCatalogImage: item.useCatalogImage,
      catalogPanelId: item.catalogPanelId,
      seller: null, // Pas besoin du vendeur pour ses propres annonces
    }));
  }

  /**
   * Publier une annonce en brouillon
   */
  async publish(id: string, userId: string): Promise<ChuteOfferingWithRelations> {
    const existing = await this.prisma.chuteOffering.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Chute avec l'ID "${id}" non trouvée`);
    }

    if (existing.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à publier cette annonce",
      );
    }

    if (existing.status !== ChuteOfferingStatus.DRAFT) {
      throw new BadRequestException("Cette annonce n'est pas un brouillon");
    }

    return this.update(id, userId, { status: ChuteOfferingStatus.ACTIVE });
  }

  /**
   * Calculer la commission pour une vente
   */
  calculateCommission(
    price: number,
    boostLevel: keyof typeof COMMISSION_RATES,
  ): { commission: number; sellerPayout: number; rate: number } {
    const rate = COMMISSION_RATES[boostLevel];
    const commission = Math.round(price * rate * 100) / 100;
    const sellerPayout = Math.round((price - commission) * 100) / 100;

    return { commission, sellerPayout, rate };
  }

  /**
   * Ajouter une image à une annonce
   */
  async addImage(
    offeringId: string,
    userId: string,
    buffer: Buffer,
    originalFilename: string,
    isPrimary: boolean = false,
  ): Promise<ChuteImage> {
    // Vérifier que l'annonce existe et appartient à l'utilisateur
    const offering = await this.prisma.chuteOffering.findUnique({
      where: { id: offeringId },
      select: {
        sellerId: true,
        status: true,
        _count: { select: { images: true } },
      },
    });

    if (!offering) {
      throw new NotFoundException(
        `Chute avec l'ID "${offeringId}" non trouvée`,
      );
    }

    if (offering.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette annonce",
      );
    }

    // Vérifier le nombre d'images
    if (offering._count.images >= MAX_IMAGES_PER_OFFERING) {
      throw new BadRequestException(
        `Vous ne pouvez pas ajouter plus de ${MAX_IMAGES_PER_OFFERING} images`,
      );
    }

    // Uploader l'image vers R2
    const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const key = `chutes/${offeringId}/image-${uniqueSuffix}.${ext}`;

    const contentType = this.getContentType(ext);
    const uploadResult = await this.r2Storage.uploadBuffer(
      buffer,
      key,
      contentType,
    );

    // Si c'est la première image ou isPrimary, mettre les autres en non-primary
    if (isPrimary || offering._count.images === 0) {
      await this.prisma.chuteImage.updateMany({
        where: { offeringId },
        data: { isPrimary: false },
      });
    }

    // Créer l'entrée en BDD
    const image = await this.prisma.chuteImage.create({
      data: {
        offeringId,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.url, // Pour l'instant, même URL (à optimiser plus tard)
        order: offering._count.images,
        isPrimary: isPrimary || offering._count.images === 0,
      },
    });

    return image;
  }

  /**
   * Supprimer une image d'une annonce
   */
  async removeImage(
    offeringId: string,
    userId: string,
    imageId: string,
  ): Promise<void> {
    // Vérifier que l'annonce existe et appartient à l'utilisateur
    const offering = await this.prisma.chuteOffering.findUnique({
      where: { id: offeringId },
      select: { sellerId: true },
    });

    if (!offering) {
      throw new NotFoundException(
        `Chute avec l'ID "${offeringId}" non trouvée`,
      );
    }

    if (offering.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette annonce",
      );
    }

    // Récupérer l'image
    const image = await this.prisma.chuteImage.findFirst({
      where: { id: imageId, offeringId },
    });

    if (!image) {
      throw new NotFoundException(`Image avec l'ID "${imageId}" non trouvée`);
    }

    // Supprimer de R2
    const key = this.r2Storage.extractKeyFromUrl(image.url);
    if (key) {
      await this.r2Storage.delete(key).catch(() => {
        // Ignorer les erreurs de suppression R2
      });
    }

    // Supprimer de la BDD
    await this.prisma.chuteImage.delete({
      where: { id: imageId },
    });

    // Si c'était l'image principale, mettre la première restante comme principale
    if (image.isPrimary) {
      const firstImage = await this.prisma.chuteImage.findFirst({
        where: { offeringId },
        orderBy: { order: 'asc' },
      });

      if (firstImage) {
        await this.prisma.chuteImage.update({
          where: { id: firstImage.id },
          data: { isPrimary: true },
        });
      }
    }
  }

  /**
   * Définir une image comme principale
   */
  async setPrimaryImage(
    offeringId: string,
    userId: string,
    imageId: string,
  ): Promise<ChuteImage> {
    // Vérifier que l'annonce existe et appartient à l'utilisateur
    const offering = await this.prisma.chuteOffering.findUnique({
      where: { id: offeringId },
      select: { sellerId: true },
    });

    if (!offering) {
      throw new NotFoundException(
        `Chute avec l'ID "${offeringId}" non trouvée`,
      );
    }

    if (offering.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette annonce",
      );
    }

    // Vérifier que l'image existe
    const image = await this.prisma.chuteImage.findFirst({
      where: { id: imageId, offeringId },
    });

    if (!image) {
      throw new NotFoundException(`Image avec l'ID "${imageId}" non trouvée`);
    }

    // Mettre toutes les autres images en non-primary
    await this.prisma.chuteImage.updateMany({
      where: { offeringId, id: { not: imageId } },
      data: { isPrimary: false },
    });

    // Mettre cette image en primary
    return this.prisma.chuteImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }

  /**
   * Helper pour obtenir le content type
   */
  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return types[ext] || 'image/jpeg';
  }
}
