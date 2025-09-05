import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError } from '../../common/utilities';
import { PaymentStatusEnum, TransactionTypeEnum } from '../../../generated/prisma';
import { BadRequestMessages } from '../../common/enums/messages.enum';
import { AddFundsAndCreateEscrow, AddFundsDto } from './dto/add-funds.dto';
import { CreateEscrowDto } from './dto/create-escrow.dto';
import { PrismaTransaction } from '../prisma/prisma.types';

// TODO: Payment Gateway transaction

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async getWallet(
    userId: string,
    page = 1,
    limit = 10,
    tx: PrismaTransaction = this.prisma
  ) {
    const skip = (page - 1) * limit;
    return tx.wallet.findUniqueOrThrow({
      where: { userId },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit,
        }
      },
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async addFunds(
    userId: string,
    {
      amount,
      gatewayTransactionId
    }: AddFundsDto
  ) {
    const wallet = await this.getWallet(userId, 1, 0);

    // TODO: Check all unpaid matchedRequests
    return this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: BigInt(amount)
          },
        }
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          transactionType: TransactionTypeEnum.deposit,
          amount: BigInt(amount),
          balanceBefore: wallet.balance,
          reason: 'Funds added to wallet.',
          gatewayTransactionId
        }
      });

      return updatedWallet;
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async createEscrow(
    {
      packageId,
      tripId
    }: CreateEscrowDto
  ) {
    const matchedRequest = await this.prisma.matchedRequest.findUniqueOrThrow({
      where: {
        packageId,
        tripId
      },
      include: {
        package: {
          include: {
            sender: true
          }
        },
        trip: {
          include: {
            transporter: {
              include: {
                user: true
              }
            }
          }
        },
        request: true
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (matchedRequest.paymentStatus !== PaymentStatusEnum.unpaid) {
      throw new BadRequestException(BadRequestMessages.PaymentProcessed);
    }

    const senderId = matchedRequest.package.senderId;
    const transporterId = matchedRequest.trip.transporter.userId;
    const finalPrice = matchedRequest.package.finalPrice;
    
    const senderWallet = await this.getWallet(senderId, 1, 0);    
    if (senderWallet.balance < BigInt(finalPrice)) {
      throw new BadRequestException(BadRequestMessages.NotEnoughBalance);
    }

    const transporterWallet = await this.getWallet(transporterId, 1, 0);  
    return this.prisma.$transaction(async (tx) => {
      // Escrow funds from sender
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          balance: {
            decrement: BigInt(finalPrice)
          },
          escrowedAmount: {
            increment: finalPrice
          }
        }
      });

      // Create escrow transaction
      await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          transactionType: TransactionTypeEnum.escrow,
          amount: finalPrice,
          balanceBefore: senderWallet.balance,
          reason: `Escrowed payment for package ${matchedRequest.package.id}.`,
          matchedRequestId: matchedRequest.id
        }
      });

      await tx.transaction.create({
        data: {
          walletId: transporterWallet.id,
          transactionType: TransactionTypeEnum.escrow,
          amount: matchedRequest.request.offeredPrice,
          balanceBefore: transporterWallet.balance,
          reason: `Escrowed payment for package ${matchedRequest.package.id}.`,
          matchedRequestId: matchedRequest.id
        }
      });

      // Update matched request
      await tx.matchedRequest.update({
        where: { id: matchedRequest.id },
        data: {
          paymentStatus: PaymentStatusEnum.escrowed
        }
      });
      
      return {
        escrowedAmount: finalPrice
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
    }: AddFundsAndCreateEscrow
  ) {
    await this.addFunds(userId, { amount, gatewayTransactionId });
    return this.createEscrow({ packageId, tripId });
  }

  async releaseEscrow(
    packageId: string,
    tripId: string,
    tx: PrismaTransaction
  ) {
    const matchedRequest = await tx.matchedRequest.findUniqueOrThrow({
      where: {
        packageId,
        tripId
      },
      include: {
        package: {
          include: {
            sender: true
          }
        },
        trip: {
          include: {
            transporter: {
              include: {
                user: true
              }
            }
          }
        },
        request: {
          select: {
            offeredPrice: true
          }
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (matchedRequest.paymentStatus !== PaymentStatusEnum.escrowed) {
      throw new BadRequestException(BadRequestMessages.NoEscrowedPayment);
    }

    const senderId = matchedRequest.package.senderId;
    const transporterId = matchedRequest.trip.transporter.userId;

    const escrowedAmount = matchedRequest.package.finalPrice;
    const transporterEarnings = matchedRequest.request.offeredPrice;
    
    const transporterWallet = await this.getWallet(transporterId, 1, 0, tx);

    // Release escrow from sender
    await tx.wallet.update({
      where: { userId: senderId },
      data: {
          escrowedAmount: {
          decrement: escrowedAmount
        }
      }
    });

    // Pay transporter
    await tx.wallet.update({
      where: { userId: transporterId },
      data: {
        balance: {
          increment: BigInt(transporterEarnings)
        },
        totalEarned: {
          increment: BigInt(transporterEarnings)
        }
      }
    });

    // Create release transaction for transporter
    await tx.transaction.create({
      data: {
        walletId: transporterWallet.id,
        transactionType: TransactionTypeEnum.release,
        amount: BigInt(transporterEarnings),
        balanceBefore: transporterWallet.balance,
        reason: `Payment received for package ${matchedRequest.packageId}.`,
        matchedRequestId: matchedRequest.id,
      }
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
      }
    });

    await tx.wallet.update({
      where: { id: platformWalletId },
      data: {
        balance: {
          increment: platformEarnings
        },
        totalEarned: {
          increment: platformEarnings
        }
      }
    });

    return true;
  }

  private async getPlatformWalletId(): Promise<string> {
    const platformUser = await this.prisma.user.findFirst({
      where: {
        role: 'admin'
      },
      include: {
        wallet: true
      }
    });

    if (!platformUser?.wallet) {
      throw new Error('Platform wallet not configured.');
    }

    return platformUser.wallet.id;
  }
}
