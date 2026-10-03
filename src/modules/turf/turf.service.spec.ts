import { Test, TestingModule } from '@nestjs/testing';
import { TurfService } from './turf.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Turf, TURF_TOKEN } from './turf.provider';

describe('TurfService', () => {
  let service: TurfService;
  let turfProvider: DeepMockProxy<Turf>;

  beforeEach(async () => {
    turfProvider = mockDeep<Turf>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TurfService, { provide: TURF_TOKEN, useValue: turfProvider }],
    }).compile();

    service = module.get<TurfService>(TurfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDistanceToRoute', () => {
    const point = { type: 'Point', coordinates: [51.389, 35.6892] } as never;
    const route = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [51.38, 35.685],
          [51.34, 35.725],
        ],
      },
    } as never;

    it('should return distance via nearestPointOnLine when it succeeds', () => {
      const nearest = { type: 'Point', coordinates: [51.38, 35.685] } as never;
      turfProvider.nearestPointOnLine.mockReturnValue(nearest);
      turfProvider.distance.mockReturnValue(800 as never);

      expect(service.getDistanceToRoute(point, route)).toBe(800);
      expect(turfProvider.nearestPointOnLine).toHaveBeenCalledWith(
        route,
        point,
      );
    });

    it('should log and fall back to vertex distances when nearestPointOnLine throws', () => {
      turfProvider.nearestPointOnLine.mockImplementation(() => {
        throw new Error('turf failed');
      });
      // Fake point: mock shapes are not real GeoJSON — assertion needed for tsc.

      turfProvider.point.mockImplementation(
        (coords: number[]) => ({ coords }) as never,
      );
      turfProvider.distance.mockReturnValue(600 as never);
      const loggerSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      expect(service.getDistanceToRoute(point, route)).toBe(600);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error calculating distance to route:',
        expect.any(Error),
      );
    });
  });
});
