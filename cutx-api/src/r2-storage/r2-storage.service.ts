import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;
  private isConfigured = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    this.bucket = this.configService.get<string>('R2_BUCKET') || 'cutx-images';
    this.publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') || 'https://cdn.cutx.ai';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 credentials not configured - image uploads will fail',
      );
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.isConfigured = true;
    this.logger.log(`R2 Storage configured - Bucket: ${this.bucket}`);
  }

  /**
   * Check if R2 is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get the public URL for a key
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Upload a file buffer to R2
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new Error('R2 Storage is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await this.s3Client.send(command);

    return {
      key,
      url: this.getPublicUrl(key),
      size: buffer.length,
    };
  }

  /**
   * Upload a file from a stream
   */
  async uploadStream(
    stream: Readable,
    key: string,
    contentType: string,
    size: number,
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new Error('R2 Storage is not configured');
    }

    // Convert stream to buffer for R2 (R2 doesn't support streaming well)
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return this.uploadBuffer(buffer, key, contentType);
  }

  /**
   * Upload a panel image
   */
  async uploadPanelImage(
    buffer: Buffer,
    originalFilename: string,
    catalogueSlug?: string,
  ): Promise<UploadResult> {
    const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const prefix = catalogueSlug ? `panels/${catalogueSlug}` : 'panels';
    const key = `${prefix}/panel-${uniqueSuffix}.${ext}`;

    const contentType = this.getContentType(ext);

    return this.uploadBuffer(buffer, key, contentType);
  }

  /**
   * Upload an image from a URL (for migration)
   */
  async uploadFromUrl(
    imageUrl: string,
    catalogueSlug?: string,
  ): Promise<UploadResult | null> {
    if (!this.isConfigured) {
      throw new Error('R2 Storage is not configured');
    }

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch image: ${imageUrl} - ${response.status}`);
        return null;
      }

      const contentType =
        response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      // Extract filename from URL
      const urlPath = new URL(imageUrl).pathname;
      const filename = urlPath.split('/').pop() || 'image.jpg';

      return this.uploadPanelImage(buffer, filename, catalogueSlug);
    } catch (error) {
      this.logger.error(`Error uploading from URL ${imageUrl}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('R2 Storage is not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get content type from extension
   */
  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    return types[ext] || 'image/jpeg';
  }

  /**
   * Extract key from a full R2 URL
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url.startsWith(this.publicUrl)) {
      return null;
    }
    return url.replace(`${this.publicUrl}/`, '');
  }
}
