import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { schemeRepository } from '../../src/modules/scheme/scheme.repository';
import { env } from '../../src/config/env';
import { STATUTORY_ELIGIBILITY_DISCLAIMER } from '../../src/modules/scheme/scheme.service';

describe('Module 2: Scheme Intelligence Endpoints', () => {
  const app = createApp();

  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';
  const secretaryId = 'c0000000-0000-0000-0000-000000000003';

  const makeToken = (role: string, sub: string, pId = panchayatId) => {
    return jwt.sign({ sub, role, panchayatId: pId }, env.JWT_SECRET);
  };

  const citizenToken = makeToken('CITIZEN', citizenId);
  const secretaryToken = makeToken('PANCHAYAT_SECRETARY', secretaryId);

  const mockScheme = {
    id: 'e0000000-0000-0000-0000-000000000001',
    scheme_code: 'SCH-PMAYG',
    title: 'Pradhan Mantri Awas Yojana - Gramin',
    ministry: 'Ministry of Rural Development',
    category: 'HOUSING' as const,
    description: 'Financial assistance for construction of pucca houses.',
    benefits_summary: 'Direct grant of Rs. 1,20,000 for plain areas.',
    application_url: 'https://pmayg.nic.in',
    eligibility_rules: {
      minAge: 18,
      maxAge: 100,
      maxAnnualIncome: 150000,
      maxLandholdingAcres: 5.0,
      requiresBpl: true,
      eligibleCategories: ['SC', 'ST', 'OBC', 'GENERAL'],
      gender: 'ANY' as const,
    },
    required_documents: [
      { code: 'AADHAAR', name: 'Aadhaar Card', isMandatory: true },
      { code: 'BPL_CARD', name: 'BPL Ration Card', isMandatory: true },
    ],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockApplication = {
    id: 'e1000000-0000-0000-0000-000000000001',
    application_number: 'APP-202611-1001',
    scheme_id: mockScheme.id,
    panchayat_id: panchayatId,
    citizen_user_id: citizenId,
    is_assisted: false,
    assisted_operator_id: null,
    status: 'SUBMITTED' as const,
    applicant_data: { annualIncome: 120000, hasBplCard: true, age: 34 },
    uploaded_document_refs: [{ code: 'AADHAAR', url: 'https://docs.test/aadhaar.pdf', fileName: 'aadhaar.pdf' }],
    remarks: 'Applying for house construction',
    submitted_at: new Date(),
    sanctioned_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/schemes', () => {
    it('should list all active schemes with optional category filter', async () => {
      vi.spyOn(schemeRepository, 'findAllSchemes').mockResolvedValueOnce([mockScheme]);

      const res = await request(app).get('/api/v1/schemes?category=HOUSING');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].scheme_code).toBe('SCH-PMAYG');
    });

    it('should retrieve a single scheme by ID', async () => {
      vi.spyOn(schemeRepository, 'findSchemeById').mockResolvedValueOnce(mockScheme);

      const res = await request(app).get(`/api/v1/schemes/${mockScheme.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockScheme.id);
      expect(res.body.data.title).toBe(mockScheme.title);
    });
  });

  describe('POST /api/v1/schemes/:id/check-eligibility', () => {
    it('should evaluate citizen profile as eligible when all criteria match and include advisory disclaimer', async () => {
      vi.spyOn(schemeRepository, 'findSchemeById').mockResolvedValueOnce(mockScheme);

      const res = await request(app)
        .post(`/api/v1/schemes/${mockScheme.id}/check-eligibility`)
        .send({
          age: 32,
          annualIncome: 110000,
          landholdingAcres: 2.5,
          hasBplCard: true,
          casteCategory: 'OBC',
          gender: 'MALE',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isEligible).toBe(true);
      expect(res.body.data.unmetCriteria).toHaveLength(0);
      expect(res.body.data.matchedCriteria.length).toBeGreaterThan(0);
      expect(res.body.data.disclaimer).toBe(STATUTORY_ELIGIBILITY_DISCLAIMER);
    });

    it('should evaluate citizen profile as ineligible when income exceeds ceiling or lacks BPL card', async () => {
      vi.spyOn(schemeRepository, 'findSchemeById').mockResolvedValueOnce(mockScheme);

      const res = await request(app)
        .post(`/api/v1/schemes/${mockScheme.id}/check-eligibility`)
        .send({
          age: 32,
          annualIncome: 250000, // Exceeds 150000 limit
          landholdingAcres: 2.5,
          hasBplCard: false, // Required by scheme
          casteCategory: 'OBC',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isEligible).toBe(false);
      expect(res.body.data.unmetCriteria.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.disclaimer).toBe(STATUTORY_ELIGIBILITY_DISCLAIMER);
    });
  });

  describe('POST /api/v1/schemes/:id/apply & Application Management', () => {
    it('should allow authenticated citizen to submit an application', async () => {
      vi.spyOn(schemeRepository, 'findSchemeById').mockResolvedValueOnce(mockScheme);
      vi.spyOn(schemeRepository, 'createApplication').mockResolvedValueOnce(mockApplication);

      const res = await request(app)
        .post(`/api/v1/schemes/${mockScheme.id}/apply`)
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          applicantData: { annualIncome: 120000, hasBplCard: true, age: 34 },
          uploadedDocumentRefs: [
            { code: 'AADHAAR', url: 'https://docs.test/aadhaar.pdf', fileName: 'aadhaar.pdf' },
          ],
          remarks: 'Applying for house construction',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application_number).toBe('APP-202611-1001');
      expect(res.body.data.status).toBe('SUBMITTED');
    });

    it('should list citizen own applications via GET /api/v1/schemes/applications/my', async () => {
      vi.spyOn(schemeRepository, 'findApplicationsByCitizen').mockResolvedValueOnce([mockApplication]);

      const res = await request(app)
        .get('/api/v1/schemes/applications/my')
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].application_number).toBe('APP-202611-1001');
    });

    it('should allow Panchayat Secretary to advance application status', async () => {
      vi.spyOn(schemeRepository, 'findApplicationById').mockResolvedValueOnce(mockApplication);
      const updatedApp = { ...mockApplication, status: 'VERIFIED_BY_PANCHAYAT' as const };
      vi.spyOn(schemeRepository, 'updateApplicationStatus').mockResolvedValueOnce(updatedApp);

      const res = await request(app)
        .patch(`/api/v1/schemes/applications/${mockApplication.id}/status`)
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send({
          status: 'VERIFIED_BY_PANCHAYAT',
          remarks: 'Document verification completed at GP office.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED_BY_PANCHAYAT');
    });

    it('should reject invalid status transition jump with 400 Bad Request', async () => {
      vi.spyOn(schemeRepository, 'findApplicationById').mockResolvedValueOnce(mockApplication); // Status is SUBMITTED

      const res = await request(app)
        .patch(`/api/v1/schemes/applications/${mockApplication.id}/status`)
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send({
          status: 'SANCTIONED', // Invalid: cannot jump SUBMITTED directly to SANCTIONED
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Invalid status transition');
    });

    it('should forbid citizens from updating application status', async () => {
      const res = await request(app)
        .patch(`/api/v1/schemes/applications/${mockApplication.id}/status`)
        .set('X-Panchayat-ID', panchayatId)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          status: 'VERIFIED_BY_PANCHAYAT',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
