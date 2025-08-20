import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError } from 'src/common/utilities';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    return this.prisma.wallet.findUniqueOrThrow({
      where: { userId }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async addFunds(
    userId: string,
    amount: number
  ) {
    // TODO: Payment Gateway transaction
    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
}
