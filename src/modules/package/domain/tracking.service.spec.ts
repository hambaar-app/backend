import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { StoragePort } from '../../../infra/ports/ports';
import { PORTS } from '../../../infra/ports/ports.tokens';
import { PrismaService } from '../../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '../../../../generated/prisma';

describe('TrackingService', () => {
  let service: TrackingService;
  let prisma: DeepMockProxy<PrismaClient>;
  let s3Service: DeepMockProxy<StoragePort>;

  const mockMatchedRequest = {
    id: 'matched-123',
    tripId: 'trip-123',
    packageId: 'package-123',
    trackingCode: '17571445988911932924',
    deliveryCode: '12345',
    trackingUpdates: [{ city: 'Tehran', createdAt: new Date() }],
    package: {
      code: 1001,
      sender: {
        firstName: 'Ahmad',
        lastName: 'Mohammadi',
        phoneNumber: '+989123456789',
      },
      recipient: {
        address: { city: 'Tehran' },
      },
      items: ['Books'],
      weight: 2000,
      dimensions: '30x20x15',
      finalPrice: 50000,
      breakdown: {},
      status: 'delivered',
      packageValue: 100000,
      deliveryAtDestination: true,
    },
    trip: {
      transporter: {
        rate: 4.5,
        profilePictureKey: 'profile-pic-key',
        user: {
          firstName: 'Reza',
          lastName: 'Ahmadi',
          phoneNumber: '+989123456780',
        },
      },
      vehicle: {
        vehicleType: 'truck',
        model: { brand: { name: 'Volvo' } },
      },
    },
  } as any;

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    s3Service = mockDeep<StoragePort>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: PORTS.STORAGE, useValue: s3Service },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  describe('getTrackingByCode', () => {
    it('should get trip tracking by code successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );
      s3Service.generateGetPresignedUrl.mockResolvedValue(
        'https://s3.example.com/profile.jpg',
      );

      const result = await service.getTrackingByCode('TRK123456789');

      expect(result.trackingUpdates).toBeDefined();
      expect(result.package).toBeDefined();
      expect(result.transporter).toBeDefined();
      expect(result.transporter.profilePictureUrl).toBe(
        'https://s3.example.com/profile.jpg',
      );
    });

    it('should mask the sender phone number (S-8)', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );
      s3Service.generateGetPresignedUrl.mockResolvedValue(
        'https://s3.example.com/profile.jpg',
      );

      const result = await service.getTrackingByCode('TRK123456789');

      expect(result.package.sender.phoneNumber).toBe('+98•••••789');
      expect(result.package.sender.phoneNumber).not.toContain('989123456789');
    });

    it('should query by tracking code with non-deleted filter', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );
      s3Service.generateGetPresignedUrl.mockResolvedValue('url');

      await service.getTrackingByCode('TRK123456789');

      expect(prisma.matchedRequest.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { trackingCode: 'TRK123456789', deletedAt: null },
        }),
      );
    });
  });
});
