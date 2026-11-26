import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { developmentRepository } from '../../src/modules/development/development.repository';
import { verificationRepository } from '../../src/modules/verification/verification.repository';
import { env } from '../../src/config/env';

describe('Cross-Module Integration: Citizen Verification to Milestone & Project State Update', () => {
  const app = createApp();
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const projectId = 'f0000000-0000-0000-0000-000000000001';
  const milestoneId = 'f1000000-0000-0000-0000-000000000002';
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
    has_audit_variance_flag: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Defective verification with variance flag should freeze milestone and set audit variance on project', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any);

    const mockVerification = {
      id: 'ver-variance-1',
      project_id: projectId,
      milestone_id: milestoneId,
      panchayat_id: panchayatId,
      verified_by_user_id: citizenId,
      verification_source: 'CITIZEN_SOCIAL_AUDIT',
      geo_latitude: 18.3541,
      geo_longitude: 73.8612,
      distance_from_project_meters: 5,
      photo_urls: ['https://storage.gramvikas.in/evidence/concrete-spall.jpg'],
      observations: 'Aggregate separation and crumbly concrete in M20 layer.',
      rating: 'DEFECTIVE',
      audit_variance_flag: true,
      status: 'SUBMITTED',
      created_at: new Date(),
    };

    vi.spyOn(verificationRepository, 'createVerification').mockResolvedValueOnce(mockVerification as any);

    // Spies on development subscriber reactions
    const setVarianceSpy = vi.spyOn(developmentRepository, 'setAuditVarianceFlag').mockResolvedValueOnce(undefined);
    const updateMilestoneSpy = vi.spyOn(developmentRepository, 'updateMilestoneStatus').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post('/api/v1/verification/submit')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        projectId,
        milestoneId,
        geoLatitude: 18.3541,
        geoLongitude: 73.8612,
        photoUrls: ['https://storage.gramvikas.in/evidence/concrete-spall.jpg'],
        observations: 'Aggregate separation and crumbly concrete in M20 layer.',
        rating: 'DEFECTIVE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify subscriber execution
    expect(setVarianceSpy).toHaveBeenCalledWith(projectId, panchayatId, true);
    expect(updateMilestoneSpy).toHaveBeenCalledWith(milestoneId, 'FROZEN_VARIANCE');
  });

  it('Satisfactory verification without variance should mark milestone VERIFIED_COMPLETE', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any);
    vi.spyOn(developmentRepository, 'getTotalDisbursedAmount').mockResolvedValueOnce(100000);

    const mockSatisfactoryVerification = {
      id: 'ver-satisfactory-1',
      project_id: projectId,
      milestone_id: milestoneId,
      panchayat_id: panchayatId,
      verified_by_user_id: citizenId,
      verification_source: 'CITIZEN_SOCIAL_AUDIT',
      geo_latitude: 18.3541,
      geo_longitude: 73.8612,
      distance_from_project_meters: 5,
      photo_urls: ['https://storage.gramvikas.in/evidence/good-curing.jpg'],
      observations: 'Continuous ponding water curing observed; smooth finish without voids.',
      rating: 'SATISFACTORY',
      audit_variance_flag: false,
      status: 'SUBMITTED',
      created_at: new Date(),
    };

    vi.spyOn(verificationRepository, 'createVerification').mockResolvedValueOnce(mockSatisfactoryVerification as any);
    const updateMilestoneSpy = vi.spyOn(developmentRepository, 'updateMilestoneStatus').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post('/api/v1/verification/submit')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        projectId,
        milestoneId,
        geoLatitude: 18.3541,
        geoLongitude: 73.8612,
        photoUrls: ['https://storage.gramvikas.in/evidence/good-curing.jpg'],
        observations: 'Continuous ponding water curing observed; smooth finish without voids.',
        rating: 'SATISFACTORY',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(updateMilestoneSpy).toHaveBeenCalledWith(milestoneId, 'VERIFIED_COMPLETE');
  });
});
