import { Test, TestingModule } from '@nestjs/testing';
import { TurfService } from './turf.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Turf, TURF_TOKEN, TurfProvider } from './turf.provider';

describe('TurfService', () => {
  let service: TurfService;
  let turfProvider: DeepMockProxy<Turf>;

  beforeEach(async () => {
    turfProvider = mockDeep<Turf>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurfService,
        { provide: TURF_TOKEN, useValue: turfProvider },
      ],
    }).compile();

    service = module.get<TurfService>(TurfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
