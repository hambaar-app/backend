import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from '../ports/ports';

/**
 * AWS S3 storage adapter (Phase 5 Task 1).
 *
 * Moved verbatim from `S3Service` (which is deleted — all importers use the
 * `PORTS.STORAGE` token now). The only code outside tests that may construct
 * SDK commands or presign URLs.
 */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  private client: S3Client;
  private bucketName: string;

  constructor(config: ConfigService) {
    this.client = new S3Client({
      region: config.get<string>('AWS_REGION', 'default'),
      endpoint: config.getOrThrow<string>('AWS_ENDPOINT'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_KEY'),
      },
    });

    this.bucketName = config.getOrThrow<string>('AWS_BUCKET_NAME');
  }

  async generatePutPresignedUrl(
    keyName: string,
    expiresIn = 300,
  ): Promise<string> {
    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: keyName,
    });
    return getSignedUrl(this.client, putCommand, { expiresIn });
  }

  async generateGetPresignedUrl(
    keyName: string | undefined | null,
    expiresIn = 600,
  ): Promise<string> {
    if (!keyName) return '';

    const getCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: keyName.trim(),
    });
    return getSignedUrl(this.client, getCommand, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (errorName(error) === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

/** Typed name access over unknown SDK failures. */
function errorName(error: unknown): unknown {
  if (typeof error === 'object' && error !== null) {
    return (error as { name?: unknown }).name;
  }
  return undefined;
}
