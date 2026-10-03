import { Test, TestingModule } from '@nestjs/testing';
import { TripService } from './trip.service';
import { TripTrackingService } from '../domain/trip-tracking.service';
import { FinancialService } from '../../financial/financial.service';
import { MapService } from '../../map/map.service';
import {
  PrismaClient,
  TripStatusEnum,
  TripTypeEnum,
  PackageStatusEnum,
} from '../../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  BadRequestMessages,
  AuthMessages,
  TrackingMessages,
} from '../../../common/enums/messages.enum';
import { NotificationService } from '../../notification/notification.service';

describe('TripService', () => {
  let service: TripService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let financialService: DeepMockProxy<FinancialService>;
  let notificationService: DeepMockProxy<NotificationService>;
  let runner: DeepMockProxy<TransactionRunner>;
  let trackingService: DeepMockProxy<TripTrackingService>;

  const mockVehicle = {
    id: 'vehicle-123',
    ownerId: 'transporter-123',
    owner: {
      userId: 'user-123',
    },
  } as any;

  const mockCity = {
    id: 'city-123',
    name: 'Tehran',
    latitude: '35.6892',
    longitude: '51.3890',
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
    matchedRequests: [],
  } as any;

  const mockCreateTripDto = {
    originId: 'city-origin',
    destinationId: 'city-dest',
    vehicleId: 'vehicle-123',
    departureTime: [new Date(), new Date(Date.now() + 3600000)] as [Date, Date],
    maxPackageWeightGr: 5000,
    restrictedItems: ['fragile'],
    description: 'Test trip',
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
        city: 'Tehran',
      },
      recipient: {
        address: {
          latitude: '35.7219',
          longitude: '51.3347',
          city: 'Tehran',
        },
      },
      breakdown: { baseCost: 100000, deviationCost: 0 },
    },
    trip: {
      status: TripStatusEnum.in_progress,
    },
  } as any;

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    financialService = mockDeep<FinancialService>();
    notificationService = mockDeep<NotificationService>();
    runner = mockDeep<TransactionRunner>();
    trackingService = mockDeep<TripTrackingService>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapService, useValue: mapService },
        { provide: FinancialService, useValue: financialService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransactionRunner, useValue: runner },
        { provide: TripTrackingService, useValue: trackingService },
      ],
    }).compile();

    service = module.get<TripService>(TripService);
  });

  describe('create', () => {
    it('should create trip successfully', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({
        distance: 100,
        duration: 120,
      });
      prisma.trip.create.mockResolvedValue(mockTrip);

      const result = await service.create('user-123', mockCreateTripDto);

      expect(result).toEqual(mockTrip);
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: 'vehicle-123', owner: { userId: 'user-123' } },
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
          normalDurationMin: 120,
        }),
      });
    });

    it('should create trip with waypoints', async () => {
      const tripDtoWithWaypoints = {
        ...mockCreateTripDto,
        waypoints: [{ id: 'way-1', name: 'Waypoint 1' }],
      };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({
        distance: 100,
        duration: 120,
      });
      prisma.trip.create.mockResolvedValue(mockTrip);

      await service.create('user-123', tripDtoWithWaypoints as any);

      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          waypoints: {
            createMany: {
              data: [{ id: 'way-1', name: 'Waypoint 1' }],
            },
          },
        }),
      });
    });

    it('should throw when vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-123', mockCreateTripDto),
      ).rejects.toThrow(
        new ForbiddenException(`${AuthMessages.EntityAccessDenied} vehicle.`),
      );
    });

    it('should run creation inside TransactionRunner', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({
        distance: 100,
        duration: 120,
      });
      prisma.trip.create.mockResolvedValue(mockTrip);

      await service.create('user-123', mockCreateTripDto);

      expect(runner.run).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('should get trip by id successfully', async () => {
      const tripWithIncludes = {
        ...mockTrip,
        waypoints: [{ id: 'way-1', isVisible: true }],
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
              color: true,
            },
          },
        },
      });
    });
  });

  describe('getMultipleById', () => {
    it('should get multiple trips by ids', async () => {
      const trips = [mockTrip];
      prisma.trip.findMany.mockResolvedValue(trips);

      const result = await service.getMultipleById(
        ['trip-123', 'trip-456'],
        prisma,
      );

      expect(result).toEqual(trips);
      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['trip-123', 'trip-456'] },
          status: TripStatusEnum.scheduled,
        },
        include: {
          origin: true,
          destination: true,
          waypoints: true,
          vehicle: {
            include: {
              model: { include: { brand: true } },
            },
          },
          matchedRequests: {
            include: {
              package: {
                include: {
                  originAddress: true,
                  recipient: { include: { address: true } },
                },
              },
            },
          },
        },
      });
    });

    it('should default to the injected client when no tx is provided', async () => {
      prisma.trip.findMany.mockResolvedValue([mockTrip]);

      const result = await service.getMultipleById(['trip-123']);

      expect(result).toEqual([mockTrip]);
      expect(prisma.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TripStatusEnum.scheduled,
          }),
        }),
      );
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
              TripStatusEnum.in_progress,
            ],
          },
          deletedAt: null,
        },
        include: {
          origin: true,
          destination: true,
          waypoints: { where: { isVisible: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should get all trips with custom status filter', async () => {
      const trips = [mockTrip];
      prisma.trip.findMany.mockResolvedValue(trips);

      await service.getAll('user-123', [TripStatusEnum.scheduled]);

      expect(prisma.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [TripStatusEnum.scheduled] },
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      maxPackageWeightGr: 6000,
      description: 'Updated description',
    };

    it('should update trip successfully', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        status: TripStatusEnum.scheduled,
      } as any);
      prisma.trip.update.mockResolvedValue({ ...mockTrip, ...updateDto });

      const result = await service.update('trip-123', updateDto);

      expect(result).toEqual({ ...mockTrip, ...updateDto });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: updateDto,
      });
    });

    it('should update trip with waypoints', async () => {
      const updateDtoWithWaypoints = {
        ...updateDto,
        waypoints: [{ id: 'way-2', name: 'New waypoint' }],
      };

      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        status: TripStatusEnum.scheduled,
      } as any);
      prisma.tripWaypoint.deleteMany.mockResolvedValue({ count: 1 });
      prisma.trip.update.mockResolvedValue(mockTrip);

      await service.update('trip-123', updateDtoWithWaypoints as any);

      expect(prisma.tripWaypoint.deleteMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-123', isVisible: true },
      });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: expect.objectContaining({
          waypoints: {
            createMany: {
              data: [{ id: 'way-2', name: 'New waypoint' }],
            },
          },
        }),
      });
    });

    it('should throw when trip status is not scheduled', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
      } as any);

      await expect(service.update('trip-123', updateDto)).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.in_progress}*.`,
        ),
      );
    });
  });

  describe('delete', () => {
    it('should delete trip successfully', async () => {
      const deletedTrip = { ...mockTrip, deletedAt: new Date() };
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        status: TripStatusEnum.scheduled,
      } as any);
      prisma.trip.update.mockResolvedValue(deletedTrip);

      const result = await service.delete('trip-123');

      expect(result).toEqual(deletedTrip);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw when trip status is not scheduled', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        status: TripStatusEnum.completed,
      } as any);

      await expect(service.delete('trip-123')).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`,
        ),
      );
    });
  });

  describe('toggleTripAccess', () => {
    it('should toggle from scheduled to closed', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        status: TripStatusEnum.scheduled,
      } as any);
      prisma.trip.update.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.closed,
      });

      const result = await service.toggleTripAccess('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.closed });
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { status: TripStatusEnum.closed },
      });
    });

    it('should toggle from closed to scheduled', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        status: TripStatusEnum.closed,
      } as any);
      prisma.trip.update.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.scheduled,
      });

      const result = await service.toggleTripAccess('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.scheduled });
    });

    it('should throw when trip status is invalid', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.completed,
      } as any);

      await expect(service.toggleTripAccess('trip-123')).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`,
        ),
      );
    });
  });

  describe('startTrip', () => {
    it('should start trip successfully', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.scheduled,
        origin: mockCity,
      } as any);
      trackingService.updateTracking.mockResolvedValue({ count: 2 });
      prisma.trip.update.mockResolvedValueOnce({
        ...mockTrip,
        status: TripStatusEnum.in_progress,
      });

      const result = await service.startTrip('trip-123');

      expect(result).toEqual({
        ...mockTrip,
        status: TripStatusEnum.in_progress,
      });
      expect(trackingService.updateTracking).toHaveBeenCalledWith(
        'trip-123',
        {
          city: 'Tehran',
          description: TrackingMessages.TripStarted,
        },
        prisma,
      );
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { status: TripStatusEnum.in_progress },
      });
    });

    it('should throw when trip status cannot start', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.completed,
        origin: mockCity,
      } as any);

      await expect(service.startTrip('trip-123')).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`,
        ),
      );
    });
  });

  describe('pickupPackage', () => {
    it('should pickup package successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValueOnce(
        mockMatchedRequest,
      );
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.in_transit,
      } as any);
      prisma.matchedRequest.update.mockResolvedValue({
        pickupTime: new Date(),
      } as any);
      prisma.trackingUpdate.create.mockResolvedValue({} as any);

      const result = await service.pickupPackage('trip-123', 'package-123');

      expect(result.packageStatus).toBe(PackageStatusEnum.in_transit);
      expect(result.pickupTime).toBeInstanceOf(Date);
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123', deletedAt: null },
        data: { status: PackageStatusEnum.in_transit },
      });
      expect(prisma.trackingUpdate.create).toHaveBeenCalledWith({
        data: {
          matchedRequestId: 'matched-123',
          latitude: '35.6892',
          longitude: '51.3890',
          city: 'Tehran',
          description: TrackingMessages.PackagePickedUp,
        },
      });
    });

    it('should throw when package status is invalid', async () => {
      const invalidMatchedRequest = {
        ...mockMatchedRequest,
        package: {
          ...mockMatchedRequest.package,
          status: PackageStatusEnum.delivered,
        },
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValueOnce(
        invalidMatchedRequest,
      );

      await expect(
        service.pickupPackage('trip-123', 'package-123'),
      ).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BasePackageStatus}*${PackageStatusEnum.delivered}*.`,
        ),
      );
    });

    it('should throw when trip status is invalid', async () => {
      const invalidMatchedRequest = {
        ...mockMatchedRequest,
        trip: { status: TripStatusEnum.completed },
      };

      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValueOnce(
        invalidMatchedRequest,
      );

      await expect(
        service.pickupPackage('trip-123', 'package-123'),
      ).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${PackageStatusEnum.matched}*.`,
        ),
      );
    });
  });

  describe('deliveryPackage', () => {
    const inTransitMatchedRequest = {
      ...mockMatchedRequest,
      package: {
        ...mockMatchedRequest.package,
        status: PackageStatusEnum.in_transit,
      },
    };

    it('should deliver package successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        inTransitMatchedRequest,
      );
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.delivered,
      } as any);
      prisma.matchedRequest.update.mockResolvedValue({
        deliveryTime: new Date(),
      } as any);
      prisma.trackingUpdate.create.mockResolvedValue({} as any);
      financialService.releaseEscrow.mockResolvedValue({} as any);

      const result = await service.deliveryPackage(
        'trip-123',
        'package-123',
        '12345',
      );

      expect(result.packageStatus).toBe(PackageStatusEnum.delivered);
      expect(result.deliveryTime).toBeInstanceOf(Date);
      expect(financialService.releaseEscrow).toHaveBeenCalledWith(
        'package-123',
        'trip-123',
        prisma,
      );
    });

    it('should throw when delivery code is wrong', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        inTransitMatchedRequest,
      );

      await expect(
        service.deliveryPackage('trip-123', 'package-123', '54321'),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.WrongDeliveryCode),
      );
    });

    it('should throw when package is not in transit', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockMatchedRequest,
      );

      await expect(
        service.deliveryPackage('trip-123', 'package-123', '12345'),
      ).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BasePackageStatus}*${PackageStatusEnum.matched}*.`,
        ),
      );
    });
  });

  describe('finishTrip', () => {
    it('should finish trip successfully', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ deliveryTime: new Date() }],
        transporter: {
          id: 'transporter-123',
          firstTripDate: null,
        },
      } as any);
      prisma.trip.update.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.completed,
      });
      prisma.transporter.update.mockResolvedValue({} as any);

      const result = await service.finishTrip('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.completed });
      expect(prisma.transporter.update).toHaveBeenCalledWith({
        where: { id: 'transporter-123' },
        data: { firstTripDate: expect.any(Date) },
      });
    });

    it('should finish trip successfully when transporter has firstTripDate', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ deliveryTime: new Date() }],
        transporter: {
          id: 'transporter-123',
          firstTripDate: new Date('2023-01-01'),
        },
      } as any);
      prisma.trip.update.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.completed,
      });
      prisma.transporter.update.mockResolvedValue({} as any);

      const result = await service.finishTrip('trip-123');

      expect(result).toEqual({ ...mockTrip, status: TripStatusEnum.completed });
      expect(prisma.transporter.update).toHaveBeenCalledWith({
        where: { id: 'transporter-123' },
        data: { lastTripDate: expect.any(Date) },
      });
    });

    it('should throw when not all packages are delivered', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ deliveryTime: null }],
        transporter: {
          id: 'transporter-123',
          firstTripDate: null,
        },
      } as any);

      await expect(service.finishTrip('trip-123')).rejects.toThrow(
        new BadRequestException(BadRequestMessages.CannotFinishTrip),
      );
    });

    it('should throw when trip is not in progress', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.scheduled,
        matchedRequests: [],
        transporter: { id: 'transporter-123', firstTripDate: null },
      } as any);

      await expect(service.finishTrip('trip-123')).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.scheduled}*.`,
        ),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty waypoints array in create', async () => {
      const tripDtoWithEmptyWaypoints = {
        ...mockCreateTripDto,
        waypoints: undefined,
      };

      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.city.findUniqueOrThrow.mockResolvedValue(mockCity);
      mapService.calculateDistance.mockResolvedValue({
        distance: 100,
        duration: 120,
      });
      prisma.trip.create.mockResolvedValue(mockTrip);

      await service.create('user-123', tripDtoWithEmptyWaypoints);

      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          waypoints: expect.anything(),
        }),
      });
    });
  });

  describe('Private method tests', () => {
    it('should update package status correctly', async () => {
      const updatedPackage = {
        id: 'package-123',
        status: PackageStatusEnum.in_transit,
      };
      prisma.package.update.mockResolvedValue(updatedPackage as any);

      const result = await service['updatePackageStatus'](
        'package-123',
        PackageStatusEnum.in_transit,
        prisma,
      );

      expect(result).toEqual(updatedPackage);
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123', deletedAt: null },
        data: { status: PackageStatusEnum.in_transit },
      });
    });

    it('should update trip status correctly', async () => {
      const updatedTrip = { ...mockTrip, status: TripStatusEnum.completed };
      prisma.trip.update.mockResolvedValue(updatedTrip);

      const result = await service['updateStatus'](
        'trip-123',
        TripStatusEnum.completed,
      );

      expect(result).toEqual(updatedTrip);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: { status: TripStatusEnum.completed },
      });
    });
  });
});
