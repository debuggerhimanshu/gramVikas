import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { verificationRepository } from '../../src/modules/verification/verification.repository';
import { developmentRepository } from '../../src/modules/development/development.repository';
import { env } from '../../src/config/env';

describe('Module 6: Development Verification Endpoints', () => {
  const app = createApp();
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const projectId = 'f0000000-0000-0000-0000-000000000001';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';

  const citizenToken = jwt.sign(
    { sub: citizenId, role: 'CITIZEN', panchayatId },
    env.JWT_SECRET
  );

  const mockProject = {
    id: projectId,
    project_code: 'PRJ-2026-0042',
    panchayat_id: panchayatId,
    sanctioned_budget: 750000,
  };

  const mockVerification = {
    id: 'ver-001',
    project_id: projectId,
    milestone_id: null,
    panchayat_id: panchayatId,
    verified_by_user_id: citizenId,
    verification_source: 'CITIZEN_SOCIAL_AUDIT',
    geo_latitude: 18.3541,
    geo_longitude: 73.8612,
    distance_from_project_meters: 10,
    photo_urls: ['https://storage.gramvikas.in/evidence/road-cracks.jpg'],
    observations: 'Concrete surface has severe cracks after 48 hours without curing.',
    rating: 'DEFECTIVE',
    audit_variance_flag: true,
    status: 'SUBMITTED',
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/verification/submit should record geotagged evidence and set variance flag for DEFECTIVE rating', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any);
    vi.spyOn(verificationRepository, 'createVerification').mockResolvedValueOnce(mockVerification as any);

    const res = await request(app)
      .post('/api/v1/verification/submit')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        projectId,
        geoLatitude: 18.3541,
        geoLongitude: 73.8612,
        photoUrls: ['https://storage.gramvikas.in/evidence/road-cracks.jpg'],
        observations: 'Concrete surface has severe cracks after 48 hours without curing.',
        rating: 'DEFECTIVE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.audit_variance_flag).toBe(true);
    expect(res.body.data.rating).toBe('DEFECTIVE');
  });

  it('POST /api/v1/verification/submit should detect physical-vs-financial variance (Funds > 75% disbursed but work INCOMPLETE)', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any); // budget: 750k
    vi.spyOn(developmentRepository, 'getTotalDisbursedAmount').mockResolvedValueOnce(600000); // 80% disbursed!

    const varianceVerification = {
      ...mockVerification,
      rating: 'INCOMPLETE',
      audit_variance_flag: true,
    };
    const createSpy = vi.spyOn(verificationRepository, 'createVerification').mockResolvedValueOnce(varianceVerification as any);

    const res = await request(app)
      .post('/api/v1/verification/submit')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        projectId,
        geoLatitude: 18.3541,
        geoLongitude: 73.8612,
        photoUrls: ['https://storage.gramvikas.in/evidence/road-incomplete.jpg'],
        observations: 'Work is barely 30% complete, gravel unrolled, yet contractors claim 80% finished.',
        rating: 'INCOMPLETE',
      });

    expect(res.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      panchayatId,
      citizenId,
      true // auditVarianceFlag must be computed as TRUE
    );
  });

  it('GET /api/v1/verification/project/:projectId should list all verifications for a project', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any);
    vi.spyOn(verificationRepository, 'listVerificationsByProject').mockResolvedValueOnce({
      verifications: [mockVerification as any],
      total: 1,
    });

    const res = await request(app)
      .get(`/api/v1/verification/project/${projectId}`)
      .set('X-Panchayat-ID', panchayatId);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe('ver-001');
  });
});
