import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/core/middleware/error.middleware';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from '../../src/core/errors/app-error';

const createErrorTestApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/test/bad-request', () => {
    throw new BadRequestError('Invalid input parameter', { field: 'name' });
  });

  app.get('/test/unauthorized', () => {
    throw new UnauthorizedError('Token expired');
  });

  app.get('/test/forbidden', () => {
    throw new ForbiddenError('Insufficient permissions');
  });

  app.get('/test/not-found', () => {
    throw new NotFoundError('Asset not found');
  });

  app.get('/test/conflict', () => {
    throw new ConflictError('Ticket already assigned');
  });

  app.get('/test/validation', () => {
    throw new ValidationError('Validation failed on schema', [{ path: 'email', message: 'Required' }]);
  });

  app.get('/test/internal', () => {
    throw new Error('Unexpected database connection timeout');
  });

  app.use(errorHandler);
  return app;
};

describe('Centralized Error Handler', () => {
  const app = createErrorTestApp();

  it('should map BadRequestError to 400 and RFC-7807 structure', async () => {
    const res = await request(app).get('/test/bad-request');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Invalid input parameter');
    expect(res.body.error.details).toEqual({ field: 'name' });
  });

  it('should map UnauthorizedError to 401', async () => {
    const res = await request(app).get('/test/unauthorized');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should map ForbiddenError to 403', async () => {
    const res = await request(app).get('/test/forbidden');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should map NotFoundError to 404', async () => {
    const res = await request(app).get('/test/not-found');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should map ConflictError to 409', async () => {
    const res = await request(app).get('/test/conflict');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should map ValidationError to 422', async () => {
    const res = await request(app).get('/test/validation');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('should map unhandled generic Error to 500 INTERNAL_SERVER_ERROR', async () => {
    const res = await request(app).get('/test/internal');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('An unexpected internal error occurred.');
  });
});
