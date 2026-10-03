import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MapService } from '../../map/map.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { CreateTripDto } from '../dto/create-trip.dto';
import {
  AuthMessages,
  BadRequestMessages,
  TrackingMessages,
} from '../../../common/enums/messages.enum';
import {
  PackageStatusEnum,
  Prisma,
  TripStatusEnum,
  TripTypeEnum,
} from '../../../../generated/prisma';
import { UpdateTripDto } from '../dto/update-trip.dto';
import { PrismaTransaction } from '../../prisma/prisma.types';
import { FinancialService } from '../../financial/financial.service';
import { NotificationService } from '../../notification/notification.service';
import { CityRepository } from '../../prisma/repositories/city.repository';
import {
  getNotificationMessage,
  NotificationMessages,
} from '../../notification/notification-messages';
import { TripTrackingService } from '../domain/trip-tracking.service';

/**
 * Trip lifecycle + CRUD orchestration (Phase 4 Task 4).
 *
 * Slimmed from the 35 KB god service: request handling lives in
 * `TripRequestService`, notes/tracking/rating/directions in
 * `TripTrackingService`. All multi-statement writes run through
 * `TransactionRunner` (no manual `.catch` — the global filter maps Prisma
 * errors). Fixes vs the original: `update`/`delete` now write through `tx`
 * (they used the root client inside the transaction), and `startTrip` /
 * `pickupPackage` / `deliveryPackage` now pass `tx` into the tracking and
 * package-status helpers (they silently ran outside the transaction).
 */
@Injectable()
export class TripService {
  constructor(
    private prisma: PrismaService,
    private mapService: MapService,
    private financialService: FinancialService,
    private notificationService: NotificationService,
    private runner: TransactionRunner,
    private trackingService: TripTrackingService,
    private cities: CityRepository,
  ) {}

  async create(
    userId: string,
    {
      vehicleId,
      waypoints,
      originId,
      destinationId,
      ...tripDto
    }: CreateTripDto,
    tripType: TripTypeEnum = TripTypeEnum.intercity,
  ) {
    return this.runner.run(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({
        where: {
          id: vehicleId,
          owner: {
            userId,
          },
        },
      });

      if (!vehicle) {
        throw new ForbiddenException(
          `${AuthMessages.EntityAccessDenied} vehicle.`,
        );
      }

      const originCity = await this.cities.findCityOrThrow(originId, tx);

      const destinationCity = await this.cities.findCityOrThrow(
        destinationId,
        tx,
      );

      const { distance, duration } = await this.mapService.calculateDistance({
        origin: {
          latitude: originCity.latitude,
          longitude: originCity.longitude,
        },
        destination: {
          latitude: destinationCity.latitude,
          longitude: destinationCity.longitude,
        },
        waypoints,
      });

      const tripData = {
        transporterId: vehicle.ownerId,
        originId,
        destinationId,
        vehicleId: vehicle.id,
        tripType,
        normalDistanceKm: distance,
        normalDurationMin: duration,
        ...tripDto,
      } as Prisma.TripUncheckedCreateInput;

      if (waypoints) {
        // TODO: Sort waypoints?
        tripData.waypoints = {
          createMany: {
            data: waypoints,
          },
        };
      }

      const trip = await tx.trip.create({
        data: tripData,
      });

      // Add create trip notification
      await this.notificationService.create(
        userId,
        {
          tripId: trip.id,
          content: getNotificationMessage(NotificationMessages.TripCreated, {
            tripCode: trip.code,
          }),
        },
        tx,
      );

      return trip;
    });
  }

  async getById(id: string) {
    return this.prisma.trip.findUniqueOrThrow({
      where: { id },
      include: {
        origin: true,
        destination: true,
        waypoints: {
          where: {
            isVisible: true,
          },
        },
        vehicle: {
          select: {
            vehicleType: true,
            model: {
              include: {
                brand: true,
              },
            },
            manufactureYear: true,
            color: true,
          },
        },
      },
    });
  }

  async getMultipleById(ids: string[], tx: PrismaTransaction = this.prisma) {
    return tx.trip.findMany({
      where: {
        id: {
          in: ids,
        },
        status: TripStatusEnum.scheduled,
      },
      include: {
        origin: true,
        destination: true,
        waypoints: true,
        vehicle: {
          include: {
            model: {
              include: {
                brand: true,
              },
            },
          },
        },
        matchedRequests: {
          include: {
            package: {
              include: {
                originAddress: true,
                recipient: {
                  include: {
                    address: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getAll(
    userId: string,
    status: TripStatusEnum[] = [
      TripStatusEnum.scheduled,
      TripStatusEnum.closed,
      TripStatusEnum.delayed,
      TripStatusEnum.in_progress,
    ],
  ) {
    return this.prisma.trip.findMany({
      where: {
        transporter: {
          userId,
        },
        status: {
          in: status,
        },
        deletedAt: null,
      },
      include: {
        origin: true,
        destination: true,
        waypoints: {
          where: {
            isVisible: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, { waypoints, ...tripDto }: UpdateTripDto) {
    return this.runner.run(async (tx) => {
      const { status } = await tx.trip.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          status: true,
        },
      });

      if (status !== TripStatusEnum.scheduled) {
        throw new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${status}*.`,
        );
      }

      const tripData = tripDto as Prisma.TripUpdateInput;

      if (waypoints) {
        tripData.waypoints = {
          createMany: {
            data: waypoints,
          },
        };

        await tx.tripWaypoint.deleteMany({
          where: {
            tripId: id,
            isVisible: true,
          },
        });
      }

      return tx.trip.update({
        where: { id },
        data: tripData,
      });
    });
  }

  async delete(id: string) {
    return this.runner.run(async (tx) => {
      const { status } = await tx.trip.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          status: true,
        },
      });

      if (status !== TripStatusEnum.scheduled) {
        throw new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${status}*.`,
        );
      }

      return tx.trip.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    });
  }

  async toggleTripAccess(id: string) {
    const { status: tripStatus } = await this.prisma.trip.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
      },
    });

    const isValidStatus =
      tripStatus === TripStatusEnum.scheduled ||
      tripStatus === TripStatusEnum.closed;
    if (!isValidStatus) {
      throw new BadRequestException(
        `${BadRequestMessages.BaseTripStatus}*${tripStatus}*.`,
      );
    }

    const updatedStatus =
      tripStatus === TripStatusEnum.scheduled
        ? TripStatusEnum.closed
        : TripStatusEnum.scheduled;

    return this.updateStatus(id, updatedStatus);
  }

  async startTrip(id: string) {
    const { status: tripStatus, origin } =
      await this.prisma.trip.findUniqueOrThrow({
        where: { id },
        select: {
          status: true,
          origin: true,
        },
      });

    const isValidStatus =
      tripStatus === TripStatusEnum.scheduled ||
      tripStatus === TripStatusEnum.closed ||
      tripStatus === TripStatusEnum.delayed;
    if (!isValidStatus) {
      throw new BadRequestException(
        `${BadRequestMessages.BaseTripStatus}*${tripStatus}*.`,
      );
    }

    return this.runner.run(async (tx) => {
      await this.trackingService.updateTracking(
        id,
        {
          city: origin.name,
          description: TrackingMessages.TripStarted,
        },
        tx,
      );

      return this.updateStatus(id, TripStatusEnum.in_progress, tx);
    });
  }

  async pickupPackage(tripId: string, packageId: string) {
    const {
      id: matchedRequestId,
      package: packageData,
      trip,
    } = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        tripId,
        packageId,
      },
      select: {
        id: true,
        package: {
          select: {
            code: true,
            senderId: true,
            status: true,
            originAddress: true,
          },
        },
        trip: {
          select: {
            status: true,
          },
        },
      },
    });

    if (packageData.status !== PackageStatusEnum.matched) {
      throw new BadRequestException(
        `${BadRequestMessages.BasePackageStatus}*${packageData.status}*.`,
      );
    }

    if (trip.status !== TripStatusEnum.in_progress) {
      throw new BadRequestException(
        `${BadRequestMessages.BaseTripStatus}*${packageData.status}*.`,
      );
    }

    return this.runner.run(async (tx) => {
      // Update package status
      const { status: packageStatus } = await this.updatePackageStatus(
        packageId,
        PackageStatusEnum.in_transit,
        tx,
      );

      // Set pickupTime
      const { pickupTime } = await tx.matchedRequest.update({
        where: {
          tripId,
          packageId,
        },
        data: {
          pickupTime: new Date(),
        },
      });

      // Update tracking
      await tx.trackingUpdate.create({
        data: {
          matchedRequestId,
          latitude: packageData.originAddress.latitude,
          longitude: packageData.originAddress.longitude,
          city: packageData.originAddress.city,
          description: TrackingMessages.PackagePickedUp,
        },
      });

      // Add pickup package notification
      await this.notificationService.create(
        packageData.senderId,
        {
          packageId,
          tripId,
          content: getNotificationMessage(
            NotificationMessages.PackagePickedUp,
            { packageCode: packageData.code },
          ),
        },
        tx,
      );

      return {
        packageStatus,
        pickupTime,
      };
    });
  }

  async deliveryPackage(tripId: string, packageId: string, code: string) {
    const {
      id: matchedRequestId,
      package: packageData,
      trip,
      deliveryCode,
    } = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        tripId,
        packageId,
      },
      select: {
        id: true,
        package: {
          select: {
            code: true,
            senderId: true,
            status: true,
            recipient: {
              include: {
                address: true,
              },
            },
          },
        },
        trip: {
          select: {
            status: true,
          },
        },
        deliveryCode: true,
      },
    });

    if (packageData.status !== PackageStatusEnum.in_transit) {
      throw new BadRequestException(
        `${BadRequestMessages.BasePackageStatus}*${packageData.status}*.`,
      );
    }

    if (trip.status !== TripStatusEnum.in_progress) {
      throw new BadRequestException(
        `${BadRequestMessages.BaseTripStatus}*${trip.status}*.`,
      );
    }

    if (code !== deliveryCode) {
      throw new BadRequestException(BadRequestMessages.WrongDeliveryCode);
    }

    return this.runner.run(async (tx) => {
      // Update package status
      const { status: packageStatus } = await this.updatePackageStatus(
        packageId,
        PackageStatusEnum.delivered,
        tx,
      );

      // Set deliveryTime
      const { deliveryTime } = await tx.matchedRequest.update({
        where: {
          tripId,
          packageId,
        },
        data: {
          deliveryTime: new Date(),
        },
      });

      // Update tracking
      await tx.trackingUpdate.create({
        data: {
          matchedRequestId,
          latitude: packageData.recipient.address.latitude,
          longitude: packageData.recipient.address.longitude,
          city: packageData.recipient.address.city,
          description: TrackingMessages.PackageDelivered,
        },
      });

      // Release escrow (fatal: aborts the transaction on failure)
      await this.financialService.releaseEscrow(packageId, tripId, tx);

      // TODO: Send SMS

      // Add delivery package notification
      await this.notificationService.create(
        packageData.senderId,
        {
          packageId,
          tripId,
          content: getNotificationMessage(
            NotificationMessages.PackageDelivered,
            { packageCode: packageData.code },
          ),
        },
        tx,
      );

      return {
        packageStatus,
        deliveryTime,
      };
    });
  }

  async finishTrip(id: string) {
    const {
      status: tripStatus,
      matchedRequests,
      transporter,
    } = await this.prisma.trip.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        matchedRequests: {
          select: {
            deliveryTime: true,
          },
        },
        transporter: {
          select: {
            id: true,
            firstTripDate: true,
          },
        },
      },
    });

    if (tripStatus !== TripStatusEnum.in_progress) {
      throw new BadRequestException(
        `${BadRequestMessages.BaseTripStatus}*${tripStatus}*.`,
      );
    }

    const allRequestsDelivered = matchedRequests.every(
      (m) => m.deliveryTime !== null,
    );
    if (!allRequestsDelivered) {
      throw new BadRequestException(BadRequestMessages.CannotFinishTrip);
    }

    // Update firstTripDate/lastTripDate
    const updateTransporter: Prisma.TransporterUpdateInput = {};
    if (!transporter.firstTripDate) {
      updateTransporter.firstTripDate = new Date();
    } else {
      updateTransporter.lastTripDate = new Date();
    }

    return this.runner.run(async (tx) => {
      // Update transporter
      await tx.transporter.update({
        where: { id: transporter.id },
        data: updateTransporter,
      });

      return this.updateStatus(id, TripStatusEnum.completed, tx);
    });
  }

  private async updateStatus(
    id: string,
    status: TripStatusEnum,
    tx: PrismaTransaction = this.prisma,
  ) {
    return tx.trip.update({
      where: { id },
      data: { status },
    });
  }

  private async updatePackageStatus(
    id: string,
    status: PackageStatusEnum,
    tx: PrismaTransaction,
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
}
