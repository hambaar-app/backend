import { getCookieOptions } from './cookie-options';
import { ConfigService } from '@nestjs/config';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('getCookieOptions', () => {
  let config: DeepMockProxy<ConfigService>;

  beforeEach(() => {
    config = mockDeep<ConfigService>();
  });

  const baseConfig = () => {
    config.get.mockImplementation((key: string, defaultValue?: any) => {
      const map: Record<string, any> = {
        NODE_ENV: 'production',
        COOKIE_MAX_AGE: 15 * 24 * 3600 * 1000,
        COOKIE_SAMESITE: 'strict',
      };
      return map[key] ?? defaultValue;
    });
  };

  it('sets httpOnly and secure in production by default', () => {
    baseConfig();
    const options = getCookieOptions(config);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('strict');
    expect(options.path).toBe('/');
  });

  it('sets secure false in development by default', () => {
    config.get.mockImplementation((key: string, defaultValue?: any) => {
      const map: Record<string, any> = {
        NODE_ENV: 'development',
        COOKIE_MAX_AGE: 15 * 24 * 3600 * 1000,
        COOKIE_SAMESITE: 'strict',
      };
      return map[key] ?? defaultValue;
    });
    const options = getCookieOptions(config);
    expect(options.secure).toBe(false);
  });

  it('honors explicit COOKIE_SECURE=true even in development', () => {
    config.get.mockImplementation((key: string, defaultValue?: any) => {
      const map: Record<string, any> = {
        NODE_ENV: 'development',
        COOKIE_SECURE: 'true',
        COOKIE_MAX_AGE: 15 * 24 * 3600 * 1000,
        COOKIE_SAMESITE: 'strict',
      };
      return map[key] ?? defaultValue;
    });
    const options = getCookieOptions(config);
    expect(options.secure).toBe(true);
  });

  it('uses default maxAge of 15 days when unset', () => {
    config.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'COOKIE_SAMESITE') return 'strict';
      return defaultValue;
    });
    const options = getCookieOptions(config);
    expect(options.maxAge).toBe(15 * 24 * 3600 * 1000);
  });

  it('falls back to strict for invalid sameSite', () => {
    config.get.mockImplementation((key: string, defaultValue?: any) => {
      const map: Record<string, any> = {
        NODE_ENV: 'production',
        COOKIE_MAX_AGE: 15 * 24 * 3600 * 1000,
        COOKIE_SAMESITE: 'bogus',
      };
      return map[key] ?? defaultValue;
    });
    const options = getCookieOptions(config);
    expect(options.sameSite).toBe('strict');
  });

  it('includes domain when set', () => {
    config.get.mockImplementation((key: string, defaultValue?: any) => {
      const map: Record<string, any> = {
        NODE_ENV: 'production',
        COOKIE_MAX_AGE: 15 * 24 * 3600 * 1000,
        COOKIE_SAMESITE: 'strict',
        COOKIE_DOMAIN: 'example.com',
      };
      return map[key] ?? defaultValue;
    });
    const options = getCookieOptions(config);
    expect(options.domain).toBe('example.com');
  });
});
