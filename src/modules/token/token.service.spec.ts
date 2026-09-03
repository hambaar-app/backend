import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { AuthTokens } from '../../common/enums/auth.enum';
import { AuthMessages } from '../../common/enums/messages.enum';

describe('TokenService', () => {
  let service: TokenService;
  let configService: DeepMockProxy<ConfigService>;

  const SECRETS: Record<string, string> = {
    JWT_ACCESS_SECRET_KEY: 'access-secret-abcdefgh-1234567890',
    JWT_TEMP_SECRET_KEY: 'temp-secret-abcdefgh-1234567890',
    JWT_PROGRESS_SECRET_KEY: 'progress-secret-abcdefgh-1234567890',
  };

  const EXPIRIES: Record<string, string> = {
    JWT_ACCESS_EXPIRES_IN: '20d',
    JWT_TEMP_EXPIRES_IN: '20m',
    JWT_PROGRESS_EXPIRES_IN: '1d',
  };

  const now = (): number => Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    configService = mockDeep<ConfigService>();
    configService.getOrThrow.mockImplementation(
      (key: string) => SECRETS[key],
    );
    configService.get.mockImplementation(
      (key: string, defaultValue?: unknown) =>
        EXPIRIES[key] ?? defaultValue,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('generateAccessToken', () => {
    it('should produce an access JWT with the right payload and ~20d expiry', () => {
      const token = service.generateAccessToken({
        sub: 'user-1',
        phoneNumber: '+989123456789',
      });

      const decoded = jwt.verify(
        token,
        SECRETS.JWT_ACCESS_SECRET_KEY,
      ) as jwt.JwtPayload;
      expect(decoded.sub).toBe('user-1');
      expect(decoded.phoneNumber).toBe('+989123456789');
      expect(decoded.exp).toBeGreaterThan(now() + 20 * 24 * 3600 - 60);
      expect(decoded.exp).toBeLessThanOrEqual(now() + 20 * 24 * 3600 + 60);
    });
  });

  describe('generateTempToken', () => {
    it('should produce a temp JWT with ~20m expiry', () => {
      const token = service.generateTempToken({
        phoneNumber: '+989123456789',
      });

      const decoded = jwt.verify(
        token,
        SECRETS.JWT_TEMP_SECRET_KEY,
      ) as jwt.JwtPayload;
      expect(decoded.phoneNumber).toBe('+989123456789');
      expect(decoded.sub).toBeUndefined();
      expect(decoded.exp).toBeGreaterThan(now() + 20 * 60 - 5);
      expect(decoded.exp).toBeLessThanOrEqual(now() + 20 * 60 + 5);
    });
  });

  describe('generateProgressToken', () => {
    it('should produce a progress JWT with ~1d expiry', () => {
      const token = service.generateProgressToken({
        sub: 'user-2',
        phoneNumber: '+989876543210',
      });

      const decoded = jwt.verify(
        token,
        SECRETS.JWT_PROGRESS_SECRET_KEY,
      ) as jwt.JwtPayload;
      expect(decoded.sub).toBe('user-2');
      expect(decoded.exp).toBeGreaterThan(now() + 24 * 3600 - 10);
      expect(decoded.exp).toBeLessThanOrEqual(now() + 24 * 3600 + 10);
    });
  });

  describe('config-driven expiry', () => {
    it('should honor a JWT_ACCESS_EXPIRES_IN env override', () => {
      EXPIRIES.JWT_ACCESS_EXPIRES_IN = '5s';
      const token = service.generateAccessToken({
        sub: 'user-1',
        phoneNumber: '+989123456789',
      });

      const decoded = jwt.verify(
        token,
        SECRETS.JWT_ACCESS_SECRET_KEY,
      ) as jwt.JwtPayload;
      expect(decoded.exp).toBeLessThanOrEqual(now() + 10);
    });
  });

  describe('verifyToken', () => {
    it('should throw InvalidToken for empty input', () => {
      expect(() => service.verifyToken('', AuthTokens.Access)).toThrow(
        UnauthorizedException,
      );
      expect(() => service.verifyToken('', AuthTokens.Access)).toThrow(
        AuthMessages.InvalidToken,
      );
    });

    it('should throw InvalidToken for non-string input', () => {
      expect(() =>
        service.verifyToken(undefined as any, AuthTokens.Access),
      ).toThrow(UnauthorizedException);
    });

    it('should report expired tokens per type', () => {
      jest.useFakeTimers();
      const token = service.generateAccessToken({
        sub: 'user-1',
        phoneNumber: '+989123456789',
      });

      jest.advanceTimersByTime(20 * 24 * 3600 * 1000 + 1000);

      expect(() => service.verifyToken(token, AuthTokens.Access)).toThrow(
        'access token has expired',
      );
    });

    it('should report tampered tokens per type', () => {
      const token = jwt.sign(
        { sub: 'user-1', phoneNumber: '+989123456789' },
        'completely-wrong-secret-1234567890',
        { expiresIn: '1h' },
      );

      expect(() => service.verifyToken(token, AuthTokens.Progress)).toThrow(
        'progress invalid token',
      );
    });

    it('should report unexpected errors per type', () => {
      const verifySpy = jest
        .spyOn(jwt, 'verify')
        .mockImplementation(() => {
          throw new Error('boom');
        });

      const token = service.generateAccessToken({
        sub: 'user-1',
        phoneNumber: '+989123456789',
      });
      expect(() => service.verifyToken(token, AuthTokens.Temporary)).toThrow(
        'temp verification failed',
      );
      verifySpy.mockRestore();
    });
  });
});
