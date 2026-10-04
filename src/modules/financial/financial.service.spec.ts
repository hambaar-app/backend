import { Test, TestingModule } from '@nestjs/testing';
import { FinancialService } from './financial.service';
import { WalletService } from './domain/wallet.service';
import { EscrowService } from './domain/escrow.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';

describe('FinancialService', () => {
  let service: FinancialService;
  let wallets: DeepMockProxy<WalletService>;
  let escrows: DeepMockProxy<EscrowService>;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    wallets = mockDeep<WalletService>();
    escrows = mockDeep<EscrowService>();
    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: WalletService, useValue: wallets },
        { provide: EscrowService, useValue: escrows },
      ],
    }).compile();

    service = module.get<FinancialService>(FinancialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate getWallet with and without tx', async () => {
    wallets.getWallet.mockResolvedValue({ id: 'w' } as any);

    await service.getWallet('user-123', 2, 5);
    expect(wallets.getWallet).toHaveBeenCalledWith('user-123', 2, 5);

    await service.getWallet('user-123', 1, 10, prisma);
    expect(wallets.getWallet).toHaveBeenCalledWith('user-123', 1, 10, prisma);
  });

  it('should delegate addFunds', async () => {
    wallets.addFunds.mockResolvedValue({ id: 'w' } as any);

    await service.addFunds('user-123', {
      amount: 1000,
      gatewayTransactionId: 'gw',
    });

    expect(wallets.addFunds).toHaveBeenCalledWith('user-123', {
      amount: 1000,
      gatewayTransactionId: 'gw',
    });
  });

  it('should delegate createEscrow', async () => {
    escrows.createEscrow.mockResolvedValue({ escrowedAmount: 1 } as any);

    await service.createEscrow({ packageId: 'p', tripId: 't' });

    expect(escrows.createEscrow).toHaveBeenCalledWith({
      packageId: 'p',
      tripId: 't',
    });
  });

  it('should delegate addFundsAndCreateEscrow', async () => {
    escrows.addFundsAndCreateEscrow.mockResolvedValue(true as any);

    await service.addFundsAndCreateEscrow('user-123', {
      amount: 1,
      gatewayTransactionId: 'gw',
      packageId: 'p',
      tripId: 't',
    });

    expect(escrows.addFundsAndCreateEscrow).toHaveBeenCalledWith('user-123', {
      amount: 1,
      gatewayTransactionId: 'gw',
      packageId: 'p',
      tripId: 't',
    });
  });

  it('should delegate releaseEscrow', async () => {
    escrows.releaseEscrow.mockResolvedValue(true);

    const result = await service.releaseEscrow('p', 't', prisma);

    expect(result).toBe(true);
    expect(escrows.releaseEscrow).toHaveBeenCalledWith('p', 't', prisma);
  });
});
