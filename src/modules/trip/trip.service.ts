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

      const tripData = {
        transporterId: vehicle.ownerId,
        vehicleId: vehicle.id,
        tripType,
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

  async getAll(
    userId: string,
    status: TripStatusEnum[] = [
      TripStatusEnum.scheduled,
      TripStatusEnum.active,
      TripStatusEnum.delayed
    ]
  ) {
    return this.prisma.trip.findMany({
      where: {
        transporter: {
          userId
        },
        tripStatus: {
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
      const { tripStatus } = await tx.trip.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null
        },
        select: {
          tripStatus: true
        }
      });
      
      if (tripStatus !== TripStatusEnum.scheduled) {
        throw new BadRequestException(`${BadRequestMessages.BaseTripStatus} ${tripStatus}.`);
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
      const { tripStatus } = await tx.trip.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null
        },
        select: {
          tripStatus: true
        }
      });
      
      if (tripStatus !== TripStatusEnum.scheduled) {
        throw new BadRequestException(`${BadRequestMessages.BaseTripStatus} ${tripStatus}.`);
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
    });;
  }

  async getIntermediateCities(
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
}
