import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { S3Service } from '../s3/s3.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let s3Service: DeepMockProxy<S3Service>;
  let prismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    s3Service = mockDeep<S3Service>();
    prismaService = mockDeep<PrismaClient>();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
