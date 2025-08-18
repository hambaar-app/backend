import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MapService } from '../map/map.service';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError, generateCode, generateUniqueCode } from 'src/common/utilities';
import { CreateTripDto } from './dto/create-trip.dto';
import { AuthMessages, BadRequestMessages } from 'src/common/enums/messages.enum';
import { PackageStatusEnum, Prisma, RequestStatusEnum, TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { PrismaTransaction } from '../prisma/prisma.types';

@Injectable()
export class TripService {
  constructor(
    private prisma: PrismaService,
    private mapService: MapService
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
        tripData.waypoints = {
          createMany: {
            data: waypoints
          }
        };
      }

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
        throw new BadRequestException(`${BadRequestMessages.BaseTripStatus} ${status}.`);
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
        throw new BadRequestException(`${BadRequestMessages.BaseTripStatus} ${status}.`);
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

  async getIntermediateCitiesWithCoords(
    {
      origin,
      destination
    }: CoordinatesQueryDto
  ) {
    const [originLat, originLng] = origin.split(',');
    const [destLat, destLng] = destination.split(',');
    return this.mapService.getIntermediateCities(
      {
        latitude: originLat,
        longitude: originLng,
      },
      {
        latitude: destLat,
        longitude: destLng,
      },
    );
  }

  async getIntermediateCitiesWithIds(
    originId: string,
    destinationId: string
  ) {
    const originCity = await this.prisma.city.findUniqueOrThrow({
      where: { id: originId }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const destinationCity = await this.prisma.city.findUniqueOrThrow({
      where: { id: destinationId }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    return this.mapService.getIntermediateCities(
      {
        latitude: originCity.latitude,
        longitude: originCity.longitude,
      },
      {
        latitude: destinationCity.latitude,
        longitude: destinationCity.longitude,
      },
    );
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
      const receiptCode = generateCode().toString();
      await tx.matchedRequest.create({
        data: {
          requestId: request.id,
          packageId: request.packageId,
          tripId: request.tripId,
          trackingCode,
          receiptCode,
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

      // Update package status
      await tx.package.update({
        where: { id: request.packageId },
        data: {
          status: PackageStatusEnum.matched
        }
      });

      return request;
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async getAllMatchedRequests(tripId: string) {
    return this.prisma.matchedRequest.findMany({
      where: {
        tripId
      },
      select: {
        package: {
          select: {
            sender: {
              select: {
                firstName: true,
                lastName: true,
                gender: true,
                phoneNumber: true,
              }
            },
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
            picturesKey: true, // TODO: HANDLE THIS
          }
        },
        transporterNotes: true,
        pickupTime: true,
        deliveryTime: true,
        paymentStatus: true,
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
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

    if (tripStatus !== TripStatusEnum.scheduled 
      && tripStatus !== TripStatusEnum.closed 
    ) {
      throw new BadRequestException(`${BadRequestMessages.BaseTripStatus} ${tripStatus}.`);
    }

    const updatedStatus = tripStatus === TripStatusEnum.scheduled ?
      TripStatusEnum.closed : TripStatusEnum.scheduled;

    return this.updateStatus(id, updatedStatus);
  }
}
