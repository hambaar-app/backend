import * as turf from '@turf/turf';
import { TurfService } from './turf.service';

/**
 * Geometry behavior with the real @turf/turf (Phase 4 Task 6).
 *
 * No mocks: asserts actual distances, direction checks and route sorting,
 * including degenerate route inputs.
 */
describe('TurfService (real geometry)', () => {
  let service: TurfService;

  beforeEach(() => {
    service = new TurfService(turf);
  });

  describe('createPoint', () => {
    it('should map string lat/lng to GeoJSON [lng, lat]', () => {
      const point = service.createPoint({
        latitude: '35.6892',
        longitude: '51.3890',
      });

      expect(point.geometry.coordinates).toEqual([51.389, 35.6892]);
    });
  });

  describe('createRoute', () => {
    it('should build a 2-point line without waypoints', () => {
      const route = service.createRoute(
        { latitude: '0', longitude: '0' },
        { latitude: '0', longitude: '0.01' },
      );

      expect(route.geometry.coordinates).toEqual([
        [0, 0],
        [0.01, 0],
      ]);
    });

    it('should splice waypoints between origin and destination', () => {
      const route = service.createRoute(
        { latitude: '0', longitude: '0' },
        { latitude: '0', longitude: '0.02' },
        [{ latitude: '0', longitude: '0.01' }],
      );

      expect(route.geometry.coordinates).toEqual([
        [0, 0],
        [0.01, 0],
        [0.02, 0],
      ]);
    });
  });

  describe('getDistanceToRoute', () => {
    const route = () =>
      service.createRoute(
        { latitude: '0', longitude: '0' },
        { latitude: '0', longitude: '0.01' },
      );

    it('should return near-zero for a point on the route', () => {
      const distance = service.getDistanceToRoute(
        service.createPoint({ latitude: '0', longitude: '0.005' }),
        route(),
      );

      expect(distance).toBeLessThan(5);
    });

    it('should return a large distance for a far point', () => {
      const distance = service.getDistanceToRoute(
        service.createPoint({ latitude: '1', longitude: '1' }),
        route(),
      );

      expect(distance).toBeGreaterThan(100_000);
    });

    it('should return a finite distance for a degenerate single-point route', () => {
      const single = { latitude: '0', longitude: '0' };
      const distance = service.getDistanceToRoute(
        service.createPoint({ latitude: '0', longitude: '0.001' }),
        service.createRoute(single, single),
      );

      expect(Number.isFinite(distance)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkDirectionCompatibility', () => {
    // NOTE: the implementation compares turf segment indices, so routes
    // need at least 3 vertices for origin/destination to land on different
    // segments (a 2-vertex route always compares 0 > 0).
    const route = () =>
      service.createRoute(
        { latitude: '0', longitude: '0' },
        { latitude: '0', longitude: '0.02' },
        [{ latitude: '0', longitude: '0.01' }],
      );

    it('should accept destination after origin along the route', () => {
      expect(
        service.checkDirectionCompatibility(
          route(),
          service.createPoint({ latitude: '0', longitude: '0.002' }),
          service.createPoint({ latitude: '0', longitude: '0.015' }),
        ),
      ).toBe(true);
    });

    it('should reject destination before origin along the route', () => {
      expect(
        service.checkDirectionCompatibility(
          route(),
          service.createPoint({ latitude: '0', longitude: '0.015' }),
          service.createPoint({ latitude: '0', longitude: '0.002' }),
        ),
      ).toBe(false);
    });
  });

  describe('sortLocationsByRoute', () => {
    const origin = { latitude: '0', longitude: '0' };
    const destination = { latitude: '0', longitude: '0.02' };

    it('should sort an array by distance from origin', () => {
      const far = { latitude: '0', longitude: '0.015' };
      const near = { latitude: '0', longitude: '0.005' };

      expect(
        service.sortLocationsByRoute(origin, destination, [far, near]),
      ).toEqual([near, far]);
    });

    it('should return a copy for zero or one locations', () => {
      const single = [{ latitude: '0', longitude: '0.005' }];

      expect(service.sortLocationsByRoute(origin, destination, [])).toEqual([]);
      const sorted = service.sortLocationsByRoute(origin, destination, single);
      expect(sorted).toEqual(single);
      expect(sorted).not.toBe(single);
    });

    it('should sort a Map by distance from origin', () => {
      const locations = new Map([
        ['far', { latitude: '0', longitude: '0.015' }],
        ['near', { latitude: '0', longitude: '0.005' }],
      ]);

      const sorted = service.sortLocationsByRoute(
        origin,
        destination,
        locations,
      );

      expect(Array.from(sorted.keys())).toEqual(['near', 'far']);
    });

    it('should copy a Map with one or zero entries', () => {
      const single = new Map([['only', { latitude: '0', longitude: '0.005' }]]);

      const sorted = service.sortLocationsByRoute(origin, destination, single);
      expect(Array.from(sorted.entries())).toEqual(
        Array.from(single.entries()),
      );
      expect(sorted).not.toBe(single);
    });
  });
});
