import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Location } from '../map/map.types';
import { ConfigService } from '@nestjs/config';
import { SessionData } from 'express-session';
import {
  MatchResult,
  PackageWithLocations,
  TripWithLocations,
} from './matching.types';
import { PrismaTransaction } from '../prisma/prisma.types';
import { TurfService } from '../turf/turf.service';
import { ConfigKey } from '../../common/config/config-names';
import { MatchingScorer } from './matching/matching-scorer';
import { CorridorAnalyzer } from './matching/corridor-analyzer';
import { buildTripCandidateWhere } from './matching/trip-candidate-query';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly corridorWidth: number;
  private readonly scorer: MatchingScorer;
  private readonly analyzer: CorridorAnalyzer;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    turfService: TurfService,
  ) {
    this.corridorWidth = config.get<number>(
      ConfigKey.Pricing.CorridorWidth,
      10,
    );
    this.scorer = new MatchingScorer();
    this.analyzer = new CorridorAnalyzer(turfService, this.scorer);
  }

  async findMatchedTrips(
    packageData: PackageWithLocations,
    session: SessionData,
    maxResults: number = 20,
    tx: PrismaTransaction = this.prisma,
  ): Promise<MatchResult[]> {
    const now = new Date();

    if (!session.packages) {
      session.packages = [];
    }

    // Find or create session package
    let sessionPackage = session.packages.find((p) => p.id === packageData.id);
    if (!sessionPackage) {
      sessionPackage = {
        id: packageData.id,
        matchResults: [],
      };
      session.packages.push(sessionPackage);
    }

    // Pre-filter trips
    const candidateTrips = await this.getPreFilteredTrips(
      packageData,
      sessionPackage.lastCheckMatching,
      tx,
    );

    // Analyze each trip for corridor matching in parallel
    const matchResultPromises = candidateTrips.map((trip) =>
      this.analyzeTrip(
        trip,
        packageData.originAddress,
        packageData.recipient.address,
        this.corridorWidth,
      ).catch((error) => {
        this.logger.error(`Error analyzing trip ${trip.id}:`, error);
        return null;
      }),
    );

    const results = await Promise.allSettled(matchResultPromises);
    const newMatchResults = results
      .filter(
        (result): result is PromiseFulfilledResult<MatchResult> =>
          result.status === 'fulfilled' && result.value !== null,
      )
      .map((result) => result.value);

    // Merge and sort results
    let updatedResults = [...sessionPackage.matchResults];
    for (const newResult of newMatchResults) {
      const existingIndex = updatedResults.findIndex(
        (mr) => mr.tripId === newResult.tripId,
      );
      if (existingIndex >= 0) {
        updatedResults[existingIndex] = newResult;
      } else {
        updatedResults.push(newResult);
      }
    }
    updatedResults = updatedResults.sort((a, b) => a.score - b.score);

    // Update session
    sessionPackage.lastCheckMatching = now;
    sessionPackage.matchResults = updatedResults;

    return sessionPackage.matchResults.slice(0, maxResults);
  }

  private async getPreFilteredTrips(
    packageData: PackageWithLocations,
    lastCheckMatching?: Date,
    tx: PrismaTransaction = this.prisma,
  ) {
    const whereClause = buildTripCandidateWhere({
      weight: packageData.weight,
      lastCheckMatching,
    });

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
    corridorWidthKm: number = this.corridorWidth,
  ): Promise<MatchResult | null> {
    return this.analyzer.analyzeTrip(
      trip,
      packageOrigin,
      packageDestination,
      corridorWidthKm,
    );
  }

  // Note: Score lower is better.
  // MVP version — kept as a thin delegate so existing callers/tests keep
  // working; new code should use `MatchingScorer` directly.
  private calculateMatchingScore(
    originDistance: number,
    destinationDistance: number,
    isOnCorridor: boolean,
  ): number {
    return this.scorer.calculateMatchingScore(
      originDistance,
      destinationDistance,
      isOnCorridor,
    );
  }
}
