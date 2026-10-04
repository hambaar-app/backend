import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createIntegrationApp, truncateDb } from './setup';

/** Full AppModule against real Postgres + Redis (ports faked). */
describe('Health (integration)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    await truncateDb(app);
    if (app) await app.close();
  });

  it('GET /api/health responds 200 when DB + Redis are up', async () => {
    if (!app) throw new Error('integration app failed to initialize');
    const res = await request(app.getHttpServer()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
