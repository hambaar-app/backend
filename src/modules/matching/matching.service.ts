import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Package, Prisma, TripStatusEnum } from 'generated/prisma';
import * as turf from '@turf/turf';
import { Feature, LineString, Point } from 'geojson';
import { TripWithLocations } from './matching.types';

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService
  ) {}

  private async getPreFilteredTrips(packageData: Package) {
    const whereClause: Prisma.TripWhereInput = {
      isActive: true,
      tripStatus: {
        in: [
          TripStatusEnum.scheduled,
          TripStatusEnum.delayed,
          TripStatusEnum.active
        ],
      },
    };

    // Filter by weight capacity
    if (packageData.weight) {
      whereClause.OR = [
        { maxPackageWeightGr: { gte: packageData.weight } },
        { maxPackageWeightGr: null },
      ];
    }

    // TODO: Filter by departure time

    return this.prisma.trip.findMany({
      where: whereClause,
      include: {
        origin: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
          },
        },
        destination: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
          },
        },
        waypoints: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
          },
        },
        vehicle: {
          select: {
            vehicleType: true,
          },
          include: {
            model: {
              include: {
                brand: true
              }
            }
          }
        }
        // TODO: Includes transporter?
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private createTripRoute(trip: TripWithLocations): Feature<LineString> {
    const coordinates: [number, number][] = [];

    // Push all waypoints and make coords number
    coordinates.push([+trip.origin.longitude, +trip.origin.latitude]);
    trip.waypoints.forEach(waypoint => {
      coordinates.push([+waypoint.longitude, +waypoint.latitude]);
    });
    coordinates.push([+trip.destination.longitude, +trip.destination.latitude]);

    return turf.lineString(coordinates);
  }

  private getDistanceToRoute(
    point: Feature<Point>,
    route: Feature<LineString>
  ): number | undefined {
    try {
      const nearestPoint = turf.nearestPointOnLine(route, point);
      return turf.distance(point, nearestPoint, { units: 'meters' });
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
      const routePoint = turf.point(coordinates[i]);
      const distance = turf.distance(point, routePoint, { units: 'meters' });
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }
}
