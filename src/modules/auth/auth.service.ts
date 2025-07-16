import { Inject, Injectable } from '@nestjs/common';
import { SendOtpDto } from './dto/send-otp.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Keyv } from '@keyv/redis';

@Injectable()
export class AuthService {
  private cacheManager: Keyv;

  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache
  ) {
    this.cacheManager = cacheManager.stores[1];
  }

  async sendOtp({ phoneNumber }: SendOtpDto): Promise<boolean | never> {
    const otp = {
      code: Math.floor(Math.random() * 100_000),
      expiresIn: Date.now() + 120_000
    };
    const result = await this.cacheManager.set(`user-${phoneNumber}`, { otp }, 180_000);

    // call otp service method.

    return result;
  }
}
