import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { StoragePort } from '../../infra/ports/ports';
import { PORTS } from '../../infra/ports/ports.tokens';

describe('DashboardService', () => {
  let service: DashboardService;
  let s3Service: DeepMockProxy<StoragePort>;
  let prismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    s3Service = mockDeep<StoragePort>();
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaService },
        { provide: PORTS.STORAGE, useValue: s3Service },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
