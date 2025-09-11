import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTransaction } from '../prisma/prisma.types';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    content: string,
    tx: PrismaTransaction = this.prisma
  ) {
    return tx.notification.create({
      data: {
        userId,
        content
      }
    });
  }

  async getAll(
    userId: string,
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
  }
}
