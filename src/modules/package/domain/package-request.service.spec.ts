import { Test, TestingModule } from '@nestjs/testing';
import { PackageRequestService } from './package-request.service';
import { PricingService } from '../../pricing/pricing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionRunner } from '../../prisma/transaction-runner';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  PrismaClient,
  PackageStatusEnum,
  RequestStatusEnum,
  TripStatusEnum,
} from '../../../../generated/prisma';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthMessages,
  BadRequestMessages,
  NotFoundMessages,
} from '../../../common/enums/messages.enum';
import { CreateRequestDto } from '../../trip/dto/create-request.dto';
import { NotificationService } from '../../notification/notification.service';

describe('PackageRequestService', () => {
  let service: PackageRequestService;
  let prisma: DeepMockProxy<PrismaClient>;
  let pricingService: DeepMockProxy<PricingService>;
  let notificationService: DeepMockProxy<NotificationService>;
  let runner: DeepMockProxy<TransactionRunner>;

  const mockPackage = {
    id: 'package-123',
    senderId: 'user-123',
    status: PackageStatusEnum.searching_transporter,
    finalPrice: 50000,
    code: 1001,
  } as any;

  const mockTrip = {
    id: 'trip-123',
    status: TripStatusEnum.scheduled,
    code: 2001,
  } as any;

  function sessionWithMatch(isRequestSent = false) {
    return {
      packages: [
        {
          id: 'package-123',
          matchResults: [
            {
              tripId: 'trip-123',
              isRequestSent,
              score: 100,
              originDistance: 500,
              destinationDistance: 300,
              isOnCorridor: true,
              deviationInfo: {
                distance: 2,
                duration: 5,
                additionalPrice: 3000,
              },
            },
          ],
        },
      ],
    } as any;
  }

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma = mockDeep<PrismaClient>();
    pricingService = mockDeep<PricingService>();
    notificationService = mockDeep<NotificationService>();
    runner = mockDeep<TransactionRunner>();

    runner.run.mockImplementation((fn: any) => fn(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: pricingService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TransactionRunner, useValue: runner },
      ],
    }).compile();

    service = module.get<PackageRequestService>(PackageRequestService);
  });

  describe('createRequest', () => {
    const requestDto: CreateRequestDto = {
      packageId: 'package-123',
      tripId: 'trip-123',
      senderNote: 'لطفا با دقت حمل کنید',
    };

    it('should create request successfully', async () => {
      const createdRequest = {
        id: 'request-123',
        packageId: 'package-123',
        tripId: 'trip-123',
        status: RequestStatusEnum.pending,
        offeredPrice: 45000,
        deviationCost: 3000,
      };
      const session = sessionWithMatch();

      prisma.package.findUniqueOrThrow.mockResolvedValue(mockPackage);
      prisma.trip.findUniqueOrThrow.mockResolvedValue(mockTrip);
      prisma.tripRequest.create.mockResolvedValue(createdRequest as any);
      pricingService.calculateTransporterEarnings.mockReturnValue(42000);

      const result = await service.createRequest(
        'user-123',
        requestDto,
        session,
      );

      expect(result).toEqual(createdRequest);
      expect(session.packages[0].matchResults[0].isRequestSent).toBe(true);
      expect(prisma.tripRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          packageId: 'package-123',
          tripId: 'trip-123',
          deviationDistanceKm: 2,
          deviationDurationMin: 5,
          deviationCost: 3000,
          offeredPrice: 45000,
        }),
      });
    });

    it('should throw when user does not own package', async () => {
      prisma.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        senderId: 'other-user',
      });

      await expect(
        service.createRequest('user-123', requestDto, sessionWithMatch()),
      ).rejects.toThrow(
        new ForbiddenException(`${AuthMessages.EntityAccessDenied} package.`),
      );
    });

    it('should throw when package status is invalid', async () => {
      prisma.package.findUniqueOrThrow.mockResolvedValue({
        ...mockPackage,
        status: PackageStatusEnum.matched,
      });

      await expect(
        service.createRequest('user-123', requestDto, sessionWithMatch()),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.SendRequestPackage),
      );
    });

    it('should throw when trip status is invalid', async () => {
      prisma.package.findUniqueOrThrow.mockResolvedValue(mockPackage);
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        ...mockTrip,
        status: TripStatusEnum.completed,
      });

      await expect(
        service.createRequest('user-123', requestDto, sessionWithMatch()),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.SendRequestTrip),
      );
    });

    it('should throw when no matched trips found', async () => {
      const emptySession = {
        packages: [],
      } as any;

      prisma.package.findUniqueOrThrow.mockResolvedValue(mockPackage);
      prisma.trip.findUniqueOrThrow.mockResolvedValue(mockTrip);

      await expect(
        service.createRequest('user-123', requestDto, emptySession),
      ).rejects.toThrow(new NotFoundException(NotFoundMessages.MatchedTrip));
    });

    it('should throw when trip is not in matched trips', async () => {
      prisma.package.findUniqueOrThrow.mockResolvedValue(mockPackage);
      prisma.trip.findUniqueOrThrow.mockResolvedValue(mockTrip);

      await expect(
        service.createRequest(
          'user-123',
          { ...requestDto, tripId: 'trip-unknown' },
          sessionWithMatch(),
        ),
      ).rejects.toThrow(
        new BadRequestException(BadRequestMessages.SendRequestTrip),
      );
    });

    it('should not touch the session when the transaction fails (A-4)', async () => {
      const session = sessionWithMatch();
      prisma.package.findUniqueOrThrow.mockResolvedValue(mockPackage);
      prisma.trip.findUniqueOrThrow.mockResolvedValue(mockTrip);
      prisma.tripRequest.create.mockResolvedValue({ id: 'request-123' } as any);
      pricingService.calculateTransporterEarnings.mockReturnValue(42000);
      notificationService.create.mockRejectedValue(
        new Error('Redis/notification down'),
      );

      await expect(
        service.createRequest('user-123', requestDto, session),
      ).rejects.toThrow('Redis/notification down');
      expect(session.packages[0].matchResults[0].isRequestSent).toBe(false);
    });
  });

  describe('getAllPackageRequests', () => {
    it('should return all package requests', async () => {
      const requests = [
        {
          id: 'request-1',
          packageId: 'package-123',
          status: RequestStatusEnum.pending,
        },
        {
          id: 'request-2',
          packageId: 'package-123',
          status: RequestStatusEnum.accepted,
        },
      ];

      prisma.tripRequest.findMany.mockResolvedValue(requests as any);

      const result = await service.getAllPackageRequests('package-123');

      expect(result).toEqual(requests);
      expect(prisma.tripRequest.findMany).toHaveBeenCalledWith({
        where: {
          packageId: 'package-123',
          status: {
            in: Object.values(RequestStatusEnum),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter by status', async () => {
      const pendingRequests = [
        {
          id: 'request-1',
          packageId: 'package-123',
          status: RequestStatusEnum.pending,
        },
      ];

      prisma.tripRequest.findMany.mockResolvedValue(pendingRequests as any);

      await service.getAllPackageRequests('package-123', [
        RequestStatusEnum.pending,
      ]);

      expect(prisma.tripRequest.findMany).toHaveBeenCalledWith({
        where: {
          packageId: 'package-123',
          status: {
            in: [RequestStatusEnum.pending],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('updateRequest', () => {
    it('should cancel request and update session', async () => {
      const canceledRequest = {
        id: 'request-123',
        packageId: 'package-123',
        tripId: 'trip-123',
        status: RequestStatusEnum.canceled,
      };

      const session = {
        packages: [
          {
            id: 'package-123',
            matchResults: [
              {
                tripId: 'trip-123',
                isRequestSent: true,
                score: 100,
                originDistance: 500,
                destinationDistance: 300,
                isOnCorridor: true,
              },
            ],
          },
        ],
      } as any;

      prisma.tripRequest.update.mockResolvedValue({
        ...canceledRequest,
        package: { id: 'package-123', senderId: 'user-123' },
      } as any);

      const result = await service.updateRequest('request-123', session);

      expect(result).toEqual(canceledRequest);
      expect(session.packages[0].matchResults[0].isRequestSent).toBe(false);
      expect(prisma.tripRequest.update).toHaveBeenCalledWith({
        where: {
          id: 'request-123',
          status: RequestStatusEnum.pending,
        },
        data: {
          status: RequestStatusEnum.canceled,
        },
        include: {
          package: {
            select: {
              id: true,
              senderId: true,
            },
          },
        },
      });
    });

    it('should handle missing session data gracefully', async () => {
      const canceledRequest = {
        id: 'request-123',
        packageId: 'package-456',
        tripId: 'trip-789',
        status: RequestStatusEnum.canceled,
      };

      const session = {
        packages: [],
      } as any;

      prisma.tripRequest.update.mockResolvedValue({
        ...canceledRequest,
        package: { id: 'package-456', senderId: 'user-456' },
      } as any);

      const result = await service.updateRequest('request-123', session);

      expect(result).toEqual(canceledRequest);
    });

    it('should not touch the session when the transaction fails (A-4)', async () => {
      const session = {
        packages: [
          {
            id: 'package-123',
            matchResults: [{ tripId: 'trip-123', isRequestSent: true }],
          },
        ],
      } as any;

      prisma.tripRequest.update.mockResolvedValue({
        id: 'request-123',
        packageId: 'package-123',
        tripId: 'trip-123',
        status: RequestStatusEnum.canceled,
        package: { id: 'package-123', senderId: 'user-123' },
      } as any);
      notificationService.create.mockRejectedValue(new Error('Notify down'));

      await expect(
        service.updateRequest('request-123', session),
      ).rejects.toThrow('Notify down');
      expect(session.packages[0].matchResults[0].isRequestSent).toBe(true);
    });
  });
});
