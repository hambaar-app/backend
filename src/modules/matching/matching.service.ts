import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Package, Prisma, TripStatusEnum } from 'generated/prisma';
import * as turf from '@turf/turf';
import { Feature, LineString, Point } from 'geojson';
import { MatchResult, TripWithLocations } from './matching.types';
import { Location } from '../map/map.types';
import { ConfigService } from '@nestjs/config';
import { PackageService } from '../package/package.service';

@Injectable()
export class MatchingService {
  private corridorWidth: number;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private packageService: PackageService
  ) {
    this.corridorWidth = config.get<number>('CORRIDOR_WIDTH', 10);
  }

  async findMatchingTrips(
    packageId: string,
    maxResults: number = 10
  ): Promise<MatchResult[]> {
    const packageData = await this.packageService.getById(packageId);

    // Pre-filter trips using prisma queries
    const candidateTrips = await this.getPreFilteredTrips(packageData);

    // Analyze each trip for corridor matching
    const matchResults: MatchResult[] = [];
    for (const trip of candidateTrips) {
      const matchResult = await this.analyzeTrip(
        trip,
        packageData.originAddress,
        packageData.recipient.address,
        this.corridorWidth
      );

      if (matchResult) {
        matchResults.push(matchResult);
      }
    }

    return matchResults
      .sort((a, b) => a.score - b.score)
      .slice(0, maxResults);
  }

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

  private async analyzeTrip(
    trip: TripWithLocations,
    packageOrigin: Location,
    packageDestination: Location,
    corridorWidthKm: number = this.corridorWidth
  ): Promise<MatchResult | null> {
    const tripRoute = this.createTripRoute(trip);
    
    const packageOriginPoint = turf.point([
      Number(packageOrigin.longitude),
      Number(packageOrigin.latitude)
    ]);
    
    const packageDestinationPoint = turf.point([
      Number(packageDestination.longitude),
      Number(packageDestination.latitude)
    ]);

    // Calculate distances from package points to trip route
    const originDistance = this.getDistanceToRoute(packageOriginPoint, tripRoute);
    const destinationDistance = this.getDistanceToRoute(packageDestinationPoint, tripRoute);

    // Check if both points are within corridor
    const corridorWidthMeters = corridorWidthKm * 1000;
    const isOnCorridor = originDistance <= corridorWidthMeters && 
                        destinationDistance <= corridorWidthMeters;

    if (!isOnCorridor) {
      return null;
    }

    // Check package and trip are in the same direction.
    const isDirectionCompatible = this.checkDirectionCompatibility(
      tripRoute,
      packageOriginPoint,
      packageDestinationPoint
    );

    if (!isDirectionCompatible) {
      return null;
    }

    const score = this.calculateMatchingScore(
      originDistance,
      destinationDistance,
      isOnCorridor
    );

    return {
      tripId: trip.id,
      score,
      originDistance,
      destinationDistance,
      isOnCorridor
    };
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
  ): number {
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

  // Check if destination comes after origin along the route (Simple).
  private checkDirectionCompatibility(
    tripRoute: Feature<LineString>,
    packageOrigin: Feature<Point>,
    packageDestination: Feature<Point>
  ): boolean {
    // Find positions along the trip route
    const originPosition = turf.nearestPointOnLine(tripRoute, packageOrigin);
    const destinationPosition = turf.nearestPointOnLine(tripRoute, packageDestination);

    const originIndex = originPosition.properties?.index || 0;
    const destinationIndex = destinationPosition.properties?.index || 0;

    return destinationIndex > originIndex;
  }

  // Note: Score lower is better.
  // MVP version
  private calculateMatchingScore(
    originDistance: number,
    destinationDistance: number,
    isOnCorridor: boolean
  ): number {
    // Base score
    let score = (originDistance + destinationDistance) / 2;
    
    // Lower score for packages not on corridor
    if (!isOnCorridor) {
      score += 100_000;
    }

    // Score for trips that start/end very close to package points
    if (originDistance < 1000) score -= 500;
    if (destinationDistance < 1000) score -= 500;

    // TODO: Add time-based scoring (preferred times)
    // TODO: Add transporter rating scoring

    return Math.max(0, score); // Ensure non-negative score
  }
}
