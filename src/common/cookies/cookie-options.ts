import { ConfigService } from '@nestjs/config';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  domain?: string;
  path: string;
}

const DAY_MS = 24 * 3600 * 1000;

/**
 * Single source of truth for auth cookie options. Used by the auth controller
 * and anywhere else that sets auth cookies. Fixes the duplicated cookie
 * objects and hard-coded secure:false scattered across the controller.
 */
export function getCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const secureRaw = config.get<string>('COOKIE_SECURE');
  const sameSiteRaw = config.get<string>('COOKIE_SAMESITE') ?? 'strict';
  const domain = config.get<string>('COOKIE_DOMAIN');

  const maxAge = config.get<number>('COOKIE_MAX_AGE', 15 * DAY_MS); // 15 days

  const sameSite = (['strict', 'lax', 'none'].includes(sameSiteRaw)
    ? sameSiteRaw
    : 'strict') as 'strict' | 'lax' | 'none';

  return {
    httpOnly: true,
    secure: secureRaw !== undefined ? secureRaw === 'true' : isProduction,
    sameSite,
    maxAge,
    ...(domain ? { domain } : {}),
    path: '/',
  };
}
