import { Package, TripStatusEnum } from 'generated/prisma';
import { Location } from '../map/map.types';

export interface PackageWithLocations extends Package {
  originAddress: Location;
  recipient: {
    address: Location;
  }
}

export interface TripWithLocations {
  id: string;
  origin: Location;
  destination: Location;
  waypoints: Location[];
  status: TripStatusEnum;
}

export interface DeviationInfo {
  distance?: number;
  duration?: number;
  additionalPrice?: number;
}

export interface MatchResult {
  tripId: string;
  score: number;
  originDistance: number;
  destinationDistance: number;
  isOnCorridor: boolean;
  deviationInfo?: DeviationInfo;
}