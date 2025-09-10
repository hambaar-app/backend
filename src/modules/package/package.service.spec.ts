import { Test, TestingModule } from '@nestjs/testing';
import { PackageService } from './package.service';
import { MatchingService } from './matching.service';
import { TripService } from '../trip/trip.service';
import { S3Service } from '../s3/s3.service';
import { TurfService } from '../turf/turf.service';
import { PricingService } from '../pricing/pricing.service';
import { MapService } from '../map/map.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { 
  PrismaClient, 
  PackageStatusEnum, 
  RequestStatusEnum, 
  TripStatusEnum,
} from '../../../generated/prisma';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthMessages, BadRequestMessages, NotFoundMessages } from '../../common/enums/messages.enum';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update.package.dto';
import { CreateRequestDto } from '../trip/dto/create-request.dto';
import * as utilities from '../../common/utilities';

jest.mock('../../common/utilities', () => ({
  formatPrismaError: jest.fn(),
}));

describe('PackageService', () => {
  let service: PackageService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let pricingService: DeepMockProxy<PricingService>;
  let matchingService: DeepMockProxy<MatchingService>;
  let tripService: DeepMockProxy<TripService>;
  let s3Service: DeepMockProxy<S3Service>;
  let turfService: DeepMockProxy<TurfService>;

  const mockCity = {
    id: 'city-123',
    name: 'تهران',
    province: {
      id: 'province-123',
      name: 'تهران'
    }
  } as any;

  const mockOriginAddress = {
    id: 'address-123',
    userId: 'user-123',
    title: 'خانه',
    latitude: 35.6892,
    longitude: 51.3890,
    city: 'تهران',
    province: 'تهران'
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
      postalCode: '1234567890'
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
    deletedAt: null
  } as any;

  const mockTrip = {
    id: 'trip-123',
    status: TripStatusEnum.scheduled,
    origin: { latitude: 35.6892, longitude: 51.3890 },
    destination: { latitude: 35.7219, longitude: 51.3347 },
    waypoints: [],
    normalDistanceKm: 10,
    normalDurationMin: 30,
    totalDeviationDurationMin: 0,
    matchedRequests: []
  } as any;

  const mockBreakdown = {
    basePrice: 20000,
    distanceCost: 15000,
    weightCost: 10000,
    specialHandlingCost: 0,
    cityPremiumCost: 5000
  };


  const mockMatchedRequest = {
    id: 'matched-123',
    tripId: 'trip-123',
    packageId: 'package-123',
    trackingCode: '17571445988911932924',
    deliveryCode: '12345',
    transporterNotes: [],
    pickupTime: null,
    deliveryTime: null,
    package: {
      id: 'package-123',
      status: PackageStatusEnum.matched,
      senderId: 'user-123',
      originAddress: {
        latitude: '35.6892',
        longitude: '51.3890',
        city: 'Tehran'
      },
      recipient: {
        address: {
          latitude: '35.7219',
          longitude: '51.3347',
          city: 'Tehran'
        }
      },
      breakdown: { baseCost: 100000, deviationCost: 0 }
    },
    trip: {
      status: TripStatusEnum.in_progress,
      transporter: {
        rate: 4.5,
        rateCount: 10,
        profilePictureKey: 'profile-pic-key',
        user: {
          firstName: 'Ahmad',
          lastName: 'Mohammadi',
          phoneNumber: '+989123456789'
        }
      },
      vehicle: {
        vehicleType: 'truck',
        model: { brand: { name: 'Volvo' } }
      }
    }
  } as any;

  beforeEach(async () => {
    jest.resetAllMocks();

    prismaService = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    pricingService = mockDeep<PricingService>();
    matchingService = mockDeep<MatchingService>();
    tripService = mockDeep<TripService>();
    s3Service = mockDeep<S3Service>();
    turfService = mockDeep<TurfService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MapService, useValue: mapService },
        { provide: PricingService, useValue: pricingService },
        { provide: MatchingService, useValue: matchingService },
        { provide: TripService, useValue: tripService },
        { provide: S3Service, useValue: s3Service },
        { provide: TurfService, useValue: turfService },
      ],
    }).compile();

    service = module.get<PackageService>(PackageService);
  });

  describe('createRecipient', () => {
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
        postalCode: '1234567890'
      },
      isHighlighted: true
    };

    it('should create recipient successfully', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      prismaService.packageRecipient.create.mockResolvedValue(mockRecipient);

      const result = await service.createRecipient('user-123', recipientDto);

      expect(result).toEqual(mockRecipient);
      expect(prismaService.city.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'city-123' },
        include: { province: true }
      });
      expect(prismaService.packageRecipient.create).toHaveBeenCalledWith({
        data: {
          fullName: 'علی احمدی',
          isHighlighted: true,
          phoneNumber: '+989123456788',
          address: {
            create: {
              userId: 'user-123',
              title: 'دفتر کار',
              city: 'تهران',
              province: 'تهران',
              street: 'خیابان ولیعصر',
              details: 'روبروی ساختمان قدیم',
              latitude: '35.7219',
              longitude: '51.3347',
              postalCode: '1234567890'
            }
          },
        },
        include: { address: true }
      });
    });

    it('should handle Prisma errors', async () => {
      const error = new Error('DB error');
      prismaService.$transaction.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.createRecipient('user-123', recipientDto))
        .rejects.toThrow('Formatted error');
    });
  });

  describe('getAllRecipients', () => {
    it('should return highlighted recipients', async () => {
      const recipients = [mockRecipient];
      prismaService.packageRecipient.findMany.mockResolvedValue(recipients);

      const result = await service.getAllRecipients('user-123');

      expect(result).toEqual(recipients);
      expect(prismaService.packageRecipient.findMany).toHaveBeenCalledWith({
        where: {
          address: { userId: 'user-123' },
          isHighlighted: true,
          OR: [
            {
              fullName: {
                contains: undefined,
                mode: 'insensitive'
              }
            },
            {
              address: {
                title: {
                  contains: undefined,
                  mode: 'insensitive'
                }
              }
            }
          ]
        },
        include: { address: true }
      });
    });

    it('should filter by search term', async () => {
      const recipients = [mockRecipient];
      prismaService.packageRecipient.findMany.mockResolvedValue(recipients);

      await service.getAllRecipients('user-123', 'علی');

      expect(prismaService.packageRecipient.findMany).toHaveBeenCalledWith({
        where: {
          address: { userId: 'user-123' },
          isHighlighted: true,
          OR: [
            {
              fullName: {
                contains: 'علی',
                mode: 'insensitive'
              }
            },
            {
              address: {
                title: {
                  contains: 'علی',
                  mode: 'insensitive'
                }
              }
            }
          ]
        },
        include: { address: true }
      });
    });
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
      picturesKey: ['pic1.jpg']
    } as any;

    it('should create package successfully', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.address.findFirst.mockResolvedValue(mockOriginAddress);
      prismaService.packageRecipient.findFirst.mockResolvedValue(mockRecipient);
      prismaService.package.create.mockResolvedValue(mockPackage);
      
      mapService.calculateDistance.mockResolvedValue({ distance: 15, duration: 25 });
      pricingService.calculateSuggestedPrice.mockReturnValue({
        suggestedPrice: 50000,
        breakdown: mockBreakdown
      });

      const result = await service.create('user-123', packageDto);

      expect(result).toEqual(mockPackage);
      expect(mapService.calculateDistance).toHaveBeenCalledWith({
        origin: {
          latitude: mockOriginAddress.latitude,
          longitude: mockOriginAddress.longitude
        },
        destination: {
          latitude: mockRecipient.address.latitude,
          longitude: mockRecipient.address.longitude
        }
      });
      expect(pricingService.calculateSuggestedPrice).toHaveBeenCalled();
    });

    it('should throw when origin address not found', async () => {      
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.address.findFirst.mockResolvedValue(null);

      await expect(service.create('user-123', packageDto))
        .rejects.toThrow(new ForbiddenException(`${AuthMessages.EntityAccessDenied} origin address.`));
    });

    it('should throw when recipient not found', async () => {      
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.address.findFirst.mockResolvedValue(mockOriginAddress);
      prismaService.packageRecipient.findFirst.mockResolvedValue(null);

      await expect(service.create('user-123', packageDto))
        .rejects.toThrow(new ForbiddenException(`${AuthMessages.EntityAccessDenied} recipient.`));
    });
  });

  describe('getById', () => {
    it('should return package with presigned URLs', async () => {
      const packageWithUrls = {
        ...mockPackage,
        picturesKey: ['pic1.jpg', 'pic2.jpg'],
        picturesUrl: ['url1', 'url2']
      };
      
      prismaService.package.findFirstOrThrow.mockResolvedValue(mockPackage);
      s3Service.generateGetPresignedUrl.mockResolvedValueOnce('url1').mockResolvedValueOnce('url2');

      const result = await service.getById('package-123');

      expect(result).toMatchObject(packageWithUrls);
    });
    // TODO: fix    
    // it('should handle S3 URL generation errors', async () => {
    //   prismaService.package.findFirstOrThrow.mockResolvedValue(mockPackage);
      
    //   s3Service.generateGetPresignedUrl.mockReset();
    //   s3Service.generateGetPresignedUrl
    //     .mockRejectedValue(new Error('S3 error'))
    //     .mockResolvedValueOnce('url2');

    //   const result = await service.getById('package-123');

    //   expect(result.picturesKey).toEqual({
    //     keys: ['pic1.jpg', 'pic2.jpg'],
    //     presignedUrls: ['', 'url2']
    //   });
    // });
  });

  describe('update', () => {
    const updateDto: UpdatePackageDto = {
      dimensions: '35x25x20',
      finalPrice: 60000
    };

    it('should update package successfully', async () => {
      const updatedPackage = { ...mockPackage, ...updateDto };
      
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.created,
        suggestedPrice: 50000
      } as any);
      prismaService.package.update.mockResolvedValue(updatedPackage);

      const result = await service.update('package-123', updateDto);

      expect(result).toEqual(updatedPackage);
      expect(prismaService.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: updateDto
      });
    });

    it('should throw when package status is invalid', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.matched,
        suggestedPrice: 50000
      } as any);

      await expect(service.update('package-123', updateDto))
        .rejects.toThrow(new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${PackageStatusEnum.matched}.`));
    });

    it('should throw when final price is below suggested price', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.created,
        suggestedPrice: 50000
      } as any);

      await expect(service.update('package-123', { finalPrice: 40000 }))
        .rejects.toThrow(new BadRequestException(BadRequestMessages.InvalidPrice));
    });
  });

  describe('delete', () => {
    it('should soft delete package successfully', async () => {
      const deletedPackage = { ...mockPackage, deletedAt: new Date() };
      
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.created
      } as any);
      prismaService.package.update.mockResolvedValue(deletedPackage);

      const result = await service.delete('package-123');

      expect(result.deletedAt).toBeDefined();
      expect(prismaService.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: { deletedAt: expect.any(Date) }
      });
    });

    it('should throw when package status is invalid', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findFirstOrThrow.mockResolvedValue({
        status: PackageStatusEnum.matched
      } as any);

      await expect(service.delete('package-123'))
        .rejects.toThrow(new BadRequestException(`${BadRequestMessages.BasePackageStatus} ${PackageStatusEnum.matched}.`));
    });
  });

  describe('getMatchedTrips', () => {
    const session = {
      packages: []
    } as any;

    it('should return matched trips with deviation info', async () => {
      const matchResults = [
        {
          tripId: 'trip-123',
          isRequestSent: false,
          score: 100,
          originDistance: 500,
          destinationDistance: 300,
          isOnCorridor: true
        }
      ];

      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      service.getById = jest.fn().mockResolvedValue(mockPackage);
      matchingService.findMatchedTrips.mockResolvedValue(matchResults);
      tripService.getMultipleById.mockResolvedValue([mockTrip]);
      turfService.sortLocationsByRoute.mockReturnValue([] as any);
      mapService.calculateDistance.mockResolvedValue({ distance: 12, duration: 35 });
      pricingService.calculateDeviationCost.mockReturnValue(5000);

      const result = await service.getMatchedTrips('package-123', session);

      expect(result).toHaveLength(1);
      expect(result[0]?.additionalPrice).toBe(5000);
    });

    it('should throw when package status is invalid', async () => {
      const invalidPackage = { ...mockPackage, status: PackageStatusEnum.matched };
      
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      service.getById = jest.fn().mockResolvedValue(invalidPackage);

      await expect(service.getMatchedTrips('package-123', session))
        .rejects.toThrow(new BadRequestException(BadRequestMessages.SendRequestPackage));
    });
  });

  describe('createRequest', () => {
    const requestDto: CreateRequestDto = {
      packageId: 'package-123',
      tripId: 'trip-123',
      senderNote: 'لطفا با دقت حمل کنید'
    };

    const session = {
      packages: [{
        id: 'package-123',
        matchResults: [{
          tripId: 'trip-123',
          isRequestSent: false,
          score: 100,
          originDistance: 500,
          destinationDistance: 300,
          isOnCorridor: true,
          deviationInfo: {
            distance: 2,
            duration: 5,
            additionalPrice: 3000
          }
        }]
      }]
    } as any;

    it('should create request successfully', async () => {
      const createdRequest = {
        id: 'request-123',
        packageId: 'package-123',
        tripId: 'trip-123',
        status: RequestStatusEnum.pending,
        offeredPrice: 45000,
        deviationCost: 3000
      };

      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        status: PackageStatusEnum.searching_transporter
      });
      prismaService.trip.findUniqueOrThrow.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.scheduled
      });
      prismaService.tripRequest.create.mockResolvedValue(createdRequest as any);
      pricingService.calculateTransporterEarnings.mockReturnValue(42000);

      const result = await service.createRequest('user-123', requestDto, session);

      expect(result).toEqual(createdRequest);
      expect(session.packages[0].matchResults[0].isRequestSent).toBe(true);
    });

    it('should throw when user does not own package', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        senderId: 'other-user'
      });

      await expect(service.createRequest('user-123', requestDto, session))
        .rejects.toThrow(new ForbiddenException(`${AuthMessages.EntityAccessDenied} package.`));
    });

    it('should throw when package status is invalid', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        status: PackageStatusEnum.matched
      });

      await expect(service.createRequest('user-123', requestDto, session))
        .rejects.toThrow(new BadRequestException(BadRequestMessages.SendRequestPackage));
    });

    it('should throw when trip status is invalid', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        status: PackageStatusEnum.searching_transporter
      });
      prismaService.trip.findUniqueOrThrow.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.completed
      });

      await expect(service.createRequest('user-123', requestDto, session))
        .rejects.toThrow(new BadRequestException(BadRequestMessages.SendRequestTrip));
    });

    it('should throw when no matched trips found', async () => {
      const emptySession = {
        packages: []
      } as any;

      prismaService.$transaction.mockImplementation(async (callback) => callback(prismaService));
      prismaService.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        status: PackageStatusEnum.searching_transporter
      });
      prismaService.trip.findUniqueOrThrow.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.scheduled
      });

      await expect(service.createRequest('user-123', requestDto, emptySession))
        .rejects.toThrow(new NotFoundException(NotFoundMessages.MatchedTrip));
    });
  });

  describe('getAllPackageRequests', () => {
    it('should return all package requests', async () => {
      const requests = [
        {
          id: 'request-1',
          packageId: 'package-123',
          status: RequestStatusEnum.pending
        },
        {
          id: 'request-2',
          packageId: 'package-123',
          status: RequestStatusEnum.accepted
        }
      ];

      prismaService.tripRequest.findMany.mockResolvedValue(requests as any);

      const result = await service.getAllPackageRequests('package-123');

      expect(result).toEqual(requests);
      expect(prismaService.tripRequest.findMany).toHaveBeenCalledWith({
        where: {
          packageId: 'package-123',
          status: {
            in: Object.values(RequestStatusEnum)
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    it('should filter by status', async () => {
      const pendingRequests = [
        {
          id: 'request-1',
          packageId: 'package-123',
          status: RequestStatusEnum.pending
        }
      ];

      prismaService.tripRequest.findMany.mockResolvedValue(pendingRequests as any);

      await service.getAllPackageRequests('package-123', [RequestStatusEnum.pending]);

      expect(prismaService.tripRequest.findMany).toHaveBeenCalledWith({
        where: {
          packageId: 'package-123',
          status: {
            in: [RequestStatusEnum.pending]
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });

  describe('updateRequest', () => {
    it('should cancel request and update session', async () => {
      const canceledRequest = {
        id: 'request-123',
        packageId: 'package-123',
        tripId: 'trip-123',
        status: RequestStatusEnum.canceled
      };

      const session = {
        packages: [{
          id: 'package-123',
          matchResults: [{
            tripId: 'trip-123',
            isRequestSent: true,
            score: 100,
            originDistance: 500,
            destinationDistance: 300,
            isOnCorridor: true
          }]
        }]
      } as any;

      prismaService.tripRequest.update.mockResolvedValue(canceledRequest as any);

      const result = await service.updateRequest('request-123', session);

      expect(result).toEqual(canceledRequest);
      expect(session.packages[0].matchResults[0].isRequestSent).toBe(false);
      expect(prismaService.tripRequest.update).toHaveBeenCalledWith({
        where: {
          id: 'request-123',
          status: RequestStatusEnum.pending
        },
        data: {
          status: RequestStatusEnum.canceled
        }
      });
    });

    it('should handle missing session data gracefully', async () => {
      const canceledRequest = {
        id: 'request-123',
        packageId: 'package-456',
        tripId: 'trip-789',
        status: RequestStatusEnum.canceled
      };

      const session = {
        packages: []
      } as any;

      prismaService.tripRequest.update.mockResolvedValue(canceledRequest as any);

      const result = await service.updateRequest('request-123', session);

      expect(result).toEqual(canceledRequest);
    });
  });

  describe('getTripTrackingByCode', () => {
    it('should get trip tracking by code successfully', async () => {
      const matchedRequestWithTracking = {
        ...mockMatchedRequest,
        trackingUpdates: [{ city: 'Tehran', createdAt: new Date() }]
      };
      
      prismaService.matchedRequest.findUniqueOrThrow.mockResolvedValue(matchedRequestWithTracking);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://s3.example.com/profile.jpg');

      const result = await service.getTrackingByCode('TRK123456789');

      expect(result.trackingUpdates).toBeDefined();
      expect(result.package).toBeDefined();
      expect(result.transporter).toBeDefined();
      expect(result.transporter.profilePictureUrl).toBe('https://s3.example.com/profile.jpg');
    });
  });

  describe('Error scenarios', () => {
    it('should handle Prisma errors in getAll', async () => {
      const error = new Error('DB error');
      prismaService.package.findMany.mockRejectedValue(error);
      ((utilities.formatPrismaError as unknown) as jest.Mock).mockImplementation(() => {
        throw new Error('Formatted error');
      });

      await expect(service.getAll('user-123'))
        .rejects.toThrow('Formatted error');
    });

    it('should handle empty picturesKey array', async () => {
      const packageWithoutPics = { ...mockPackage, picturesKey: [] };
      prismaService.package.findMany.mockResolvedValue([packageWithoutPics]);

      const result = await service.getAll('user-123');

      expect(result).toBeDefined();
    });

    it('should handle null picturesKey', async () => {
      const packageWithNullPics = { ...mockPackage, picturesKey: null };
      prismaService.package.findFirstOrThrow.mockResolvedValue(packageWithNullPics);

      const result = await service.getById('package-123');

      expect(result.picturesKey).toBeNull();
    });
  });
});