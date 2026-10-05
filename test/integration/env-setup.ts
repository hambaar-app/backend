/**
 * Jest `setupFiles` entry — runs BEFORE test-file imports are evaluated.
 *
 * Required because `AppModule` calls `ConfigModule.forRoot({ validate })`
 * at import (decorator-evaluation) time. Setting these here (instead of in
 * `beforeAll`) guarantees the validated env exists when the module graph
 * loads. Values apply only when unset, so CI-provided vars always win.
 *
 * Must stay in sync with `setupIntegrationEnv()` in `./setup`.
 */
const DEFAULTS: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/hambaar_test',
  REDIS_URL: 'redis://localhost:6380',
  OTP_REDIS_URL: 'redis://localhost:6380/1',
  SESSION_REDIS_URL: 'redis://localhost:6380/2',
  SESSION_SECRET: 'test-session-secret-min-16-chars',
  COOKIE_SECRET: 'test-cookie-secret',
  JWT_ACCESS_SECRET_KEY: 'test-jwt-access-secret-min-16',
  JWT_TEMP_SECRET_KEY: 'test-jwt-temp-secret-min-16',
  JWT_PROGRESS_SECRET_KEY: 'test-jwt-progress-secret-min-16',
  AWS_ACCESS_KEY: 'test',
  AWS_SECRET_KEY: 'test',
  AWS_BUCKET_NAME: 'test-bucket',
  AWS_ENDPOINT: 'https://s3.test.local',
  MAP_API_KEY: 'test',
  MAP_API_URL: 'https://maps.test.local',
  SMS_API_KEY: 'test',
  API_PREFIX: 'api',
  // The test runner's own heap dwarfs a production container's — keep the
  // Terminus memory probe green without touching the 150 MB app default.
  MEMORY_HEAP_THRESHOLD_MB: '4096',
};

for (const [key, value] of Object.entries(DEFAULTS)) {
  if (!process.env[key]) process.env[key] = value;
}

export {};
