import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { maskPhoneNumber } from '../../../common/utils/phone';

/**
 * Public package tracking (Phase 4 Task 5).
 *
 * Owns `getTrackingByCode`. S-8 fix: the sender phone number is masked
 * (`+98•••••123`) instead of exposed in clear — this endpoint is public
 * (no auth guard). The transporter phone is left as-is (residual PII,
 * follow-up).
 */
@Injectable()
export class TrackingService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async getTrackingByCode(trackingCode: string) {
    const matchedRequest = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        trackingCode,
        deletedAt: null,
      },
      include: {
        trackingUpdates: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        package: {
          select: {
            code: true,
            sender: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            recipient: {
              include: {
                address: true,
              },
            },
            items: true,
            weight: true,
            dimensions: true,
            finalPrice: true,
            breakdown: true,
            status: true,
            packageValue: true,
            deliveryAtDestination: true,
          },
        },
        trip: {
          select: {
            transporter: {
              select: {
                profilePictureKey: true,
                rate: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
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
          },
        },
      },
    });

    return {
      trackingUpdates: matchedRequest.trackingUpdates,
      package: {
        ...matchedRequest.package,
        sender: {
          ...matchedRequest.package.sender,
          phoneNumber: maskPhoneNumber(
            matchedRequest.package.sender.phoneNumber ?? '',
          ),
        },
      },
      transporter: {
        profilePictureUrl: await this.s3Service.generateGetPresignedUrl(
          matchedRequest.trip.transporter.profilePictureKey,
        ),
        ...matchedRequest.trip.transporter,
        ...matchedRequest.trip.transporter.user,
        vehicle: matchedRequest.trip.vehicle,
      },
    };
  }
}
