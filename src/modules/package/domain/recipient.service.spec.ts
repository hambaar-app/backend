import { Test, TestingModule } from '@nestjs/testing';
import { RecipientService } from './recipient.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../../generated/prisma';
import { CreateRecipientDto } from '../dto/create-recipient.dto';

describe('RecipientService', () => {
  let service: RecipientService;
  let prisma: DeepMockProxy<PrismaClient>;
  let runner: DeepMockProxy<TransactionRunner>;

  const mockCity = {
    id: 'city-123',
    name: 'تهران',
    province: {
      id: 'province-123',
      name: 'تهران',
    },
  } as any;

  const recipientDto: CreateRecipientDto = {
    fullName: 'علی احمدی',
    phoneNumber: '+989123456788',
    address: {
      cityId: 'city-123',
      title: 'دفتر کار',
      street: 'خیابان ولیعصر',
      details: 'روبروی ساختمان قدیم',
      latitude: '35.7219',
      longitude: '51.3347',
      postalCode: '1234567890',
    },
  } as any;

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipientService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<RecipientService>(RecipientService);
  });

  describe('createRecipient', () => {
    it('should create recipient with denormalized city and province', async () => {
      const created = { id: 'recipient-123', ...recipientDto };
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      prisma.packageRecipient.create.mockResolvedValue(created as any);

      const result = await service.createRecipient('user-123', recipientDto);

      expect(result).toEqual(created);
      expect(prisma.city.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'city-123' },
        include: { province: true },
      });
      expect(prisma.packageRecipient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: expect.objectContaining({
            create: expect.objectContaining({
              userId: 'user-123',
              province: 'تهران',
              city: 'تهران',
            }),
          }),
        }),
        include: { address: true },
      });
    });

    it('should fall back to fullName when address title is missing', async () => {
      const dtoWithoutTitle = {
        ...recipientDto,
        address: { ...recipientDto.address, title: undefined },
      } as any;
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      prisma.packageRecipient.create.mockResolvedValue({} as any);

      await service.createRecipient('user-123', dtoWithoutTitle);

      expect(prisma.packageRecipient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: expect.objectContaining({
            create: expect.objectContaining({ title: 'علی احمدی' }),
          }),
        }),
        include: { address: true },
      });
    });

    it('should run creation inside TransactionRunner', async () => {
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      prisma.packageRecipient.create.mockResolvedValue({} as any);

      await service.createRecipient('user-123', recipientDto);

      expect(runner.run).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllRecipients', () => {
    it('should list highlighted recipients by default', async () => {
      prisma.packageRecipient.findMany.mockResolvedValue([]);

      await service.getAllRecipients('user-123');

      expect(prisma.packageRecipient.findMany).toHaveBeenCalledWith({
        where: {
          address: { userId: 'user-123' },
          isHighlighted: true,
          OR: [
            { fullName: { contains: undefined, mode: 'insensitive' } },
            {
              address: { title: { contains: undefined, mode: 'insensitive' } },
            },
          ],
        },
        include: { address: true },
      });
    });

    it('should search by fullName and address title', async () => {
      prisma.packageRecipient.findMany.mockResolvedValue([]);

      await service.getAllRecipients('user-123', 'علی', false);

      expect(prisma.packageRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isHighlighted: false,
            OR: [
              { fullName: { contains: 'علی', mode: 'insensitive' } },
              {
                address: { title: { contains: 'علی', mode: 'insensitive' } },
              },
            ],
          }),
        }),
      );
    });
  });
});
