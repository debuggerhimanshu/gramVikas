import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/core/middleware/auth.middleware';
import { authorize } from '../../src/core/middleware/rbac.middleware';
import { errorHandler } from '../../src/core/middleware/error.middleware';
import { env } from '../../src/config/env';

const createRbacTestApp = () => {
  const app = express();
  app.use(express.json());

  // Protected route requiring SARPANCH or PANCHAYAT_SECRETARY
  app.post(
    '/api/v1/test/sanction',
    authenticate,
    authorize(['SARPANCH', 'PANCHAYAT_SECRETARY']),
    (req, res) => {
      res.status(200).json({ success: true, message: 'Sanction authorized' });
    }
  );

  // Read route with block officer supervision allowed
  app.get(
    '/api/v1/test/audit',
    authenticate,
    authorize(['PANCHAYAT_SECRETARY'], { allowBlockOfficerSupervision: true }),
    (req, res) => {
      res.status(200).json({ success: true, message: 'Audit report read' });
    }
  );

  app.use(errorHandler);
  return app;
};

describe('Authentication & RBAC Middleware', () => {
  const app = createRbacTestApp();

  const generateToken = (role: string, id = 'test-user') => {
    return jwt.sign({ sub: id, role, panchayatId: 'a0000000-0000-0000-0000-000000000001' }, env.JWT_SECRET);
  };

  it('should reject unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/v1/test/sanction');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject request with invalid token with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/test/sanction')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject citizen attempting to sanction project with 403 Forbidden', async () => {
    const citizenToken = generateToken('CITIZEN');

    const res = await request(app)
      .post('/api/v1/test/sanction')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain("Role 'CITIZEN' lacks permission");
  });

  it('should permit Sarpanch to sanction project with 200 OK', async () => {
    const sarpanchToken = generateToken('SARPANCH');

    const res = await request(app)
      .post('/api/v1/test/sanction')
      .set('Authorization', `Bearer ${sarpanchToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should permit Panchayat Secretary to sanction project with 200 OK', async () => {
    const sachivToken = generateToken('PANCHAYAT_SECRETARY');

    const res = await request(app)
      .post('/api/v1/test/sanction')
      .set('Authorization', `Bearer ${sachivToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should permit System Admin universally', async () => {
    const adminToken = generateToken('SYSTEM_ADMIN');

    const res = await request(app)
      .post('/api/v1/test/sanction')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should permit Block Officer supervisory read on audit endpoint', async () => {
    const bdoToken = generateToken('BLOCK_OFFICER');

    const res = await request(app)
      .get('/api/v1/test/audit')
      .set('Authorization', `Bearer ${bdoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
