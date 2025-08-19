import { Inject, Injectable } from '@nestjs/common';
import { Turf, TURF_TOKEN } from './turf.provider';
import { Location } from '../map/map.types';

@Injectable()
export class TurfService {
  constructor(@Inject(TURF_TOKEN) private turf: Turf) {}

  sortLocationsByRoute(
    origin: Location,
    destination: Location,
    locations: Location[],
  ): Location[] {
    if (locations.length <= 1) {
      return [...locations];
    }

    // Remove duplicate waypoints
    const uniqueLocations = this.removeDuplicateLocations(locations);

    if (uniqueLocations.length <= 1) {
      return uniqueLocations;
    }

    // Create the main route line from origin to destination
    const routeLine = this.turf.lineString([
      [Number(origin.longitude), Number(origin.latitude)],
      [Number(destination.longitude), Number(destination.latitude)]
    ]);

    // Calculate position along route for each location
    const locationsWithPosition = uniqueLocations.map(location => {
      const locationPoint = this.turf.point([
        Number(location.longitude),
        Number(location.latitude)
      ]);

      // Find the nearest point on the route line
      const nearestPoint = this.turf.nearestPointOnLine(routeLine, locationPoint);
      
      // Get the distance from origin to this projected point
      const originPoint = this.turf.point([Number(origin.longitude), Number(origin.latitude)]);
      const distanceFromOrigin = this.turf.distance(originPoint, nearestPoint, { units: 'meters' });

      return {
        location,
        distanceFromOrigin
      };
    });

    // Sort locations
    locationsWithPosition.sort((a, b) => a.distanceFromOrigin  - b.distanceFromOrigin );
    return locationsWithPosition.map(item => item.location);
  }

  private removeDuplicateLocations(locations: Location[]): Location[] {
    const seen = new Set<string>();
    return locations.filter(location => {
      const key = `${location.latitude},${location.longitude}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
