import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Package, Prisma, TripStatusEnum } from 'generated/prisma';

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService
  ) {}

  private async getPreFilteredTrips(packageData: Package) {
    const whereClause: Prisma.TripWhereInput = {
      isActive: true,
      tripStatus: {
        in: [
          TripStatusEnum.scheduled,
          TripStatusEnum.delayed,
          TripStatusEnum.active
        ],
      },
    };

    // Filter by weight capacity
    if (packageData.weight) {
      whereClause.OR = [
        { maxPackageWeightGr: { gte: packageData.weight } },
        { maxPackageWeightGr: null },
      ];
    }

    // TODO: Filter by departure time

    return this.prisma.trip.findMany({
      where: whereClause,
      include: {
        origin: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
          },
        },
        destination: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
          },
        },
        waypoints: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
          },
        },
        vehicle: {
          select: {
            vehicleType: true,
          },
          include: {
            model: {
              include: {
                brand: true
              }
            }
          }
        }
        // TODO: Includes transporter?
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
