import { TripStatusEnum } from 'generated/prisma';
import { Location } from '../map/map.types';

export interface TripWithLocations {
  id: string;
  origin: Location;
  destination: Location;
  waypoints: Location[];
  status: TripStatusEnum;
}

export interface DeviationInfo {
  distance?: number;
  time?: number;
}

export interface MatchResult {
  tripId: string;
  score: number;
  originDistance: number;
  destinationDistance: number;
  isOnCorridor: boolean;
  deviationInfo?: DeviationInfo;
}