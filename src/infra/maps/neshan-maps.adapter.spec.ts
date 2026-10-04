import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TripTypeEnum } from '../../../generated/prisma';
import { NeshanMapsAdapter } from './neshan-maps.adapter';

describe('NeshanMapsAdapter', () => {
  let adapter: NeshanMapsAdapter;
  let httpService: { get: jest.Mock };

  const configService = {
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'MAP_API_KEY') return 'test-key';
      if (key === 'MAP_API_URL') return 'https://api.test';
      throw new Error(`unexpected key ${key}`);
    }),
  } as unknown as ConfigService;

  const origin = { latitude: '35.6892', longitude: '51.3890' };
  const destination = { latitude: '35.7219', longitude: '51.3347' };

  beforeEach(() => {
    httpService = { get: jest.fn() };
    adapter = new NeshanMapsAdapter(
      httpService as unknown as HttpService,
      configService,
    );
  });

  describe('getDirections', () => {
    it('should call the no-traffic endpoint for intercity trips', async () => {
      const payload = { routes: [] };
      httpService.get.mockReturnValue(of({ data: payload }));

      const result = await adapter.getDirections({ origin, destination });

      expect(result).toEqual(payload);
      const [url, options] = httpService.get.mock.calls[0];
      expect(url).toContain('https://api.test/v4/direction/no-traffic?');
      expect(url).toContain('origin=35.6892%2C51.3890');
      expect(options).toEqual({ headers: { 'Api-Key': 'test-key' } });
    });

    it('should append waypoints and skip no-traffic for other trip types', async () => {
      httpService.get.mockReturnValue(of({ data: { routes: [] } }));

      await adapter.getDirections({
        origin,
        destination,
        waypoints: [
          { latitude: '35.7', longitude: '51.4' },
          { latitude: '35.8', longitude: '51.5' },
        ],
        tripType: TripTypeEnum.intracity,
      });

      const [url] = httpService.get.mock.calls[0];
      expect(url).not.toContain('no-traffic');
      expect(url).toContain('waypoints=');
    });

    it('should throw BadRequest on 407', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 407, data: {} } })),
      );

      await expect(
        adapter.getDirections({ origin, destination }),
      ).rejects.toThrow(
        new BadRequestException('Invalid geographic coordinates provided.'),
      );
    });

    it('should throw InternalServerError on other API errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: 'bad' } })),
      );

      await expect(
        adapter.getDirections({ origin, destination }),
      ).rejects.toThrow(new InternalServerErrorException('Something wrong.'));
    });

    it('should throw on network failure', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('down')));

      await expect(
        adapter.getDirections({ origin, destination }),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to get directions.'),
      );
    });

    it('should treat non-object failures as network failures', async () => {
      httpService.get.mockReturnValue(throwError(() => 'reset'));

      await expect(
        adapter.getDirections({ origin, destination }),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to get directions.'),
      );
    });
  });

  describe('reverseGeocode', () => {
    it('should call the reverse endpoint', async () => {
      const payload = { status: 'OK', city: 'Tehran' };
      httpService.get.mockReturnValue(of({ data: payload }));

      const result = await adapter.reverseGeocode(origin);

      expect(result).toEqual(payload);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.test/v5/reverse?lat=35.6892&lng=51.3890',
        { headers: { 'Api-Key': 'test-key' } },
      );
    });

    it('should throw on failure', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('down')));

      await expect(adapter.reverseGeocode(origin)).rejects.toThrow(
        new InternalServerErrorException('Failed to reverse geocode.'),
      );
    });
  });

  describe('calculateDistance', () => {
    it('should forward explicit vehicle, trip and waypoint options', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            routes: [
              {
                legs: [{ distance: { value: 1000 }, duration: { value: 60 } }],
              },
            ],
          },
        }),
      );

      const result = await adapter.calculateDistance({
        vehicleType: 'motorcycle',
        tripType: TripTypeEnum.intracity,
        origin,
        destination,
        waypoints: [{ latitude: '35.7', longitude: '51.4' }],
      });

      expect(result).toEqual({ distance: 1, duration: 1 });
      const [url] = httpService.get.mock.calls[0];
      expect(url).not.toContain('no-traffic');
      expect(url).toContain('waypoints=');
    });

    it('should aggregate legs into km and minutes', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            routes: [
              {
                legs: [
                  { distance: { value: 10000 }, duration: { value: 1200 } },
                  { distance: { value: 5000 }, duration: { value: 600 } },
                ],
              },
            ],
          },
        }),
      );

      const result = await adapter.calculateDistance({ origin, destination });

      expect(result).toEqual({ distance: 15, duration: 30 });
    });
  });
});
