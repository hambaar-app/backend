import { Test, TestingModule } from '@nestjs/testing';
import { TurfService } from './turf.service';

describe('TurfService', () => {
  let service: TurfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TurfService],
    }).compile();

    service = module.get<TurfService>(TurfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
