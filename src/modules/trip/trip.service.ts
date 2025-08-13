import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MapService } from '../map/map.service';
import { CoordinatesQueryDto } from './dto/coordinates-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError } from 'src/common/utilities';
import { CreateTripDto } from './dto/create-trip.dto';
import { AuthMessages, BadRequestMessages } from 'src/common/enums/messages.enum';
import { Prisma, TripStatusEnum, TripTypeEnum } from 'generated/prisma';
import { UpdateTripDto } from './dto/update-trip.dto';

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

      const { distance } = await this.mapService.calculateDistance({
        origins: [{
          latitude: originCity.latitude,
          longitude: originCity.longitude
        }],
        destinations: [{
          latitude: destinationCity.latitude,
          longitude: destinationCity.longitude
        }],
        waypoints
      });

      const tripData = {
        transporterId: vehicle.ownerId,
        originId,
        destinationId,
        vehicleId: vehicle.id,
        tripType,
        normalDistanceKm: distance,
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
        waypoints: {
          every: {
            isVisible: true
          }
        }
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
}
