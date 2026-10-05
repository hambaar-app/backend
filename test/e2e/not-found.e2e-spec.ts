import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createIntegrationApp } from '../integration/setup';

/**
 * Unknown routes get Nest's default 404 body; the global request-id
 * middleware still tags the response with an `X-Request-Id` header.
 */
describe('Not found (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET on an unknown route returns 404 with a request id', async () => {
    if (!app) throw new Error('e2e app failed to initialize');
    const res = await request(app.getHttpServer()).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
