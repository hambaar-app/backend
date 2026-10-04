import { Test, TestingModule } from '@nestjs/testing';
import { PackageController } from './package.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PackageService } from './application/package.service';
import { RecipientService } from './domain/recipient.service';
import { PackageRequestService } from './domain/package-request.service';
import { TrackingService } from './domain/tracking.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';

describe('PackageController', () => {
  let controller: PackageController;
  let service: DeepMockProxy<PackageService>;
  let recipientService: DeepMockProxy<RecipientService>;
  let requestService: DeepMockProxy<PackageRequestService>;
  let trackingService: DeepMockProxy<TrackingService>;

  beforeEach(async () => {
    service = mockDeep<PackageService>();
    recipientService = mockDeep<RecipientService>();
    requestService = mockDeep<PackageRequestService>();
    trackingService = mockDeep<TrackingService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackageController],
      providers: [
        { provide: PackageService, useValue: service },
        { provide: RecipientService, useValue: recipientService },
        { provide: PackageRequestService, useValue: requestService },
        { provide: TrackingService, useValue: trackingService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PackageController>(PackageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate recipient routes to RecipientService', async () => {
    await controller.createPackageRecipient({ fullName: 'A' } as any, 'user-1');
    expect(recipientService.createRecipient).toHaveBeenCalledWith('user-1', {
      fullName: 'A',
    });
  });

  it('should delegate request routes to PackageRequestService', async () => {
    const session = { packages: [] } as any;
    await controller.createTripRequest(
      { packageId: 'p', tripId: 't' } as any,
      'user-1',
      session,
    );
    expect(requestService.createRequest).toHaveBeenCalledWith(
      'user-1',
      { packageId: 'p', tripId: 't' },
      session,
    );

    await controller.updateTripRequest('request-1', session);
    expect(requestService.updateRequest).toHaveBeenCalledWith(
      'request-1',
      session,
    );
  });

  it('should delegate tracking route to TrackingService', async () => {
    await controller.getTripTrackingByCode('TRK123');
    expect(trackingService.getTrackingByCode).toHaveBeenCalledWith('TRK123');
  });
});
