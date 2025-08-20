import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

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
    });
  }
}
