import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';

describe('TokenService', () => {
  let service: TokenService;
  let configService: DeepMockProxy<ConfigService>;

  beforeEach(async () => {
    configService = mockDeep<ConfigService>();

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        JWT_ACCESS_SECRET_KEY: 'key',
        JWT_TEMP_SECRET_KEY: 'key',
        JWT_PROGRESS_SECRET_KEY: 'key',
      };
      return config[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: ConfigService, useValue: configService }
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
