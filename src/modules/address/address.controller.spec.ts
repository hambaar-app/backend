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
      providers: [
        { provide: AddressService, useValue: service }
      ]
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
});
