import { ConfigService } from '@nestjs/config';
import { DocumentBuilder } from '@nestjs/swagger';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Parse the CORS_ORIGINS env (comma-separated) into a CorsOptions origin
 * callback. Returns undefined when unset — caller should then deny/omit CORS.
 * Never returns `true` (no reflect-request-origin wildcard).
 */
export function parseCorsOrigins(config: ConfigService): CorsOptions {
  const raw = config.get<string>('CORS_ORIGINS');

  if (!raw) {
    return { origin: false, credentials: true };
  }

  const origins = raw
    .split(',')
   .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  };
}

/**
 * Build the Swagger document config. Pure — no app reference needed for tests.
 */
export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('HamBaar App')
    .setDescription('HamBaar App API using NestJS and Prisma')
    .setVersion('1.0')
    .build();
}

/**
 * Swagger is enabled only outside production.
 */
export function isSwaggerEnabled(config: ConfigService): boolean {
  const nodeEnv = config.get<string>('NODE_ENV');
  return nodeEnv !== 'production';
}
