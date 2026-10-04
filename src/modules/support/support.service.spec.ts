import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserService } from '../user/user.service';
import { PrismaClient } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRunner } from '../prisma/transaction-runner';
import { NotFoundException } from '@nestjs/common';
import { NotFoundMessages } from '../../common/enums/messages.enum';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: DeepMockProxy<PrismaClient>;
  let userService: DeepMockProxy<UserService>;
  let runner: DeepMockProxy<TransactionRunner>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    userService = mockDeep<UserService>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  describe('updateVerification', () => {
    it('should update a verification status by id', async () => {
      prisma.verificationStatus.update.mockResolvedValue({
        id: 'vs-1',
        status: 'verified',
      } as any);

      const result = await service.updateVerification('vs-1', {
        status: 'verified',
      } as any);

      expect(result).toEqual({ id: 'vs-1', status: 'verified' });
      expect(prisma.verificationStatus.update).toHaveBeenCalledWith({
        where: { id: 'vs-1' },
        data: { status: 'verified' },
      });
    });
  });

  describe('updateTransporterVerification', () => {
    it('should update through the transporter verification status', async () => {
      userService.getTransporter.mockResolvedValue({
        id: 'transporter-123',
        verificationStatusId: 'vs-1',
      } as any);
      prisma.verificationStatus.update.mockResolvedValue({
        id: 'vs-1',
        status: 'verified',
      } as any);

      const result = await service.updateTransporterVerification('user-123', {
        status: 'verified',
      } as any);

      expect(result).toEqual({ id: 'vs-1', status: 'verified' });
      expect(runner.run).toHaveBeenCalledTimes(1);
      expect(userService.getTransporter).toHaveBeenCalledWith(
        { userId: 'user-123' },
        prisma,
      );
      expect(prisma.verificationStatus.update).toHaveBeenCalledWith({
        where: { id: 'vs-1' },
        data: { status: 'verified' },
      });
    });

    it('should throw 404 when the transporter has no verification status', async () => {
      userService.getTransporter.mockResolvedValue({
        id: 'transporter-123',
        verificationStatusId: null,
      } as any);

      await expect(
        service.updateTransporterVerification('user-123', {
          status: 'verified',
        } as any),
      ).rejects.toThrow(
        new NotFoundException(NotFoundMessages.VerificationStatus),
      );
      expect(prisma.verificationStatus.update).not.toHaveBeenCalled();
    });
  });
});
