import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicatorService, HealthIndicatorResult } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicatorService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.check(key);

    try {
      const testKey = 'health-check';
      const testValue = Date.now().toString();
      
      // Set a test value
      await this.cacheManager.set(testKey, testValue, 5000);
      
      // Get the test value back
      const retrievedValue = await this.cacheManager.get(testKey);
      
      if (retrievedValue !== testValue) {
        return indicator.down('Redis read/write test failed.');
      }
      
      // Clean up test key
      await this.cacheManager.del(testKey);

      return indicator.up({
        message: 'Redis connection is healthy',
        connection: 'active',
        operations: 'read/write successful',
      });      
    } catch (error) {
      return indicator.down('Redis read/write test failed.');
    }
  }
}