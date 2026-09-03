import { UnauthorizedException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Keyv } from '@keyv/redis';
import { OtpService, OtpConfig } from './otp.service';
import { SmsService } from '../../sms/sms.service';
import { TooManyRequestsException } from '../../../common/custom.exceptions';
import { AuthMessages } from '../../../common/enums/messages.enum';
import { CachedUserData } from '../types/auth.types';

describe('OtpService', () => {
  let service: OtpService;
  // `get` is widened to jest.Mock: Keyv's overloaded `get` signature collapses
  // under jest.Mocked's transform, making mockResolvedValue un-typable.
  let cache: { get: jest.Mock } & jest.Mocked<Keyv>;
  let smsService: DeepMockProxy<SmsService>;

  const config: OtpConfig = {
    otpExpireTime: 2 * 60 * 1000,
    maxSendAttempts: 5,
    maxCheckAttempts: 10,
    sendWindow: 30 * 60 * 1000,
    baseBlockTime: 20 * 60 * 1000,
  };

  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    cache = mockDeep<Keyv>() as unknown as { get: jest.Mock } & jest.Mocked<Keyv>;
    smsService = mockDeep<SmsService>();
    service = new OtpService(cache, config, smsService);

    cache.set.mockResolvedValue(true);
    smsService.sendOtp.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Factories (not shared constants): OtpService mutates attempts in place,
  // so a shared object would leak state across tests.
  const defaultAttempts = () => ({
    sendAttempts: 0,
    checkAttempts: 0,
    lastSendAttempt: 0,
  });

  const emptyUserData = (): CachedUserData => ({ attempts: defaultAttempts() });

  describe('sendOtp', () => {
    it('should send the OTP once and persist attempts on the happy path', async () => {
      cache.get.mockResolvedValue(null as any);

      const result = await service.sendOtp('+989123456789');

      expect(result).toBe(true);
      expect(smsService.sendOtp).toHaveBeenCalledTimes(1);
      expect(smsService.sendOtp).toHaveBeenCalledWith(
        '+989123456789',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(cache.set).toHaveBeenCalledTimes(1);
      const [, stored] = cache.set.mock.calls[0] as [string, CachedUserData];
      expect(stored.attempts.sendAttempts).toBe(1);
      expect(stored.attempts.checkAttempts).toBe(0);
      expect(stored.attempts.lastSendAttempt).toBe(NOW);
      expect(stored.otp?.expiresIn).toBe(NOW + config.otpExpireTime);
      expect(stored.otp?.code).toMatch(/^\d{6}$/);
    });

    it('should throw OtpNotExpired when a valid OTP is still live', async () => {
      const userData: CachedUserData = {
        attempts: defaultAttempts(),
        otp: { code: '123456', expiresIn: NOW + 60_000, createdAt: NOW },
      };
      cache.get.mockResolvedValue(userData);

      await expect(service.sendOtp('+989123456789')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.sendOtp('+989123456789')).rejects.toThrow(
        AuthMessages.OtpNotExpired,
      );
      expect(smsService.sendOtp).not.toHaveBeenCalled();
    });

    it('should allow a new OTP after the previous one expires', async () => {
      const userData: CachedUserData = {
        attempts: defaultAttempts(),
        otp: { code: '123456', expiresIn: NOW - 1, createdAt: NOW },
      };
      cache.get.mockResolvedValue(userData);

      const result = await service.sendOtp('+989123456789');
      expect(result).toBe(true);
      expect(smsService.sendOtp).toHaveBeenCalledTimes(1);
    });

    it('should throw 429 when the user is currently blocked', async () => {
      const userData: CachedUserData = {
        attempts: { ...defaultAttempts(), blockedUntil: NOW + 5 * 60_000 },
      };
      cache.get.mockResolvedValue(userData);

      await expect(service.sendOtp('+989123456789')).rejects.toThrow(
        TooManyRequestsException,
      );
      await expect(service.sendOtp('+989123456789')).rejects.toThrow(
        /Please try again in \d+ minutes/,
      );
    });

    it('should throw 429 when the send limit is reached', async () => {
      const userData: CachedUserData = {
        attempts: {
          ...defaultAttempts(),
          sendAttempts: config.maxSendAttempts,
          // Just hit the limit: an old lastSendAttempt would trigger the
          // send-window reset in getUserData() before the limit check.
          lastSendAttempt: NOW,
        },
      };
      cache.get.mockResolvedValue(userData);

      // Single invocation: hitting the limit also sets blockedUntil, so a
      // second call would fail with the "currently blocked" message instead.
      const error = await service.sendOtp('+989123456789').catch((e) => e);

      expect(error).toBeInstanceOf(TooManyRequestsException);
      expect(error.message).toBe(AuthMessages.MaxAttempts);
      expect(smsService.sendOtp).not.toHaveBeenCalled();
    });

    it('should not persist anything when the SMS send fails', async () => {
      cache.get.mockResolvedValue(null as any);
      smsService.sendOtp.mockRejectedValue(new Error('SMS down'));

      await expect(service.sendOtp('+989123456789')).rejects.toThrow(
        'SMS down',
      );
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should return false when the SMS provider reports failure', async () => {
      cache.get.mockResolvedValue(null as any);
      smsService.sendOtp.mockResolvedValue(false);

      const result = await service.sendOtp('+989123456789');
      expect(result).toBe(false);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should reset send attempts when the send window passed', async () => {
      const userData: CachedUserData = {
        attempts: {
          ...defaultAttempts(),
          sendAttempts: config.maxSendAttempts,
          lastSendAttempt: NOW - config.sendWindow - 1,
        },
      };
      cache.get.mockResolvedValue(userData);

      const result = await service.sendOtp('+989123456789');
      expect(result).toBe(true);
      const [, stored] = cache.set.mock.calls[0] as [string, CachedUserData];
      expect(stored.attempts.sendAttempts).toBe(1);
    });
  });

  describe('verify', () => {
    const OTP = '654321';

    it('should succeed for a valid code and clear the OTP', async () => {
      const userData: CachedUserData = {
        attempts: defaultAttempts(),
        otp: { code: OTP, expiresIn: NOW + 60_000, createdAt: NOW },
      };
      cache.get.mockResolvedValue(userData);

      await service.verify('+989123456789', OTP);

      expect(cache.set).toHaveBeenCalledTimes(1);
      const [, stored] = cache.set.mock.calls[0] as [string, CachedUserData];
      expect(stored.otp).toBeUndefined();
      expect(stored.attempts.checkAttempts).toBe(1);
    });

    it('should throw OtpExpired when no OTP exists', async () => {
      cache.get.mockResolvedValue(emptyUserData());

      await expect(service.verify('+989123456789', OTP)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verify('+989123456789', OTP)).rejects.toThrow(
        AuthMessages.OtpExpired,
      );
    });

    it('should throw OtpExpired when the OTP is expired', async () => {
      const userData: CachedUserData = {
        attempts: defaultAttempts(),
        otp: { code: OTP, expiresIn: NOW - 1, createdAt: NOW - 130_000 },
      };
      cache.get.mockResolvedValue(userData);

      await expect(service.verify('+989123456789', OTP)).rejects.toThrow(
        AuthMessages.OtpExpired,
      );
    });

    it('should throw OtpInvalid and increment check attempts on a wrong code', async () => {
      const userData: CachedUserData = {
        attempts: defaultAttempts(),
        otp: { code: OTP, expiresIn: NOW + 60_000, createdAt: NOW },
      };
      cache.get.mockResolvedValue(userData);

      await expect(
        service.verify('+989123456789', '000000'),
      ).rejects.toThrow(AuthMessages.OtpInvalid);
      expect(cache.set).toHaveBeenCalledTimes(1);

      const [, stored] = cache.set.mock.calls[0] as [string, CachedUserData];
      expect(stored.attempts.checkAttempts).toBe(1);
      expect(stored.otp).toBeDefined();
    });

    it('should block after exceeding the check limit', async () => {
      const userData: CachedUserData = {
        attempts: {
          ...defaultAttempts(),
          checkAttempts: config.maxCheckAttempts,
        },
        otp: { code: OTP, expiresIn: NOW + 60_000, createdAt: NOW },
      };
      cache.get.mockResolvedValue(userData);

      await expect(service.verify('+989123456789', OTP)).rejects.toThrow(
        TooManyRequestsException,
      );
      expect(cache.set).toHaveBeenCalledTimes(1);
      const [, stored] = cache.set.mock.calls[0] as [string, CachedUserData];
      expect(stored.attempts.blockedUntil).toBeDefined();
    });

    it('should throw 429 when the user is currently blocked', async () => {
      const userData: CachedUserData = {
        attempts: { ...defaultAttempts(), blockedUntil: NOW + 5 * 60_000 },
      };
      cache.get.mockResolvedValue(userData);

      await expect(service.verify('+989123456789', OTP)).rejects.toThrow(
        TooManyRequestsException,
      );
    });
  });
});