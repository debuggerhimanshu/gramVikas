import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { tenantMiddleware } from '../../src/core/middleware/tenant.middleware';
import { errorHandler } from '../../src/core/middleware/error.middleware';
import { env } from '../../src/config/env';

const createTenantTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock authentication injector if authorization header provided
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(auth.split(' ')[1], env.JWT_SECRET) as any;
        (req as any).user = {
          id: decoded.sub,
          role: decoded.role,
          panchayatId: decoded.panchayatId,
        };
      } catch {}
    }
    next();
  });

  app.use(tenantMiddleware);

  app.get('/test/tenant', (req, res) => {
    res.status(200).json({ success: true, panchayatId: req.headers['x-panchayat-id'] });
  });

  app.use(errorHandler);
  return app;
};

describe('Multi-Tenant Context Middleware', () => {
  const app = createTenantTestApp();
  const validPanchayatId = 'a0000000-0000-0000-0000-000000000001';
  const otherPanchayatId = 'a0000000-0000-0000-0000-000000000002';

  it('should reject request missing X-Panchayat-ID with 400 Bad Request', async () => {
    const res = await request(app).get('/test/tenant');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toContain('Missing required');
  });

  it('should reject request with invalid UUID format with 400 Bad Request', async () => {
    const res = await request(app)
      .get('/test/tenant')
      .set('X-Panchayat-ID', 'not-a-valid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toContain('Invalid');
  });

  it('should permit request with valid X-Panchayat-ID', async () => {
    const res = await request(app)
      .get('/test/tenant')
      .set('X-Panchayat-ID', validPanchayatId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.panchayatId).toBe(validPanchayatId);
  });

  it('should reject citizen accessing another panchayat with 403 Forbidden', async () => {
    const token = jwt.sign(
      { sub: 'usr-1', role: 'CITIZEN', panchayatId: validPanchayatId },
      env.JWT_SECRET
    );

    const res = await request(app)
      .get('/test/tenant')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Panchayat-ID', otherPanchayatId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Cross-panchayat access denied');
  });

  it('should permit block officer supervisory access across panchayats', async () => {
    const token = jwt.sign(
      { sub: 'bdo-1', role: 'BLOCK_OFFICER', blockId: 'block-haveli' },
      env.JWT_SECRET
    );

    const res = await request(app)
      .get('/test/tenant')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Panchayat-ID', otherPanchayatId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
