import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import {
  PaymentStatusEnum,
  TransactionTypeEnum,
} from '../../../../generated/prisma';
import { BadRequestMessages } from '../../../common/enums/messages.enum';
import { AddFundsAndCreateEscrow } from '../dto/add-funds.dto';
import { CreateEscrowDto } from '../dto/create-escrow.dto';
import { PrismaTransaction } from '../../prisma/prisma.types';
import { WalletService } from './wallet.service';

/**
 * Escrow lifecycle (Phase 5 Task 3).
 *
 * Split from the `FinancialService` god service. Creation runs through
 * `TransactionRunner`; release joins the caller-supplied transaction (it is
 * invoked from inside `TripService.deliveryPackage`, where failure must
 * abort the whole delivery). No manual `.catch` — the global filter maps
 * Prisma errors.
 *
 * Preserved quirks (not fixed here — schema/behavior territory):
 * `escrowedAmount` is an `Int` column while `balance` is `BigInt`;
 * `platformEarnings` is computed in the `number` domain before the
 * `BigInt()` conversion; `totalSpent` is never incremented;
 * `addFundsAndCreateEscrow` is two separate transactions, not atomic.
 * Creation failure stays non-fatal only at the trip call-site
 * (`updateRequest:accept` catches); release failure is fatal.
 */
@Injectable()
export class EscrowService {
  constructor(
    private prisma: PrismaService,
    private wallets: WalletService,
    private runner: TransactionRunner,
  ) {}

  async createEscrow({ packageId, tripId }: CreateEscrowDto) {
    const matchedRequest = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        packageId,
        tripId,
      },
      include: {
        package: {
          include: {
            sender: true,
          },
        },
        trip: {
          include: {
            transporter: {
              include: {
                user: true,
              },
            },
          },
        },
        request: true,
      },
    });

    if (matchedRequest.paymentStatus !== PaymentStatusEnum.unpaid) {
      throw new BadRequestException(BadRequestMessages.PaymentProcessed);
    }

    const senderId = matchedRequest.package.senderId;
    const transporterId = matchedRequest.trip.transporter.userId;
    const finalPrice = matchedRequest.package.finalPrice;

    const senderWallet = await this.wallets.getWallet(senderId, 1, 0);
    if (Number(senderWallet.balance) < finalPrice) {
      throw new BadRequestException(BadRequestMessages.NotEnoughBalance);
    }

    const transporterWallet = await this.wallets.getWallet(transporterId, 1, 0);
    return this.runner.run(async (tx) => {
      // Escrow funds from sender
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          balance: {
            decrement: BigInt(finalPrice),
          },
          escrowedAmount: {
            increment: finalPrice,
          },
        },
      });

      // Create escrow transaction
      await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          transactionType: TransactionTypeEnum.escrow,
          amount: finalPrice,
          balanceBefore: BigInt(senderWallet.balance),
          reason: `Escrowed payment for package ${matchedRequest.package.id}.`,
          matchedRequestId: matchedRequest.id,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: transporterWallet.id,
          transactionType: TransactionTypeEnum.escrow,
          amount: matchedRequest.request.offeredPrice,
          balanceBefore: BigInt(transporterWallet.balance),
          reason: `Escrowed payment for package ${matchedRequest.package.id}.`,
          matchedRequestId: matchedRequest.id,
        },
      });

      // Update matched request
      await tx.matchedRequest.update({
        where: { id: matchedRequest.id },
        data: {
          paymentStatus: PaymentStatusEnum.escrowed,
        },
      });

      return {
        escrowedAmount: finalPrice,
      };
    });
  }

  async addFundsAndCreateEscrow(
    userId: string,
    {
      amount,
      gatewayTransactionId,
      packageId,
      tripId,
    }: AddFundsAndCreateEscrow,
  ) {
    await this.wallets.addFunds(userId, { amount, gatewayTransactionId });
    return this.createEscrow({ packageId, tripId });
  }

  async releaseEscrow(
    packageId: string,
    tripId: string,
    tx: PrismaTransaction,
  ) {
    const matchedRequest = await tx.matchedRequest.findUniqueOrThrow({
      where: {
        packageId,
        tripId,
      },
      include: {
        package: {
          include: {
            sender: true,
          },
        },
        trip: {
          include: {
            transporter: {
              include: {
                user: true,
              },
            },
          },
        },
        request: {
          select: {
            offeredPrice: true,
          },
        },
      },
    });

    if (matchedRequest.paymentStatus !== PaymentStatusEnum.escrowed) {
      throw new BadRequestException(BadRequestMessages.NoEscrowedPayment);
    }

    const senderId = matchedRequest.package.senderId;
    const transporterId = matchedRequest.trip.transporter.userId;

    const escrowedAmount = matchedRequest.package.finalPrice;
    const transporterEarnings = matchedRequest.request.offeredPrice;

    const transporterWallet = await this.wallets.getWallet(
      transporterId,
      1,
      0,
      tx,
    );

    // Release escrow from sender
    await tx.wallet.update({
      where: { userId: senderId },
      data: {
        escrowedAmount: {
          decrement: escrowedAmount,
        },
      },
    });

    // Pay transporter
    await tx.wallet.update({
      where: { userId: transporterId },
      data: {
        balance: {
          increment: BigInt(transporterEarnings),
        },
        totalEarned: {
          increment: BigInt(transporterEarnings),
        },
      },
    });

    // Create release transaction for transporter
    await tx.transaction.create({
      data: {
        walletId: transporterWallet.id,
        transactionType: TransactionTypeEnum.release,
        amount: BigInt(transporterEarnings),
        balanceBefore: BigInt(transporterWallet.balance),
        reason: `Payment received for package ${matchedRequest.packageId}.`,
        matchedRequestId: matchedRequest.id,
      },
    });

    // Create commission transaction (platform earning)
    const platformWalletId = await this.getPlatformWalletId();
    const platformEarnings = BigInt(escrowedAmount - transporterEarnings);
    await tx.transaction.create({
      data: {
        walletId: platformWalletId,
        transactionType: TransactionTypeEnum.commission,
        amount: platformEarnings,
        reason: `Commission from package ${matchedRequest.packageId}`,
        matchedRequestId: matchedRequest.id,
      },
    });

    await tx.wallet.update({
      where: { id: platformWalletId },
      data: {
        balance: {
          increment: platformEarnings,
        },
        totalEarned: {
          increment: platformEarnings,
        },
      },
    });

    return true;
  }

  private async getPlatformWalletId(): Promise<string> {
    const platformUser = await this.prisma.user.findFirst({
      where: {
        role: 'admin',
      },
      include: {
        wallet: true,
      },
    });

    if (!platformUser?.wallet) {
      throw new Error('Platform wallet not configured.');
    }

    return platformUser.wallet.id;
  }
}
