import { Test, TestingModule } from '@nestjs/testing';
import { FinancialController } from './financial.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { FinancialService } from './financial.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';

describe('FinancialController', () => {
  let controller: FinancialController;
  let service: DeepMockProxy<FinancialService>;

  beforeEach(async () => {
    service = mockDeep<FinancialService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialController],
      providers: [
        { provide: FinancialService, useValue: service }
      ]
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<FinancialController>(FinancialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
