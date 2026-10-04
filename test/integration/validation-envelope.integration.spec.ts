import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createIntegrationApp, truncateDb } from './setup';

/**
 * Standardized envelopes (Phase 2 filter + global ValidationPipe) through
 * real HTTP: unknown DTO fields → 400, unknown routes → default 404.
 *
 * Deviation from the phase-6 spec: unmatched routes get Nest's default 404
 * body (`{statusCode, message}`) — the `AllExceptionsFilter` only shapes
 * exceptions thrown inside the pipeline. The `X-Request-Id` header is still
 * present on 404s via the global middleware.
 */
describe('Validation + error envelope (integration)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    await truncateDb(app);
    if (app) await app.close();
  });

  it('POST with an unknown field returns the 400 envelope', async () => {
    if (!app) throw new Error('integration app failed to initialize');
    const res = await request(app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ mobile: '09123456789', extra: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(String(res.body.message)).toContain('extra');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET on an unknown route returns 404 with a request id header', async () => {
    if (!app) throw new Error('integration app failed to initialize');
    const res = await request(app.getHttpServer()).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
