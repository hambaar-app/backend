import { Location } from '../../map/map.types';
import { TurfService } from '../../turf/turf.service';
import { MatchResult, TripWithLocations } from '../matching.types';
import { MatchingScorer } from './matching-scorer';

/**
 * Corridor + direction analysis for one candidate trip (Phase 4 Task 3).
 *
 * Pure orchestration over `TurfService` geometry + `MatchingScorer`.
 * Extracted verbatim from `MatchingService.analyzeTrip`; returns `null` when
 * the trip is not a match (out of corridor or wrong direction).
 */
export class CorridorAnalyzer {
  constructor(
    private readonly turfService: TurfService,
    private readonly scorer: MatchingScorer = new MatchingScorer(),
  ) {}

  async analyzeTrip(
    trip: TripWithLocations,
    packageOrigin: Location,
    packageDestination: Location,
    corridorWidthKm: number,
  ): Promise<MatchResult | null> {
    const tripRoute = this.turfService.createRoute(
      trip.origin,
      trip.destination,
      trip.waypoints,
    );

    const packageOriginPoint = this.turfService.createPoint(packageOrigin);
    const packageDestinationPoint =
      this.turfService.createPoint(packageDestination);

    // Calculate distances from package points to trip route
    const originDistance = this.turfService.getDistanceToRoute(
      packageOriginPoint,
      tripRoute,
    );
    const destinationDistance = this.turfService.getDistanceToRoute(
      packageDestinationPoint,
      tripRoute,
    );

    // Check if both points are within corridor
    const corridorWidthMeters = corridorWidthKm * 1000;
    const isOnCorridor =
      originDistance <= corridorWidthMeters &&
      destinationDistance <= corridorWidthMeters;

    if (!isOnCorridor) {
      return null;
    }

    // Check package and trip are in the same direction.
    const isDirectionCompatible = this.turfService.checkDirectionCompatibility(
      tripRoute,
      packageOriginPoint,
      packageDestinationPoint,
    );

    if (!isDirectionCompatible) {
      return null;
    }

    const score = this.scorer.calculateMatchingScore(
      originDistance,
      destinationDistance,
      isOnCorridor,
    );

    return {
      tripId: trip.id,
      isRequestSent: false,
      score,
      originDistance,
      destinationDistance,
      isOnCorridor,
    };
  }
}
