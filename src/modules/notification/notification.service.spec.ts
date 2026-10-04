import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRunner } from '../prisma/transaction-runner';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: DeepMockProxy<PrismaClient>;
  let runner: DeepMockProxy<TransactionRunner>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    it('should create a notification with the default client', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'n-1' } as any);

      const result = await service.create('user-123', {
        content: 'hello',
        packageId: 'package-123',
      });

      expect(result).toEqual({ id: 'n-1' });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          content: 'hello',
          packageId: 'package-123',
          tripId: undefined,
        },
      });
    });

    it('should create inside the given transaction', async () => {
      const tx = mockDeep<PrismaClient>();
      tx.notification.create.mockResolvedValue({ id: 'n-2' } as any);

      const result = await service.create(
        'user-123',
        { content: 'hello', tripId: 'trip-123' },
        tx,
      );

      expect(result).toEqual({ id: 'n-2' });
      expect(tx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          content: 'hello',
          packageId: undefined,
          tripId: 'trip-123',
        },
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should mark all read then list paginated', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });
      prisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }] as any);

      const result = await service.getAll('user-123', 2, 5);

      expect(result).toEqual([{ id: 'n-1' }]);
      expect(runner.run).toHaveBeenCalledTimes(1);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { unread: false },
      });
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 5,
      });
    });
  });

  describe('unreadCount', () => {
    it('should count unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.unreadCount('user-123');

      expect(result).toEqual({ count: 3 });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', unread: true },
      });
    });
  });
});
