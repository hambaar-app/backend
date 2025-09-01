import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { AccessTokenGuard, ProgressTokenGuard, TemporaryTokenGuard } from './guard/token.guard';
import { DenyAuthorizedGuard } from './guard/deny-authorized.guard';
import { MultiTokenGuard } from './guard/multi-token.guard';
import { VehicleService } from '../vehicle/vehicle.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let service: DeepMockProxy<AuthService>;
  let vehicleService: DeepMockProxy<VehicleService>;
  let configService: DeepMockProxy<ConfigService>;

  beforeEach(async () => {
    service = mockDeep<AuthService>();
    vehicleService = mockDeep<VehicleService>();
    configService = mockDeep<ConfigService>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        COOKIE_MAX_AGE: 50000
      };
      return config[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: VehicleService, useValue: vehicleService },
        { provide: ConfigService, useValue: configService }
      ]
    })
    .overrideGuard(TemporaryTokenGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(ProgressTokenGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(DenyAuthorizedGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(MultiTokenGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
