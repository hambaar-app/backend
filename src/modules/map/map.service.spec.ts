import { Test, TestingModule } from '@nestjs/testing';
import { MapService } from './map.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { CityRepository } from '../prisma/repositories/city.repository';
import { MapsPort } from '../../infra/ports/ports';
import { PORTS } from '../../infra/ports/ports.tokens';

describe('MapService', () => {
  let service: MapService;
  let maps: DeepMockProxy<MapsPort>;
  let cities: DeepMockProxy<CityRepository>;

  beforeEach(async () => {
    maps = mockDeep<MapsPort>();
    cities = mockDeep<CityRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        { provide: PORTS.MAPS, useValue: maps },
        { provide: CityRepository, useValue: cities },
      ],
    }).compile();

    service = module.get<MapService>(MapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('delegation', () => {
    it('should delegate calculateDistance to the port', async () => {
      maps.calculateDistance.mockResolvedValue({ distance: 15, duration: 30 });
      const input = {
        origin: { latitude: '0', longitude: '0' },
        destination: { latitude: '1', longitude: '1' },
      };

      const result = await service.calculateDistance(input);

      expect(result).toEqual({ distance: 15, duration: 30 });
      expect(maps.calculateDistance).toHaveBeenCalledWith({
        vehicleType: 'car',
        tripType: 'intercity',
        origin: input.origin,
        destination: input.destination,
        waypoints: undefined,
      });
    });

    it('should delegate reverseGeocode to the port', async () => {
      maps.reverseGeocode.mockResolvedValue({ status: 'OK' } as any);

      const result = await service.reverseGeocode({
        latitude: '0',
        longitude: '0',
      });

      expect(result).toEqual({ status: 'OK' });
      expect(maps.reverseGeocode).toHaveBeenCalledWith({
        latitude: '0',
        longitude: '0',
      });
    });

    it('should delegate getDirections to the port', async () => {
      maps.getDirections.mockResolvedValue({ routes: [] } as any);
      const input = {
        origin: { latitude: '0', longitude: '0' },
        destination: { latitude: '1', longitude: '1' },
      };

      const result = await service.getDirections(input);

      expect(result).toEqual({ routes: [] });
      expect(maps.getDirections).toHaveBeenCalledWith({
        vehicleType: 'car',
        tripType: 'intercity',
        origin: input.origin,
        destination: input.destination,
        waypoints: undefined,
      });
    });
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
