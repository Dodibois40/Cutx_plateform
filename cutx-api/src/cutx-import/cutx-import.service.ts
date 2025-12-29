import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CutxImportSession } from '@prisma/client';

export interface CreateImportDto {
  panneaux: Array<{
    entityId: number;
    reference: string;
    longueur: number;
    largeur: number;
    epaisseur: number;
    bounds?: {
      width: number;
      depth: number;
      height: number;
    };
    sensDuFil?: 'longueur' | 'largeur';
    panneau?: {
      id: string;
      nom: string;
      marque?: string;
      prixM2?: number;
    };
    chants?: {
      A: boolean;
      B: boolean;
      C: boolean;
      D: boolean;
    };
    finition?: {
      type: 'vernis' | 'teinte_vernis' | 'laque' | null;
      teinte?: string | null;
      couleurRAL?: string | null;
      brillance?: string | null;
      faces?: 1 | 2;
    };
    usinages?: {
      percage?: boolean;
      liste?: Array<{ type: string; description?: string; quantite?: number }>;
    };
    dxf?: {
      filename: string;
      data: string; // Base64
    };
  }>;
  projetNom?: string;
  sketchupVersion?: string;
  pluginVersion?: string;
}

@Injectable()
export class CutxImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée une session d'import avec TTL de 1 heure
   */
  async createImportSession(
    dto: CreateImportDto,
    ipAddress?: string,
  ): Promise<{ importId: string }> {
    // TTL de 1 heure
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const session = await this.prisma.cutxImportSession.create({
      data: {
        data: JSON.stringify(dto.panneaux),
        projectName: dto.projetNom,
        sketchupVersion: dto.sketchupVersion,
        pluginVersion: dto.pluginVersion,
        ipAddress,
        expiresAt,
      },
    });

    return { importId: session.id };
  }

  /**
   * Récupère une session d'import par son ID
   * Marque la session comme utilisée
   */
  async getImportSession(id: string): Promise<{
    panneaux: CreateImportDto['panneaux'];
    projetNom?: string;
  }> {
    const session = await this.prisma.cutxImportSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Session d'import "${id}" non trouvée`);
    }

    // Vérifier si la session a expiré
    if (new Date() > session.expiresAt) {
      throw new GoneException(`Session d'import "${id}" expirée`);
    }

    // Marquer comme utilisée (optionnel - on permet la réutilisation)
    if (!session.usedAt) {
      await this.prisma.cutxImportSession.update({
        where: { id },
        data: { usedAt: new Date() },
      });
    }

    return {
      panneaux: JSON.parse(session.data),
      projetNom: session.projectName || undefined,
    };
  }

  /**
   * Nettoie les sessions expirées (à appeler via cron)
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.prisma.cutxImportSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}
