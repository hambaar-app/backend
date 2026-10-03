import { PackageStatusEnum } from '../../../../generated/prisma';
import { Location } from '../../map/map.types';
import { TurfService } from '../../turf/turf.service';

/**
 * Route-ordering for matched packages (Phase 4 Task 4).
 *
 * Extracted verbatim from `TripService.sortMatchedPackages`: builds a
 * packageId → stop-location map (pickup point for not-yet-picked-up packages,
 * delivery point for matched packages awaiting delivery), orders it along the
 * trip route via Turf, and reorders the matched requests to match.
 */
export class MatchedRouteSorter {
  constructor(private readonly turfService: TurfService) {}

  async sort(
    origin: Location,
    destination: Location,
    matchedRequests: any[],
  ): Promise<any[]> {
    const locationsMap = new Map(
      matchedRequests
        .map((m) => [
          m.package.id,
          m.package.pickupAtOrigin &&
          m.package.status !== PackageStatusEnum.delivered &&
          m.package.status !== PackageStatusEnum.returned &&
          m.package.status !== PackageStatusEnum.cancelled
            ? {
                latitude: m.package.originAddress.latitude,
                longitude: m.package.originAddress.longitude,
              }
            : m.package.deliveryAtDestination &&
                m.package.status === PackageStatusEnum.matched
              ? {
                  latitude: m.package.recipient.address.latitude,
                  longitude: m.package.recipient.address.longitude,
                }
              : undefined,
        ])
        .filter(([_, location]) => location !== undefined) as [
        string,
        Location,
      ][],
    );

    const sortedLocations = this.turfService.sortLocationsByRoute(
      origin,
      destination,
      locationsMap,
    );
    const sortedPackageIds = Array.from(sortedLocations.keys());

    // Create the sorted array
    const sortedRequests: any[] = [];
    sortedPackageIds.forEach((packageId) => {
      const request = matchedRequests.find((m) => m.package.id === packageId);
      if (request) {
        sortedRequests.push(request);
      }
    });

    return sortedRequests;
  }
}
