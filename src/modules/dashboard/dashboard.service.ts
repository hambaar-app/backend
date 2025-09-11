import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError, getDateDifference } from '../../common/utilities';
import {
  PackageStatusEnum,
  PaymentStatusEnum,
  RequestStatusEnum,
  RolesEnum,
  TransactionTypeEnum,
  TripStatusEnum,
} from '../../../generated/prisma';
import { S3Service } from '../s3/s3.service';
import { SenderStatistics, TransporterStatistics } from './dashboard.types';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async getDashboard(userId: string) {
    const {
      transporter,
      wallet,
      role,
      ...user
    } = await this.prisma.user
      .findFirstOrThrow({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          wallet: {
            select: {
              balance: true,
              escrowedAmount: true,
            },
          },
          transporter: {
            select: {
              profilePictureKey: true,
              rate: true,
              bio: true,
              firstTripDate: true,
              lastTripDate: true,
            },
          },
          role: true,
          _count: {
            select: {
              notifications: {
                where: {
                  unread: true
                }
              }
            }
          }
        },
      }).catch((error: Error) => {
        formatPrismaError(error);
        throw error;
      });

    const totalWalletBalance =
      (wallet?.balance ?? BigInt(0)) + BigInt(wallet?.escrowedAmount ?? 0);

    let experience: string | undefined;
    if (
      role === RolesEnum.transporter &&
      transporter?.firstTripDate &&
      transporter?.lastTripDate &&
      transporter.lastTripDate > transporter.firstTripDate
    ) {
      experience = getDateDifference(
        transporter.firstTripDate,
        transporter.lastTripDate,
      );
    }

    let statistics: TransporterStatistics | SenderStatistics | undefined;
    if (role === RolesEnum.transporter) {
      statistics = await this.getTransporterStatistics(userId);
    }
    if (role === RolesEnum.sender) {
      statistics = await this.getSenderStatistics(userId);
    }

    return {
      fullName: `${user.firstName} ${user.lastName}`,
      totalBalance: totalWalletBalance,
      role,
      profilePictureUrl: await this.s3Service.generateGetPresignedUrl(
        transporter?.profilePictureKey,
      ),
      rate: transporter?.rate,
      experience,
      bio: transporter?.bio,
      statistics,
      notificationCount: user._count.notifications
    };
  }

  private async getTransporterStatistics(
    userId: string,
  ): Promise<TransporterStatistics> {
    const completedTrips = await this.prisma.trip.count({
      where: {
        transporter: {
          userId,
        },
      },
    });

    const pendingRequests = await this.prisma.tripRequest.count({
      where: {
        trip: {
          transporter: {
            userId,
          },
          status: {
            in: [TripStatusEnum.scheduled, TripStatusEnum.delayed],
          },
        },
        status: RequestStatusEnum.pending,
      },
    });

    const notDeliveredPackages = await this.prisma.package.count({
      where: {
        matchedRequest: {
          trip: {
            transporter: {
              userId,
            },
          },
        },
        status: {
          in: [
            PackageStatusEnum.matched,
            PackageStatusEnum.in_transit,
            PackageStatusEnum.picked_up,
          ],
        },
      },
    });

    const {
      _sum: { amount: totalEscrowedAmount },
    } = await this.prisma.transaction.aggregate({
      where: {
        wallet: {
          userId,
        },
        transactionType: TransactionTypeEnum.escrow,
        matchedRequestId: {
          notIn: (
            await this.prisma.transaction.findMany({
              where: {
                wallet: {
                  userId,
                },
                transactionType: {
                  in: [TransactionTypeEnum.release, TransactionTypeEnum.refund],
                },
              },
              select: {
                matchedRequestId: true,
              },
            })
          )
            .map((t) => t.matchedRequestId)
            .filter((i) => i !== null),
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      completedTrips,
      pendingRequests,
      notDeliveredPackages,
      totalEscrowedAmount: totalEscrowedAmount ? totalEscrowedAmount.toString() : '0',
    };
  }

  private async getSenderStatistics(userId: string): Promise<SenderStatistics> {
    const notPickedUpPackages = await this.prisma.package.count({
      where: {
        senderId: userId,
        status: PackageStatusEnum.matched,
      },
    });

    const inTransitPackages = await this.prisma.package.count({
      where: {
        senderId: userId,
        status: {
          in: [PackageStatusEnum.picked_up, PackageStatusEnum.in_transit],
        },
      },
    });

    const deliveredPackages = await this.prisma.package.count({
      where: {
        senderId: userId,
        status: PackageStatusEnum.delivered,
      },
    });

    const {
      _sum: { finalPrice: totalUnpaidAmount },
    } = await this.prisma.package.aggregate({
      where: {
        senderId: userId,
        matchedRequest: {
          paymentStatus: PaymentStatusEnum.unpaid,
        },
      },
      _sum: {
        finalPrice: true,
      },
    });

    return {
      notPickedUpPackages,
      inTransitPackages,
      deliveredPackages,
      totalUnpaidAmount: totalUnpaidAmount ?? 0,
    };
  }
}
