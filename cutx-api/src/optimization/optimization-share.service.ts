import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ShareOptimizationRequestDto } from './dto/share.dto';

interface StoredShare {
  data: ShareOptimizationRequestDto;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class OptimizationShareService {
  private readonly logger = new Logger(OptimizationShareService.name);
  private readonly store = new Map<string, StoredShare>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Nettoyage automatique toutes les heures
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Genere un ID court unique (6 caracteres alphanumeriques)
   */
  private generateShareId(): string {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // Sans ambigus (0, O, l, 1)
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Verifier unicite
    if (this.store.has(id)) {
      return this.generateShareId();
    }
    return id;
  }

  /**
   * Stocke une optimisation et retourne l'ID de partage
   */
  create(data: ShareOptimizationRequestDto): { shareId: string; expiresAt: Date } {
    const shareId = this.generateShareId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.TTL_MS);

    this.store.set(shareId, {
      data,
      createdAt: now,
      expiresAt,
    });

    this.logger.log(`Partage cree: ${shareId} (${data.sheets.length} panneaux)`);

    return { shareId, expiresAt };
  }

  /**
   * Recupere une optimisation partagee
   */
  get(shareId: string): StoredShare {
    const stored = this.store.get(shareId);

    if (!stored) {
      throw new NotFoundException(`Partage "${shareId}" non trouve ou expire`);
    }

    // Verifier expiration
    if (new Date() > stored.expiresAt) {
      this.store.delete(shareId);
      throw new NotFoundException(`Partage "${shareId}" expire`);
    }

    return stored;
  }

  /**
   * Verifie si un partage existe
   */
  exists(shareId: string): boolean {
    const stored = this.store.get(shareId);
    if (!stored) return false;
    if (new Date() > stored.expiresAt) {
      this.store.delete(shareId);
      return false;
    }
    return true;
  }

  /**
   * Nettoie les partages expires
   */
  private cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [id, stored] of this.store.entries()) {
      if (now > stored.expiresAt) {
        this.store.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Nettoyage: ${cleaned} partages expires supprimes`);
    }
  }

  /**
   * Stats pour debug
   */
  getStats(): { count: number; oldestExpiry: Date | null } {
    let oldestExpiry: Date | null = null;

    for (const stored of this.store.values()) {
      if (!oldestExpiry || stored.expiresAt < oldestExpiry) {
        oldestExpiry = stored.expiresAt;
      }
    }

    return {
      count: this.store.size,
      oldestExpiry,
    };
  }
}
