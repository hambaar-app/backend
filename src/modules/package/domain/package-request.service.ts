import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import {
  AuthMessages,
  BadRequestMessages,
  NotFoundMessages,
} from '../../../common/enums/messages.enum';
import {
  PackageStatusEnum,
  RequestStatusEnum,
  TripStatusEnum,
} from '../../../../generated/prisma';
import { MatchResult } from '../matching.types';
import { SessionData } from 'express-session';
import { PricingService } from '../../pricing/pricing.service';
import { CreateRequestDto } from '../../trip/dto/create-request.dto';
import { NotificationService } from '../../notification/notification.service';
import {
  getNotificationMessage,
  NotificationMessages,
} from '../../notification/notification-messages';

/**
 * Package-side trip requests (Phase 4 Task 5).
 *
 * Owns `createRequest`, `getAllPackageRequests` and `updateRequest`
 * (= cancel). Session bookkeeping (`isRequestSent`) happens **after** the
 * transaction commits: the Redis session is not transactional with
 * Postgres, so mutating it inside the tx risks divergence on rollback
 * (A-4 mitigation).
 */
@Injectable()
export class PackageRequestService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private notificationService: NotificationService,
    private runner: TransactionRunner,
  ) {}

  async createRequest(
    userId: string,
    { packageId, tripId, senderNote }: CreateRequestDto,
    session: SessionData,
  ) {
    let matchedTrip: MatchResult | undefined;
    const request = await this.runner.run(async (tx) => {
      const packageData = await tx.package.findUniqueOrThrow({
        where: { id: packageId },
      });

      if (userId !== packageData.senderId) {
        throw new ForbiddenException(
          `${AuthMessages.EntityAccessDenied} package.`,
        );
      }

      if (packageData.status !== PackageStatusEnum.searching_transporter) {
        throw new BadRequestException(BadRequestMessages.SendRequestPackage);
      }

      const tripData = await tx.trip.findUniqueOrThrow({
        where: { id: tripId },
        include: {
          origin: true,
          destination: true,
          waypoints: true,
        },
      });

      if (tripData.status !== TripStatusEnum.scheduled) {
        throw new BadRequestException(BadRequestMessages.SendRequestTrip);
      }

      const matchedTrips = session.packages.find(
        (p) => p.id === packageId,
      )?.matchResults;
      if (!matchedTrips || !matchedTrips.length) {
        throw new NotFoundException(NotFoundMessages.MatchedTrip);
      }

      matchedTrip = matchedTrips.find((t) => t.tripId === tripId);
      if (!matchedTrip) {
        throw new BadRequestException(BadRequestMessages.SendRequestTrip);
      }

      const deviationDistance = matchedTrip.deviationInfo?.distance ?? 0;
      const deviationDuration = matchedTrip.deviationInfo?.duration ?? 0;
      const deviationCost = matchedTrip.deviationInfo?.additionalPrice ?? 0;
      const transporterEarnings =
        this.pricingService.calculateTransporterEarnings(
          packageData.finalPrice,
          deviationCost,
        );
      const offeredPrice = transporterEarnings + deviationCost;

      const created = await tx.tripRequest.create({
        data: {
          packageId,
          tripId,
          deviationDistanceKm: deviationDistance,
          deviationDurationMin: deviationDuration,
          deviationCost,
          offeredPrice,
          senderNote,
        },
      });

      // Add create request notification
      await this.notificationService.create(
        userId,
        {
          packageId,
          content: getNotificationMessage(
            NotificationMessages.TripRequestCreated,
            {
              packageCode: packageData.code,
              tripCode: tripData.code,
            },
          ),
        },
        tx,
      );

      return created;
    });

    // Update session only after the transaction commits (see class doc).
    if (matchedTrip) matchedTrip.isRequestSent = true;

    return request;
  }

  async getAllPackageRequests(
    packageId: string,
    status: RequestStatusEnum[] = Object.values(RequestStatusEnum),
  ) {
    return this.prisma.tripRequest.findMany({
      where: {
        packageId,
        status: {
          in: status,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateRequest(requestId: string, session: SessionData) {
    let matchedTrip: MatchResult | undefined;
    const request = await this.runner.run(async (tx) => {
      const { package: packageData, ...updated } = await tx.tripRequest.update({
        where: {
          id: requestId,
          status: RequestStatusEnum.pending,
        },
        data: {
          status: RequestStatusEnum.canceled,
        },
        include: {
          package: {
            select: {
              id: true,
              senderId: true,
            },
          },
        },
      });

      // Resolve the session entry inside the tx (read-only) but mutate it
      // only after commit (see class doc).
      matchedTrip = session.packages
        .find((p) => p.id === updated.packageId)
        ?.matchResults.find((m) => m.tripId === updated.tripId);

      // Add create package notification
      await this.notificationService.create(
        packageData.senderId,
        {
          packageId: packageData.id,
          content: NotificationMessages.TripRequestCanceled,
        },
        tx,
      );

      return updated;
    });

    if (matchedTrip) matchedTrip.isRequestSent = false;

    return request;
  }
}
