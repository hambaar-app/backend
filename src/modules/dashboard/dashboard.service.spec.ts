import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient, RolesEnum } from '../../../generated/prisma';
import { StoragePort } from '../../infra/ports/ports';
import { PORTS } from '../../infra/ports/ports.tokens';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: DeepMockProxy<PrismaClient>;
  let storage: DeepMockProxy<StoragePort>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    storage = mockDeep<StoragePort>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: PORTS.STORAGE, useValue: storage },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getDashboard as transporter', () => {
    it('should assemble profile, balance, experience and statistics', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({
        firstName: 'Ahmad',
        lastName: 'Mohammadi',
        wallet: { balance: 100n, escrowedAmount: 20 },
        transporter: {
          profilePictureKey: 'pic-key',
          rate: 4.5,
          bio: 'bio',
          firstTripDate: new Date('2023-01-01'),
          lastTripDate: new Date('2023-06-15'),
        },
        role: RolesEnum.transporter,
        _count: { notifications: 3 },
      } as any);
      prisma.trip.count.mockResolvedValue(5);
      prisma.tripRequest.count.mockResolvedValue(2);
      prisma.package.count.mockResolvedValue(3);
      prisma.transaction.findMany.mockResolvedValue([
        { matchedRequestId: 'm-1' },
        { matchedRequestId: null },
      ] as any);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 700n },
      } as any);
      storage.generateGetPresignedUrl.mockResolvedValue('url');

      const result = await service.getDashboard('user-123');

      expect(result.fullName).toBe('Ahmad Mohammadi');
      expect(result.totalBalance).toBe(120n);
      expect(result.role).toBe(RolesEnum.transporter);
      expect(result.profilePictureUrl).toBe('url');
      expect(result.rate).toBe(4.5);
      expect(typeof result.experience).toBe('string');
      expect(result.statistics).toEqual({
        completedTrips: 5,
        pendingRequests: 2,
        notDeliveredPackages: 3,
        totalEscrowedAmount: '700',
      });
      expect(result.notificationCount).toBe(3);
    });

    it('should report zero escrowed amount when the sum is null', async () => {      prisma.user.findFirstOrThrow.mockResolvedValue({
        firstName: 'A',
        lastName: 'B',
        wallet: { balance: 0n, escrowedAmount: 0 },
        transporter: {
          profilePictureKey: null,
          rate: 5,
          bio: null,
          firstTripDate: new Date('2023-01-01'),
          lastTripDate: new Date('2023-01-02'),
        },
        role: RolesEnum.transporter,
        _count: { notifications: 0 },
      } as any);
      prisma.trip.count.mockResolvedValue(0);
      prisma.tripRequest.count.mockResolvedValue(0);
      prisma.package.count.mockResolvedValue(0);
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      } as any);

      const result = await service.getDashboard('user-123');

      expect(result.statistics).toMatchObject({ totalEscrowedAmount: '0' });
    });

    it('should leave experience undefined without a last trip date', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({
        firstName: 'A',
        lastName: 'B',
        wallet: { balance: 5n },
        transporter: {
          profilePictureKey: null,
          rate: 5,
          bio: null,
          firstTripDate: new Date('2023-01-01'),
          lastTripDate: null,
        },
        role: RolesEnum.transporter,
        _count: { notifications: 0 },
      } as any);
      prisma.trip.count.mockResolvedValue(0);
      prisma.tripRequest.count.mockResolvedValue(0);
      prisma.package.count.mockResolvedValue(0);
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      } as any);

      const result = await service.getDashboard('user-123');

      expect(result.experience).toBeUndefined();
      expect(result.totalBalance).toBe(5n);
    });
  });

  describe('getDashboard as sender', () => {
    it('should assemble sender statistics', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({
        firstName: 'Sara',
        lastName: 'Karimi',
        wallet: { balance: 50n, escrowedAmount: 0 },
        transporter: null,
        role: RolesEnum.sender,
        _count: { notifications: 1 },
      } as any);
      prisma.package.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(4);
      prisma.package.aggregate.mockResolvedValue({
        _sum: { finalPrice: 9000 },
      } as any);

      const result = await service.getDashboard('user-123');

      expect(result.statistics).toEqual({
        notPickedUpPackages: 1,
        inTransitPackages: 2,
        deliveredPackages: 4,
        totalUnpaidAmount: 9000,
      });
      expect(result.totalBalance).toBe(50n);
    });

    it('should report zero unpaid amount when the sum is null', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({
        firstName: 'Sara',
        lastName: 'Karimi',
        wallet: { balance: 0n, escrowedAmount: 0 },
        transporter: null,
        role: RolesEnum.sender,
        _count: { notifications: 0 },
      } as any);
      prisma.package.count.mockResolvedValue(0);
      prisma.package.aggregate.mockResolvedValue({
        _sum: { finalPrice: null },
      } as any);

      const result = await service.getDashboard('user-123');

      expect(result.statistics).toMatchObject({ totalUnpaidAmount: 0 });
    });
  });

  describe('getDashboard with other roles', () => {
    it('should leave statistics undefined', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({
        firstName: 'Admin',
        lastName: 'User',
        wallet: null,
        transporter: null,
        role: RolesEnum.admin,
        _count: { notifications: 0 },
      } as any);

      const result = await service.getDashboard('user-123');

      expect(result.statistics).toBeUndefined();
      expect(result.totalBalance).toBe(0n);
    });
  });
});
