import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { authRepository } from '../../src/modules/auth/auth.repository';
import { hashPassword } from '../../src/modules/auth/auth.service';
import { env } from '../../src/config/env';

describe('Auth & Dynamic Onboarding Endpoints', () => {
  const app = createApp();

  const districtId = 'd1000000-0000-0000-0000-000000000001';
  const blockId = 'e1000000-0000-0000-0000-000000000001';
  const newPanchayatId = 'a0000000-0000-0000-0000-000000000099';
  const otherPanchayatId = 'a0000000-0000-0000-0000-000000000002';
  const wardId = 'b0000000-0000-0000-0000-000000000099';

  const mockPanchayat = {
    id: newPanchayatId,
    district_id: districtId,
    block_id: blockId,
    code: 'GP-251999',
    lgd_code: '251999',
    name: 'Kasurdi Gram Panchayat',
    block_name: 'Haveli',
    district_name: 'Pune',
    state_name: 'Maharashtra',
    office_address: 'Kasurdi Main Road',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockWard = {
    id: wardId,
    panchayat_id: newPanchayatId,
    ward_number: 1,
    ward_name: 'Ward 1 - Central',
    representative_user_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSarpanchUser = {
    id: 'c0000000-0000-0000-0000-000000000091',
    mobile_number: '9876543210',
    email: 'sarpanch.kasurdi@gramvikas.in',
    password_hash: hashPassword('SarpanchSecure@123'),
    full_name: 'Anandi Bai Shinde',
    designation: 'Sarpanch',
    role: 'SARPANCH' as const,
    account_status: 'ACTIVE' as const,
    panchayat_id: newPanchayatId,
    ward_id: wardId,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCitizenUser = {
    id: 'c0000000-0000-0000-0000-000000000092',
    mobile_number: '9876543211',
    email: null,
    password_hash: hashPassword('CitizenPass@123'),
    full_name: 'Santosh Gaikwad',
    designation: null,
    role: 'CITIZEN' as const,
    account_status: 'ACTIVE' as const,
    panchayat_id: newPanchayatId,
    ward_id: wardId,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/register-panchayat', () => {
    it('should register a new Panchayat and create Sarpanch leader account with JWT', async () => {
      vi.spyOn(authRepository, 'findPanchayatByLgdCode').mockResolvedValueOnce(null);
      vi.spyOn(authRepository, 'findUserByMobile').mockResolvedValueOnce(null);
      vi.spyOn(authRepository, 'createPanchayat').mockResolvedValueOnce(mockPanchayat);
      vi.spyOn(authRepository, 'createWard').mockResolvedValueOnce(mockWard);
      vi.spyOn(authRepository, 'createUser').mockResolvedValueOnce(mockSarpanchUser);

      const res = await request(app)
        .post('/api/v1/auth/register-panchayat')
        .send({
          districtId,
          blockId,
          name: 'Kasurdi Gram Panchayat',
          lgdCode: '251999',
          officeAddress: 'Kasurdi Main Road',
          leader: {
            fullName: 'Anandi Bai Shinde',
            phone: '9876543210',
            email: 'sarpanch.kasurdi@gramvikas.in',
            password: 'SarpanchSecure@123',
            designation: 'Sarpanch',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.panchayat.id).toBe(newPanchayatId);
      expect(res.body.data.user.role).toBe('SARPANCH');
      expect(res.body.data.user.fullName).toBe('Anandi Bai Shinde');
      expect(res.body.data.defaultWard.wardNumber).toBe(1);

      // Verify JWT token payload
      const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET) as any;
      expect(decoded.sub).toBe(mockSarpanchUser.id);
      expect(decoded.role).toBe('SARPANCH');
      expect(decoded.panchayatId).toBe(newPanchayatId);
    });

    it('should reject registration if LGD code is already registered with 409 Conflict', async () => {
      vi.spyOn(authRepository, 'findPanchayatByLgdCode').mockResolvedValueOnce(mockPanchayat);

      const res = await request(app)
        .post('/api/v1/auth/register-panchayat')
        .send({
          districtId,
          blockId,
          name: 'Kasurdi Gram Panchayat',
          lgdCode: '251999',
          leader: {
            fullName: 'Anandi Bai Shinde',
            phone: '9876543210',
            password: 'SarpanchSecure@123',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject invalid payload with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-panchayat')
        .send({
          districtId: 'not-a-uuid',
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/register-citizen', () => {
    it('should register a resident citizen scoped to newly created Panchayat', async () => {
      vi.spyOn(authRepository, 'findPanchayatById').mockResolvedValueOnce(mockPanchayat);
      vi.spyOn(authRepository, 'findWardById').mockResolvedValueOnce(mockWard);
      vi.spyOn(authRepository, 'findUserByMobile').mockResolvedValueOnce(null);
      vi.spyOn(authRepository, 'createUser').mockResolvedValueOnce(mockCitizenUser);

      const res = await request(app)
        .post('/api/v1/auth/register-citizen')
        .send({
          panchayatId: newPanchayatId,
          wardId,
          fullName: 'Santosh Gaikwad',
          phone: '9876543211',
          password: 'CitizenPass@123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CITIZEN');
      expect(res.body.data.user.panchayatId).toBe(newPanchayatId);
      expect(res.body.data.user.wardId).toBe(wardId);

      // Verify JWT token payload
      const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET) as any;
      expect(decoded.sub).toBe(mockCitizenUser.id);
      expect(decoded.role).toBe('CITIZEN');
      expect(decoded.panchayatId).toBe(newPanchayatId);
      expect(decoded.wardId).toBe(wardId);
    });

    it('should reject citizen registration if target ward does not belong to panchayat', async () => {
      vi.spyOn(authRepository, 'findPanchayatById').mockResolvedValueOnce(mockPanchayat);
      vi.spyOn(authRepository, 'findWardById').mockResolvedValueOnce(null); // ward not found in this panchayat

      const res = await request(app)
        .post('/api/v1/auth/register-citizen')
        .send({
          panchayatId: newPanchayatId,
          wardId: 'b0000000-0000-0000-0000-000000000999',
          fullName: 'Santosh Gaikwad',
          phone: '9876543211',
          password: 'CitizenPass@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should reject citizen registration if mobile is already registered', async () => {
      vi.spyOn(authRepository, 'findPanchayatById').mockResolvedValueOnce(mockPanchayat);
      vi.spyOn(authRepository, 'findWardById').mockResolvedValueOnce(mockWard);
      vi.spyOn(authRepository, 'findUserByMobile').mockResolvedValueOnce(mockCitizenUser);

      const res = await request(app)
        .post('/api/v1/auth/register-citizen')
        .send({
          panchayatId: newPanchayatId,
          wardId,
          fullName: 'Santosh Gaikwad',
          phone: '9876543211',
          password: 'CitizenPass@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate Sarpanch and return JWT token and role', async () => {
      vi.spyOn(authRepository, 'findUserByIdentifier').mockResolvedValueOnce(mockSarpanchUser);
      vi.spyOn(authRepository, 'findPanchayatById').mockResolvedValueOnce(mockPanchayat);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9876543210',
          password: 'SarpanchSecure@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('SARPANCH');
      expect(res.body.data.user.mobileNumber).toBe('9876543210');

      const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET) as any;
      expect(decoded.role).toBe('SARPANCH');
      expect(decoded.panchayatId).toBe(newPanchayatId);
    });

    it('should authenticate Citizen and return JWT token and role', async () => {
      vi.spyOn(authRepository, 'findUserByIdentifier').mockResolvedValueOnce(mockCitizenUser);
      vi.spyOn(authRepository, 'findPanchayatById').mockResolvedValueOnce(mockPanchayat);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9876543211',
          password: 'CitizenPass@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CITIZEN');

      const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET) as any;
      expect(decoded.role).toBe('CITIZEN');
      expect(decoded.panchayatId).toBe(newPanchayatId);
    });

    it('should reject login with wrong password with 401 Unauthorized', async () => {
      vi.spyOn(authRepository, 'findUserByIdentifier').mockResolvedValueOnce(mockCitizenUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9876543211',
          password: 'WrongPassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login if user not found with 401 Unauthorized', async () => {
      vi.spyOn(authRepository, 'findUserByIdentifier').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9999999999',
          password: 'SomePassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Security & Multi-Tenant Boundary Enforcement', () => {
    it('should return 401 Unauthorized for unauthenticated requests to protected endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/grievances')
        .set('X-Panchayat-ID', newPanchayatId);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should block cross-panchayat actions when user attempts access with mismatched X-Panchayat-ID', async () => {
      // Citizen token belongs to newPanchayatId
      const citizenToken = jwt.sign(
        { sub: mockCitizenUser.id, role: 'CITIZEN', panchayatId: newPanchayatId },
        env.JWT_SECRET
      );

      // Attempting to access otherPanchayatId with token issued for newPanchayatId
      const res = await request(app)
        .get('/api/v1/grievances')
        .set('X-Panchayat-ID', otherPanchayatId)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Cross-panchayat access denied');
    });
  });
});
