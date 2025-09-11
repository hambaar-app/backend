import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTransaction } from '../prisma/prisma.types';
import { formatPrismaError } from '../../common/utilities';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    {
      content,
      packageId,
      tripId
    }: {
      content: string;
      packageId?: string;
      tripId?: string
    },
    tx: PrismaTransaction = this.prisma
  ) {
    return tx.notification.create({
      data: {
        userId,
        content,
        packageId,
        tripId
      }
    });
  }

  async getAll(
    userId: string,
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;
    return this.prisma.$transaction(async tx => {
      // Update notifications => unread: true
      await tx.notification.updateMany({
        where: { userId },
        data: {
          unread: false
        }
      });

      return this.prisma.notification.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      });
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}
