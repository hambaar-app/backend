import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { TurfService } from '../../turf/turf.service';
import { Location } from '../../map/map.types';
import { TripWithLocations } from '../matching.types';
import { CorridorAnalyzer } from './corridor-analyzer';
import { MatchingScorer } from './matching-scorer';
import { createTripWithLocations } from '../../../../test/fixtures/match.fixture';
import { createLocation } from '../../../../test/fixtures/location.fixture';

describe('CorridorAnalyzer', () => {
  let analyzer: CorridorAnalyzer;
  let turfService: DeepMockProxy<TurfService>;

  const mockRoute = {
    type: 'LineString',
    coordinates: [
      ['51.3800', '35.6850'],
      ['51.3400', '35.7250'],
    ],
  };

  const packageOrigin: Location = createLocation('35.6892', '51.3890');
  const packageDestination: Location = createLocation('35.7219', '51.3347');

  beforeEach(() => {
    turfService = mockDeep<TurfService>();
    analyzer = new CorridorAnalyzer(turfService, new MatchingScorer());
  });

  function stubTurf(
    originDistance: number,
    destinationDistance: number,
    directionCompatible: boolean,
    trip: TripWithLocations = createTripWithLocations(),
  ): TripWithLocations {
    turfService.createRoute.mockReturnValue(mockRoute as never);
    turfService.createPoint.mockReturnValue({
      type: 'Point',
      coordinates: [0, 0],
    } as never);
    turfService.getDistanceToRoute
      .mockReturnValueOnce(originDistance)
      .mockReturnValueOnce(destinationDistance);
    turfService.checkDirectionCompatibility.mockReturnValue(
      directionCompatible,
    );
    return trip;
  }

  describe('analyzeTrip', () => {
    it('should return match result for compatible trip', async () => {
      const trip = stubTurf(800, 600, true);

      const result = await analyzer.analyzeTrip(
        trip,
        packageOrigin,
        packageDestination,
        2,
      );

      expect(result).toEqual({
        tripId: trip.id,
        isRequestSent: false,
        score: 0,
        originDistance: 800,
        destinationDistance: 600,
        isOnCorridor: true,
      });
    });

    it('should return null when origin is outside corridor', async () => {
      const trip = stubTurf(3000, 600, true);

      const result = await analyzer.analyzeTrip(
        trip,
        packageOrigin,
        packageDestination,
        2,
      );

      expect(result).toBeNull();
    });

    it('should return null when destination is outside corridor', async () => {
      const trip = stubTurf(800, 3000, true);

      const result = await analyzer.analyzeTrip(
        trip,
        packageOrigin,
        packageDestination,
        2,
      );

      expect(result).toBeNull();
    });

    it('should return null when direction is incompatible', async () => {
      const trip = stubTurf(800, 600, false);

      const result = await analyzer.analyzeTrip(
        trip,
        packageOrigin,
        packageDestination,
        2,
      );

      expect(result).toBeNull();
    });

    it('should create route with waypoints', async () => {
      const trip = createTripWithLocations({
        waypoints: [
          createLocation('35.7000', '51.3600'),
          createLocation('35.7100', '51.3500'),
        ],
      });
      stubTurf(800, 600, true, trip);

      await analyzer.analyzeTrip(trip, packageOrigin, packageDestination, 2);

      expect(turfService.createRoute).toHaveBeenCalledWith(
        trip.origin,
        trip.destination,
        trip.waypoints,
      );
    });

    it('should respect custom corridor width', async () => {
      const trip = stubTurf(9000, 9000, true);

      const narrow = await analyzer.analyzeTrip(
        trip,
        packageOrigin,
        packageDestination,
        2,
      );
      expect(narrow).toBeNull();

      stubTurf(9000, 9000, true, trip);
      const wide = await analyzer.analyzeTrip(
        trip,
        packageOrigin,
        packageDestination,
        10,
      );
      expect(wide).not.toBeNull();
    });

    it('should default to a working scorer when not provided', async () => {
      const defaultAnalyzer = new CorridorAnalyzer(turfService);
      turfService.createRoute.mockReturnValue(mockRoute as never);
      turfService.createPoint.mockReturnValue({
        type: 'Point',
        coordinates: [0, 0],
      } as never);
      turfService.getDistanceToRoute
        .mockReturnValueOnce(800)
        .mockReturnValueOnce(600);
      turfService.checkDirectionCompatibility.mockReturnValue(true);

      const result = await defaultAnalyzer.analyzeTrip(
        createTripWithLocations(),
        packageOrigin,
        packageDestination,
        2,
      );

      expect(result).toMatchObject({ isOnCorridor: true, score: 0 });
    });
  });
});
