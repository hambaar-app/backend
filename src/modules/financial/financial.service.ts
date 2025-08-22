import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError } from 'src/common/utilities';
import { PrismaTransaction } from '../prisma/prisma.types';
import { MatchStatusEnum, PaymentStatusEnum, TransactionTypeEnum } from 'generated/prisma';
import { BadRequestMessages } from 'src/common/enums/messages.enum';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async getWallet(
    userId: string,
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;
    return this.prisma.wallet.findUniqueOrThrow({
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
    amount: number
  ) {
    const wallet = await this.getWallet(userId, 1, 0);
    
    // TODO: Payment Gateway transaction
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
          // TODO: gatewayTransactionId
        }
      });

      return updatedWallet;
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }

  async createEscrow(
    packageId: string,
    tripId: string
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
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });

    if (matchedRequest.paymentStatus !== PaymentStatusEnum.unpaid) {
      throw new BadRequestException(BadRequestMessages.PaymentProcessed);
    }

    const senderId = matchedRequest.package.senderId;
    const finalPrice = matchedRequest.package.finalPrice;
    
    const senderWallet = await this.getWallet(senderId, 1, 0);
    if (senderWallet.balance < BigInt(finalPrice)) {
      throw new BadRequestException(BadRequestMessages.NotEnoughBalance);
    }

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

  async releaseEscrow(
    packageId: string,
    tripId: string
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
    
    return this.prisma.$transaction(async (tx) => {
      const transporterWallet = await this.getWallet(transporterId);

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
      await tx.transaction.create({
        data: {
          walletId: await this.getPlatformWalletId(),
          transactionType: TransactionTypeEnum.commission,
          amount: BigInt(escrowedAmount - transporterEarnings),
          reason: `Commission from package ${matchedRequest.packageId}`,
          matchedRequestId: matchedRequest.id,
        }
      });

      return true;
    });
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
