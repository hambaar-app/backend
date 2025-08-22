import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatPrismaError } from 'src/common/utilities';
import { PrismaTransaction } from '../prisma/prisma.types';
import { PaymentStatusEnum, TransactionTypeEnum } from 'generated/prisma';
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
  
  async escrowFunds(userId: string, amount: number) {
    const wallet = await this.getWallet(userId);
    
    if (wallet.balance < amount) {
      throw new BadRequestException('Not enough balance.');
    }

    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount
        },
        escrowedAmount: {
          increment: amount
        }
      }
    }).catch((error: Error) => {
      formatPrismaError(error);
      throw error;
    });
  }
  
  async releaseFunds(
    senderId: string,
    transporterId: string,
    amount: number,
    tx: PrismaTransaction = this.prisma
  ) {
    const senderWallet = await this.getWallet(senderId);
    
    if (senderWallet.escrowedAmount < amount) {
      throw new BadRequestException('Not enough escrowed funds.');
    }

    // Release from escrow and transfer to transporter
    const { balance: senderBalance } = await tx.wallet.update({
      where: { userId: senderId },
      data: {
        escrowedAmount: {
          decrement: amount
        }
      }
    });

    const { balance: transporterBalance } = await tx.wallet.update({
      where: { userId: transporterId },
      data: {
        balance: {
          increment: amount
        }
      }
    });

    return {
      senderBalance,
      transporterBalance
    };
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
      const escrowTransaction = await tx.transaction.create({
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
}
