import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MapService } from '../../map/map.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import {
  AuthMessages,
  BadRequestMessages,
} from '../../../common/enums/messages.enum';
import {
  MatchedRequest,
  PackageStatusEnum,
  TripStatusEnum,
} from '../../../../generated/prisma';
import { UpdateTrackingDto } from '../dto/update-tracking.dto';
import { RateTripDto } from '../dto/rate-trip.dto';
import { isNumber } from 'class-validator';
import { TurfService } from '../../turf/turf.service';
import { Location } from '../../map/map.types';
import { NotificationService } from '../../notification/notification.service';
import {
  getNotificationMessage,
  NotificationMessages,
} from '../../notification/notification-messages';
import { PrismaTransaction } from '../../prisma/prisma.types';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { MatchedRouteSorter } from './matched-route-sorter';

/**
 * Trip tracking, notes, rating and directions (Phase 4 Task 4).
 *
 * Owns `addTripNote`, `updateTracking`, `getTripTracking`, `rateTrip` and
 * `getDirections`. All multi-statement writes run through `TransactionRunner`
 * (no manual `.catch` — the global filter maps Prisma errors). `rateTrip` has
 * no financial interplay (it only averages the transporter rating); the
 * escrow interplay lives in `TripRequestService.updateRequest` (non-fatal
 * creation) and `TripService.deliveryPackage` (fatal release).
 */
@Injectable()
export class TripTrackingService {
  private readonly sorter: MatchedRouteSorter;

  constructor(
    private prisma: PrismaService,
    private mapService: MapService,
    private turfService: TurfService,
    private notificationService: NotificationService,
    private runner: TransactionRunner,
  ) {
    this.sorter = new MatchedRouteSorter(turfService);
  }

  async addTripNote(
    tripId: string,
    note: string,
    packageId?: string,
    tx: PrismaTransaction = this.prisma,
  ) {
    const trip = await tx.trip.findUniqueOrThrow({
      where: {
        id: tripId,
      },
      include: {
        matchedRequests: {
          where: {
            packageId,
          },
          include: {
            package: {
              select: {
                code: true,
                senderId: true,
              },
            },
          },
        },
        transporter: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (trip.status === TripStatusEnum.completed) {
      throw new BadRequestException(
        `${BadRequestMessages.BaseTripStatus}*${trip.status}*.`,
      );
    }

    // If packageId included, the note will send for all matched requests within a trip.
    const updatedMatchedRequestsPromises = trip.matchedRequests.map(
      async (m) => {
        // Push note
        const oldNotes =
          plainToInstance(Array<string>, m.transporterNotes) ?? [];
        oldNotes.push(note);
        const plainNewNotes = instanceToPlain(oldNotes);

        // Add create package notification
        await this.notificationService.create(
          m.package.senderId,
          {
            packageId: m.packageId,
            tripId: m.tripId,
            content: getNotificationMessage(
              NotificationMessages.NewTransporterNote,
              {
                packageCode: m.package.code,
                tripCode: trip.code,
                noteContent: note,
              },
            ),
          },
          tx,
        );

        return tx.matchedRequest.update({
          where: {
            tripId,
            packageId: m.packageId,
          },
          data: {
            transporterNotes: plainNewNotes,
          },
        });
      },
    );

    // Run queries parallel and Get 'resolved' promises's length
    const results = await Promise.allSettled(updatedMatchedRequestsPromises);
    const count = results.filter(
      (result): result is PromiseFulfilledResult<MatchedRequest> =>
        result.status === 'fulfilled' && result.value !== null,
    ).length;

    return {
      count,
    };
  }

  async updateTracking(
    tripId: string,
    trackingDto: UpdateTrackingDto,
    tx: PrismaTransaction = this.prisma,
  ) {
    const trip = await tx.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: {
        status: true,
        matchedRequests: true,
      },
    });

    const trackingUpdates = trip.matchedRequests.map((m) => ({
      matchedRequestId: m.id,
      ...trackingDto,
    }));
    return tx.trackingUpdate.createMany({
      data: trackingUpdates,
    });
  }

  async getTripTracking(tripId: string, packageId: string) {
    return this.prisma.trackingUpdate.findMany({
      where: {
        matchedRequest: {
          tripId,
          packageId,
        },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async rateTrip(
    userId: string,
    { tripId, packageId, rate, comment }: RateTripDto,
  ) {
    const {
      senderRating,
      package: { senderId, status },
      trip: {
        transporterId,
        transporter: { rate: tRate, rateCount },
      },
    } = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        tripId,
        packageId,
      },
      select: {
        senderRating: true,
        package: {
          select: {
            senderId: true,
            status: true,
          },
        },
        trip: {
          select: {
            transporterId: true,
            transporter: {
              select: {
                rate: true,
                rateCount: true,
              },
            },
          },
        },
      },
    });

    if (senderId !== userId) {
      throw new ForbiddenException(
        `${AuthMessages.EntityAccessDenied} package.`,
      );
    }

    if (isNumber(senderRating)) {
      throw new BadRequestException(BadRequestMessages.AlreadyRatedTrip);
    }

    const isValidStatus =
      status === PackageStatusEnum.delivered ||
      status === PackageStatusEnum.returned;
    if (!isValidStatus) {
      throw new BadRequestException(
        `${BadRequestMessages.BasePackageStatus}*${status}*.`,
      );
    }

    return this.runner.run(async (tx) => {
      // Update transporter rate
      const newRateCount = rateCount + 1;
      const newRate = (tRate * rateCount + rate) / newRateCount;

      await tx.transporter.update({
        where: {
          id: transporterId,
        },
        data: {
          rate: newRate,
          rateCount: newRateCount,
        },
      });

      return tx.matchedRequest.update({
        where: {
          tripId,
          packageId,
        },
        data: {
          senderRating: rate,
          senderComment: comment,
        },
      });
    });
  }

  async getDirections(tripId: string, origin: Location) {
    const { destination } = await this.prisma.trip.findFirstOrThrow({
      where: { id: tripId },
      select: {
        destination: true,
      },
    });

    let matchedRequests = await this.prisma.matchedRequest.findMany({
      where: {
        tripId,
      },
      select: {
        package: {
          select: {
            id: true,
            status: true,
            originAddress: true,
            recipient: {
              select: {
                address: true,
              },
            },
            pickupAtOrigin: true,
            deliveryAtDestination: true,
          },
        },
      },
    });

    if (matchedRequests.length < 1) {
      return {};
    }

    matchedRequests = await this.sorter.sort(
      origin,
      destination,
      matchedRequests,
    );

    const waypoints = matchedRequests.flatMap((m) =>
      [
        m.package.pickupAtOrigin
          ? {
              latitude: m.package.originAddress.latitude,
              longitude: m.package.originAddress.longitude,
            }
          : undefined,
        m.package.deliveryAtDestination
          ? {
              latitude: m.package.recipient.address.latitude,
              longitude: m.package.recipient.address.longitude,
            }
          : undefined,
      ].filter((v) => v !== undefined),
    );

    const sortedWaypoints = this.turfService.sortLocationsByRoute(
      origin,
      destination,
      waypoints,
    );

    return this.mapService.getDirections({
      origin,
      destination,
      waypoints: sortedWaypoints,
    });
  }
}
