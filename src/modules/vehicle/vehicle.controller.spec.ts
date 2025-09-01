import { Test, TestingModule } from '@nestjs/testing';
import { VehicleController } from './vehicle.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { VehicleService } from './vehicle.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';

describe('VehicleController', () => {
  let controller: VehicleController;
  let service: DeepMockProxy<VehicleService>;

  beforeEach(async () => {
    service = mockDeep<VehicleService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        { provide: VehicleService, useValue: service }
      ]
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(OwnershipGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<VehicleController>(VehicleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
