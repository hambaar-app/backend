import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisHealthIndicator } from './redis-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: DeepMockProxy<HealthCheckService>;
  let redisHealthIndicator: DeepMockProxy<RedisHealthIndicator>;

  beforeEach(async () => {
    healthCheckService = mockDeep<HealthCheckService>();
    redisHealthIndicator = mockDeep<RedisHealthIndicator>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockDeep<PrismaHealthIndicator>() },
        { provide: RedisHealthIndicator, useValue: redisHealthIndicator },
        { provide: MemoryHealthIndicator, useValue: mockDeep<MemoryHealthIndicator>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) =>
              key === 'MEMORY_HEAP_THRESHOLD_MB' ? 150 : defaultValue,
            ),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('runs health checks without the external nestjs-docs ping', () => {
    healthCheckService.check.mockResolvedValue({
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    } as any);

    controller.check();

    const checks = healthCheckService.check.mock.calls[0][0] as Array<() => any>;
    expect(checks).toHaveLength(3);
    const labels = checks.map((fn) => fn.name);
    expect(labels).not.toContain('bound pingCheck');
  });
});
