import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { assistedAccessRepository } from '../../src/modules/assisted-access/assisted-access.repository';
import { schemeRepository } from '../../src/modules/scheme/scheme.repository';
import { env } from '../../src/config/env';

describe('Module 10: Assisted Digital Access Endpoints', () => {
  const app = createApp();

  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const operatorId = 'c0000000-0000-0000-0000-000000000007';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';

  const makeToken = (role: string, sub: string, pId = panchayatId) => {
    return jwt.sign({ sub, role, panchayatId: pId }, env.JWT_SECRET);
  };

  const operatorToken = makeToken('ASSISTED_OPERATOR', operatorId);
  const citizenToken = makeToken('CITIZEN', citizenId);

  const mockScheme = {
    id: 'e0000000-0000-0000-0000-000000000001',
    scheme_code: 'SCH-PMAYG',
    title: 'Pradhan Mantri Awas Yojana - Gramin',
    ministry: 'Ministry of Rural Development',
    category: 'HOUSING' as const,
    description: 'Housing assistance.',
    benefits_summary: 'Direct grant.',
    application_url: 'https://pmayg.nic.in',
    eligibility_rules: { minAge: 18 },
    required_documents: [{ code: 'AADHAAR', name: 'Aadhaar Card', isMandatory: true }],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockApplication = {
    id: 'e1000000-0000-0000-0000-000000000001',
    application_number: 'APP-202611-9876',
    scheme_id: mockScheme.id,
    panchayat_id: panchayatId,
    citizen_user_id: operatorId,
    is_assisted: true,
    assisted_operator_id: operatorId,
    status: 'SUBMITTED' as const,
    applicant_data: { annualIncome: 120000, hasBplCard: true, age: 52 },
    uploaded_document_refs: [],
    remarks: 'Assisted submission by VLE operator',
    submitted_at: new Date(),
    sanctioned_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAssistedLog = {
    id: 'e2000000-0000-0000-0000-000000000001',
    panchayat_id: panchayatId,
    operator_id: operatorId,
    citizen_user_id: null,
    citizen_name: 'Chandrakant Jadhav',
    citizen_phone: '9822001122',
    service_type: 'SCHEME_APPLICATION' as const,
    reference_id: mockApplication.id,
    consent_type: 'PHYSICAL_FORM_SIGNATURE' as const,
    consent_proof_url: 'https://storage.gramvikas.in/consent/vle-77291.pdf',
    offline_tracking_token: 'VLE-77291',
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/assisted/schemes/:id/apply', () => {
    it('should allow Assisted Operator to submit application on behalf of citizen with legal consent', async () => {
      vi.spyOn(schemeRepository, 'findSchemeById').mockResolvedValueOnce(mockScheme);
      vi.spyOn(schemeRepository, 'createApplication').mockResolvedValueOnce(mockApplication);
      vi.spyOn(assistedAccessRepository, 'createLog').mockResolvedValueOnce(mockAssistedLog);

      const res = await request(app)
        .post(`/api/v1/assisted/schemes/${mockScheme.id}/apply`)
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          citizenName: 'Chandrakant Jadhav',
          citizenPhone: '9822001122',
          consentType: 'PHYSICAL_FORM_SIGNATURE',
          consentProofUrl: 'https://storage.gramvikas.in/consent/vle-77291.pdf',
          applicantData: { annualIncome: 120000, hasBplCard: true, age: 52 },
          remarks: 'Applicant visited VLE Kendra in person with signed slip.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt.offlineTrackingToken).toMatch(/^VLE-\d{5}$/);
      expect(res.body.data.receipt.maskedPhone).toBe('******1122');
      expect(res.body.data.receipt.citizenName).toBe('Chandrakant Jadhav');
      expect(res.body.data.application.is_assisted).toBe(true);
    });

    it('should forbid regular citizens from accessing operator-only assisted endpoints', async () => {
      const res = await request(app)
        .post(`/api/v1/assisted/schemes/${mockScheme.id}/apply`)
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          citizenName: 'Chandrakant Jadhav',
          citizenPhone: '9822001122',
          consentType: 'PHYSICAL_FORM_SIGNATURE',
          applicantData: { age: 52 },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/assisted/track/:token (Public Offline Receipt Lookup)', () => {
    it('should allow public lookup by offline paper token without authentication or panchayat header', async () => {
      vi.spyOn(assistedAccessRepository, 'findLogByToken').mockResolvedValueOnce(mockAssistedLog);
      vi.spyOn(schemeRepository, 'findApplicationById').mockResolvedValueOnce({
        ...mockApplication,
        scheme_title: mockScheme.title,
        scheme_code: mockScheme.scheme_code,
      });

      const res = await request(app).get('/api/v1/assisted/track/VLE-77291');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.offlineTrackingToken).toBe('VLE-77291');
      expect(res.body.data.citizenName).toBe('Chandrakant Jadhav');
      expect(res.body.data.maskedPhone).toBe('******1122');
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.details.applicationNumber).toBe('APP-202611-9876');
    });

    it('should return 404 for unknown offline tracking token', async () => {
      vi.spyOn(assistedAccessRepository, 'findLogByToken').mockResolvedValueOnce(null);

      const res = await request(app).get('/api/v1/assisted/track/VLE-00000');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('GET /api/v1/assisted/logs (Audit Logs)', () => {
    it('should allow Assisted Operator to view their recorded logs in the Panchayat', async () => {
      vi.spyOn(assistedAccessRepository, 'findLogsByOperator').mockResolvedValueOnce([mockAssistedLog]);

      const res = await request(app)
        .get('/api/v1/assisted/logs')
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].offline_tracking_token).toBe('VLE-77291');
    });
  });
});
