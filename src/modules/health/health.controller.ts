import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisHealthIndicator } from './redis-health.indicator';
import { Serialize } from 'src/common/serialize.interceptor';
import { HealthCheckDto } from './health-check.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @ApiOperation({
    summary: 'Complete health check'
  })
  @ApiOkResponse({
    type: HealthCheckDto
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
      () => this.db.pingCheck('database', this.prisma),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
    ]);
  }
}
