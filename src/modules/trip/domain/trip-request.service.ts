import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { generateCode, generateUniqueCode } from '../../../common/utilities';
import { UpdateRequestDto } from '../dto/update-request.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { PriceBreakdownDto } from '../../package/dto/package-response.dto';
import {
  PackageStatusEnum,
  RequestStatusEnum,
} from '../../../../generated/prisma';
import { FinancialService } from '../../financial/financial.service';
import { S3Service } from '../../s3/s3.service';
import { TurfService } from '../../turf/turf.service';
import { NotificationService } from '../../notification/notification.service';
import {
  getNotificationMessage,
  NotificationMessages,
} from '../../notification/notification-messages';
import { MatchedRouteSorter } from './matched-route-sorter';

/**
 * Trip-side request handling (Phase 4 Task 4).
 *
 * Owns `updateRequest` (accept/reject), the pending-request list and the
 * matched-request list. All multi-statement writes run through
 * `TransactionRunner` (no manual `.catch` — the global filter maps Prisma
 * errors). Fix vs the original: the reject branch now writes through `tx`
 * (it used the root client inside the transaction).
 *
 * Escrow semantics preserved: creation on accept is intentionally non-fatal
 * (MVP — the request is still accepted), while release on delivery (in the
 * application service) is fatal.
 */
@Injectable()
export class TripRequestService {
  private readonly sorter: MatchedRouteSorter;

  constructor(
    private prisma: PrismaService,
    private financialService: FinancialService,
    private s3Service: S3Service,
    private notificationService: NotificationService,
    private runner: TransactionRunner,
    turfService: TurfService,
  ) {
    this.sorter = new MatchedRouteSorter(turfService);
  }

  async updateRequest(
    requestId: string,
    { status, transporterNotes }: UpdateRequestDto,
  ) {
    if (
      (status as unknown as RequestStatusEnum) === RequestStatusEnum.rejected
    ) {
      return this.runner.run(async (tx) => {
        const {
          package: packageData,
          trip,
          ...request
        } = await tx.tripRequest.update({
          where: { id: requestId },
          data: { status },
          include: {
            package: {
              select: {
                code: true,
                senderId: true,
              },
            },
            trip: {
              select: {
                code: true,
              },
            },
          },
        });

        // Add reject request notification
        await this.notificationService.create(
          packageData.senderId,
          {
            packageId: request.packageId,
            tripId: request.tripId,
            content: getNotificationMessage(
              NotificationMessages.TripRequestRejected,
              {
                packageCode: packageData.code,
                tripCode: trip.code,
              },
            ),
          },
          tx,
        );

        return request;
      });
    }

    return this.runner.run(async (tx) => {
      const request = await tx.tripRequest.update({
        where: { id: requestId },
        data: { status },
      });

      // Delete other sent requests for this package
      await tx.tripRequest.updateMany({
        where: {
          packageId: request.packageId,
          NOT: {
            id: request.id,
          },
        },
        data: {
          status: RequestStatusEnum.deleted,
        },
      });

      // Create MatchedRequest instance
      const trackingCode = generateUniqueCode();
      const deliveryCode = generateCode().toString();
      await tx.matchedRequest.create({
        data: {
          requestId: request.id,
          packageId: request.packageId,
          tripId: request.tripId,
          trackingCode,
          deliveryCode,
          transporterNotes,
        },
      });

      // Update total deviation info in trip
      const { totalDeviationDistanceKm, totalDeviationDurationMin } =
        await tx.trip.findUniqueOrThrow({
          where: { id: request.tripId },
        });

      const newTotalDeviationDistance =
        (totalDeviationDistanceKm ?? 0) + request.deviationDistanceKm;
      const newTotalDeviationDuration =
        (totalDeviationDurationMin ?? 0) + request.deviationDurationMin;

      const { code: tripCode } = await tx.trip.update({
        where: { id: request.tripId },
        data: {
          totalDeviationDistanceKm: newTotalDeviationDistance,
          totalDeviationDurationMin: newTotalDeviationDuration,
        },
      });

      // Get package and Update its status and breakdown
      const packageData = await tx.package.findFirstOrThrow({
        where: { id: request.packageId },
        select: {
          code: true,
          breakdown: true,
          senderId: true,
        },
      });

      // Update breakdown
      const breakdown = plainToInstance(
        PriceBreakdownDto,
        packageData?.breakdown,
      );
      if (breakdown) {
        breakdown.deviationCost = request.deviationCost ?? 0;
      }
      const plainBreakdown = instanceToPlain(breakdown);

      await tx.package.update({
        where: { id: request.packageId },
        data: {
          status: PackageStatusEnum.matched,
          finalPrice: {
            increment: request.deviationCost,
          },
          breakdown: plainBreakdown,
        },
      });

      // Create escrow if balance is enough
      try {
        await this.financialService.createEscrow({
          packageId: request.packageId,
          tripId: request.tripId,
        });
      } catch {
        // Escrow creation failure is intentionally non-fatal here (MVP behavior); request is still accepted.
      }

      // Add accept request notification
      await this.notificationService.create(
        packageData.senderId,
        {
          packageId: request.packageId,
          tripId: request.tripId,
          content: getNotificationMessage(
            NotificationMessages.TripRequestAccepted,
            {
              packageCode: packageData.code,
              tripCode,
            },
          ),
        },
        tx,
      );

      return request;
    });
  }

  async getAllTripRequests(tripId: string) {
    return this.prisma.tripRequest.findMany({
      where: {
        tripId,
        status: RequestStatusEnum.pending,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getAllMatchedRequests(tripId: string, inOrder = false) {
    const matchedRequests = await this.prisma.matchedRequest.findMany({
      where: {
        tripId,
      },
      select: {
        package: {
          select: {
            id: true,
            code: true,
            sender: {
              select: {
                firstName: true,
                lastName: true,
                gender: true,
                phoneNumber: true,
              },
            },
            status: true,
            items: true,
            originAddress: true,
            recipient: {
              select: {
                address: true,
              },
            },
            weight: true,
            dimensions: true,
            packageValue: true,
            isFragile: true,
            isPerishable: true,
            description: true,
            pickupAtOrigin: true,
            deliveryAtDestination: true,
            preferredPickupTime: true,
            preferredDeliveryTime: true,
            picturesKey: true,
          },
        },
        request: true,
        transporterNotes: true,
        pickupTime: true,
        deliveryTime: true,
        paymentStatus: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    let sortedMatchedRequests = matchedRequests.map((m) => ({
      ...m,
      package: {
        ...m.package,
        items: instanceToPlain(m.package.items) as string[],
      },
    }));
    if (matchedRequests.length > 0 && inOrder) {
      const trip = await this.prisma.trip.findFirstOrThrow({
        where: { id: tripId },
        select: {
          origin: true,
          destination: true,
        },
      });
      sortedMatchedRequests = await this.sorter.sort(
        trip.origin,
        trip.destination,
        sortedMatchedRequests,
      );
    }

    return Promise.all(
      sortedMatchedRequests.map(async (m) => {
        const picturesKey = instanceToPlain(m.package.picturesKey) as string[];
        const picturePromises = picturesKey?.map((k) =>
          this.s3Service.generateGetPresignedUrl(k),
        );
        const picturesUrl = await Promise.all(picturePromises);
        return {
          ...m,
          package: {
            ...m.package,
            picturesUrl,
            offeredPrice: m.request.offeredPrice,
            picturesKey: undefined,
          },
          request: undefined,
        };
      }),
    );
  }
}
