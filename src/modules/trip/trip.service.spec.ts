import { Test, TestingModule } from '@nestjs/testing';
import { TripService } from './trip.service';
import { S3Service } from '../s3/s3.service';
import { FinancialService } from '../financial/financial.service';
import { MapService } from '../map/map.service';
import { PrismaClient, TripStatusEnum, TripTypeEnum, RequestStatusEnum, PackageStatusEnum } from '../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BadRequestMessages, AuthMessages, TrackingMessages } from '../../common/enums/messages.enum';
import * as utilities from '../../common/utilities';

jest.mock('../../common/utilities', () => ({
  generateCode: jest.fn(() => 12345),
  generateUniqueCode: jest.fn(() => '17571445988911932924'),
  formatPrismaError: jest.fn(),
}));

describe('TripService', () => {
  let service: TripService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let financialService: DeepMockProxy<FinancialService>;
  let s3Service: DeepMockProxy<S3Service>;

  const mockVehicle = {
    id: 'vehicle-123',
    ownerId: 'transporter-123',
    owner: {
      userId: 'user-123'
    }
  } as any;

  const mockCity = {
    id: 'city-123',
    name: 'Tehran',
    latitude: '35.6892',
    longitude: '51.3890'
  } as any;

  const mockTrip = {
    id: 'trip-123',
    transporterId: 'transporter-123',
    originId: 'city-origin',
    destinationId: 'city-dest',
    vehicleId: 'vehicle-123',
    status: TripStatusEnum.scheduled,
    origin: mockCity,
    destination: mockCity,
    waypoints: [],
    vehicle: mockVehicle,
    normalDistanceKm: 100,
    normalDurationMin: 120,
    totalDeviationDistanceKm: 0,
    totalDeviationDurationMin: 0,
    matchedRequests: []
  } as any;

  const mockCreateTripDto = {
    originId: 'city-origin',
    destinationId: 'city-dest',
    vehicleId: 'vehicle-123',
    departureTime: [new Date(), new Date(Date.now() + 3600000)] as [Date, Date],
    maxPackageWeightGr: 5000,
    restrictedItems: ['fragile'],
    description: 'Test trip'
  };

  const mockTripRequest = {
    id: 'request-123',
    tripId: 'trip-123',
    packageId: 'package-123',
    status: RequestStatusEnum.pending,
    deviationDistanceKm: 10,
    deviationDurationMin: 15,
    deviationCost: 50000
  } as any;

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

  const trackingDto = {
    latitude: '35.6892',
    longitude: '51.3890',
    city: 'Tehran',
    routeName: 'Azadi Square',
    description: 'Moving towards destination'
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    financialService = mockDeep<FinancialService>();
    s3Service = mockDeep<S3Service>();

    // Reset utility mocks to default values
    (utilities.generateCode as jest.Mock).mockReturnValue(12345);
    (utilities.generateUniqueCode as jest.Mock).mockReturnValue('17571445988911932924');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapService, useValue: mapService },
        { provide: FinancialService, useValue: financialService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<TripService>(TripService);
  });

  describe('create', () => {
    it('should create trip successfully', async () => {
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({ distance: 100, duration: 120 });
      prisma.trip.create.mockResolvedValue(mockTrip);

      const result = await service.create('user-123', mockCreateTripDto);

      expect(result).toEqual(mockTrip);
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: 'vehicle-123', owner: { userId: 'user-123' } }
      });
      expect(mapService.calculateDistance).toHaveBeenCalled();
      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transporterId: 'transporter-123',
          originId: 'city-origin',
          destinationId: 'city-dest',
          vehicleId: 'vehicle-123',
          tripType: TripTypeEnum.intercity,
          normalDistanceKm: 100,
          normalDurationMin: 120
        })
      });
    });

    it('should create trip with waypoints', async () => {
      const tripDtoWithWaypoints = {
        ...mockCreateTripDto,
        waypoints: [{ id: 'way-1', name: 'Waypoint 1' }]
      };

      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({ distance: 100, duration: 120 });
      prisma.trip.create.mockResolvedValue(mockTrip);

      await service.create('user-123', tripDtoWithWaypoints as any);

      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          waypoints: {
            createMany: {
              data: [{ id: 'way-1', name: 'Waypoint 1' }]
            }
          }
        })
      });
    });

    it('should throw when vehicle not found', async () => {
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.create('user-123', mockCreateTripDto)).rejects.toThrow(
        new ForbiddenException(`${AuthMessages.EntityAccessDenied} vehicle.`)
      );
    });
  });

  describe('getById', () => {
    it('should get trip by id successfully', async () => {
      const tripWithIncludes = {
        ...mockTrip,
        waypoints: [{ id: 'way-1', isVisible: true }]
      };
      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithIncludes);

      const result = await service.getById('trip-123');

      expect(result).toEqual(tripWithIncludes);
      expect(prisma.trip.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        include: {
          origin: true,
          destination: true,
          waypoints: { where: { isVisible: true } },
          vehicle: {
            select: {
              vehicleType: true,
              model: { include: { brand: true } },
              manufactureYear: true,
              color: true
            }
          }
        }
      });
    });
  });

  describe('getAll', () => {
    it('should get all trips with default status filter', async () => {
      const trips = [mockTrip];
      prisma.trip.findMany.mockResolvedValue(trips);

      const result = await service.getAll('user-123');

      expect(result).toEqual(trips);
      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          transporter: { userId: 'user-123' },
          status: {
            in: [
              TripStatusEnum.scheduled,
              TripStatusEnum.closed,
              TripStatusEnum.delayed,
              TripStatusEnum.in_progress
            ]
          },
          deletedAt: null
        },
        include: {
          origin: true,
          destination: true,
          waypoints: { where: { isVisible: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should get all trips with custom status filter', async () => {
      const trips = [mockTrip];
      prisma.trip.findMany.mockResolvedValue(trips);

      await service.getAll('user-123', [TripStatusEnum.scheduled]);

      expect(prisma.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [TripStatusEnum.scheduled] }
          })
        })
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      maxPackageWeightGr: 6000,
      description: 'Updated description'
    };

    it('should update trip successfully', async () => {
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.trip.findUniqueOrThrow.mockResolvedValue({ status: TripStatusEnum.scheduled } as any);
      prisma.trip.update.mockResolvedValue({ ...mockTrip, ...updateDto });

      const result = await service.update('trip-123', updateDto);

      expect(result).toEqual({ ...mockTrip, ...updateDto });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: updateDto
      });
    });

    it('should update trip with waypoints', async () => {
      const updateDtoWithWaypoints = {
        ...updateDto,
        waypoints: [{ id: 'way-2', name: 'New waypoint' }]
      };

      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.trip.findUniqueOrThrow.mockResolvedValue({ status: TripStatusEnum.scheduled } as any);
      prisma.tripWaypoint.deleteMany.mockResolvedValue({ count: 1 });
      prisma.trip.update.mockResolvedValue(mockTrip);

      await service.update('trip-123', updateDtoWithWaypoints as any);

      expect(prisma.tripWaypoint.deleteMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-123', isVisible: true }
      });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: expect.objectContaining({
          waypoints: {
            createMany: {
              data: [{ id: 'way-2', name: 'New waypoint' }]
            }
          }
        })
      });
    });

    it('should throw when trip status is not scheduled', async () => {
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({ status: TripStatusEnum.in_progress } as any);

      await expect(service.update('trip-123', updateDto)).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.in_progress}*.`)
      );
    });
  });

  describe('delete', () => {
    it('should delete trip successfully', async () => {
      const deletedTrip = { ...mockTrip, deletedAt: new Date() };
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.trip.findUniqueOrThrow.mockResolvedValue({ status: TripStatusEnum.scheduled } as any);
      prisma.trip.update.mockResolvedValue(deletedTrip);

      const result = await service.delete('trip-123');

      expect(result).toEqual(deletedTrip);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { deletedAt: expect.any(Date) }
      });
    });

    it('should throw when trip status is not scheduled', async () => {
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.trip.findUniqueOrThrow.mockResolvedValue({ status: TripStatusEnum.completed } as any);

      await expect(service.delete('trip-123')).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`)
      );
    });
  });

  describe('getAllTripRequests', () => {
    it('should get all pending trip requests', async () => {
      const requests = [mockTripRequest];
      prisma.tripRequest.findMany.mockResolvedValue(requests);

      const result = await service.getAllTripRequests('trip-123');

      expect(result).toEqual(requests);
      expect(prisma.tripRequest.findMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-123', status: RequestStatusEnum.pending },
        orderBy: { createdAt: 'asc' }
      });
    });
  });

  describe('updateRequest', () => {
    it('should reject request', async () => {
      const updatedRequest = { ...mockTripRequest, status: RequestStatusEnum.rejected };
      prisma.tripRequest.update.mockResolvedValue(updatedRequest);

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.rejected
      } as any);

      expect(result).toEqual(updatedRequest);
      expect(prisma.tripRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-123' },
        data: { status: RequestStatusEnum.rejected }
      });
    });

    it('should accept request and create matched request', async () => {
      const acceptedRequest = { ...mockTripRequest, status: RequestStatusEnum.accepted };
      
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: 0,
        totalDeviationDurationMin: 0
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirst.mockResolvedValue({
        breakdown: { baseCost: 100000, deviationCost: 0 }
      } as any);
      prisma.package.update.mockResolvedValue({ status: PackageStatusEnum.matched } as any);
      financialService.createEscrow.mockResolvedValue({} as any);

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.accepted,
        transporterNotes: ['Note 1']
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(prisma.matchedRequest.create).toHaveBeenCalledWith({
        data: {
          requestId: 'request-123',
          packageId: 'package-123',
          tripId: 'trip-123',
          trackingCode: mockMatchedRequest.trackingCode,
          deliveryCode: mockMatchedRequest.deliveryCode,
          transporterNotes: ['Note 1']
        }
      });
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: {
          status: PackageStatusEnum.matched,
          finalPrice: { increment: 50000 },
          breakdown: expect.any(Object)
        }
      });
    });
  });

  describe('toggleTripAccess', () => {
    it('should toggle from scheduled to closed', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValue({ status: TripStatusEnum.scheduled } as any);
      prisma.trip.update.mockResolvedValue({ ...mockTrip, status: TripStatusEnum.closed });

      const result = await service.toggleTripAccess('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.closed });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { status: TripStatusEnum.closed }
      });
    });

    it('should toggle from closed to scheduled', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValue({ status: TripStatusEnum.closed } as any);
      prisma.trip.update.mockResolvedValue({ ...mockTrip, status: TripStatusEnum.scheduled });

      const result = await service.toggleTripAccess('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.scheduled });
    });

    it('should throw when trip status is invalid', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.completed,
      } as any);

      await expect(service.toggleTripAccess('trip-123')).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`)
      );
    });
  });

  describe('startTrip', () => {
    it('should start trip successfully', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.scheduled,
        origin: mockCity
      } as any);
      
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.scheduled,
        matchedRequests: [{ id: 'matched-1' }, { id: 'matched-2' }]
      } as any);
      
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.trip.update.mockResolvedValueOnce({ ...mockTrip, status: TripStatusEnum.in_progress });
      prisma.trackingUpdate.createMany.mockResolvedValue({ count: 2 });

      const result = await service.startTrip('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.in_progress });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { status: TripStatusEnum.in_progress }
      });
      expect(prisma.trackingUpdate.createMany).toHaveBeenCalledWith({
        data: [
          {
            matchedRequestId: 'matched-1',
            city: 'Tehran',
            description: TrackingMessages.TripStarted
          },
          {
            matchedRequestId: 'matched-2',
            city: 'Tehran',
            description: TrackingMessages.TripStarted
          }
        ]
      });
    });
  });

  describe('pickupPackage', () => {
    it('should pickup package successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValueOnce(mockMatchedRequest);
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.in_transit
      } as any);
      prisma.matchedRequest.update.mockResolvedValue({
        pickupTime: new Date()
      } as any);
      prisma.trackingUpdate.create.mockResolvedValue({} as any);

      const result = await service.pickupPackage('trip-123', 'package-123');

      expect(result.packageStatus).toBe(PackageStatusEnum.in_transit);
      expect(result.pickupTime).toBeInstanceOf(Date);
      expect(prisma.trackingUpdate.create).toHaveBeenCalledWith({
        data: {
          matchedRequestId: 'matched-123',
          latitude: '35.6892',
          longitude: '51.3890',
          city: 'Tehran',
          description: TrackingMessages.PackagePickedUp
        }
      });
    });

    it('should throw when package status is invalid', async () => {
      const invalidMatchedRequest = {
        ...mockMatchedRequest,
        package: { ...mockMatchedRequest.package, status: PackageStatusEnum.delivered }
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValueOnce(invalidMatchedRequest);

      await expect(service.pickupPackage('trip-123', 'package-123')).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BasePackageStatus}*${PackageStatusEnum.delivered}*.`)
      );
    });

    it('should throw when trip status is invalid', async () => {
      const invalidMatchedRequest = {
        ...mockMatchedRequest,
        trip: { status: TripStatusEnum.completed }
      };
      
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValueOnce(invalidMatchedRequest);

      await expect(service.pickupPackage('trip-123', 'package-123')).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${PackageStatusEnum.matched}*.`)
      );
    });
  });

  describe('deliveryPackage', () => {
    const inTransitMatchedRequest = {
      ...mockMatchedRequest,
      package: {
        ...mockMatchedRequest.package,
        status: PackageStatusEnum.in_transit
      }
    };

    it('should deliver package successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(inTransitMatchedRequest);
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.delivered
      } as any);
      prisma.matchedRequest.update.mockResolvedValue({
        deliveryTime: new Date()
      } as any);
      prisma.trackingUpdate.create.mockResolvedValue({} as any);
      financialService.releaseEscrow.mockResolvedValue({} as any);

      const result = await service.deliveryPackage('trip-123', 'package-123', '12345');

      expect(result.packageStatus).toBe(PackageStatusEnum.delivered);
      expect(result.deliveryTime).toBeInstanceOf(Date);
      expect(financialService.releaseEscrow).toHaveBeenCalledWith('package-123', 'trip-123', prisma);
    });

    it('should throw when delivery code is wrong', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(inTransitMatchedRequest);

      await expect(service.deliveryPackage('trip-123', 'package-123', '54321')).rejects.toThrow(
        new BadRequestException(BadRequestMessages.WrongDeliveryCode)
      );
    });
  });

  describe('finishTrip', () => {
    it('should finish trip successfully', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ deliveryTime: new Date() }]
      } as any);
      prisma.trip.update.mockResolvedValue({ ...mockTrip, status: TripStatusEnum.completed });

      const result = await service.finishTrip('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.completed });
    });

    it('should throw when not all packages are delivered', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ deliveryTime: null }]
      } as any);

      await expect(service.finishTrip('trip-123')).rejects.toThrow(
        new BadRequestException(BadRequestMessages.CannotFinishTrip)
      );
    });
  });

  describe('addTripNote', () => {
    it('should add note to specific package', async () => {
      const tripWithMatches = {
        ...mockTrip,
        matchedRequests: [{ packageId: 'package-123', transporterNotes: [] }]
      };
      
      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithMatches);
      prisma.matchedRequest.update.mockResolvedValue({} as any);

      const result = await service.addTripNote('trip-123', 'Test note', 'package-123');

      expect(result.count).toBe(1);
      expect(prisma.matchedRequest.update).toHaveBeenCalledWith({
        where: { tripId: 'trip-123', packageId: 'package-123' },
        data: { transporterNotes: ['Test note'] }
      });
    });

    it('should throw when trip is completed', async () => {
      const completedTrip = {
        ...mockTrip,
        status: TripStatusEnum.completed,
        matchedRequests: []
      };
      
      prisma.trip.findUniqueOrThrow.mockResolvedValue(completedTrip);

      await expect(service.addTripNote('trip-123', 'Test note')).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`)
      );
    });
  });

  describe('getTripTracking', () => {
    it('should get trip tracking successfully', async () => {
      const trackingUpdates = [
        { id: 'tracking-1', city: 'Tehran', createdAt: new Date() }
      ];
      prisma.trackingUpdate.findMany.mockResolvedValue(trackingUpdates as any);

      const result = await service.getTripTracking('trip-123', 'package-123');

      expect(result).toEqual(trackingUpdates);
      expect(prisma.trackingUpdate.findMany).toHaveBeenCalledWith({
        where: {
          matchedRequest: { tripId: 'trip-123', packageId: 'package-123' },
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('rateTrip', () => {
    const rateDto = {
      tripId: 'trip-123',
      packageId: 'package-123',
      rate: 5,
      comment: 'Great service!'
    };

    const mockRatingData = {
      senderRating: null,
      package: {
        senderId: 'user-123',
        status: PackageStatusEnum.delivered
      },
      trip: {
        transporterId: 'transporter-123',
        transporter: {
          rate: 4.5,
          rateCount: 10
        }
      }
    };

    it('should rate trip successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(mockRatingData as any);
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.transporter.update.mockResolvedValue({} as any);
      prisma.matchedRequest.update.mockResolvedValue({ senderRating: 5 } as any);

      const result = await service.rateTrip('user-123', rateDto);

      expect(result.senderRating).toBe(5);
      expect(prisma.transporter.update).toHaveBeenCalledWith({
        where: { id: 'transporter-123' },
        data: {
          rate: (4.5 * 10 + 5) / 11, // New average
          rateCount: 11
        }
      });
    });

    it('should throw when user is not the sender', async () => {
      const wrongUserRatingData = {
        ...mockRatingData,
        package: { ...mockRatingData.package, senderId: 'different-user' }
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(wrongUserRatingData as any);

      await expect(service.rateTrip('user-123', rateDto)).rejects.toThrow(
        new ForbiddenException(`${AuthMessages.EntityAccessDenied} package.`)
      );
    });

    it('should throw when trip already rated', async () => {
      const alreadyRatedData = {
        ...mockRatingData,
        senderRating: 4
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(alreadyRatedData as any);

      await expect(service.rateTrip('user-123', rateDto)).rejects.toThrow(
        new BadRequestException(BadRequestMessages.AlreadyRatedTrip)
      );
    });

    it('should throw when package status is invalid', async () => {
      const invalidStatusData = {
        ...mockRatingData,
        package: { ...mockRatingData.package, status: PackageStatusEnum.matched }
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(invalidStatusData as any);

      await expect(service.rateTrip('user-123', rateDto)).rejects.toThrow(
        new BadRequestException(`${BadRequestMessages.BasePackageStatus}*${PackageStatusEnum.matched}*.`)
      );
    });
  });

  describe('updateTracking', () => {
    it('should update tracking successfully', async () => {
      const tripWithMatches = {
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ id: 'matched-1' }, { id: 'matched-2' }]
      };
      
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce(tripWithMatches as any);
      prisma.trackingUpdate.createMany.mockResolvedValue({ count: 2 });

      const result = await service.updateTracking('trip-123', trackingDto);

      expect(result.count).toBe(2);
      expect(prisma.trackingUpdate.createMany).toHaveBeenCalledWith({
        data: [
          { matchedRequestId: 'matched-1', ...trackingDto },
          { matchedRequestId: 'matched-2', ...trackingDto }
        ]
      });
    });
  });

  describe('getMultipleById', () => {
    it('should get multiple trips by ids', async () => {
      const trips = [mockTrip];
      prisma.trip.findMany.mockResolvedValue(trips);

      const result = await service.getMultipleById(['trip-123', 'trip-456']);

      expect(result).toEqual(trips);
      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['trip-123', 'trip-456'] },
          status: TripStatusEnum.scheduled
        },
        include: {
          origin: true,
          destination: true,
          waypoints: true,
          vehicle: {
            include: {
              model: { include: { brand: true } }
            }
          },
          matchedRequests: {
            include: {
              package: {
                include: {
                  originAddress: true,
                  recipient: { include: { address: true } }
                }
              }
            }
          }
        }
      });
    });
  });

  describe('getAllMatchedRequests', () => {
    it('should get all matched requests for a trip', async () => {
      const matchedRequests = [
        {
          package: {
            id: 'package-123',
            sender: { firstName: 'Ahmad', lastName: 'Mohammadi' },
            items: ['Electronics'],
            weight: 2.5,
            picturesKey: ['key-1']
          },
          request: { offeredPrice: 75000 },
          transporterNotes: ['Handle with care'],
          pickupTime: null,
          deliveryTime: null,
          paymentStatus: 'pending'
        }
      ];
      
      prisma.matchedRequest.findMany.mockResolvedValue(matchedRequests as any);
      s3Service.generateGetPresignedUrl.mockResolvedValue('https://s3.example.com/key-1');

      const result = await service.getAllMatchedRequests('trip-123');

      expect(result).toEqual([
        {
          package: {
            ...matchedRequests[0].package,
            picturesUrl: ['https://s3.example.com/key-1'],
            offeredPrice: 75000,
            picturesKey: undefined
          },
          transporterNotes: ['Handle with care'],
          pickupTime: null,
          deliveryTime: null,
          paymentStatus: 'pending',
          request: undefined
        }
      ]);
      expect(prisma.matchedRequest.findMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-123' },
        orderBy: { updatedAt: 'desc' },
        select: {
          package: {
            select: {
              id: true,
              sender: {
                select: {
                  firstName: true,
                  lastName: true,
                  gender: true,
                  phoneNumber: true
                }
              },
              items: true,
              originAddress: true,
              recipient: true,
              weight: true,
              dimensions: true,
              status: true,
              packageValue: true,
              isFragile: true,
              isPerishable: true,
              description: true,
              pickupAtOrigin: true,
              deliveryAtDestination: true,
              preferredPickupTime: true,
              preferredDeliveryTime: true,
              picturesKey: true
            }
          },
          request: true,
          transporterNotes: true,
          pickupTime: true,
          deliveryTime: true,
          paymentStatus: true
        }
      });
    });
  });

  describe('Error handling', () => {
    it('should handle escrow creation failure gracefully', async () => {
      const acceptedRequest = { ...mockTripRequest, status: RequestStatusEnum.accepted };
      
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: 0,
        totalDeviationDurationMin: 0
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirst.mockResolvedValue({
        breakdown: { baseCost: 100000, deviationCost: 0 }
      } as any);
      prisma.package.update.mockResolvedValue({ status: PackageStatusEnum.matched } as any);
      
      financialService.createEscrow.mockRejectedValue(new Error('Insufficient balance'));

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.accepted
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(financialService.createEscrow).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty waypoints array in create', async () => {
      const tripDtoWithEmptyWaypoints = {
        ...mockCreateTripDto,
        waypoints: undefined
      };

      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({ distance: 100, duration: 120 });
      prisma.trip.create.mockResolvedValue(mockTrip);

      await service.create('user-123', tripDtoWithEmptyWaypoints);

      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          waypoints: expect.anything()
        })
      });
    });

    it('should handle null breakdown in updateRequest', async () => {
      const acceptedRequest = { ...mockTripRequest, status: RequestStatusEnum.accepted };
      
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: null,
        totalDeviationDurationMin: null
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirst.mockResolvedValue({ breakdown: null } as any);
      prisma.package.update.mockResolvedValue({ status: PackageStatusEnum.matched } as any);
      financialService.createEscrow.mockResolvedValue({} as any);

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.accepted
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: {
          totalDeviationDistanceKm: 10, // 0 + 10
          totalDeviationDurationMin: 15  // 0 + 15
        }
      });
    });

    it('should handle empty matched requests in addTripNote', async () => {
      const tripWithoutMatches = {
        ...mockTrip,
        matchedRequests: []
      };
      
      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithoutMatches);

      const result = await service.addTripNote('trip-123', 'Test note');

      expect(result.count).toBe(0);
    });

    it('should handle partial delivery failures in getAllMatchedRequests', async () => {
      jest.spyOn(Promise, 'allSettled').mockResolvedValue([
        { status: 'fulfilled', value: { id: 'matched-1' } as any },
        { status: 'rejected', reason: new Error('Database error') },
        { status: 'fulfilled', value: { id: 'matched-3' } as any }
      ]);

      const tripWithMatches = {
        ...mockTrip,
        matchedRequests: [
          { packageId: 'package-1', transporterNotes: [] },
          { packageId: 'package-2', transporterNotes: [] },
          { packageId: 'package-3', transporterNotes: [] }
        ]
      };
      
      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithMatches);

      const result = await service.addTripNote('trip-123', 'Broadcast note');

      expect(result.count).toBe(2);

      jest.restoreAllMocks();
    });
  });

  describe('Private method tests', () => {
    it('should update package status correctly', async () => {
      const updatedPackage = { id: 'package-123', status: PackageStatusEnum.in_transit };
      prisma.package.update.mockResolvedValue(updatedPackage as any);

      const result = await service['updatePackageStatus']('package-123', PackageStatusEnum.in_transit);

      expect(result).toEqual(updatedPackage);
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123', deletedAt: null },
        data: { status: PackageStatusEnum.in_transit }
      });
    });

    it('should update trip status correctly', async () => {
      const updatedTrip = { ...mockTrip, status: TripStatusEnum.completed };
      prisma.trip.update.mockResolvedValue(updatedTrip);

      const result = await service['updateStatus']('trip-123', TripStatusEnum.completed);

      expect(result).toEqual(updatedTrip);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { status: TripStatusEnum.completed }
      });
    });
  });
});