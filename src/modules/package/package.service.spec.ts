import { Test, TestingModule } from '@nestjs/testing';
import { PackageService } from './package.service';
import { MatchingService } from './matching.service';
import { TripService } from '../trip/trip.service';
import { S3Service } from '../s3/s3.service';
import { TurfService } from '../turf/turf.service';
import { PricingService } from '../pricing/pricing.service';
import { MapService } from '../map/map.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';

describe('PackageService', () => {
  let service: PackageService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let pricingService: DeepMockProxy<PricingService>;
  let matchingService: DeepMockProxy<MatchingService>;
  let tripService: DeepMockProxy<TripService>;
  let s3Service: DeepMockProxy<S3Service>;
  let turfService: DeepMockProxy<TurfService>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    pricingService = mockDeep<PricingService>();
    matchingService = mockDeep<MatchingService>();
    tripService = mockDeep<TripService>();
    s3Service = mockDeep<S3Service>();
    turfService = mockDeep<TurfService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MapService, useValue: mapService },
        { provide: PricingService, useValue: pricingService },
        { provide: MatchingService, useValue: matchingService },
        { provide: TripService, useValue: tripService },
        { provide: S3Service, useValue: s3Service },
        { provide: TurfService, useValue: turfService },
      ],
    }).compile();

    service = module.get<PackageService>(PackageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
