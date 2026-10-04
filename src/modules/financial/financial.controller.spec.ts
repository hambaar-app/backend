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
      providers: [{ provide: FinancialService, useValue: service }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FinancialController>(FinancialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate wallet routes to FinancialService', async () => {
    await controller.getWallet(1, 10, 'user-123');
    expect(service.getWallet).toHaveBeenCalledWith('user-123', 1, 10);

    await controller.addFunds({ amount: 1000 } as any, 'user-123');
    expect(service.addFunds).toHaveBeenCalledWith('user-123', {
      amount: 1000,
    });

    await controller.addFundsAndCreateEscrow(
      { amount: 1000 } as any,
      'user-123',
    );
    expect(service.addFundsAndCreateEscrow).toHaveBeenCalledWith('user-123', {
      amount: 1000,
    });
  });
});
