import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { CreateRecipientDto } from '../dto/create-recipient.dto';

/**
 * Recipient + address management (Phase 4 Task 5).
 *
 * Owns `createRecipient` (city → province resolution with address creation
 * in one `TransactionRunner` op) and `getAllRecipients`. No manual
 * `.catch` — the global filter maps Prisma errors.
 */
@Injectable()
export class RecipientService {
  constructor(
    private prisma: PrismaService,
    private runner: TransactionRunner,
  ) {}

  async createRecipient(
    userId: string,
    { address: { cityId, ...address }, ...recipientDto }: CreateRecipientDto,
  ) {
    return this.runner.run(async (tx) => {
      const city = await tx.city.findUniqueOrThrow({
        where: { id: cityId },
        include: {
          province: true,
        },
      });

      return tx.packageRecipient.create({
        data: {
          ...recipientDto,
          address: {
            create: {
              userId,
              ...address,
              title: address.title ?? recipientDto.fullName,
              province: city.province.name,
              city: city.name,
            },
          },
        },
        include: {
          address: true,
        },
      });
    });
  }

  async getAllRecipients(
    userId: string,
    search?: string,
    isHighlighted = true,
  ) {
    return this.prisma.packageRecipient.findMany({
      where: {
        address: {
          userId,
        },
        isHighlighted,
        OR: [
          {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            address: {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        address: true,
      },
    });
  }
}
