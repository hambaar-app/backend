import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { formatMoney } from '../../../common/utils/money';
import { TransactionTypeEnum } from '../../../../generated/prisma';
import { AddFundsDto } from '../dto/add-funds.dto';
import { PrismaTransaction } from '../../prisma/prisma.types';

// TODO: Payment Gateway transaction

/**
 * Wallet reads and deposits (Phase 5 Task 3).
 *
 * Split from the `FinancialService` god service. All multi-statement writes
 * run through `TransactionRunner` (no manual `.catch` — the global filter
 * maps Prisma errors); every public BigInt serialization goes through
 * `formatMoney`. Arithmetic quirks of the original are preserved verbatim
 * (see `EscrowService` for the known ones).
 */
@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private runner: TransactionRunner,
  ) {}

  async getWallet(
    userId: string,
    page = 1,
    limit = 10,
    tx: PrismaTransaction = this.prisma,
  ) {
    const skip = (page - 1) * limit;

    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { userId },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        },
      },
    });

    return {
      ...wallet,
      balance: formatMoney(wallet.balance),
      totalEarned: formatMoney(wallet.totalEarned),
      totalSpent: formatMoney(wallet.totalSpent),
      transactions: wallet.transactions.map((transaction) => ({
        ...transaction,
        amount: formatMoney(transaction.amount),
        balanceBefore: formatMoney(transaction.balanceBefore),
      })),
    };
  }

  async addFunds(
    userId: string,
    { amount, gatewayTransactionId }: AddFundsDto,
  ) {
    const wallet = await this.getWallet(userId, 1, 0);

    // TODO: Check all unpaid matchedRequests
    return this.runner.run(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: BigInt(amount),
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          transactionType: TransactionTypeEnum.deposit,
          amount: BigInt(amount),
          balanceBefore: BigInt(wallet.balance),
          reason: 'Funds added to wallet.',
          gatewayTransactionId,
        },
      });

      return updatedWallet;
    });
  }
}
