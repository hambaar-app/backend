import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError, getDateDifference } from 'src/common/utilities';
import { RolesEnum } from 'generated/prisma';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  async getDashboard(userId: string) {
    const {
      transporter,
      wallet,
      role,
      ...user
    } = await this.prisma.user.findFirstOrThrow({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        wallet: {
          select: {
            balance: true,
            escrowedAmount: true
          }
        },
        transporter: {
          select: {
            profilePictureKey: true,
            rate: true,
            bio: true,
            firstTripDate: true,
            lastTripDate: true,
          }
        },
        role: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    const totalBalance = (wallet?.balance ?? BigInt(0)) + BigInt(wallet?.escrowedAmount ?? 0);

    let experience: string | undefined;
    if (
      role === RolesEnum.transporter &&
      transporter?.firstTripDate &&
      transporter?.lastTripDate &&
      transporter.lastTripDate > transporter.firstTripDate
    ) {
      experience = getDateDifference(transporter.firstTripDate, transporter.lastTripDate);
    }

    return {
      fullName: `${user.firstName} ${user.lastName}`,
      totalBalance,
      role,
      profilePictureUrl: await this.s3Service.generateGetPresignedUrl(transporter?.profilePictureKey),
      rate: transporter?.rate,
      experience,
      bio: transporter?.bio,
    };
  }
}
