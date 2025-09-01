import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

describe('SmsService', () => {
  let service: SmsService;
  let configService: DeepMockProxy<ConfigService>;
  let httpService: DeepMockProxy<HttpService>;

  beforeEach(async () => {
    configService = mockDeep<ConfigService>();
    httpService = mockDeep<HttpService>();
    
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        SMS_API_KEY: 'key'
      };
      return config[key] || defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: configService },
        { provide: HttpService, useValue: httpService }
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
