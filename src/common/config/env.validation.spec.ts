import 'reflect-metadata';
import { validateEnv, EnvSchema } from './env.validation';

const makeFullEnv = () => ({
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/hambaar-db',
  REDIS_URL: 'redis://localhost:6379',
  OTP_REDIS_URL: 'redis://localhost:6379/1',
  SESSION_REDIS_URL: 'redis://localhost:6379/2',
  SESSION_SECRET: 'a'.repeat(16),
  COOKIE_SECRET: 'b'.repeat(16),
  JWT_ACCESS_SECRET_KEY: 'c'.repeat(16),
  JWT_TEMP_SECRET_KEY: 'd'.repeat(16),
  JWT_PROGRESS_SECRET_KEY: 'e'.repeat(16),
  AWS_ACCESS_KEY: 'aws-access-key',
  AWS_SECRET_KEY: 'aws-secret-key',
  AWS_BUCKET_NAME: 'aws-bucket',
  AWS_ENDPOINT: 'https://storage.example.com',
  MAP_API_KEY: 'map-api-key',
  MAP_API_URL: 'https://api.example.com',
  SMS_API_KEY: 'sms-api-key',
});

describe('validateEnv', () => {
  it('passes with a valid full env', () => {
    const result = validateEnv(makeFullEnv());
    expect(result).toBeDefined();
  });

  describe('required keys', () => {
    const requiredKeys = [
      'DATABASE_URL',
      'REDIS_URL',
      'OTP_REDIS_URL',
      'SESSION_REDIS_URL',
      'SESSION_SECRET',
      'COOKIE_SECRET',
      'JWT_ACCESS_SECRET_KEY',
      'JWT_TEMP_SECRET_KEY',
      'JWT_PROGRESS_SECRET_KEY',
      'AWS_ACCESS_KEY',
      'AWS_SECRET_KEY',
      'AWS_BUCKET_NAME',
      'AWS_ENDPOINT',
      'MAP_API_KEY',
      'MAP_API_URL',
      'SMS_API_KEY',
    ];

    it.each(requiredKeys)('fails when %s is missing', (key) => {
      const env = makeFullEnv();
      delete (env as any)[key];
      expect(() => validateEnv(env)).toThrow(/Invalid environment configuration/);
    });
  });

  it('fails on invalid value types (PORT=abc)', () => {
    const env = { ...makeFullEnv(), PORT: 'abc' };
    expect(() => validateEnv(env)).toThrow(/PORT/);
  });

  it('fails when JWT secrets are too short (<16 chars)', () => {
    const env = { ...makeFullEnv(), JWT_ACCESS_SECRET_KEY: 'short' };
    expect(() => validateEnv(env)).toThrow(/JWT_ACCESS_SECRET_KEY/);
  });

  it('passes when optional keys are absent', () => {
    const env = makeFullEnv();
    const result = validateEnv(env);
    expect(result.PORT).toBeUndefined();
  });

  it('accepts a valid CORS_ORIGINS list', () => {
    const env = {
      ...makeFullEnv(),
      CORS_ORIGINS: 'https://a.example.com,https://b.example.com',
    };
    expect(() => validateEnv(env)).not.toThrow();
  });

  it('fails on an invalid CORS_ORIGINS entry', () => {
    const env = { ...makeFullEnv(), CORS_ORIGINS: 'not-a-url' };
    expect(() => validateEnv(env)).toThrow(/CORS_ORIGINS/);
  });

  it('does not read the trailing-space MAX_SEND_ATTEMPTS key', () => {
    // The canonical key (no trailing space) is what the schema reads.
    const env: any = makeFullEnv();
    env['MAX_SEND_ATTEMPTS'] = 5;
    env['MAX_SEND_ATTEMPTS '] = 99;
    const result = validateEnv(env);
    expect(result.MAX_SEND_ATTEMPTS).toBe(5);
  });
});
