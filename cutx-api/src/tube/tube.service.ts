import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

interface PipedStream {
  url: string;
  format: string;
  quality: string;
  mimeType: string;
  codec?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
  videoOnly?: boolean;
}

interface PipedVideoResponse {
  title: string;
  uploader: string;
  uploaderUrl: string;
  uploaderAvatar?: string;
  duration: number;
  videoStreams: PipedStream[];
  audioStreams: PipedStream[];
  thumbnailUrl: string;
}

export interface VideoStreamResponse {
  id: string;
  title: string;
  author: string;
  authorId: string;
  duration: number;
  streamUrl: string;
  quality: string;
  type: string;
  thumbnail: string;
}

// Instances Piped API publiques (testées et fonctionnelles)
// Source: https://piped-instances.kavin.rocks/
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',  // Austria, 100% uptime
  'https://pipedapi.kavin.rocks',      // Official (backup)
];

@Injectable()
export class TubeService {
  private readonly logger = new Logger(TubeService.name);
  private currentInstanceIndex = 0;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Récupère l'URL de stream direct pour une vidéo YouTube via Piped API
   */
  async getVideoStream(videoId: string): Promise<VideoStreamResponse> {
    // Check cache first (TTL 6h pour les URLs - elles expirent)
    const cacheKey = `tube:stream:${videoId}`;
    const cached = await this.cacheManager.get<VideoStreamResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for video ${videoId}`);
      return cached;
    }

    // Try each instance until one works
    let lastError: Error | null = null;

    for (let i = 0; i < PIPED_INSTANCES.length; i++) {
      const instanceIndex = (this.currentInstanceIndex + i) % PIPED_INSTANCES.length;
      const instance = PIPED_INSTANCES[instanceIndex];

      try {
        const result = await this.fetchFromPiped(instance, videoId);

        // Cache for 6 hours (URLs have expiry)
        await this.cacheManager.set(cacheKey, result, 21600000);

        // Update preferred instance on success
        this.currentInstanceIndex = instanceIndex;

        this.logger.log(`Stream fetched for ${videoId} from ${instance}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Instance ${instance} failed for ${videoId}: ${lastError.message}`);
      }
    }

    throw new NotFoundException(`Could not fetch video ${videoId}: ${lastError?.message}`);
  }

  /**
   * Récupère les streams pour plusieurs vidéos en parallèle
   */
  async getMultipleVideoStreams(videoIds: string[]): Promise<VideoStreamResponse[]> {
    const results = await Promise.allSettled(
      videoIds.map(id => this.getVideoStream(id))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<VideoStreamResponse> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  private async fetchFromPiped(instance: string, videoId: string): Promise<VideoStreamResponse> {
    const url = `${instance}/streams/${videoId}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CutX/1.0',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: PipedVideoResponse = await response.json();

    // Chercher le meilleur stream vidéo avec audio intégré
    // Piped retourne des streams séparés (videoOnly) et combinés
    const preferredQualities = ['720p', '480p', '360p', '1080p', '240p', '144p'];

    let bestStream: PipedStream | null = null;

    // Chercher un stream combiné (audio+video) en priorité
    for (const quality of preferredQualities) {
      const stream = data.videoStreams?.find(
        s => s.quality === quality && !s.videoOnly && s.mimeType?.includes('video/mp4')
      );
      if (stream) {
        bestStream = stream;
        break;
      }
    }

    // Fallback: n'importe quel stream MP4 non videoOnly
    if (!bestStream) {
      bestStream = data.videoStreams?.find(
        s => !s.videoOnly && s.mimeType?.includes('video/mp4')
      ) ?? null;
    }

    // Fallback: n'importe quel stream non videoOnly
    if (!bestStream) {
      bestStream = data.videoStreams?.find(s => !s.videoOnly) ?? null;
    }

    // Dernier fallback: premier stream disponible
    if (!bestStream && data.videoStreams?.length > 0) {
      bestStream = data.videoStreams[0];
    }

    if (!bestStream) {
      throw new Error('No suitable video stream found');
    }

    // Extraire l'ID de la chaîne depuis uploaderUrl
    const channelId = data.uploaderUrl?.replace('/channel/', '') || '';

    return {
      id: videoId,
      title: data.title,
      author: data.uploader,
      authorId: channelId,
      duration: data.duration,
      streamUrl: bestStream.url,
      quality: bestStream.quality,
      type: bestStream.mimeType || 'video/mp4',
      thumbnail: data.thumbnailUrl,
    };
  }

  /**
   * Invalide le cache pour une vidéo (si URL expirée)
   */
  async invalidateCache(videoId: string): Promise<void> {
    const cacheKey = `tube:stream:${videoId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`Cache invalidated for ${videoId}`);
  }
}
