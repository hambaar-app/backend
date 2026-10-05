import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createIntegrationApp } from '../integration/setup';

/** Full-app smoke: Terminus health against real DB + Redis. */
describe('Health (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('/api/health (GET) responds 200', async () => {
    if (!app) throw new Error('e2e app failed to initialize');
    const res = await request(app.getHttpServer()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
