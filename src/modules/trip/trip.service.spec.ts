import { Test, TestingModule } from '@nestjs/testing';
import { TripService } from './trip.service';
import { S3Service } from '../s3/s3.service';
import { FinancialService } from '../financial/financial.service';
import { MapService } from '../map/map.service';
import { PrismaClient } from '../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';

describe('TripService', () => {
  let service: TripService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let financialService: DeepMockProxy<FinancialService>;
  let s3Service: DeepMockProxy<S3Service>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    financialService = mockDeep<FinancialService>();
    s3Service = mockDeep<S3Service>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapService, useValue: mapService },
        { provide: FinancialService, useValue: financialService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<TripService>(TripService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});