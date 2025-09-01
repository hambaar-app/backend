import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from './matching.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../generated/prisma';
import { TurfService } from '../turf/turf.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let configService: DeepMockProxy<ConfigService>;
  let prismaService: DeepMockProxy<PrismaClient>;
  let turfService: DeepMockProxy<TurfService>;


  beforeEach(async () => {
    configService = mockDeep<ConfigService>();
    prismaService = mockDeep<PrismaClient>();
    turfService = mockDeep<TurfService>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        CORRIDOR_WIDTH: 2
      };
      return config[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prismaService },
        { provide: TurfService, useValue: turfService },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
