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

@Injectable()
export class S3Service {
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

  async generatePutPresignedUrl(keyName: string, expiresIn = 300): Promise<string> {
    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: keyName,
    });
    return getSignedUrl(this.client, putCommand, { expiresIn });
  }

  async generateGetPresignedUrl(keyName: string, expiresIn = 600): Promise<string> {    
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
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}
