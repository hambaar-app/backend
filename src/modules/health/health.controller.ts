import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisHealthIndicator } from './redis-health.indicator';
import { HealthCheckDto } from './health-check.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Complete health check',
  })
  @ApiOkResponse({
    type: HealthCheckDto,
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  @HealthCheck()
  check() {
    const heapMb =
      this.config.get<number>('MEMORY_HEAP_THRESHOLD_MB', 150);
    const heapBytes = heapMb * 1024 * 1024;

    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', heapBytes),
    ]);
  }
}

