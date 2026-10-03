import { Test, TestingModule } from '@nestjs/testing';
import { MapService } from './map.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CityRepository } from '../prisma/repositories/city.repository';

describe('MapService', () => {
  let service: MapService;
  let httpService: DeepMockProxy<HttpService>;
  let configService: DeepMockProxy<ConfigService>;
  let cities: DeepMockProxy<CityRepository>;

  beforeEach(async () => {
    httpService = mockDeep<HttpService>();
    configService = mockDeep<ConfigService>();
    cities = mockDeep<CityRepository>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        MAP_API_KEY: 'key',
        MAP_API_URL: 'url',
      };
      return config[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
        { provide: CityRepository, useValue: cities },
      ],
    }).compile();

    service = module.get<MapService>(MapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getIntermediateCitiesWithIds', () => {
    it('should resolve cities through the repository and delegate', async () => {
      const originCity = { id: 'origin', latitude: '35.6', longitude: '51.3' };
      const destinationCity = {
        id: 'dest',
        latitude: '35.9',
        longitude: '51.6',
      };
      cities.findCityOrThrow
        .mockResolvedValueOnce(originCity as any)
        .mockResolvedValueOnce(destinationCity as any);
      const inner = jest
        .spyOn(service as any, 'getIntermediateCities')
        .mockResolvedValue([]);

      const result = await service.getIntermediateCitiesWithIds(
        'origin',
        'dest',
      );

      expect(result).toEqual([]);
      expect(cities.findCityOrThrow).toHaveBeenCalledWith('origin');
      expect(cities.findCityOrThrow).toHaveBeenCalledWith('dest');
      expect(inner).toHaveBeenCalledWith(
        { latitude: '35.6', longitude: '51.3' },
        { latitude: '35.9', longitude: '51.6' },
      );
    });
  });
});
