import {
  parseCorsOrigins,
  buildSwaggerConfig,
  isSwaggerEnabled,
} from './bootstrap-options';
import { ConfigService } from '@nestjs/config';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('bootstrap-options', () => {
  let config: DeepMockProxy<ConfigService>;

  beforeEach(() => {
    config = mockDeep<ConfigService>();
  });

  describe('parseCorsOrigins', () => {
    it('returns origin:false when CORS_ORIGINS is unset', () => {
      config.get.mockReturnValue(undefined);
      const result = parseCorsOrigins(config);
      expect(result.origin).toBe(false);
      expect(result.credentials).toBe(true);
    });

    it('allows listed origins and blocks others', () => {
      config.get.mockReturnValue('https://a.example.com,https://b.example.com');
      const result = parseCorsOrigins(config);
      const origin = result.origin as (
        o: string | undefined,
        cb: (err: Error | null, allow: boolean) => void,
      ) => void;

      const allowedCb = jest.fn();
      origin('https://a.example.com', allowedCb);
      expect(allowedCb).toHaveBeenCalledWith(null, true);

      const blockedCb = jest.fn();
      origin('https://evil.example.com', blockedCb);
      expect(blockedCb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not allowed by CORS'),
        }),
      );
    });

    it('allows requests with no origin header', () => {
      config.get.mockReturnValue('https://a.example.com');
      const result = parseCorsOrigins(config);
      const origin = result.origin as (
        o: string | undefined,
        cb: (err: Error | null, allow: boolean) => void,
      ) => void;
      const cb = jest.fn();
      origin(undefined, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('trims whitespace around origins', () => {
      config.get.mockReturnValue(' https://a.example.com , https://b.example.com ');
      const result = parseCorsOrigins(config);
      const origin = result.origin as (
        o: string | undefined,
        cb: (err: Error | null, allow: boolean) => void,
      ) => void;
      const cb = jest.fn();
      origin('https://b.example.com', cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });
  });

  describe('buildSwaggerConfig', () => {
    it('returns a DocumentBuilder config with title', () => {
      const result = buildSwaggerConfig();
      expect(result).toBeDefined();
      expect(result.info.title).toBe('HamBaar App');
    });
  });

  describe('isSwaggerEnabled', () => {
    it('returns true when NODE_ENV is not production', () => {
      config.get.mockReturnValue('development');
      expect(isSwaggerEnabled(config)).toBe(true);
    });

    it('returns false when NODE_ENV is production', () => {
      config.get.mockReturnValue('production');
      expect(isSwaggerEnabled(config)).toBe(false);
    });

    it('returns true when NODE_ENV is unset', () => {
      config.get.mockReturnValue(undefined);
      expect(isSwaggerEnabled(config)).toBe(true);
    });
  });
});
