import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRunner } from '../prisma/transaction-runner';
import { PrismaTransaction } from '../prisma/prisma.types';

/**
 * Notifications (Phase 5 Task 3).
 *
 * `create` keeps its `(userId, content, tx?)` signature (callers pass their
 * transaction). Reads run through `TransactionRunner`; no manual `.catch` —
 * the global filter maps Prisma errors. `getAll` still marks everything
 * read on fetch (locked legacy behavior); use `unreadCount` for badges.
 */
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private runner: TransactionRunner,
  ) {}

  async create(
    userId: string,
    {
      content,
      packageId,
      tripId,
    }: {
      content: string;
      packageId?: string;
      tripId?: string;
    },
    tx: PrismaTransaction = this.prisma,
  ) {
    return tx.notification.create({
      data: {
        userId,
        content,
        packageId,
        tripId,
      },
    });
  }

  async getAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.runner.run(async (tx) => {
      // Update notifications => unread: true
      await tx.notification.updateMany({
        where: { userId },
        data: {
          unread: false,
        },
      });

      return tx.notification.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, unread: true },
    });
    return { count };
  }
}
