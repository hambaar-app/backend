import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { CreatePackageDto } from '../dto/create-package.dto';
import {
  AuthMessages,
  BadRequestMessages,
} from '../../../common/enums/messages.enum';
import { PackageStatusEnum } from '../../../../generated/prisma';
import { MapService } from '../../map/map.service';
import { PricingService } from '../../pricing/pricing.service';
import { PORTS } from '../../../infra/ports/ports.tokens';
import { StoragePort } from '../../../infra/ports/ports';
import { SessionData } from 'express-session';
import { MatchingService } from '../matching.service';
import { TripService } from '../../trip/application/trip.service';
import { PrismaTransaction } from '../../prisma/prisma.types';
import { UpdatePackageDto } from '../dto/update.package.dto';
import { instanceToPlain } from 'class-transformer';
import { TurfService } from '../../turf/turf.service';
import { NotificationService } from '../../notification/notification.service';
import {
  getNotificationMessage,
  NotificationMessages,
} from '../../notification/notification-messages';

/**
 * Package lifecycle + CRUD orchestration (Phase 4 Task 5).
 *
 * Slimmed from the 22 KB god service: recipients live in
 * `RecipientService`, package-side requests in `PackageRequestService`,
 * public tracking in `TrackingService`. All multi-statement writes run
 * through `TransactionRunner` (no manual `.catch` — the global filter maps
 * Prisma errors). Fixes vs the original: `update`/`delete` now write
 * through `tx` (they used the root client inside the transaction), and
 * `generatePackagePicPresignedUrl` uses Nest `Logger` instead of
 * `console.error` and no longer imports the internal
 * `generated/prisma/runtime/library` `JsonArray` type (B-9).
 *
 * Known quirk preserved: `getAll` yields `undefined` entries for packages
 * whose `picturesKey` is not an array.
 */
@Injectable()
export class PackageService {
  private readonly logger = new Logger(PackageService.name);

  constructor(
    private prisma: PrismaService,
    private mapService: MapService,
    private pricingService: PricingService,
    private matchingService: MatchingService,
    private tripService: TripService,
    @Inject(PORTS.STORAGE) private storage: StoragePort,
    private turfService: TurfService,
    private notificationService: NotificationService,
    private runner: TransactionRunner,
  ) {}

  async create(
    userId: string,
    { items, originAddressId, recipientId, ...packageDto }: CreatePackageDto,
  ) {
    return this.runner.run(async (tx) => {
      const originAddress = await tx.address.findFirst({
        where: {
          id: originAddressId,
          userId,
        },
      });

      if (!originAddress) {
        throw new ForbiddenException(
          `${AuthMessages.EntityAccessDenied} origin address.`,
        );
      }

      const recipient = await tx.packageRecipient.findFirst({
        where: {
          id: recipientId,
          address: {
            userId,
          },
        },
        include: {
          address: true,
        },
      });

      if (!recipient) {
        throw new ForbiddenException(
          `${AuthMessages.EntityAccessDenied} recipient.`,
        );
      }

      // Calculate distance for pricing
      const { distance } = await this.mapService.calculateDistance({
        origin: {
          latitude: originAddress.latitude,
          longitude: originAddress.longitude,
        },
        destination: {
          latitude: recipient.address.latitude,
          longitude: recipient.address.longitude,
        },
      });

      const { suggestedPrice, breakdown } =
        this.pricingService.calculateSuggestedPrice({
          distanceKm: distance,
          weightGr: packageDto.weight,
          isFragile: packageDto.isFragile ?? false,
          isPerishable: packageDto.isPerishable ?? false,
          originCity: originAddress.city!,
          destinationCity: recipient.address.city!,
        });

      const plainBreakdown = instanceToPlain(breakdown);

      const packageData = await tx.package.create({
        data: {
          senderId: userId,
          items,
          originAddressId: originAddress.id,
          recipientId: recipient.id,
          ...packageDto,
          suggestedPrice,
          breakdown: plainBreakdown,
          finalPrice: suggestedPrice,
        },
        include: {
          originAddress: true,
          recipient: {
            include: {
              address: true,
            },
          },
        },
      });

      // Add create package notification
      await this.notificationService.create(
        userId,
        {
          packageId: packageData.id,
          content: getNotificationMessage(NotificationMessages.PackageCreated, {
            packageCode: packageData.code,
          }),
        },
        tx,
      );

      return packageData;
    });
  }

  async getById(id: string, tx: PrismaTransaction = this.prisma) {
    const packageData = await tx.package.findFirstOrThrow({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        originAddress: true,
        recipient: {
          include: {
            address: true,
          },
        },
        matchedRequest: {
          select: {
            trip: {
              select: {
                transporter: {
                  select: {
                    rate: true,
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        gender: true,
                        phoneNumber: true,
                      },
                    },
                  },
                },
                vehicle: {
                  select: {
                    vehicleType: true,
                    model: {
                      select: {
                        brand: true,
                      },
                    },
                    manufactureYear: true,
                    color: true,
                  },
                },
                departureTime: true,
                status: true,
                description: true,
              },
            },
            trackingCode: true,
            deliveryCode: true,
            transporterNotes: true,
            senderRating: true,
            senderComment: true,
            isCompleted: true,
            pickupTime: true,
            deliveryTime: true,
            paymentStatus: true,
          },
        },
      },
    });

    const keys = packageData.picturesKey;
    let picturesUrl: string[] | undefined;
    if (keys && Array.isArray(keys)) {
      picturesUrl = await this.generatePackagePicPresignedUrl(keys);
    }

    return {
      ...packageData,
      picturesUrl,
    };
  }

  async getAll(
    userId: string,
    status: PackageStatusEnum[] = [
      PackageStatusEnum.created,
      PackageStatusEnum.searching_transporter,
      PackageStatusEnum.matched,
      PackageStatusEnum.picked_up,
      PackageStatusEnum.in_transit,
    ],
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;
    const packages = await this.prisma.package.findMany({
      where: {
        senderId: userId,
        status: {
          in: status,
        },
        deletedAt: null,
      },
      include: {
        originAddress: true,
        recipient: {
          include: {
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return Promise.all(
      packages.map(async (packageData) => {
        const keys = packageData.picturesKey;
        if (keys && Array.isArray(keys)) {
          return {
            ...packageData,
            picturesUrl: await this.generatePackagePicPresignedUrl(keys),
            picturesKey: undefined,
          };
        }
      }),
    );
  }

  async update(id: string, packageDto: UpdatePackageDto) {
    return this.runner.run(async (tx) => {
      const { status, suggestedPrice } = await tx.package.findFirstOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          status: true,
          suggestedPrice: true,
        },
      });

      const isValidStatus =
        status === PackageStatusEnum.created ||
        status === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(
          `${BadRequestMessages.BasePackageStatus} ${status}.`,
        );
      }

      if (packageDto.finalPrice < suggestedPrice) {
        throw new BadRequestException(BadRequestMessages.InvalidPrice);
      }

      return tx.package.update({
        where: { id },
        data: packageDto,
      });
    });
  }

  async generatePackagePicPresignedUrl(keys: unknown[]) {
    return Promise.all(
      keys.map(async (key, index) => {
        const keyString = JSON.stringify(key).split('"')[1];
        try {
          if (keyString) {
            return this.storage.generateGetPresignedUrl(keyString);
          }
          return '';
        } catch (urlError) {
          this.logger.error(
            `Failed to generate presigned URL for picturesKey[${index}]:`,
            urlError,
          );
          return '';
        }
      }),
    );
  }

  private async updateStatus(
    id: string,
    status: PackageStatusEnum,
    tx: PrismaTransaction = this.prisma,
  ) {
    return tx.package.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        status,
      },
    });
  }

  async delete(id: string) {
    return this.runner.run(async (tx) => {
      const { status } = await tx.package.findFirstOrThrow({
        where: { id },
        select: { status: true },
      });

      const isValidStatus =
        status === PackageStatusEnum.created ||
        status === PackageStatusEnum.searching_transporter;
      if (!isValidStatus) {
        throw new BadRequestException(
          `${BadRequestMessages.BasePackageStatus} ${status}.`,
        );
      }

      return tx.package.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    });
  }

  async getMatchedTrips(
    packageId: string,
    session: SessionData,
    maxResults = 20,
  ) {
    return this.runner.run(async (tx) => {
      const packageData = await this.getById(packageId, tx);

      const idValidPackageStatus =
        packageData.status === PackageStatusEnum.created ||
        packageData.status === PackageStatusEnum.searching_transporter ||
        packageData.status === PackageStatusEnum.cancelled;
      if (!idValidPackageStatus) {
        throw new BadRequestException(BadRequestMessages.SendRequestPackage);
      }

      // Update package status
      await this.updateStatus(
        packageId,
        PackageStatusEnum.searching_transporter,
        tx,
      );

      // Do matching
      const matchedTrips = await this.matchingService.findMatchedTrips(
        packageData,
        session,
        maxResults,
        tx,
      );

      // Fetch trips
      const tripIds = matchedTrips
        .filter((m) => !m.isRequestSent)
        .slice(0, maxResults)
        .map((m) => m.tripId);
      const trips = await this.tripService.getMultipleById(tripIds, tx);
      const tripMap = new Map(trips.map((trip) => [trip.id, trip]));

      // Calculate deviation info
      const matchingResult = await Promise.all(
        matchedTrips.map(async (matchedTrip) => {
          const trip = tripMap.get(matchedTrip.tripId);
          if (!trip) return;

          const waypoints = trip.matchedRequests
            .flatMap((r) => [
              r.package.pickupAtOrigin
                ? {
                    latitude: r.package.originAddress.latitude,
                    longitude: r.package.originAddress.longitude,
                  }
                : undefined,
              r.package.deliveryAtDestination
                ? {
                    latitude: r.package.recipient.address.latitude,
                    longitude: r.package.recipient.address.longitude,
                  }
                : undefined,
            ])
            .filter((v) => v !== undefined);

          waypoints.push(
            ...[
              packageData.pickupAtOrigin
                ? {
                    latitude: packageData.originAddress.latitude,
                    longitude: packageData.originAddress.longitude,
                  }
                : undefined,
              packageData.deliveryAtDestination
                ? {
                    latitude: packageData.recipient.address.latitude,
                    longitude: packageData.recipient.address.longitude,
                  }
                : undefined,
            ].filter((v) => v !== undefined),
          );

          const sortedWaypoints = this.turfService.sortLocationsByRoute(
            trip.origin,
            trip.destination,
            waypoints,
          );

          const { distance, duration } =
            await this.mapService.calculateDistance({
              origin: {
                latitude: trip.origin.latitude,
                longitude: trip.origin.longitude,
              },
              destination: {
                latitude: trip.destination.latitude,
                longitude: trip.destination.longitude,
              },
              waypoints: sortedWaypoints,
            });

          const deviationDistance = Math.max(
            0,
            distance -
              ((trip.normalDistanceKm ?? 0) +
                (trip.totalDeviationDurationMin ?? 0)),
          );
          const deviationDuration = Math.max(
            0,
            duration -
              ((trip.normalDurationMin ?? 0) +
                (trip.totalDeviationDurationMin ?? 0)),
          );

          const additionalPrice = this.pricingService.calculateDeviationCost(
            deviationDistance,
            deviationDuration,
          );
          matchedTrip.deviationInfo = {
            distance: deviationDistance,
            duration: deviationDuration,
            additionalPrice,
          };

          return {
            ...trip,
            additionalPrice,
          };
        }),
      );

      return matchingResult.filter(Boolean);
    });
  }
}
