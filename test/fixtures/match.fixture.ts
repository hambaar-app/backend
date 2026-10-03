import {
  MatchResult,
  PackageWithLocations,
  TripWithLocations,
} from '../../src/modules/package/matching.types';
import { TripStatusEnum } from '../../generated/prisma';
import {
  DESTINATION_LOCATION,
  ORIGIN_LOCATION,
  createLocation,
} from './location.fixture';

/** Fresh TripWithLocations per call — never mutate the shared constant. */
export const createTripWithLocations = (
  overrides: Partial<TripWithLocations> = {},
): TripWithLocations => ({
  id: 'trip-123',
  status: TripStatusEnum.scheduled,
  origin: createLocation(
    ORIGIN_LOCATION.latitude,
    ORIGIN_LOCATION.longitude,
  ),
  destination: createLocation(
    DESTINATION_LOCATION.latitude,
    DESTINATION_LOCATION.longitude,
  ),
  waypoints: [],
  ...overrides,
});

export const mockTripWithLocations = createTripWithLocations();

/** Fresh MatchResult per call. */
export const createMatchResult = (
  overrides: Partial<MatchResult> = {},
): MatchResult => ({
  tripId: 'trip-123',
  isRequestSent: false,
  score: 0,
  originDistance: 500,
  destinationDistance: 300,
  isOnCorridor: true,
  ...overrides,
});

export const mockMatchResult = createMatchResult();

/** Fresh PackageWithLocations per call (cast: shares shape with Prisma Package). */
export const createPackageWithLocations = (
  overrides: Partial<PackageWithLocations> = {},
): PackageWithLocations =>
  ({
    id: 'package-123',
    weight: 2000,
    originAddress: createLocation(
      ORIGIN_LOCATION.latitude,
      ORIGIN_LOCATION.longitude,
    ),
    recipient: {
      address: createLocation(
        ORIGIN_LOCATION.latitude,
        ORIGIN_LOCATION.longitude,
      ),
    },
    ...overrides,
  }) as unknown as PackageWithLocations;

export const mockPackageWithLocations = createPackageWithLocations();
