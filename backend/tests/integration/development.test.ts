import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { developmentRepository } from '../../src/modules/development/development.repository';
import { env } from '../../src/config/env';

describe('Module 3: Development & Expenditure Tracking Endpoints', () => {
  const app = createApp();
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const otherPanchayatId = 'a0000000-0000-0000-0000-000000000002';
  const wardId = 'b0000000-0000-0000-0000-000000000001';
  const secretaryId = 'c0000000-0000-0000-0000-000000000003';
  const sarpanchId = 'c0000000-0000-0000-0000-000000000002';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';

  const makeToken = (role: string, sub: string, pId = panchayatId) => {
    return jwt.sign({ sub, role, panchayatId: pId }, env.JWT_SECRET);
  };

  const secretaryToken = makeToken('PANCHAYAT_SECRETARY', secretaryId);
  const citizenToken = makeToken('CITIZEN', citizenId);

  const mockProject = {
    id: 'f0000000-0000-0000-0000-000000000001',
    project_code: 'PRJ-2026-0042',
    panchayat_id: panchayatId,
    ward_id: wardId,
    title: 'Construction of Cement Concrete Road in Harijan Basti',
    work_type: 'ROAD_CONCRETING',
    funding_source: 'FIFTEENTH_FINANCE_COMMISSION',
    sanction_order_number: 'SAN/15FC/HAV/2026/089',
    sanction_date: new Date('2026-01-15'),
    sanctioned_budget: 750000,
    contractor_name: 'Shree Balaji Constructions',
    contractor_phone: '9822100000',
    target_start_date: new Date('2026-02-01'),
    target_completion_date: new Date('2026-05-30'),
    status: 'IN_PROGRESS',
    has_audit_variance_flag: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMilestone = {
    id: 'f1000000-0000-0000-0000-000000000001',
    project_id: mockProject.id,
    sequence_number: 1,
    title: 'Site preparation and soling',
    target_date: new Date('2026-02-28'),
    allocated_amount: 200000,
    status: 'PENDING',
    completed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockVoucher = {
    id: 'f2000000-0000-0000-0000-000000000001',
    project_id: mockProject.id,
    milestone_id: mockMilestone.id,
    panchayat_id: panchayatId,
    voucher_number: 'VCH-202603-0001',
    voucher_date: new Date('2026-03-02'),
    payee_name: 'Shree Balaji Constructions',
    amount: 195000,
    payment_mode: 'PFMS_DIRECT_TRANSFER',
    invoice_scan_url: 'https://storage.gramvikas.in/vouchers/vch001.pdf',
    authorized_by_sachiv_id: secretaryId,
    co_signed_by_sarpanch_id: sarpanchId,
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/projects should sanction a project when called by Panchayat Secretary', async () => {
    vi.spyOn(developmentRepository, 'createProject').mockResolvedValueOnce(mockProject as any);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        wardId,
        title: 'Construction of Cement Concrete Road in Harijan Basti',
        workType: 'ROAD_CONCRETING',
        fundingSource: 'FIFTEENTH_FINANCE_COMMISSION',
        sanctionOrderNumber: 'SAN/15FC/HAV/2026/089',
        sanctionDate: '2026-01-15',
        sanctionedBudget: 750000,
        contractorName: 'Shree Balaji Constructions',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project_code).toBe('PRJ-2026-0042');
    expect(res.body.data.sanctioned_budget).toBe(750000);
  });

  it('POST /api/v1/projects should reject unauthorized Citizen (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Unauthorized road proposal',
        workType: 'ROAD_CONCRETING',
        fundingSource: 'MGNREGS',
        sanctionOrderNumber: 'SAN/001',
        sanctionDate: '2026-01-15',
        sanctionedBudget: 100000,
        contractorName: 'Test',
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/projects/:id/milestones should add milestone checkpoint to project', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any);
    vi.spyOn(developmentRepository, 'createMilestone').mockResolvedValueOnce(mockMilestone as any);

    const res = await request(app)
      .post(`/api/v1/projects/${mockProject.id}/milestones`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        sequenceNumber: 1,
        title: 'Site preparation and soling',
        targetDate: '2026-02-28',
        allocatedAmount: 200000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sequence_number).toBe(1);
    expect(res.body.data.allocated_amount).toBe(200000);
  });

  it('POST /api/v1/projects/:id/vouchers should record dual-signed voucher within budget', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any);
    vi.spyOn(developmentRepository, 'getTotalDisbursedAmount').mockResolvedValueOnce(0);
    vi.spyOn(developmentRepository, 'createVoucher').mockResolvedValueOnce(mockVoucher as any);
    vi.spyOn(developmentRepository, 'updateMilestoneStatus').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/projects/${mockProject.id}/vouchers`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        milestoneId: mockMilestone.id,
        voucherDate: '2026-03-02',
        payeeName: 'Shree Balaji Constructions',
        amount: 195000,
        paymentMode: 'PFMS_DIRECT_TRANSFER',
        coSignedBySarpanchId: sarpanchId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.voucher_number).toBe('VCH-202603-0001');
    expect(res.body.data.amount).toBe(195000);
    expect(res.body.data.co_signed_by_sarpanch_id).toBe(sarpanchId);
  });

  it('POST /api/v1/projects/:id/vouchers should reject voucher exceeding sanctioned budget (400 Bad Request)', async () => {
    vi.spyOn(developmentRepository, 'findProjectById').mockResolvedValueOnce(mockProject as any); // budget: 750,000
    vi.spyOn(developmentRepository, 'getTotalDisbursedAmount').mockResolvedValueOnce(600000); // 600,000 already spent

    const res = await request(app)
      .post(`/api/v1/projects/${mockProject.id}/vouchers`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        voucherDate: '2026-03-02',
        payeeName: 'Shree Balaji Constructions',
        amount: 200000, // 600k + 200k = 800k > 750k!
        paymentMode: 'PFMS_DIRECT_TRANSFER',
        coSignedBySarpanchId: sarpanchId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toContain('Disbursement exceeds budget');
  });

  it('GET /api/v1/projects/summary/expenditure should return public transparency aggregates', async () => {
    vi.spyOn(developmentRepository, 'getExpenditureSummary').mockResolvedValueOnce({
      panchayatId,
      totalSanctionedBudget: 1500000,
      totalDisbursedAmount: 450000,
      remainingBalance: 1050000,
      utilizationRatePercent: 30.0,
      projectCount: 3,
    });

    const res = await request(app)
      .get('/api/v1/projects/summary/expenditure')
      .set('X-Panchayat-ID', panchayatId);

    expect(res.status).toBe(200);
    expect(res.body.data.totalSanctionedBudget).toBe(1500000);
    expect(res.body.data.utilizationRatePercent).toBe(30.0);
    expect(res.body.data.projectCount).toBe(3);
  });

  it('Cross-tenant isolation: Secretary from Panchayat 1 cannot record voucher for Panchayat 2 project', async () => {
    // Secretary token belongs to Panchayat 1, but X-Panchayat-ID requested is Panchayat 2
    const res = await request(app)
      .post(`/api/v1/projects/${mockProject.id}/vouchers`)
      .set('X-Panchayat-ID', otherPanchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        voucherDate: '2026-03-02',
        payeeName: 'Cross Tenant Payee',
        amount: 50000,
        paymentMode: 'CHEQUE',
        coSignedBySarpanchId: sarpanchId,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Cross-panchayat access denied');
  });
});
