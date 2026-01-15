import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { TubeService, VideoStreamResponse } from './tube.service';

@Controller('tube')
export class TubeController {
  constructor(private readonly tubeService: TubeService) {}

  /**
   * GET /api/tube/video/:id
   * Récupère l'URL de stream direct pour une vidéo YouTube
   */
  @Get('video/:id')
  async getVideoStream(@Param('id') videoId: string): Promise<VideoStreamResponse> {
    return this.tubeService.getVideoStream(videoId);
  }

  /**
   * GET /api/tube/videos?ids=id1,id2,id3
   * Récupère les URLs de stream pour plusieurs vidéos
   */
  @Get('videos')
  async getMultipleVideoStreams(
    @Query('ids') ids: string,
  ): Promise<VideoStreamResponse[]> {
    const videoIds = ids.split(',').map(id => id.trim()).filter(Boolean);
    return this.tubeService.getMultipleVideoStreams(videoIds);
  }

  /**
   * POST /api/tube/invalidate/:id
   * Invalide le cache pour une vidéo (si URL expirée)
   */
  @Get('invalidate/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateCache(@Param('id') videoId: string): Promise<void> {
    return this.tubeService.invalidateCache(videoId);
  }
}
