import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../../generated/prisma';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: DeepMockProxy<PrismaClient>;
  let runner: DeepMockProxy<TransactionRunner>;

  const mockWallet = {
    id: 'wallet-123',
    userId: 'user-123',
    balance: 100000n,
    escrowedAmount: 0,
    totalEarned: 50000n,
    totalSpent: 10000n,
    transactions: [
      {
        id: 'tx-1',
        amount: 50000n,
        balanceBefore: 50000n,
      },
      {
        id: 'tx-2',
        amount: 10000n,
        balanceBefore: null,
      },
    ],
  } as any;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('getWallet', () => {
    it('should serialize BigInt amounts via formatMoney', async () => {
      prisma.wallet.findUniqueOrThrow.mockResolvedValue(mockWallet);

      const result = await service.getWallet('user-123');

      expect(result.balance).toBe('100000');
      expect(result.totalEarned).toBe('50000');
      expect(result.totalSpent).toBe('10000');
      expect(result.transactions[0]).toMatchObject({
        amount: '50000',
        balanceBefore: '50000',
      });
      expect(result.transactions[1].balanceBefore).toBeUndefined();
    });

    it('should paginate transactions', async () => {
      prisma.wallet.findUniqueOrThrow.mockResolvedValue({
        ...mockWallet,
        transactions: [],
      });

      await service.getWallet('user-123', 2, 5);

      expect(prisma.wallet.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            skip: 5,
            take: 5,
          },
        },
      });
    });

    it('should read through the given transaction when provided', async () => {
      const tx = mockDeep<PrismaClient>();
      tx.wallet.findUniqueOrThrow.mockResolvedValue(mockWallet);

      const result = await service.getWallet('user-123', 1, 10, tx);

      expect(result.balance).toBe('100000');
      expect(tx.wallet.findUniqueOrThrow).toHaveBeenCalled();
      expect(prisma.wallet.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('addFunds', () => {
    it('should increment balance and write a deposit ledger row', async () => {
      prisma.wallet.findUniqueOrThrow.mockResolvedValue({
        ...mockWallet,
        transactions: [],
      });
      prisma.wallet.update.mockResolvedValue({
        ...mockWallet,
        balance: 150000n,
      });
      prisma.transaction.create.mockResolvedValue({} as any);

      const result = await service.addFunds('user-123', {
        amount: 50000,
        gatewayTransactionId: 'gw-123',
      });

      expect(runner.run).toHaveBeenCalledTimes(1);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { balance: { increment: 50000n } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-123',
          amount: 50000n,
          balanceBefore: 100000n,
          reason: 'Funds added to wallet.',
          gatewayTransactionId: 'gw-123',
        }),
      });
      expect(result.balance).toBe(150000n);
    });
  });
});
