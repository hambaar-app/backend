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
      providers: [{ provide: VehicleService, useValue: service }],
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

  it('should delegate vehicle routes to VehicleService', async () => {
    await controller.createBrand({ name: 'Toyota' } as any);
    expect(service.createBrand).toHaveBeenCalledWith({ name: 'Toyota' });

    await controller.getAllBrands('toy');
    expect(service.getAllBrands).toHaveBeenCalledWith('toy');

    await controller.registerTransporterVehicle(
      { color: 'Red' } as any,
      'user-123',
    );
    expect(service.create).toHaveBeenCalledWith('user-123', { color: 'Red' });

    await controller.getVehicleById('vehicle-123');
    expect(service.getById).toHaveBeenCalledWith('vehicle-123');

    await controller.getAllTransporterVehicles('user-123');
    expect(service.getAllVehicles).toHaveBeenCalledWith('user-123');
  });
});
