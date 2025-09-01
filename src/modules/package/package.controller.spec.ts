import { Test, TestingModule } from '@nestjs/testing';
import { PackageController } from './package.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PackageService } from './package.service';
import { MatchingService } from './matching.service';
import { TokenService } from '../token/token.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { OwnershipGuard } from '../auth/guard/ownership.guard';

describe('PackageController', () => {
  let controller: PackageController;
  let service: DeepMockProxy<PackageService>;
  let matchingService: DeepMockProxy<MatchingService>;

  beforeEach(async () => {
    service = mockDeep<PackageService>();
    matchingService = mockDeep<MatchingService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackageController],
      providers: [
        { provide: PackageService, useValue: service },
        { provide: MatchingService, useValue: matchingService },
      ]
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
});
