import { Test, TestingModule } from '@nestjs/testing';
import { MapController } from './map.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { MapService } from './map.service';
import { TokenService } from '../token/token.service';
import { AccessTokenGuard } from '../auth/guard/token.guard';

describe('MapController', () => {
  let controller: MapController;
  let service: DeepMockProxy<MapService>;

  beforeEach(async () => {
    service = mockDeep<MapService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapController],
      providers: [
        { provide: MapService, useValue: service },
        {
          provide: TokenService,
          useValue: {
            verifyToken: jest.fn().mockReturnValue({ sub: '123' }),
          },
        },
      ]
    })
    .overrideGuard(AccessTokenGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<MapController>(MapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
