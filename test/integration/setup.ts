import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/modules/app/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from '../../src/common/middleware/request-id.middleware';
import { PORTS } from '../../src/infra/ports/ports.tokens';

/**
 * Shared bootstrap for the integration suite (Phase 6 Task 1).
 *
 * - Env defaults target `docker-compose.test.yml` (postgres :5433, redis
 *   :6380) and apply only when unset, so CI-provided values always win.
 * - External ports (S3/SMS/Neshan) are overridden with in-memory fakes —
 *   no network, no secrets (T-6).
 * - HTTP pipeline mirrors `src/main.ts`: global prefix, ValidationPipe
 *   (whitelist + forbidNonWhitelisted), AllExceptionsFilter, request ids.
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

export function setupIntegrationEnv(): void {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

const fakeStorage = {
  generatePutPresignedUrl: async (key: string) => `https://test.local/${key}`,
  generateGetPresignedUrl: async (key: string | undefined | null) =>
    key ? `https://test.local/${key}` : '',
  deleteFile: async () => undefined,
  fileExists: async () => false,
};

const fakeSms = {
  sendSms: async () => true,
  sendOtp: async () => true,
};

const fakeMaps = {
  calculateDistance: async () => ({ distance: 1, duration: 1 }),
  reverseGeocode: async () => ({
    status: 'OK',
    city: 'TestCity',
    county: null,
  }),
  getDirections: async () => ({ routes: [] }),
};

export async function createIntegrationApp(): Promise<INestApplication> {
  setupIntegrationEnv();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PORTS.STORAGE)
    .useValue(fakeStorage)
    .overrideProvider(PORTS.SMS)
    .useValue(fakeSms)
    .overrideProvider(PORTS.MAPS)
    .useValue(fakeMaps)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  const requestIds = new RequestIdMiddleware();
  app.use((req: unknown, res: unknown, next: () => void) =>
    requestIds.use(req as never, res as never, next as never),
  );
  await app.init();
  return app;
}

/**
 * Physical table names (see `@@map` in `prisma/schema.prisma`) truncate
 * (CASCADE) — keeps suites isolated.
 */
const TABLES = [
  'tracking_updates',
  'matched_requests',
  'trip_requests',
  'trip_waypoints',
  'trips',
  'package_recipients',
  'packages',
  'addresses',
  'transactions',
  'wallets',
  'notifications',
  'vehicles',
  'vehicle_models',
  'vehicle_brands',
  'transporters',
  'verification_status',
  'achievements',
  'cities',
  'provinces',
  'users',
];

export async function truncateDb(
  app: INestApplication | undefined,
): Promise<void> {
  if (!app) return;
  const prisma = app.get(PrismaService);
  const tables = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
}
