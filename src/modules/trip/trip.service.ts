import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MapService } from '../map/map.service';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError } from 'src/common/utilities';
import { CreateTripDto } from './dto/create-trip.dto';
import { AuthMessages, BadRequestMessages, NotFoundMessages } from 'src/common/enums/messages.enum';
import { PackageStatusEnum, Prisma, RequestStatusEnum, TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { SessionData } from 'express-session';
import { UpdateRequestDto } from './dto/update-request.dto';

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
        waypoints: true,
        vehicle: true
      },
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  // TODO: Complete this
  async getMultipleById(ids: string[]) {
    return this.prisma.trip.findMany({
      where: {
        id: {
          in: ids
        },
        status: {
          in: [
            TripStatusEnum.scheduled,
            TripStatusEnum.delayed,
        ],
        },
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
        requests: {
          where: {
            status: RequestStatusEnum.accepted
          },
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
      TripStatusEnum.delayed
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
        waypoints: true
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
          where: { tripId: id },
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

  async createRequest(
    userId: string,
    {
      packageId,
      tripId,
      senderNote
    }: CreateRequestDto,
    session: SessionData
  ) {
    return this.prisma.$transaction(async tx => {
      const packageData = await tx.package.findUniqueOrThrow({
        where: { id: packageId },
        include: {
          originAddress: true,
          recipient: {
            include: {
              address: true
            }
          }
        }
      });

      if (userId !== packageData.senderId) {
        throw new ForbiddenException(`${AuthMessages.EntityAccessDenied} package.`);
      }

      if (packageData.status !== PackageStatusEnum.searching_transporter) {
        throw new BadRequestException(BadRequestMessages.SendRequestPackage);
      }

      const tripData = await tx.trip.findUniqueOrThrow({
        where: { id: tripId },
        include: {
          origin: true,
          destination: true,
          waypoints: true
        }
      });

      const isValidTripStatus = tripData.status === TripStatusEnum.scheduled
        || tripData.status === TripStatusEnum.delayed
      if (!isValidTripStatus) {
        throw new BadRequestException(BadRequestMessages.SendRequestTrip);
      }

      const matchedTrips = session.packages.find(p => p.id === packageId)?.matchResults;
      if (!matchedTrips || !matchedTrips.length) {
        throw new NotFoundException(NotFoundMessages.MatchedTrip);
      }

      const matchedTrip = matchedTrips.find(t => t.tripId === tripId);
      if (!matchedTrip) {
        throw new BadRequestException(BadRequestMessages.SendRequestTrip);
      }

      // TODO: Calculate deviation cost and use it for request.

      return tx.tripRequest.create({
        data: {
          packageId,
          tripId,
          senderNote
        }
      });
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
      status
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

      await tx.tripRequest.updateMany({
        where: {
          packageId: request.packageId
        },
        data: {
          status: RequestStatusEnum.deleted
        }
      });

      return request;
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}
