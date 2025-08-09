import { TripStatusEnum } from 'generated/prisma';
import { Location } from '../map/map.types';

export interface TripWithLocations {
  id: string;
  origin: Location;
  destination: Location;
  waypoints: Location[];
  tripStatus: TripStatusEnum;
}