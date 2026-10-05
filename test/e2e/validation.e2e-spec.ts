import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createIntegrationApp } from '../integration/setup';

/** Global ValidationPipe: unknown DTO fields are rejected with 400. */
describe('Validation envelope (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('POST /api/auth/send-otp with an unknown field returns 400', async () => {
    if (!app) throw new Error('e2e app failed to initialize');
    const res = await request(app.getHttpServer())
      .post('/api/auth/send-otp')
      .send({ mobile: '09123456789', extra: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(String(res.body.message)).toContain('extra');
  });
});
