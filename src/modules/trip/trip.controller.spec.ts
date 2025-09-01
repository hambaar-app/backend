import { Test, TestingModule } from '@nestjs/testing';
import { TripController } from './trip.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { TripService } from './trip.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';

describe('TripController', () => {
  let controller: TripController;
  let service: DeepMockProxy<TripService>;

  beforeEach(async () => {
    service = mockDeep<TripService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripController],
      providers: [
        { provide: TripService, useValue: service }
      ]
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
});
