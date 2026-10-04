import { Test, TestingModule } from '@nestjs/testing';
import { S3Controller } from './s3.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from '../../infra/ports/ports';
import { PORTS } from '../../infra/ports/ports.tokens';
import { ConfigKey } from '../../common/config/config-names';
import { MultiTokenGuard } from '../auth/guard/multi-token.guard';
import { BadRequestException } from '@nestjs/common';

describe('S3Controller', () => {
  let controller: S3Controller;
  let storage: DeepMockProxy<StoragePort>;
  let config: DeepMockProxy<ConfigService>;

  const MB = 1024 * 1024;

  function buildModule() {
    return Test.createTestingModule({
      controllers: [S3Controller],
      providers: [
        { provide: PORTS.STORAGE, useValue: storage },
        { provide: ConfigService, useValue: config },
      ],
    })
      .overrideGuard(MultiTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();
  }

  beforeEach(async () => {
    storage = mockDeep<StoragePort>();
    config = mockDeep<ConfigService>();
    config.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === ConfigKey.Upload.MaxSizeMb) return 10;
      return defaultValue;
    });
    storage.generatePutPresignedUrl.mockImplementation((key: string) =>
      Promise.resolve(`url:${key}`),
    );

    const module: TestingModule = await buildModule();
    controller = module.get<S3Controller>(S3Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should build transporter keys and delegate presigning', async () => {
    const result = await controller.getPresignedTransporterProfilePic(
      { fileName: 'a.jpg' },
      'user-1',
    );

    expect(result).toEqual({
      key: 'transporter/user-1/profile-pic-a.jpg',
      url: 'url:transporter/user-1/profile-pic-a.jpg',
    });
    expect(storage.generatePutPresignedUrl).toHaveBeenCalledWith(
      'transporter/user-1/profile-pic-a.jpg',
    );
  });

  it('should build sender package keys', async () => {
    const result = await controller.getPresignedPackagePicture(
      { fileName: 'p.png' },
      'user-2',
    );

    expect(result.key).toBe('sender/user-2/package/pic-p.png');
  });

  it('should allow uploads within the limit', async () => {
    const result = await controller.getPresignedPackagePicture(
      { fileName: 'p.png', size: 10 * MB },
      'user-2',
    );

    expect(result.key).toBe('sender/user-2/package/pic-p.png');
  });

  it('should reject declared sizes over the limit', async () => {
    await expect(
      controller.getPresignedPackagePicture(
        { fileName: 'p.png', size: 10 * MB + 1 },
        'user-2',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Upload size exceeds the maximum allowed size of 10 MB.',
      ),
    );
    expect(storage.generatePutPresignedUrl).not.toHaveBeenCalled();
  });

  it('should fall back to the default limit when unconfigured', async () => {
    config.get.mockImplementation(
      (_key: string, defaultValue?: unknown) => defaultValue,
    );
    const module: TestingModule = await buildModule();
    controller = module.get<S3Controller>(S3Controller);

    await expect(
      controller.getPresignedPackagePicture(
        { fileName: 'p.png', size: 10 * MB + 1 },
        'user-2',
      ),
    ).rejects.toThrow(/maximum allowed size of 10 MB/);
  });
});
