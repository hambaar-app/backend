import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MapService } from '../map/map.service';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError, generateCode, generateUniqueCode } from '../../common/utilities';
import { CreateTripDto } from './dto/create-trip.dto';
import { AuthMessages, BadRequestMessages, NotificationMessages, TrackingMessages } from '../../common/enums/messages.enum';
import { MatchedRequest, Package, PackageStatusEnum, Prisma, RequestStatusEnum, TripStatusEnum, TripTypeEnum } from '../../../generated/prisma';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { PrismaTransaction } from '../prisma/prisma.types';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { PriceBreakdownDto } from '../package/dto/package-response.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { FinancialService } from '../financial/financial.service';
import { RateTripDto } from './dto/rate-trip.dto';
import { isNumber } from 'class-validator';
import { S3Service } from '../s3/s3.service';
import { TurfService } from '../turf/turf.service';
import { Location } from '../map/map.types';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TripService {
  constructor(
    private prisma: PrismaService,
    private mapService: MapService,
    private financialService: FinancialService,
    private s3Service: S3Service,
    private turfService: TurfService,
    private notificationService: NotificationService
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
    tripType: TripTypeEnum = TripTypeEnum.intercity
  ) {
    return this.prisma.$transaction(async tx => {
      const vehicle = await tx.vehicle.findFirst({
        where: {
          id: vehicleId,
          owner: {
            userId
          }
        }
      });

      if (!vehicle) {
        throw new ForbiddenException(`${AuthMessages.EntityAccessDenied} vehicle.`);
      }

      const originCity = await tx.city.findUniqueOrThrow({
        where: { id: originId }
      });

      const destinationCity = await tx.city.findUniqueOrThrow({
        where: { id: destinationId }
      });

      const { distance, duration } = await this.mapService.calculateDistance({
        origin: {
          latitude: originCity.latitude,
          longitude: originCity.longitude
        },
        destination: {
          latitude: destinationCity.latitude,
          longitude: destinationCity.longitude
        },
        waypoints
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
            data: waypoints
          }
        };
      }

      // Add create trip notification
      await this.notificationService.create(
        userId,
        NotificationMessages.TripCreated,
        tx
      );

      return tx.trip.create({
        data: tripData
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
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
            isVisible: true
          }
        },
        vehicle: {
          select: {
            vehicleType: true,
            model: {
              include: {
                brand: true
              }
            },
            manufactureYear: true,
            color: true
          },
        }
      },
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getMultipleById(
    ids: string[],
    tx: PrismaTransaction = this.prisma
  ) {
    return tx.trip.findMany({
      where: {
        id: {
          in: ids
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
                brand: true
              }
            }
          }
        },
        matchedRequests: {
          include: {
            package: {
              include: {
                originAddress: true,
                recipient: {
                  include: {
                    address: true
                  }
                }
              }
            }
          }
        }
      },
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAll(
    userId: string,
    status: TripStatusEnum[] = [
      TripStatusEnum.scheduled,
      TripStatusEnum.closed,
      TripStatusEnum.delayed,
      TripStatusEnum.in_progress,
    ]
  ) {
    return this.prisma.trip.findMany({
      where: {
        transporter: {
          userId
        },
        status: {
          in: status
        },
        deletedAt: null
      },
      include: {
        origin: true,
        destination: true,
        waypoints: {
          where: {
            isVisible: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async update(
    id: string,
    {
      waypoints,
      ...tripDto
    }: UpdateTripDto
  ) {
    return this.prisma.$transaction(async tx => {
      const { status } = await tx.trip.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null
        },
        select: {
          status: true
        }
      });
      
      if (status !== TripStatusEnum.scheduled) {
        throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${status}*.`);
      }

      const tripData = tripDto as Prisma.TripUpdateInput;

      if (waypoints) {
        tripData.waypoints = {
          createMany: {
            data: waypoints
          }
        };

        await tx.tripWaypoint.deleteMany({
          where: {
            tripId: id,
            isVisible: true
          },
        });
      }

      return tx.trip.update({
        where: { id },
        data: tripData
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });;
  }

  async delete(id: string) {
    return this.prisma.$transaction(async tx => {
      const { status } = await tx.trip.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null
        },
        select: {
          status: true
        }
      });
      
      if (status !== TripStatusEnum.scheduled) {
        throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${status}*.`);
      }

      return tx.trip.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAllTripRequests(tripId: string) {
    return this.prisma.tripRequest.findMany({
      where: {
        tripId,
        status: RequestStatusEnum.pending
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  async updateRequest(
    requestId: string,
    {
      status,
      transporterNotes
    }: UpdateRequestDto
  ) {
    if (status === RequestStatusEnum.rejected) {
      return this.prisma.tripRequest.update({
        where: { id: requestId },
        data: { status }
      }).catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });
    }

    return this.prisma.$transaction(async tx => {
      const request = await tx.tripRequest.update({
        where: { id: requestId },
        data: { status }
      });

      // Delete other sent requests for this package
      await tx.tripRequest.updateMany({
        where: {
          packageId: request.packageId,
          NOT: {
            id: request.id
          }
        },
        data: {
          status: RequestStatusEnum.deleted
        }
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
          transporterNotes, // TODO: Improve it
        }
      });

      // Update total deviation info in trip
      const {
        totalDeviationDistanceKm,
        totalDeviationDurationMin
      } = await tx.trip.findUniqueOrThrow({
        where: { id: request.tripId }
      });

      const newTotalDeviationDistance = (totalDeviationDistanceKm ?? 0) + request.deviationDistanceKm;
      const newTotalDeviationDuration = (totalDeviationDurationMin ?? 0) + request.deviationDurationMin;

      await tx.trip.update({
        where: { id: request.tripId },
        data: {
          totalDeviationDistanceKm: newTotalDeviationDistance,
          totalDeviationDurationMin: newTotalDeviationDuration
        }
      });

      // Get package and Update its status and breakdown
      const packageData = await tx.package.findFirst({
        where: { id: request.packageId },
        select: {
          breakdown: true
        }
      });

      // Update breakdown
      const breakdown = plainToInstance(PriceBreakdownDto, packageData?.breakdown);
      if (breakdown) {
        breakdown.deviationCost = request.deviationCost ?? 0;
      }
      const plainBreakdown = instanceToPlain(breakdown);

      await tx.package.update({
        where: { id: request.packageId },
        data: {
          status: PackageStatusEnum.matched,
          finalPrice: {
            increment: request.deviationCost
          },
          breakdown: plainBreakdown
        }
      });

      // Create escrow if balance is enough
      try {
        await this.financialService.createEscrow({
          packageId: request.packageId,
          tripId: request.tripId
        });
      } catch(error) {}

      return request;
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAllMatchedRequests(
    tripId: string,
    inOrder = false
  ) {
    const matchedRequests = await this.prisma.matchedRequest.findMany({
      where: {
        tripId
      },
      select: {
        package: {
          select: {
            id: true,
            sender: {
              select: {
                firstName: true,
                lastName: true,
                gender: true,
                phoneNumber: true,
              }
            },
            status: true,
            items: true,
            originAddress: true,
            recipient: true,
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
            picturesKey: true
          }
        },
        request: true,
        transporterNotes: true,
        pickupTime: true,
        deliveryTime: true,
        paymentStatus: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    let sortedMatchedRequests = matchedRequests.map(m => ({
      ...m,
      package: {
        ...m.package,
        items: instanceToPlain(m.package.items) as string[]
      }
    }));
    if (matchedRequests.length > 0 && inOrder) {
      const trip = await this.prisma.trip.findFirstOrThrow({
        where: { id: tripId },
        select: {
          origin: true,
          destination: true
        }
      });
      sortedMatchedRequests = await this.sortMatchedPackages(trip.origin, trip.destination, sortedMatchedRequests);
    }

    return Promise.all(sortedMatchedRequests.map((async m => {
      const picturesKey = instanceToPlain(m.package.picturesKey) as string[];
      const picturePromises = picturesKey?.map(k => this.s3Service.generateGetPresignedUrl(k));
      const picturesUrl = await Promise.all(picturePromises);
      return {
        ...m,
        package: {
          ...m.package,
          picturesUrl,
          offeredPrice: m.request.offeredPrice,
          picturesKey: undefined
        },
        request: undefined
      };
    })));
  }

  private async sortMatchedPackages(
    origin: Location,
    destination: Location,
    matchedRequests: any[]
  ) {
    const locationsMap = new Map(
      matchedRequests
        .map(m => [
          m.package.id,
          m.package.pickupAtOrigin
          && m.package.status !== PackageStatusEnum.delivered
          && m.package.status !== PackageStatusEnum.returned
          && m.package.status !== PackageStatusEnum.cancelled ? {
            latitude: m.package.originAddress.latitude,
            longitude: m.package.originAddress.longitude
          } : m.package.deliveryAtDestination
          && m.package.status === PackageStatusEnum.matched ? {
            latitude: m.package.recipient.address.latitude,
            longitude: m.package.recipient.address.longitude
          } : undefined
        ])
        .filter(([_, location]) => location !== undefined) as [string, Location][]
    );

    const sortedLocations = this.turfService.sortLocationsByRoute(origin, destination, locationsMap);
    const sortedPackageIds = Array.from(sortedLocations.keys());
    
    // Create the sorted array
    const sortedRequests: any[] = [];
    sortedPackageIds.forEach(packageId => {
      const request = matchedRequests.find(m => m.package.id === packageId);
      if (request) {
        sortedRequests.push(request);
      }
    });

    return sortedRequests;
  }

  private async updateStatus(
    id: string,
    status: TripStatusEnum,
    tx: PrismaTransaction = this.prisma
  ) {
    return tx.trip.update({
      where: { id },
      data: { status }
    });
  }

  async toggleTripAccess(id: string) {
    const { status: tripStatus } = await this.prisma.trip.findUniqueOrThrow({
      where: { id },
      select: {
        status: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const isValidStatus = tripStatus === TripStatusEnum.scheduled 
      || tripStatus === TripStatusEnum.closed;
    if (!isValidStatus) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${tripStatus}*.`);
    }

    const updatedStatus = tripStatus === TripStatusEnum.scheduled ?
      TripStatusEnum.closed : TripStatusEnum.scheduled;

    return this.updateStatus(id, updatedStatus);
  }

  async startTrip(id: string) {
    const {
      status: tripStatus,
      origin
    } = await this.prisma.trip.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        origin: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const isValidStatus = tripStatus === TripStatusEnum.scheduled
      || tripStatus === TripStatusEnum.closed
      || tripStatus === TripStatusEnum.delayed;
    if (!isValidStatus) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${tripStatus}*.`);
    }
    
    return this.prisma.$transaction(async tx => {
      await this.updateTracking(id, {
        city: origin.name,
        description: TrackingMessages.TripStarted
      });

      return this.updateStatus(id, TripStatusEnum.in_progress, tx);
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async pickupPackage(
    tripId: string,
    packageId: string
  ) {
    const {
      id: matchedRequestId,
      package: packageData,
      trip
    } = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        tripId,
        packageId
      },
      select: {
        id: true,
        package: {
          select: {
            status: true,
            originAddress: true
          }
        },
        trip: {
          select: {
            status: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (packageData.status !== PackageStatusEnum.matched) {
      throw new BadRequestException(`${BadRequestMessages.BasePackageStatus}*${packageData.status}*.`);
    }

    if (trip.status !== TripStatusEnum.in_progress) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${packageData.status}*.`);
    }

    return this.prisma.$transaction(async tx => {
      // Update package status
      const {
        status: packageStatus
      } = await this.updatePackageStatus(packageId, PackageStatusEnum.in_transit);

      // Set pickupTime
      const { pickupTime } = await tx.matchedRequest.update({
        where: {
          tripId,
          packageId
        },
        data: {
          pickupTime: new Date()
        }
      });

      // Update tracking
      await tx.trackingUpdate.create({
        data: {
          matchedRequestId,
          latitude: packageData.originAddress.latitude,
          longitude: packageData.originAddress.longitude,
          city: packageData.originAddress.city,
          description: TrackingMessages.PackagePickedUp
        }
      });

      return {
        packageStatus,
        pickupTime
      };
    });
  }

  async deliveryPackage(
    tripId: string,
    packageId: string,
    code: string
  ) {
    const {
      id: matchedRequestId,
      package: packageData,
      trip,
      deliveryCode
    } = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        tripId,
        packageId
      },
      select: {
        id: true,
        package: {
          select: {
            status: true,
            recipient: {
              include: {
                address: true
              }
            }
          }
        },
        trip: {
          select: {
            status: true
          }
        },
        deliveryCode: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (packageData.status !== PackageStatusEnum.in_transit) {
      throw new BadRequestException(`${BadRequestMessages.BasePackageStatus}*${packageData.status}*.`);
    }

    if (trip.status !== TripStatusEnum.in_progress) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${trip.status}*.`);
    }

    if (code !== deliveryCode) {
      throw new BadRequestException(BadRequestMessages.WrongDeliveryCode);
    }

    return this.prisma.$transaction(async tx => {
      // Update package status
      const {
        status: packageStatus
      } = await this.updatePackageStatus(packageId, PackageStatusEnum.delivered);

      // Set deliveryTime
      const { deliveryTime } = await tx.matchedRequest.update({
        where: {
          tripId,
          packageId
        },
        data: {
          deliveryTime: new Date()
        }
      });

      // Update tracking
      await tx.trackingUpdate.create({
        data: {
          matchedRequestId,
          latitude: packageData.recipient.address.latitude,
          longitude: packageData.recipient.address.longitude,
          city: packageData.recipient.address.city,
          description: TrackingMessages.PackageDelivered
        }
      });

      // Release escrow
      await this.financialService.releaseEscrow(packageId, tripId, tx);

      // TODO: Send SMS

      return {
        packageStatus,
        deliveryTime
      };
    });
  }

  async finishTrip(id: string) {
    const {
      status: tripStatus,
      matchedRequests
    } = await this.prisma.trip.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        matchedRequests: {
          select: {
            deliveryTime: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (tripStatus !== TripStatusEnum.in_progress) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${tripStatus}*.`);
    }

    const allRequestsDelivered = matchedRequests.every(m => m.deliveryTime !== null);
    if (!allRequestsDelivered) {
      throw new BadRequestException(BadRequestMessages.CannotFinishTrip);
    }

    return this.updateStatus(id, TripStatusEnum.completed);
  }

  async addTripNote(
    tripId: string,
    note: string,
    packageId?: string,
    tx: PrismaTransaction = this.prisma
  ) {
    const trip = await tx.trip.findUniqueOrThrow({
      where: {
        id: tripId
      },
      include: {
        matchedRequests: {
          where: {
            packageId
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (trip.status === TripStatusEnum.completed) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${trip.status}*.`);
    }

    // If packageId included, the note will send for all matched requests within a trip.
    const updatedMatchedRequestsPromises = trip.matchedRequests.map(m => {
      // Push note
      const oldNotes = plainToInstance(Array<String>, m.transporterNotes) ?? [];
      oldNotes.push(note);
      const plainNewNotes = instanceToPlain(oldNotes);

      return tx.matchedRequest.update({
        where: {
          tripId,
          packageId: m.packageId
        },
        data: {
          transporterNotes: plainNewNotes
        }
      });
    });

    // Run queries parallel and Get 'resolved' promises's length
    const results = await Promise.allSettled(updatedMatchedRequestsPromises);
    const count = results
      .filter((result): result is PromiseFulfilledResult<MatchedRequest> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .length;

    return {
      count
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
        matchedRequests: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const trackingUpdates = trip.matchedRequests.map(m => ({
      matchedRequestId: m.id,
      ...trackingDto
    }));
    return tx.trackingUpdate.createMany({
      data: trackingUpdates
    });
  }

  async getTripTracking(
    tripId: string,
    packageId: string,
  ) {
    return this.prisma.trackingUpdate.findMany({
      where: {
        matchedRequest: {
          tripId,
          packageId
        },
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async rateTrip(
    userId: string,
    {
      tripId,
      packageId,
      rate,
      comment
    }: RateTripDto
  ) {
    const {
      senderRating,
      package: { senderId, status },
      trip: { transporterId, transporter: { rate: tRate, rateCount } }
    } = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        tripId,
        packageId
      },
      select: {
        senderRating: true,
        package: {
          select: {
            senderId: true,
            status: true
          }
        },
        trip: {
          select: {
            transporterId: true,
            transporter: {
              select: {
                rate: true,
                rateCount: true,
              }
            }
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (senderId !== userId) {
      throw new ForbiddenException(`${AuthMessages.EntityAccessDenied} package.`);
    }

    if (isNumber(senderRating)) {
      throw new BadRequestException(BadRequestMessages.AlreadyRatedTrip);
    }

    const isValidStatus = status === PackageStatusEnum.delivered
      || status === PackageStatusEnum.returned;
    if (!isValidStatus) {
      throw new BadRequestException(`${BadRequestMessages.BasePackageStatus}*${status}*.`);
    }

    return this.prisma.$transaction(async tx => {
      // Update transporter rate
      const newRateCount = rateCount + 1;
      const newRate = ((tRate * rateCount) + rate) / newRateCount;

      await tx.transporter.update({
        where: {
          id: transporterId
        },
        data: {
          rate: newRate,
          rateCount: newRateCount
        }
      });

      return tx.matchedRequest.update({
        where: {
          tripId,
          packageId
        },
        data: {
          senderRating: rate,
          senderComment: comment
        }
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  private async updatePackageStatus(
    id: string,
    status: PackageStatusEnum,
    tx: PrismaTransaction = this.prisma
  ) {
    return tx.package.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        status
      },
    });
  }
}
