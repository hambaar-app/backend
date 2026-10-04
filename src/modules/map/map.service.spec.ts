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

  describe('getIntermediateCitiesWithCoords', () => {
    it('should split coords and delegate', async () => {
      const inner = jest
        .spyOn(service as any, 'getIntermediateCities')
        .mockResolvedValue([{ name: 'Tehran' }]);

      const result = await service.getIntermediateCitiesWithCoords({
        origin: '35.6,51.3',
        destination: '35.9,51.6',
      } as any);

      expect(result).toEqual([{ name: 'Tehran' }]);
      expect(inner).toHaveBeenCalledWith(
        { latitude: '35.6', longitude: '51.3' },
        { latitude: '35.9', longitude: '51.6' },
      );
    });
  });

  describe('getIntermediateCities', () => {
    it('should return empty when the route has no legs', async () => {
      maps.getDirections.mockResolvedValue({ routes: [] } as any);

      const result = await (service as any).getIntermediateCities(
        { latitude: '0', longitude: '0' },
        { latitude: '1', longitude: '1' },
      );

      expect(result).toEqual([]);
    });

    it('should reverse-geocode significant points and dedupe cities', async () => {
      maps.getDirections.mockResolvedValue({
        routes: [
          {
            overview_polyline: { points: '' },
            legs: [
              {
                summary: '',
                distance: { value: 0, text: '' },
                duration: { value: 0, text: '' },
                steps: [
                  {
                    name: '',
                    instruction: '',
                    bearing_after: 0,
                    type: 'straight',
                    modifier: 'straight',
                    distance: { value: 100, text: '' },
                    duration: { value: 10, text: '' },
                    polyline: '',
                    start_location: [51.3, 35.6],
                  },
                ],
              },
            ],
          },
        ],
      } as any);
      maps.reverseGeocode.mockResolvedValue({
        status: 'OK',
        county: 'شهرستان تهران',
        city: 'تهران',
      } as any);

      const result = await (service as any).getIntermediateCities(
        { latitude: '35.6', longitude: '51.3' },
        { latitude: '35.9', longitude: '51.6' },
      );

      expect(result).toEqual([
        { name: 'تهران', latitude: '35.6', longitude: '51.3' },
      ]);
      expect(maps.reverseGeocode).toHaveBeenCalledWith({
        latitude: '35.6',
        longitude: '51.3',
      });
    });

    it('should skip points that fail or have no city', async () => {      maps.getDirections.mockResolvedValue({
        routes: [
          {
            overview_polyline: { points: '' },
            legs: [
              {
                summary: '',
                distance: { value: 0, text: '' },
                duration: { value: 10, text: '' },
                steps: [
                  {
                    name: '',
                    instruction: '',
                    bearing_after: 0,
                    type: 'straight',
                    modifier: 'straight',
                    distance: { value: 100, text: '' },
                    duration: { value: 10, text: '' },
                    polyline: '',
                    start_location: [51.3, 35.6],
                  },
                ],
              },
            ],
          },
        ],
      } as any);
      maps.reverseGeocode.mockResolvedValue({
        status: 'ZERO_RESULTS',
        county: null,
        city: null,
      } as any);

      const result = await (service as any).getIntermediateCities(
        { latitude: '35.6', longitude: '51.3' },
        { latitude: '35.9', longitude: '51.6' },
      );

      expect(result).toEqual([]);
    });

    it('should skip points that reject with non-Error values', async () => {
      maps.getDirections.mockResolvedValue({
        routes: [
          {
            overview_polyline: { points: '' },
            legs: [
              {
                summary: '',
                distance: { value: 0, text: '' },
                duration: { value: 10, text: '' },
                steps: [
                  {
                    name: '',
                    instruction: '',
                    bearing_after: 0,
                    type: 'straight',
                    modifier: 'straight',
                    distance: { value: 100, text: '' },
                    duration: { value: 10, text: '' },
                    polyline: '',
                    start_location: [51.3, 35.6],
                  },
                ],
              },
            ],
          },
        ],
      } as any);
      maps.reverseGeocode.mockRejectedValue('reset-string');

      const result = await (service as any).getIntermediateCities(
        { latitude: '35.6', longitude: '51.3' },
        { latitude: '35.9', longitude: '51.6' },
      );

      expect(result).toEqual([]);
    });

    it('should throw InternalServerError when directions fail', async () => {
      maps.getDirections.mockRejectedValue(new Error('down'));

      await expect(
        (service as any).getIntermediateCities(
          { latitude: '0', longitude: '0' },
          { latitude: '1', longitude: '1' },
        ),
      ).rejects.toThrow('Failed to get intermediate cities.');
    });

    it('should detail non-object directions failures', async () => {
      maps.getDirections.mockRejectedValue('down-string');

      await expect(
        (service as any).getIntermediateCities(
          { latitude: '0', longitude: '0' },
          { latitude: '1', longitude: '1' },
        ),
      ).rejects.toThrow('Failed to get intermediate cities.');
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
