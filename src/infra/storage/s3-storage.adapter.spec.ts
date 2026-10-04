import { S3StorageAdapter } from './s3-storage.adapter';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3StorageAdapter', () => {
  let adapter: S3StorageAdapter;
  let mockSend: jest.Mock;

  const config = {
    get: (key: string, defaultValue?: unknown) =>
      key === 'AWS_REGION' ? 'default' : defaultValue,
    getOrThrow: (key: string) =>
      ({
        AWS_ENDPOINT: 'https://s3.example.com',
        AWS_ACCESS_KEY: 'access',
        AWS_SECRET_KEY: 'secret',
        AWS_BUCKET_NAME: 'bucket',
      })[key],
  } as unknown as ConfigService;

  beforeEach(() => {
    mockSend = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.example/x');

    adapter = new S3StorageAdapter(config);
  });

  describe('generatePutPresignedUrl', () => {
    it('should presign a put command with default expiry', async () => {
      const url = await adapter.generatePutPresignedUrl('k');

      expect(url).toBe('https://signed.example/x');
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'k',
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 300 },
      );
    });

    it('should honor a custom expiry', async () => {
      await adapter.generatePutPresignedUrl('k', 60);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 60 },
      );
    });
  });

  describe('generateGetPresignedUrl', () => {
    it('should presign a trimmed get command', async () => {
      const url = await adapter.generateGetPresignedUrl('  k  ');

      expect(url).toBe('https://signed.example/x');
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'k',
      });
    });

    it('should return empty string for falsy keys without signing', async () => {
      await expect(adapter.generateGetPresignedUrl(undefined)).resolves.toBe(
        '',
      );
      await expect(adapter.generateGetPresignedUrl(null)).resolves.toBe('');
      await expect(adapter.generateGetPresignedUrl('')).resolves.toBe('');

      expect(GetObjectCommand).not.toHaveBeenCalled();
      expect(getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should send a delete command', async () => {
      mockSend.mockResolvedValue({});

      await adapter.deleteFile('k');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'k',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('fileExists', () => {
    it('should return true when head succeeds', async () => {
      mockSend.mockResolvedValue({});

      await expect(adapter.fileExists('k')).resolves.toBe(true);
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'k',
      });
    });

    it('should return false on NotFound', async () => {
      const notFound = new Error('missing');
      (notFound as any).name = 'NotFound';
      mockSend.mockRejectedValue(notFound);

      await expect(adapter.fileExists('k')).resolves.toBe(false);
    });

    it('should rethrow other errors', async () => {
      mockSend.mockRejectedValue(new Error('boom'));

      await expect(adapter.fileExists('k')).rejects.toThrow('boom');
    });
  });
});
