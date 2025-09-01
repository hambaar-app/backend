import { Test, TestingModule } from '@nestjs/testing';
import { MapService } from './map.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

describe('MapService', () => {
  let service: MapService;
  let httpService: DeepMockProxy<HttpService>;
  let configService: DeepMockProxy<ConfigService>;
  let prismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    httpService = mockDeep<HttpService>();
    configService = mockDeep<ConfigService>();
    prismaService = mockDeep<PrismaClient>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        MAP_API_KEY: 'key',
        MAP_API_URL: 'url'
      };
      return config[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<MapService>(MapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
