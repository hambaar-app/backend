import { Test, TestingModule } from '@nestjs/testing';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';

describe('AddressController', () => {
  let controller: AddressController;
  let service: DeepMockProxy<AddressService>;

  beforeEach(async () => {
    service = mockDeep<AddressService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [{ provide: AddressService, useValue: service }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AddressController>(AddressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate address routes to AddressService', async () => {
    await controller.getProvinces();
    expect(service.getAllProvinces).toHaveBeenCalledWith();

    await controller.getCitiesByProvince('province-123');
    expect(service.getAllProvinceCities).toHaveBeenCalledWith('province-123');

    await controller.searchCitiesByName('تهران');
    expect(service.searchCitiesByName).toHaveBeenCalledWith('تهران');

    await controller.createAddress({ title: 'خانه' } as any, 'user-123');
    expect(service.create).toHaveBeenCalledWith('user-123', { title: 'خانه' });

    await controller.getAllAddresses('user-123', 'search');
    expect(service.getAll).toHaveBeenCalledWith('user-123', 'search');
  });
});
