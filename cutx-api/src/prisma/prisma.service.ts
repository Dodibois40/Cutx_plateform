import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    // Configuration optimisée pour la scalabilité
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        // Uncomment for debugging:
        // { emit: 'event', level: 'query' },
      ],
      // Datasource configuration is handled via DATABASE_URL env var
      // Add ?connection_limit=10&pool_timeout=30 to DATABASE_URL on Railway
    });

    // Log errors
    this.$on('error' as never, (e: unknown) => {
      this.logger.error('Database error:', e);
    });

    // Log warnings
    this.$on('warn' as never, (e: unknown) => {
      this.logger.warn('Database warning:', e);
    });
  }

  async onModuleInit() {
    const startTime = Date.now();
    this.logger.log('🔌 Connecting to database...');

    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log(`✅ Database connected in ${Date.now() - startTime}ms`);
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting from database...');
    await this.$disconnect();
    this.isConnected = false;
    this.logger.log('✅ Database disconnected');
  }

  /**
   * Health check for the database connection
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency?: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a query with timeout protection
   * Prevents long-running queries from blocking the connection pool
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }
}
