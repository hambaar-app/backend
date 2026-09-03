import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TooManyRequestsException } from '../../../common/custom.exceptions';
import { AuthMessages } from '../../../common/enums/messages.enum';
import { generateSecureOtp } from '../../../common/utils/codes';
import { Keyv } from '@keyv/redis';
import { SmsService } from '../../sms/sms.service';
import { CachedUserData, UserAttempts } from '../types/auth.types';

export const OTP_CACHE = Symbol('OTP_CACHE');
export const OTP_CONFIG = Symbol('OTP_CONFIG');

export interface OtpConfig {
  otpExpireTime: number;
  maxSendAttempts: number;
  maxCheckAttempts: number;
  sendWindow: number;
  baseBlockTime: number;
}

/**
 * OTP lifecycle + rate-limiting state machine, extracted from AuthService.
 *
 * Owns the send/verify flow including attempt tracking, blocking, and the
 * send window. Reads limits via an injected OtpConfig value object built
 * once from ConfigService in the module factory (fixes C-1: only the
 * canonical MAX_SEND_ATTEMPTS key is read).
 *
 * Cache access goes through the OTP_CACHE named provider bound to the OTP
 * Keyv store — no positional cacheManager.stores[1] access (fixes C-3).
 */
@Injectable()
export class OtpService {
  constructor(
    @Inject(OTP_CACHE) private readonly cache: Keyv,
    @Inject(OTP_CONFIG) private readonly config: OtpConfig,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(phoneNumber: string): Promise<boolean> {
    const userKey = this.getUserKey(phoneNumber);
    const userData = await this.getUserData(userKey);

    this.checkIfBlocked(userData.attempts);
    this.checkSendAttempts(userData.attempts);

    const now = Date.now();
    if (userData.otp && now < userData.otp.expiresIn) {
      throw new UnauthorizedException(AuthMessages.OtpNotExpired);
    }

    const otp = {
      code: generateSecureOtp(),
      expiresIn: now + this.config.otpExpireTime,
      createdAt: now,
    };

    userData.attempts.sendAttempts++;
    userData.attempts.checkAttempts = 0;
    userData.attempts.lastSendAttempt = now;
    userData.otp = otp;

    const otpSmsResult = await this.smsService.sendOtp(phoneNumber, otp.code);
    return otpSmsResult && (await this.setUserData(userKey, userData));
  }

  async verify(phoneNumber: string, code: string): Promise<void> {
    const userKey = this.getUserKey(phoneNumber);
    const userData = await this.getUserData(userKey);

    this.checkIfBlocked(userData.attempts);

    if (!userData?.otp) {
      throw new UnauthorizedException(AuthMessages.OtpExpired);
    }

    const now = Date.now();
    if (now > userData.otp.expiresIn) {
      throw new UnauthorizedException(AuthMessages.OtpExpired);
    }

    userData.attempts.checkAttempts++;

    if (userData.attempts.checkAttempts > this.config.maxCheckAttempts) {
      userData.attempts.blockedUntil =
        now + this.calculateBlockTime(userData.attempts);
      await this.setUserData(userKey, userData);
      throw new TooManyRequestsException(AuthMessages.TooManyAttempts);
    }

    if (userData.otp.code !== code) {
      await this.setUserData(userKey, userData);
      throw new UnauthorizedException(AuthMessages.OtpInvalid);
    }

    // OTP is valid — clear the OTP data but keep attempts history
    userData.otp = undefined;
    await this.setUserData(userKey, userData);
  }

  private getUserKey(
    phoneNumber: string,
    type: 'mobile' | 'email' = 'mobile',
  ): string {
    return `otp:${type}:${phoneNumber}`;
  }

  private async getUserData(userKey: string): Promise<CachedUserData> {
    const userData = await this.cache.get<CachedUserData>(userKey);
    if (!userData) {
      return {
        attempts: {
          sendAttempts: 0,
          checkAttempts: 0,
          lastSendAttempt: 0,
        },
      };
    }

    // Reset send attempts if the send window has passed
    const now = Date.now();
    if (now - userData.attempts.lastSendAttempt > this.config.sendWindow) {
      userData.attempts.sendAttempts = 0;
    }

    return userData;
  }

  private async setUserData(
    userKey: string,
    userData: CachedUserData,
  ): Promise<boolean> {
    const cacheTime = this.calculateCacheTime(userData.attempts);
    return this.cache.set(userKey, userData, cacheTime);
  }

  private checkIfBlocked(attempts: UserAttempts): void {
    const now = Date.now();
    if (attempts.blockedUntil && now < attempts.blockedUntil) {
      const remainingTime = Math.ceil(
        (attempts.blockedUntil - now) / 1000 / 60,
      );
      throw new TooManyRequestsException(
        `Too many attempts. Please try again in ${remainingTime} minutes.`,
      );
    }
  }

  private checkSendAttempts(attempts: UserAttempts): void {
    if (attempts.sendAttempts >= this.config.maxSendAttempts) {
      const blockTime = this.calculateBlockTime(attempts);
      attempts.blockedUntil = Date.now() + blockTime;
      throw new TooManyRequestsException(AuthMessages.MaxAttempts);
    }
  }

  private calculateBlockTime(attempts: UserAttempts): number {
    const violations =
      Math.floor(attempts.sendAttempts / this.config.maxSendAttempts) +
      Math.floor(attempts.checkAttempts / this.config.maxCheckAttempts);
    if (!violations) return 0;
    return this.config.baseBlockTime * Math.pow(2, violations);
  }

  private calculateCacheTime(attempts: UserAttempts): number {
    if (attempts.blockedUntil) {
      return Math.max(
        attempts.blockedUntil - Date.now() + 60_000,
        this.config.sendWindow,
      );
    }
    return this.config.sendWindow;
  }
}
