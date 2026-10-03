import { Test, TestingModule } from '@nestjs/testing';
import { TripRequestService } from './trip-request.service';
import { S3Service } from '../../s3/s3.service';
import { FinancialService } from '../../financial/financial.service';
import {
  PrismaClient,
  TripStatusEnum,
  RequestStatusEnum,
  PackageStatusEnum,
} from '../../../../generated/prisma';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import * as utilities from '../../../common/utilities';
import { TurfService } from '../../turf/turf.service';
import { NotificationService } from '../../notification/notification.service';

jest.mock('../../../common/utilities', () => ({
  generateCode: jest.fn(() => 12345),
  generateUniqueCode: jest.fn(() => '17571445988911932924'),
}));

describe('TripRequestService', () => {
  let service: TripRequestService;
  let prisma: DeepMockProxy<PrismaClient>;
  let financialService: DeepMockProxy<FinancialService>;
  let s3Service: DeepMockProxy<S3Service>;
  let notificationService: DeepMockProxy<NotificationService>;
  let runner: DeepMockProxy<TransactionRunner>;
  let turfService: DeepMockProxy<TurfService>;

  const mockTrip = {
    id: 'trip-123',
    status: TripStatusEnum.scheduled,
  } as any;

  const mockTripRequest = {
    id: 'request-123',
    tripId: 'trip-123',
    packageId: 'package-123',
    status: RequestStatusEnum.pending,
    deviationDistanceKm: 10,
    deviationDurationMin: 15,
    deviationCost: 50000,
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
  } as any;

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    financialService = mockDeep<FinancialService>();
    s3Service = mockDeep<S3Service>();
    notificationService = mockDeep<NotificationService>();
    runner = mockDeep<TransactionRunner>();
    turfService = mockDeep<TurfService>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    // Reset utility mocks to default values
    (utilities.generateCode as jest.Mock).mockReturnValue(12345);
    (utilities.generateUniqueCode as jest.Mock).mockReturnValue(
      '17571445988911932924',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: FinancialService, useValue: financialService },
        { provide: S3Service, useValue: s3Service },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransactionRunner, useValue: runner },
        { provide: TurfService, useValue: turfService },
      ],
    }).compile();

    service = module.get<TripRequestService>(TripRequestService);
  });

  describe('updateRequest', () => {
    it('should reject request', async () => {
      const updatedRequest = {
        ...mockTripRequest,
        status: RequestStatusEnum.rejected,
      };
      prisma.tripRequest.update.mockResolvedValue({
        ...updatedRequest,
        package: { code: 'PKG-123', senderId: 'user-123' },
        trip: { code: 'TRIP-123' },
      });

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.rejected,
      } as any);

      expect(result).toEqual(updatedRequest);
      expect(prisma.tripRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-123' },
        data: { status: RequestStatusEnum.rejected },
        include: {
          package: {
            select: {
              code: true,
              senderId: true,
            },
          },
          trip: {
            select: {
              code: true,
            },
          },
        },
      });
    });

    it('should accept request and create matched request', async () => {
      const acceptedRequest = {
        ...mockTripRequest,
        status: RequestStatusEnum.accepted,
      };

      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: 0,
        totalDeviationDurationMin: 0,
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirstOrThrow.mockResolvedValue({
        breakdown: { baseCost: 100000, deviationCost: 0 },
        senderId: 'user-123',
      } as any);
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.matched,
      } as any);
      financialService.createEscrow.mockResolvedValue({} as any);

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.accepted,
        transporterNotes: ['Note 1'],
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(prisma.matchedRequest.create).toHaveBeenCalledWith({
        data: {
          requestId: 'request-123',
          packageId: 'package-123',
          tripId: 'trip-123',
          trackingCode: mockMatchedRequest.trackingCode,
          deliveryCode: mockMatchedRequest.deliveryCode,
          transporterNotes: ['Note 1'],
        },
      });
      expect(prisma.package.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: {
          status: PackageStatusEnum.matched,
          finalPrice: { increment: 50000 },
          breakdown: expect.any(Object),
        },
      });
    });

    it('should treat a non-rejected status as accept', async () => {
      const acceptedRequest = {
        ...mockTripRequest,
        status: RequestStatusEnum.accepted,
      };

      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: 0,
        totalDeviationDurationMin: 0,
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirstOrThrow.mockResolvedValue({
        breakdown: { baseCost: 100000, deviationCost: 0 },
        senderId: 'user-123',
      } as any);
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.matched,
      } as any);
      financialService.createEscrow.mockResolvedValue({} as any);

      const result = await service.updateRequest('request-123', {
        status: 'unknown-status',
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(prisma.matchedRequest.create).toHaveBeenCalled();
    });

    it('should handle null totals and breakdown in accept', async () => {
      const acceptedRequest = {
        ...mockTripRequest,
        status: RequestStatusEnum.accepted,
      };

      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: null,
        totalDeviationDurationMin: null,
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirstOrThrow.mockResolvedValue({
        breakdown: null,
        senderId: 'user-123',
      } as any);
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.matched,
      } as any);
      financialService.createEscrow.mockResolvedValue({} as any);

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.accepted,
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-123' },
        data: {
          totalDeviationDistanceKm: 10, // 0 + 10
          totalDeviationDurationMin: 15, // 0 + 15
        },
      });
    });

    it('should handle escrow creation failure gracefully', async () => {
      const acceptedRequest = {
        ...mockTripRequest,
        status: RequestStatusEnum.accepted,
      };

      prisma.tripRequest.update.mockResolvedValue(acceptedRequest);
      prisma.tripRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.matchedRequest.create.mockResolvedValue(mockMatchedRequest);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        totalDeviationDistanceKm: 0,
        totalDeviationDurationMin: 0,
      } as any);
      prisma.trip.update.mockResolvedValue(mockTrip);
      prisma.package.findFirstOrThrow.mockResolvedValue({
        breakdown: { baseCost: 100000, deviationCost: 0 },
        senderId: 'user-123',
      } as any);
      prisma.package.update.mockResolvedValue({
        status: PackageStatusEnum.matched,
      } as any);

      financialService.createEscrow.mockRejectedValue(
        new Error('Insufficient balance'),
      );

      const result = await service.updateRequest('request-123', {
        status: RequestStatusEnum.accepted,
      } as any);

      expect(result).toEqual(acceptedRequest);
      expect(financialService.createEscrow).toHaveBeenCalled();
    });

    it('should run accept and reject inside TransactionRunner', async () => {
      prisma.tripRequest.update.mockResolvedValue({
        ...mockTripRequest,
        package: { code: 'PKG-123', senderId: 'user-123' },
        trip: { code: 'TRIP-123' },
      });

      await service.updateRequest('request-123', {
        status: RequestStatusEnum.rejected,
      } as any);

      expect(runner.run).toHaveBeenCalledTimes(1);
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
        orderBy: { createdAt: 'asc' },
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
            picturesKey: ['key-1'],
          },
          request: { offeredPrice: 75000 },
          transporterNotes: ['Handle with care'],
          pickupTime: null,
          deliveryTime: null,
          paymentStatus: 'pending',
        },
      ];

      prisma.matchedRequest.findMany.mockResolvedValue(matchedRequests as any);
      s3Service.generateGetPresignedUrl.mockResolvedValue(
        'https://s3.example.com/key-1',
      );

      const result = await service.getAllMatchedRequests('trip-123');

      expect(result).toEqual([
        {
          package: {
            ...matchedRequests[0].package,
            picturesUrl: ['https://s3.example.com/key-1'],
            offeredPrice: 75000,
            picturesKey: undefined,
          },
          transporterNotes: ['Handle with care'],
          pickupTime: null,
          deliveryTime: null,
          paymentStatus: 'pending',
          request: undefined,
        },
      ]);
      expect(prisma.matchedRequest.findMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-123' },
        orderBy: { updatedAt: 'desc' },
        select: {
          package: {
            select: {
              id: true,
              code: true,
              sender: {
                select: {
                  firstName: true,
                  lastName: true,
                  gender: true,
                  phoneNumber: true,
                },
              },
              status: true,
              items: true,
              originAddress: true,
              recipient: { select: { address: true } },
              weight: true,
              dimensions: true,
              packageValue: true,
              isFragile: true,
              isPerishable: true,
              description: true,
              pickupAtOrigin: true,
              deliveryAtDestination: true,
              preferredPickupTime: true,
              preferredDeliveryTime: true,
              picturesKey: true,
            },
          },
          request: true,
          transporterNotes: true,
          pickupTime: true,
          deliveryTime: true,
          paymentStatus: true,
        },
      });
    });

    it('should return matched requests in route order when inOrder is true', async () => {
      const matchedRequests = [
        {
          package: {
            id: 'package-1',
            code: 'PKG-1',
            sender: {
              firstName: 'A',
              lastName: 'A',
              gender: 'male',
              phoneNumber: '+1',
            },
            status: PackageStatusEnum.matched,
            items: ['Item1'],
            originAddress: {
              latitude: '35.7',
              longitude: '51.4',
              city: 'Tehran',
            },
            recipient: {
              address: { latitude: '35.8', longitude: '51.5', city: 'Tehran' },
            },
            weight: 1,
            dimensions: { w: 1, h: 1, l: 1 } as any,
            packageValue: 100,
            isFragile: false,
            isPerishable: false,
            description: 'desc1',
            pickupAtOrigin: true,
            deliveryAtDestination: true,
            preferredPickupTime: null,
            preferredDeliveryTime: null,
            picturesKey: ['k1'],
          },
          request: { offeredPrice: 10000 },
          transporterNotes: [],
          pickupTime: null,
          deliveryTime: null,
          paymentStatus: 'pending',
        },
        {
          package: {
            id: 'package-2',
            code: 'PKG-2',
            sender: {
              firstName: 'B',
              lastName: 'B',
              gender: 'female',
              phoneNumber: '+2',
            },
            status: PackageStatusEnum.matched,
            items: ['Item2'],
            originAddress: {
              latitude: '35.6',
              longitude: '51.3',
              city: 'Tehran',
            },
            recipient: {
              address: { latitude: '35.9', longitude: '51.6', city: 'Tehran' },
            },
            weight: 2,
            dimensions: { w: 2, h: 2, l: 2 } as any,
            packageValue: 200,
            isFragile: true,
            isPerishable: false,
            description: 'desc2',
            pickupAtOrigin: true,
            deliveryAtDestination: true,
            preferredPickupTime: null,
            preferredDeliveryTime: null,
            picturesKey: ['k2'],
          },
          request: { offeredPrice: 20000 },
          transporterNotes: [],
          pickupTime: null,
          deliveryTime: null,
          paymentStatus: 'pending',
        },
      ];

      prisma.matchedRequest.findMany.mockResolvedValue(matchedRequests as any);
      prisma.trip.findFirstOrThrow.mockResolvedValue({
        origin: { latitude: '35.65', longitude: '51.35', name: 'Origin' },
        destination: {
          latitude: '35.95',
          longitude: '51.65',
          name: 'Destination',
        },
      } as any);

      (turfService.sortLocationsByRoute as any).mockImplementationOnce(
        (_o, _d, _locationsMap: Map<string, any>) =>
          new Map<string, any>([
            ['package-2', { latitude: '35.6', longitude: '51.3' }],
            ['package-1', { latitude: '35.7', longitude: '51.4' }],
          ]),
      );

      s3Service.generateGetPresignedUrl.mockImplementation(
        async (key: string) => `https://s3.example.com/${key}`,
      );

      const result = await service.getAllMatchedRequests('trip-123', true);

      expect(result.map((r) => r.package.id)).toEqual([
        'package-2',
        'package-1',
      ]);
      expect(result[0].package.picturesUrl).toEqual([
        'https://s3.example.com/k2',
      ]);
      expect(result[1].package.picturesUrl).toEqual([
        'https://s3.example.com/k1',
      ]);
    });
  });
});
