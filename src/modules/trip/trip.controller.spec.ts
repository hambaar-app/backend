import { Test, TestingModule } from '@nestjs/testing';
import { TripController } from './trip.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { TripService } from './application/trip.service';
import { TripRequestService } from './domain/trip-request.service';
import { TripTrackingService } from './domain/trip-tracking.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';

describe('TripController', () => {
  let controller: TripController;
  let service: DeepMockProxy<TripService>;
  let requestService: DeepMockProxy<TripRequestService>;
  let trackingService: DeepMockProxy<TripTrackingService>;

  beforeEach(async () => {
    service = mockDeep<TripService>();
    requestService = mockDeep<TripRequestService>();
    trackingService = mockDeep<TripTrackingService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripController],
      providers: [
        { provide: TripService, useValue: service },
        { provide: TripRequestService, useValue: requestService },
        { provide: TripTrackingService, useValue: trackingService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TripController>(TripController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate request routes to TripRequestService', async () => {
    await controller.getAllTripRequests('trip-123');
    expect(requestService.getAllTripRequests).toHaveBeenCalledWith('trip-123');

    await controller.updateTripRequest('request-123', {
      status: 'rejected',
    } as any);
    expect(requestService.updateRequest).toHaveBeenCalledWith('request-123', {
      status: 'rejected',
    });
  });

  it('should delegate tracking routes to TripTrackingService', async () => {
    await controller.getTripTracking('trip-123', 'package-123');
    expect(trackingService.getTripTracking).toHaveBeenCalledWith(
      'trip-123',
      'package-123',
    );

    await controller.rateTrip({ tripId: 'trip-123' } as any, 'user-123');
    expect(trackingService.rateTrip).toHaveBeenCalledWith('user-123', {
      tripId: 'trip-123',
    });
  });
});
