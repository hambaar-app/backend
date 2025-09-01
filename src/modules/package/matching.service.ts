import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TripStatusEnum } from '../../../generated/prisma';
import { Location } from '../map/map.types';
import { ConfigService } from '@nestjs/config';
import { SessionData } from 'express-session';
import { MatchResult, PackageWithLocations, TripWithLocations } from './matching.types';
import { PrismaTransaction } from '../prisma/prisma.types';
import { TurfService } from '../turf/turf.service';

@Injectable()
export class MatchingService {
  private corridorWidth: number;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private turfService: TurfService
  ) {
    this.corridorWidth = config.get<number>('CORRIDOR_WIDTH', 10);
  }

  async findMatchedTrips(
    packageData: PackageWithLocations,
    session: SessionData,
    maxResults: number = 20,
    tx: PrismaTransaction = this.prisma
  ): Promise<MatchResult[]> {
    const now = new Date();

    if (!session.packages) {
      session.packages = [];
    }

    // Find or create session package
    let sessionPackage = session.packages.find(p => p.id === packageData.id);
    if (!sessionPackage) {
      sessionPackage = {
        id: packageData.id,
        matchResults: []
      };
      session.packages.push(sessionPackage);
    }

    // Pre-filter trips
    const candidateTrips = await this.getPreFilteredTrips(packageData, sessionPackage.lastCheckMatching, tx);

    // Analyze each trip for corridor matching in parallel
    const matchResultPromises = candidateTrips.map(trip => 
      this.analyzeTrip(
        trip,
        packageData.originAddress,
        packageData.recipient.address,
        this.corridorWidth
      ).catch(error => {
        console.error(`Error analyzing trip ${trip.id}:`, error);
        return null;
      })
    );

    const results = await Promise.allSettled(matchResultPromises);
    const newMatchResults = results
      .filter((result): result is PromiseFulfilledResult<MatchResult> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    // Merge and sort results
    let updatedResults = [...sessionPackage.matchResults];
    for (const newResult of newMatchResults) {
      const existingIndex = updatedResults.findIndex(mr => mr.tripId === newResult.tripId);
      if (existingIndex >= 0) {
        updatedResults[existingIndex] = newResult;
      } else {
        updatedResults.push(newResult);
      }
    }
    updatedResults = updatedResults
      .sort((a, b) => a.score - b.score);
    
    // Update session
    sessionPackage.lastCheckMatching = now;
    sessionPackage.matchResults = updatedResults;

    return sessionPackage.matchResults
      .slice(0, maxResults);
  }

  private async getPreFilteredTrips(
    packageData: PackageWithLocations,
    lastCheckMatching?: Date,
    tx: PrismaTransaction = this.prisma
  ) {
    const whereClause: Prisma.TripWhereInput = {
      isActive: true,
      status: TripStatusEnum.scheduled,
    };

    // Just check new trips after lastCheckMatching
    if (lastCheckMatching) {
      whereClause.updatedAt = {
        gte: lastCheckMatching
      };
    }

    // Filter by weight capacity
    if (packageData.weight) {
      whereClause.OR = [
        { maxPackageWeightGr: { gte: packageData.weight } },
        { maxPackageWeightGr: null },
      ];
    }

    // TODO: Filter by departure time

    return tx.trip.findMany({
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
            name: true,
          },
        },
        // TODO: Includes transporter and vehicle?
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
    const tripRoute = this.turfService.createRoute(trip.origin, trip.destination, trip.waypoints);
    
    const packageOriginPoint = this.turfService.createPoint(packageOrigin);
    const packageDestinationPoint = this.turfService.createPoint(packageDestination);

    // Calculate distances from package points to trip route
    const originDistance = this.turfService.getDistanceToRoute(packageOriginPoint, tripRoute);
    const destinationDistance = this.turfService.getDistanceToRoute(packageDestinationPoint, tripRoute);

    // Check if both points are within corridor
    const corridorWidthMeters = corridorWidthKm * 1000;
    const isOnCorridor = originDistance <= corridorWidthMeters && 
                        destinationDistance <= corridorWidthMeters;

    if (!isOnCorridor) {
      return null;
    }

    // Check package and trip are in the same direction.
    const isDirectionCompatible = this.turfService.checkDirectionCompatibility(
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
      isRequestSent: false,
      score,
      originDistance,
      destinationDistance,
      isOnCorridor
    };
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
