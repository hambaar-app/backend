import { Inject, Injectable } from '@nestjs/common';
import { Feature, LineString, Point } from 'geojson';
import { Turf, TURF_TOKEN } from './turf.provider';
import { Location } from '../map/map.types';

@Injectable()
export class TurfService {
  constructor(@Inject(TURF_TOKEN) private turf: Turf) {}

  // Helper method for create Point with location
  createPoint(location: Location) {
    return this.turf.point([
      Number(location.longitude),
      Number(location.latitude)
    ]);
  }

  // Helper method for create LineString with locations
  createRoute(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): Feature<LineString> {
    const coordinates: [number, number][] = [];

    // Push all waypoints and make coords number
    coordinates.push([+origin.longitude, +origin.latitude]);
    waypoints?.forEach(waypoint => {
      coordinates.push([+waypoint.longitude, +waypoint.latitude]);
    });
    coordinates.push([+destination.longitude, +destination.latitude]);

    return this.turf.lineString(coordinates);
  }

  getDistanceToRoute(
    point: Feature<Point>,
    route: Feature<LineString>
  ): number {
    try {
      // TODO: Just check point about waypoints.
      const nearestPoint = this.turf.nearestPointOnLine(route, point);
      return this.turf.distance(point, nearestPoint, { units: 'meters' });
    } catch (error) {
      console.error('Error calculating distance to route:', error);
      return this.getDistanceToRouteSimple(point, route);
    }
  }

  // This is a backup/safety mechanism
  // that provides a simpler distance calculation
  private getDistanceToRouteSimple(
    point: Feature<Point>,
    route: Feature<LineString>
  ): number {
    const coordinates = route.geometry.coordinates;
    let minDistance = Infinity;

    for (let i = 0; i < coordinates.length; i++) {
      const routePoint = this.turf.point(coordinates[i]);
      const distance = this.turf.distance(point, routePoint, { units: 'meters' });
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  // Check if destination comes after origin along the route (Simple).
  checkDirectionCompatibility(
    tripRoute: Feature<LineString>,
    packageOrigin: Feature<Point>,
    packageDestination: Feature<Point>
  ): boolean {
    // Find positions along the trip route
    const originPosition = this.turf.nearestPointOnLine(tripRoute, packageOrigin);
    const destinationPosition = this.turf.nearestPointOnLine(tripRoute, packageDestination);

    const originIndex = originPosition.properties?.index || 0;
    const destinationIndex = destinationPosition.properties?.index || 0;

    return destinationIndex > originIndex;
  }

  sortLocationsByRoute(
    origin: Location,
    destination: Location,
    locations: Location[],
  ): Location[] {
    if (locations.length <= 1) {
      return [...locations];
    }

    if (locations.length <= 1) {
      return locations;
    }

    // Create the main route line from origin to destination
    const routeLine = this.turf.lineString([
      [Number(origin.longitude), Number(origin.latitude)],
      [Number(destination.longitude), Number(destination.latitude)]
    ]);

    // Calculate position along route for each location
    const locationsWithPosition = locations.map(location => {
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
}
