import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  PrismaClient,
  PaymentStatusEnum,
  TransactionTypeEnum,
} from '../../../../generated/prisma';
import { BadRequestException } from '@nestjs/common';
import { BadRequestMessages } from '../../../common/enums/messages.enum';

describe('EscrowService', () => {
  let service: EscrowService;
  let prisma: DeepMockProxy<PrismaClient>;
  let wallets: DeepMockProxy<WalletService>;
  let runner: DeepMockProxy<TransactionRunner>;

  const mockMatchedRequest = {
    id: 'matched-123',
    packageId: 'package-123',
    tripId: 'trip-123',
    paymentStatus: PaymentStatusEnum.unpaid,
    package: {
      id: 'package-123',
      senderId: 'sender-123',
      finalPrice: 50000,
    },
    trip: {
      transporter: { userId: 'transporter-123' },
    },
    request: { offeredPrice: 42000 },
  } as any;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    wallets = mockDeep<WalletService>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: PrismaService, useValue: prisma },
        { provide: WalletService, useValue: wallets },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
  });

  describe('createEscrow', () => {
    it('should escrow funds from sender and mark request escrowed', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );
      wallets.getWallet
        .mockResolvedValueOnce({ id: 'w-sender', balance: '100000' } as any)
        .mockResolvedValueOnce({ id: 'w-transporter', balance: '0' } as any);

      const result = await service.createEscrow({
        packageId: 'package-123',
        tripId: 'trip-123',
      });

      expect(result).toEqual({ escrowedAmount: 50000 });
      expect(runner.run).toHaveBeenCalledTimes(1);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'sender-123' },
        data: {
          balance: { decrement: 50000n },
          escrowedAmount: { increment: 50000 },
        },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'w-sender',
          transactionType: TransactionTypeEnum.escrow,
          amount: 50000,
          balanceBefore: 100000n,
          matchedRequestId: 'matched-123',
        }),
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'w-transporter',
          transactionType: TransactionTypeEnum.escrow,
          amount: 42000,
          balanceBefore: 0n,
        }),
      });
      expect(prisma.matchedRequest.update).toHaveBeenCalledWith({
        where: { id: 'matched-123' },
        data: { paymentStatus: PaymentStatusEnum.escrowed },
      });
    });

    it('should throw when payment is already processed', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue({
        ...mockMatchedRequest,
        paymentStatus: PaymentStatusEnum.escrowed,
      });

      await expect(
        service.createEscrow({ packageId: 'package-123', tripId: 'trip-123' }),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.PaymentProcessed),
      );
      expect(runner.run).not.toHaveBeenCalled();
    });

    it('should throw when sender balance is insufficient', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );
      wallets.getWallet.mockResolvedValue({
        id: 'w-sender',
        balance: '1000',
      } as any);

      await expect(
        service.createEscrow({ packageId: 'package-123', tripId: 'trip-123' }),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.NotEnoughBalance),
      );
    });
  });

  describe('addFundsAndCreateEscrow', () => {
    it('should add funds then create escrow', async () => {
      wallets.addFunds.mockResolvedValue({} as any);
      const createSpy = jest
        .spyOn(service, 'createEscrow')
        .mockResolvedValue({ escrowedAmount: 50000 } as any);

      const result = await service.addFundsAndCreateEscrow('user-123', {
        amount: 50000,
        gatewayTransactionId: 'gw-123',
        packageId: 'package-123',
        tripId: 'trip-123',
      });

      expect(result).toEqual({ escrowedAmount: 50000 });
      expect(wallets.addFunds).toHaveBeenCalledWith('user-123', {
        amount: 50000,
        gatewayTransactionId: 'gw-123',
      });
      expect(createSpy).toHaveBeenCalledWith({
        packageId: 'package-123',
        tripId: 'trip-123',
      });
    });
  });

  describe('releaseEscrow', () => {
    const escrowedRequest = {
      ...mockMatchedRequest,
      paymentStatus: PaymentStatusEnum.escrowed,
    };

    it('should pay transporter, credit commission and return true', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        escrowedRequest,
      );
      wallets.getWallet.mockResolvedValue({
        id: 'w-transporter',
        balance: '10000',
      } as any);
      prisma.user.findFirst.mockResolvedValue({
        wallet: { id: 'w-platform' },
      } as any);

      const result = await service.releaseEscrow(
        'package-123',
        'trip-123',
        prisma,
      );

      expect(result).toBe(true);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'sender-123' },
        data: { escrowedAmount: { decrement: 50000 } },
      });
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'transporter-123' },
        data: {
          balance: { increment: 42000n },
          totalEarned: { increment: 42000n },
        },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'w-transporter',
          transactionType: TransactionTypeEnum.release,
          amount: 42000n,
          balanceBefore: 10000n,
        }),
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'w-platform',
          transactionType: TransactionTypeEnum.commission,
          amount: 8000n,
        }),
      });
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { id: 'w-platform' },
        data: {
          balance: { increment: 8000n },
          totalEarned: { increment: 8000n },
        },
      });
    });

    it('should throw when payment is not escrowed', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );

      await expect(
        service.releaseEscrow('package-123', 'trip-123', prisma),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.NoEscrowedPayment),
      );
    });

    it('should throw when the platform wallet is missing', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        escrowedRequest,
      );
      wallets.getWallet.mockResolvedValue({
        id: 'w-transporter',
        balance: '10000',
      } as any);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.releaseEscrow('package-123', 'trip-123', prisma),
      ).rejects.toThrow('Platform wallet not configured.');
    });
  });
});
