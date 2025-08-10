import { TripStatusEnum } from 'generated/prisma';
import { Location } from '../map/map.types';

export interface TripWithLocations {
  id: string;
  origin: Location;
  destination: Location;
  waypoints: Location[];
  tripStatus: TripStatusEnum;
}

export interface MatchResult {
  tripId: string;
  originDistance: number;
  destinationDistance: number;
  isOnCorridor: boolean;
}