import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { DashboardService } from './dashboard.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DeepMockProxy<DashboardService>;

  beforeEach(async () => {
  service = mockDeep<DashboardService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: service }
      ]
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
