import { Test, TestingModule } from '@nestjs/testing';
import { SupportController } from './support.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { SupportService } from './support.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';

describe('SupportController', () => {
  let controller: SupportController;
  let service: DeepMockProxy<SupportService>;

  beforeEach(async () => {
    service = mockDeep<SupportService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [
        { provide: SupportService, useValue: service }
      ]
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<SupportController>(SupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
