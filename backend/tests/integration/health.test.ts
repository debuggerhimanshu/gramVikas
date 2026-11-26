import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import * as dbModule from '../../src/core/database/connection';

describe('Health Check Endpoints', () => {
  const app = createApp();

  it('GET /health should return 200 and liveness status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('GET /health/db should return 200 when database is healthy', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValueOnce(true);

    const res = await request(app).get('/health/db');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  it('GET /health/db should return 503 when database is disconnected', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValueOnce(false);

    const res = await request(app).get('/health/db');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database).toBe('disconnected');
  });
});
