import { Test, TestingModule } from '@nestjs/testing';
import { TripTrackingService } from './trip-tracking.service';
import { MapService } from '../../map/map.service';
import {
  PrismaClient,
  TripStatusEnum,
  PackageStatusEnum,
} from '../../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  BadRequestMessages,
  AuthMessages,
} from '../../../common/enums/messages.enum';
import { TurfService } from '../../turf/turf.service';
import { NotificationService } from '../../notification/notification.service';

describe('TripTrackingService', () => {
  let service: TripTrackingService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mapService: DeepMockProxy<MapService>;
  let turfService: DeepMockProxy<TurfService>;
  let notificationService: DeepMockProxy<NotificationService>;
  let runner: DeepMockProxy<TransactionRunner>;

  const mockTrip = {
    id: 'trip-123',
    status: TripStatusEnum.scheduled,
  } as any;

  const trackingDto = {
    latitude: '35.6892',
    longitude: '51.3890',
    city: 'Tehran',
    routeName: 'Azadi Square',
    description: 'Moving towards destination',
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    mapService = mockDeep<MapService>();
    turfService = mockDeep<TurfService>();
    notificationService = mockDeep<NotificationService>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapService, useValue: mapService },
        { provide: TurfService, useValue: turfService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<TripTrackingService>(TripTrackingService);
  });

  describe('addTripNote', () => {
    it('should add note to specific package', async () => {
      const tripWithMatches = {
        ...mockTrip,
        matchedRequests: [
          {
            packageId: 'package-123',
            transporterNotes: [],
            package: { senderId: 'user-123' },
          },
        ],
      };

      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithMatches);
      prisma.matchedRequest.update.mockResolvedValue({} as any);

      const result = await service.addTripNote(
        'trip-123',
        'Test note',
        'package-123',
      );

      expect(result.count).toBe(1);
      expect(prisma.matchedRequest.update).toHaveBeenCalledWith({
        where: { tripId: 'trip-123', packageId: 'package-123' },
        data: { transporterNotes: ['Test note'] },
      });
    });

    it('should throw when trip is completed', async () => {
      const completedTrip = {
        ...mockTrip,
        status: TripStatusEnum.completed,
        matchedRequests: [],
      };

      prisma.trip.findUniqueOrThrow.mockResolvedValue(completedTrip);

      await expect(
        service.addTripNote('trip-123', 'Test note'),
      ).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BaseTripStatus}*${TripStatusEnum.completed}*.`,
        ),
      );
    });

    it('should handle empty matched requests in addTripNote', async () => {
      const tripWithoutMatches = {
        ...mockTrip,
        matchedRequests: [],
      };

      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithoutMatches);

      const result = await service.addTripNote('trip-123', 'Test note');

      expect(result.count).toBe(0);
    });

    it('should handle partial delivery failures in addTripNote', async () => {
      jest.spyOn(Promise, 'allSettled').mockResolvedValue([
        { status: 'fulfilled', value: { id: 'matched-1' } as any },
        { status: 'rejected', reason: new Error('Database error') },
        { status: 'fulfilled', value: { id: 'matched-3' } as any },
      ]);

      const tripWithMatches = {
        ...mockTrip,
        matchedRequests: [
          {
            packageId: 'package-1',
            transporterNotes: [],
            package: { senderId: 'user-1' },
          },
          {
            packageId: 'package-2',
            transporterNotes: [],
            package: { senderId: 'user-2' },
          },
          {
            packageId: 'package-3',
            transporterNotes: [],
            package: { senderId: 'user-3' },
          },
        ],
      };

      prisma.trip.findUniqueOrThrow.mockResolvedValue(tripWithMatches);

      const result = await service.addTripNote('trip-123', 'Broadcast note');

      expect(result.count).toBe(2);

      jest.restoreAllMocks();
    });
  });

  describe('updateTracking', () => {
    it('should update tracking successfully', async () => {
      const tripWithMatches = {
        status: TripStatusEnum.in_progress,
        matchedRequests: [{ id: 'matched-1' }, { id: 'matched-2' }],
      };

      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce(
        tripWithMatches as any,
      );
      prisma.trackingUpdate.createMany.mockResolvedValue({ count: 2 });

      const result = await service.updateTracking('trip-123', trackingDto);

      expect(result.count).toBe(2);
      expect(prisma.trackingUpdate.createMany).toHaveBeenCalledWith({
        data: [
          { matchedRequestId: 'matched-1', ...trackingDto },
          { matchedRequestId: 'matched-2', ...trackingDto },
        ],
      });
    });

    it('should default to the injected client when no tx is provided', async () => {
      prisma.trip.findUniqueOrThrow.mockResolvedValueOnce({
        status: TripStatusEnum.in_progress,
        matchedRequests: [],
      } as any);
      prisma.trackingUpdate.createMany.mockResolvedValue({ count: 0 });

      const result = await service.updateTracking('trip-123', trackingDto);

      expect(result).toEqual({ count: 0 });
      expect(prisma.trip.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        select: { status: true, matchedRequests: true },
      });
    });
  });

  describe('getTripTracking', () => {
    it('should get trip tracking successfully', async () => {
      const trackingUpdates = [
        { id: 'tracking-1', city: 'Tehran', createdAt: new Date() },
      ];
      prisma.trackingUpdate.findMany.mockResolvedValue(trackingUpdates as any);

      const result = await service.getTripTracking('trip-123', 'package-123');

      expect(result).toEqual(trackingUpdates);
      expect(prisma.trackingUpdate.findMany).toHaveBeenCalledWith({
        where: {
          matchedRequest: { tripId: 'trip-123', packageId: 'package-123' },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('rateTrip', () => {
    const rateDto = {
      tripId: 'trip-123',
      packageId: 'package-123',
      rate: 5,
      comment: 'Great service!',
    };

    const mockRatingData = {
      senderRating: null,
      package: {
        senderId: 'user-123',
        status: PackageStatusEnum.delivered,
      },
      trip: {
        transporterId: 'transporter-123',
        transporter: {
          rate: 4.5,
          rateCount: 10,
        },
      },
    };

    it('should rate trip successfully', async () => {
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        mockRatingData as any,
      );
      prisma.transporter.update.mockResolvedValue({} as any);
      prisma.matchedRequest.update.mockResolvedValue({
        senderRating: 5,
      } as any);

      const result = await service.rateTrip('user-123', rateDto);

      expect(result.senderRating).toBe(5);
      expect(prisma.transporter.update).toHaveBeenCalledWith({
        where: { id: 'transporter-123' },
        data: {
          rate: (4.5 * 10 + 5) / 11, // New average
          rateCount: 11,
        },
      });
    });

    it('should throw when user is not the sender', async () => {
      const wrongUserRatingData = {
        ...mockRatingData,
        package: { ...mockRatingData.package, senderId: 'different-user' },
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        wrongUserRatingData as any,
      );

      await expect(service.rateTrip('user-123', rateDto)).rejects.toThrow(
        new ForbiddenException(`${AuthMessages.EntityAccessDenied} package.`),
      );
    });

    it('should throw when trip already rated', async () => {
      const alreadyRatedData = {
        ...mockRatingData,
        senderRating: 4,
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        alreadyRatedData as any,
      );

      await expect(service.rateTrip('user-123', rateDto)).rejects.toThrow(
        new BadRequestException(BadRequestMessages.AlreadyRatedTrip),
      );
    });

    it('should throw when package status is invalid', async () => {
      const invalidStatusData = {
        ...mockRatingData,
        package: {
          ...mockRatingData.package,
          status: PackageStatusEnum.matched,
        },
      };
      prisma.matchedRequest.findUniqueOrThrow.mockResolvedValue(
        invalidStatusData as any,
      );

      await expect(service.rateTrip('user-123', rateDto)).rejects.toThrow(
        new BadRequestException(
          `${BadRequestMessages.BasePackageStatus}*${PackageStatusEnum.matched}*.`,
        ),
      );
    });
  });

  describe('getDirections', () => {
    it('should build sorted waypoints and fetch directions', async () => {
      const origin = {
        latitude: '35.60',
        longitude: '51.30',
        name: 'Start',
      } as any;

      prisma.trip.findFirstOrThrow.mockResolvedValue({
        destination: { latitude: '35.95', longitude: '51.65', name: 'End' },
      } as any);

      // Two matched requests with pickup and delivery points
      prisma.matchedRequest.findMany.mockResolvedValue([
        {
          package: {
            id: 'package-1',
            status: PackageStatusEnum.matched,
            originAddress: { latitude: '35.70', longitude: '51.40' },
            recipient: { address: { latitude: '35.80', longitude: '51.50' } },
            pickupAtOrigin: true,
            deliveryAtDestination: true,
          },
        },
        {
          package: {
            id: 'package-2',
            status: PackageStatusEnum.matched,
            originAddress: { latitude: '35.65', longitude: '51.35' },
            recipient: { address: { latitude: '35.90', longitude: '51.60' } },
            pickupAtOrigin: true,
            deliveryAtDestination: true,
          },
        },
      ] as any);

      // First call used by the route sorter: return an ordering map keyed by package ids
      (turfService.sortLocationsByRoute as any).mockImplementationOnce(
        (_o, _d, _map) =>
          new Map<string, any>([
            ['package-2', { latitude: '35.65', longitude: '51.35' }],
            ['package-1', { latitude: '35.70', longitude: '51.40' }],
          ]),
      );

      // Second call sorts the final waypoints array
      (turfService.sortLocationsByRoute as any).mockImplementationOnce(
        (_o, _d, waypoints: any[]) => waypoints,
      );

      const mockedDirections = { polyline: 'encoded-polyline' } as any;
      mapService.getDirections.mockResolvedValue(mockedDirections);

      const result = await service.getDirections('trip-123', origin);

      expect(mapService.getDirections).toHaveBeenCalledWith({
        origin,
        destination: { latitude: '35.95', longitude: '51.65', name: 'End' },
        waypoints: [
          { latitude: '35.65', longitude: '51.35' },
          { latitude: '35.90', longitude: '51.60' },
          { latitude: '35.70', longitude: '51.40' },
          { latitude: '35.80', longitude: '51.50' },
        ],
      });
      expect(result).toBe(mockedDirections);
    });

    it('should return empty object when trip has no matched requests', async () => {
      const origin = { latitude: '35.60', longitude: '51.30' } as any;

      prisma.trip.findFirstOrThrow.mockResolvedValue({
        destination: { latitude: '35.95', longitude: '51.65', name: 'End' },
      } as any);
      prisma.matchedRequest.findMany.mockResolvedValue([]);

      const result = await service.getDirections('trip-123', origin);

      expect(result).toEqual({});
      expect(mapService.getDirections).not.toHaveBeenCalled();
    });
  });
});
