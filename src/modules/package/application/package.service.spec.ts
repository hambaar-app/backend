import { Test, TestingModule } from '@nestjs/testing';
import { PackageService } from './package.service';
import { MatchingService } from '../matching.service';
import { TripService } from '../../trip/application/trip.service';
import { StoragePort } from '../../../infra/ports/ports';
import { PORTS } from '../../../infra/ports/ports.tokens';
import { TurfService } from '../../turf/turf.service';
import { PricingService } from '../../pricing/pricing.service';
import { MapService } from '../../map/map.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient, PackageStatusEnum } from '../../../../generated/prisma';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AuthMessages,
  BadRequestMessages,
} from '../../../common/enums/messages.enum';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update.package.dto';
import { NotificationService } from '../../notification/notification.service';

describe('PackageService', () => {
  let service: PackageService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let pricingService: DeepMockProxy<PricingService>;
  let matchingService: DeepMockProxy<MatchingService>;
  let tripService: DeepMockProxy<TripService>;
  let s3Service: DeepMockProxy<StoragePort>;
  let turfService: DeepMockProxy<TurfService>;
  let notificationService: DeepMockProxy<NotificationService>;
  let runner: DeepMockProxy<TransactionRunner>;

  const mockOriginAddress = {
    id: 'address-123',
    userId: 'user-123',
    title: 'خانه',
    latitude: 35.6892,
    longitude: 51.389,
    city: 'تهران',
    province: 'تهران',
  } as any;

  const mockRecipient = {
    id: 'recipient-123',
    fullName: 'علی احمدی',
    phoneNumber: '+989123456788',
    address: {
      userId: 'user-123',
      title: 'دفتر کار',
      city: 'تهران',
      province: 'تهران',
      street: 'خیابان ولیعصر',
      details: 'روبروی ساختمان قدیم',
      latitude: '35.7219',
      longitude: '51.3347',
      postalCode: '1234567890',
    },
  } as any;

  const mockPackage = {
    id: 'package-123',
    senderId: 'user-123',
    items: ['کتاب', 'لپ‌تاپ'],
    weight: 2000,
    dimensions: '30x20x15',
    status: PackageStatusEnum.created,
    suggestedPrice: 50000,
    finalPrice: 50000,
    isFragile: false,
    isPerishable: false,
    pickupAtOrigin: true,
    deliveryAtDestination: true,
    picturesKey: ['pic1.jpg', 'pic2.jpg'],
    originAddress: mockOriginAddress,
    recipient: mockRecipient,
    deletedAt: null,
  } as any;

  const mockTrip = {
    id: 'trip-123',
    status: 'scheduled',
    origin: { latitude: 35.6892, longitude: 51.389 },
    destination: { latitude: 35.7219, longitude: 51.3347 },
    waypoints: [],
    normalDistanceKm: 10,
    normalDurationMin: 30,
    totalDeviationDurationMin: 0,
    matchedRequests: [],
  } as any;

  const mockBreakdown = {
    basePrice: 20000,
    distanceCost: 15000,
    weightCost: 10000,
    specialHandlingCost: 0,
    cityPremiumCost: 5000,
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    pricingService = mockDeep<PricingService>();
    matchingService = mockDeep<MatchingService>();
    tripService = mockDeep<TripService>();
    s3Service = mockDeep<StoragePort>();
    turfService = mockDeep<TurfService>();
    notificationService = mockDeep<NotificationService>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapService, useValue: mapService },
        { provide: PricingService, useValue: pricingService },
        { provide: MatchingService, useValue: matchingService },
        { provide: TripService, useValue: tripService },
        { provide: PORTS.STORAGE, useValue: s3Service },
        { provide: TurfService, useValue: turfService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<PackageService>(PackageService);
  });

  describe('create', () => {
    const packageDto: CreatePackageDto = {
      items: ['کتاب'],
      originAddressId: 'address-123',
      recipientId: 'recipient-123',
      weight: 1500,
      dimensions: '25x20x10',
      isFragile: false,
      isPerishable: false,
      pickupAtOrigin: true,
      deliveryAtDestination: true,
      picturesKey: ['pic1.jpg'],
    } as any;

    it('should create package successfully', async () => {
      prisma.address.findFirst.mockResolvedValue(mockOriginAddress);
      prisma.packageRecipient.findFirst.mockResolvedValue(mockRecipient);
      prisma.package.create.mockResolvedValue(mockPackage);

      mapService.calculateDistance.mockResolvedValue({
        distance: 15,
        duration: 25,
      });
      pricingService.calculateSuggestedPrice.mockReturnValue({
        suggestedPrice: 50000,
        breakdown: mockBreakdown,
      });

      const result = await service.create('user-123', packageDto);

      expect(result).toEqual(mockPackage);
      expect(mapService.calculateDistance).toHaveBeenCalledWith({
        origin: {
          latitude: mockOriginAddress.latitude,
          longitude: mockOriginAddress.longitude,
        },
        destination: {
          latitude: mockRecipient.address.latitude,
          longitude: mockRecipient.address.longitude,
        },
      });
      expect(pricingService.calculateSuggestedPrice).toHaveBeenCalled();
    });

    it('should throw when origin address not found', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(service.create('user-123', packageDto)).rejects.toThrow(
        new ForbiddenException(
          `${AuthMessages.EntityAccessDenied} origin address.`,
        ),
      );
    });

    it('should throw when recipient not found', async () => {
      prisma.address.findFirst.mockResolvedValue(mockOriginAddress);
      prisma.packageRecipient.findFirst.mockResolvedValue(null);

      await expect(service.create('user-123', packageDto)).rejects.toThrow(
        new ForbiddenException(`${AuthMessages.EntityAccessDenied} recipient.`),
      );
    });
  });

  describe('getById', () => {
    it('should return package with presigned URLs', async () => {
      const packageWithUrls = {
        ...mockPackage,
        picturesKey: ['pic1.jpg', 'pic2.jpg'],
        picturesUrl: ['url1', 'url2'],
      };

      prisma.package.findFirstOrThrow.mockResolvedValue(mockPackage);
      s3Service.generateGetPresignedUrl
        .mockResolvedValueOnce('url1')
        .mockResolvedValueOnce('url2');

      const result = await service.getById('package-123');

      expect(result).toMatchObject(packageWithUrls);
    });

    it('should handle null picturesKey', async () => {
      const packageWithNullPics = { ...mockPackage, picturesKey: null };
      prisma.package.findFirstOrThrow.mockResolvedValue(packageWithNullPics);

      const result = await service.getById('package-123');

      expect(result.picturesKey).toBeNull();
      expect(result.picturesUrl).toBeUndefined();
    });

    it('should default to the injected client when no tx is provided', async () => {
      prisma.package.findFirstOrThrow.mockResolvedValue({
        ...mockPackage,
        picturesKey: null,
      });

      const result = await service.getById('package-123');

      expect(result.id).toBe('package-123');
      expect(prisma.package.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'package-123', deletedAt: null },
        }),
      );
    });
  });

  describe('getAll', () => {
    it('should map packages with presigned urls', async () => {
      prisma.package.findMany.mockResolvedValue([mockPackage]);
      s3Service.generateGetPresignedUrl.mockResolvedValue('url1');

      const result = await service.getAll('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'package-123',
        picturesUrl: ['url1', 'url1'],
        picturesKey: undefined,
      });
    });

    it('should yield undefined entries for non-array picturesKey (known quirk)', async () => {
      prisma.package.findMany.mockResolvedValue([
        { ...mockPackage, picturesKey: null },
      ]);

      const result = await service.getAll('user-123');

      expect(result).toEqual([undefined]);
    });
  });

  describe('update', () => {
    const updateDto: UpdatePackageDto = {
      finalPrice: 60000,
    } as any;

    it('should update package successfully', async () => {
      prisma.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.created,
        suggestedPrice: 50000,
      } as any);
      prisma.package.update.mockResolvedValue({ ...mockPackage, ...updateDto });

      const result = await service.update('package-123', updateDto);

      expect(result).toEqual({ ...mockPackage, ...updateDto });
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: updateDto,
      });
    });

    it('should throw when package status is invalid', async () => {
      prisma.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.matched,
        suggestedPrice: 50000,
      } as any);

      await expect(service.update('package-123', updateDto)).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BasePackageStatus} ${PackageStatusEnum.matched}.`,
        ),
      );
    });

    it('should throw when final price is below suggested price', async () => {
      prisma.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.created,
        suggestedPrice: 50000,
      } as any);

      await expect(
        service.update('package-123', { finalPrice: 40000 } as any),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.InvalidPrice),
      );
    });
  });

  describe('delete', () => {
    it('should soft-delete package successfully', async () => {
      prisma.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.created,
      } as any);
      prisma.package.update.mockResolvedValue({
        ...mockPackage,
        deletedAt: new Date(),
      });

      const result = await service.delete('package-123');

      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw when package status is invalid', async () => {
      prisma.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.matched,
      } as any);

      await expect(service.delete('package-123')).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BasePackageStatus} ${PackageStatusEnum.matched}.`,
        ),
      );
    });
  });

  describe('getMatchedTrips', () => {
    const session = {
      packages: [],
    } as any;

    it('should return matched trips with deviation info', async () => {
      const matchResults = [
        {
          tripId: 'trip-123',
          isRequestSent: false,
          score: 100,
          originDistance: 500,
          destinationDistance: 300,
          isOnCorridor: true,
        },
      ];

      service.getById = jest.fn().mockResolvedValue(mockPackage);
      matchingService.findMatchedTrips.mockResolvedValue(matchResults);
      tripService.getMultipleById.mockResolvedValue([mockTrip]);
      turfService.sortLocationsByRoute.mockReturnValue([] as any);
      mapService.calculateDistance.mockResolvedValue({
        distance: 12,
        duration: 35,
      });
      pricingService.calculateDeviationCost.mockReturnValue(5000);

      const result = await service.getMatchedTrips('package-123', session);

      expect(result).toHaveLength(1);
      expect(result[0]?.additionalPrice).toBe(5000);
    });

    it('should throw when package status is invalid', async () => {
      const invalidPackage = {
        ...mockPackage,
        status: PackageStatusEnum.matched,
      };

      service.getById = jest.fn().mockResolvedValue(invalidPackage);

      await expect(
        service.getMatchedTrips('package-123', session),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.SendRequestPackage),
      );
    });
  });

  describe('generatePackagePicPresignedUrl', () => {
    it('should resolve presigned urls for string keys', async () => {
      s3Service.generateGetPresignedUrl.mockResolvedValue('url1');

      const result = await service.generatePackagePicPresignedUrl(['pic1.jpg']);

      expect(result).toEqual(['url1']);
      expect(s3Service.generateGetPresignedUrl).toHaveBeenCalledWith(
        'pic1.jpg',
      );
    });

    it('should log and return empty string when key extraction fails', async () => {
      const loggerSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);
      s3Service.generateGetPresignedUrl.mockImplementation(() => {
        throw new Error('S3 down');
      });

      const result = await service.generatePackagePicPresignedUrl(['pic1.jpg']);

      expect(result).toEqual(['']);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to generate presigned URL for picturesKey[0]:',
        expect.any(Error),
      );
    });
  });
});
