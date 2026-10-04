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
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MapController>(MapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate map routes to MapService', async () => {
    await controller.getIntermediateCitiesWithCoords({
      origin: '35.6,51.3',
      destination: '35.9,51.6',
    } as any);
    expect(service.getIntermediateCitiesWithCoords).toHaveBeenCalledWith({
      origin: '35.6,51.3',
      destination: '35.9,51.6',
    });

    await controller.getIntermediateCitiesWithIds('origin-id', 'dest-id');
    expect(service.getIntermediateCitiesWithIds).toHaveBeenCalledWith(
      'origin-id',
      'dest-id',
    );

    await controller.reverseGeocode({ lat: '35.6', lng: '51.3' } as any);
    expect(service.reverseGeocode).toHaveBeenCalledWith({
      latitude: '35.6',
      longitude: '51.3',
    });
  });
});
