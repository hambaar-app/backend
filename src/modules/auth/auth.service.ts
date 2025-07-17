import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SendOtpDto } from './dto/send-otp.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Keyv } from '@keyv/redis';
import { CheckOtpDto } from './dto/check-otp.dto';
import { ConfigService } from '@nestjs/config';
import { AuthMessages } from 'src/common/enums/messages.enum';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { AuthTokens } from 'src/common/enums/auth.enum';

@Injectable()
export class AuthService {
  private cacheManager: Keyv;
  private otpExpireTime: number;
  private otpCacheTime: number;

  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    config: ConfigService,
  ) {
    this.cacheManager = cacheManager.stores[1];
    this.otpExpireTime = config.get<number>('OTP_EXPIRE_TIME', 120_000);
    this.otpCacheTime = config.get<number>('OTP_CACHE_TIME', this.otpExpireTime * 1.5);
  }

  async sendOtp({ phoneNumber }: SendOtpDto): Promise<boolean | never> {
    const userKey = this.getUserKey(phoneNumber);
    const otp = {
      code: Math.floor(Math.random() * 100_000),
      expiresIn: Date.now() + this.otpExpireTime
    };
    const result = await this.cacheManager.set(userKey, { otp }, this.otpCacheTime);

    // call otp service method.

    return result;
  }

  async checkOtp(
    { phoneNumber, code }: CheckOtpDto
  ): Promise<{ token: string; type: AuthTokens }> {
    const userKey = this.getUserKey(phoneNumber);
    const userData = await this.cacheManager.get(userKey);

    if (!userData?.otp) throw new UnauthorizedException(AuthMessages.OtpExpired);
    if (userData.code !== code) throw new UnauthorizedException(AuthMessages.OtpInvalid);

    const now = Date.now();
    if (now > userData.expiresIn) throw new UnauthorizedException(AuthMessages.OtpExpired);

    const user = await this.userService.findByPhoneNumber(phoneNumber);

    const payload = { phoneNumber };
    let token: string;
    let type: AuthTokens;
    if (!user) {
      token = this.tokenService['generateTempToken'](payload);
      type = AuthTokens.Temporary;
    } else {
      token =  this.tokenService['generateAccessToken'](payload);
      type = AuthTokens.Access;
    }

    return {
      token,
      type
    };
  }

  private getUserKey(phoneNumber: string): string {
    return `otp:user:${phoneNumber}`;
  }
}
