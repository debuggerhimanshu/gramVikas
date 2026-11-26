import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { grievanceRepository } from '../../src/modules/grievance/grievance.repository';
import { env } from '../../src/config/env';

describe('Module 1: Grievance Management Endpoints', () => {
  const app = createApp();
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const wardId = 'b0000000-0000-0000-0000-000000000001';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';
  const secretaryId = 'c0000000-0000-0000-0000-000000000003';

  const makeToken = (role: string, sub: string) => {
    return jwt.sign({ sub, role, panchayatId }, env.JWT_SECRET);
  };

  const citizenToken = makeToken('CITIZEN', citizenId);
  const secretaryToken = makeToken('PANCHAYAT_SECRETARY', secretaryId);

  const mockTicket = {
    id: 'd0000000-0000-0000-0000-000000000001',
    ticket_number: 'TKT-202611-0001',
    panchayat_id: panchayatId,
    ward_id: wardId,
    complainant_user_id: citizenId,
    complainant_name: 'Ramesh Patil',
    complainant_mobile: '9800000006',
    is_assisted: false,
    proxy_operator_id: null,
    category: 'DRINKING_WATER',
    sub_category: 'Pipeline Leak',
    title: 'Drinking water burst pipe in Ward 1',
    description: 'Freshwater leaking across main road since yesterday.',
    geo_latitude: 18.3541,
    geo_longitude: 73.8612,
    priority: 'HIGH',
    status: 'SUBMITTED',
    assigned_to_user_id: null,
    sla_deadline: new Date(Date.now() + 48 * 3600 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/grievances should submit ticket and compute SLA deadline', async () => {
    vi.spyOn(grievanceRepository, 'createTicket').mockResolvedValueOnce(mockTicket as any);
    vi.spyOn(grievanceRepository, 'createStatusHistory').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post('/api/v1/grievances')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        wardId,
        category: 'DRINKING_WATER',
        title: 'Drinking water burst pipe in Ward 1',
        description: 'Freshwater leaking across main road since yesterday.',
        priority: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket_number).toBe('TKT-202611-0001');
    expect(res.body.data.category).toBe('DRINKING_WATER');
  });

  it('POST /api/v1/grievances should reject invalid payload (short title)', async () => {
    const res = await request(app)
      .post('/api/v1/grievances')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        wardId,
        category: 'DRINKING_WATER',
        title: 'Leak', // too short
        description: 'Broken pipe',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/grievances should list tickets with pagination and filtering', async () => {
    vi.spyOn(grievanceRepository, 'listTickets').mockResolvedValueOnce({
      tickets: [mockTicket as any],
      total: 1,
    });

    const res = await request(app)
      .get('/api/v1/grievances?page=1&limit=10&status=SUBMITTED')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('GET /api/v1/grievances/:id should mask complainant details for other citizens', async () => {
    const otherCitizenToken = makeToken('CITIZEN', 'c0000000-0000-0000-0000-000000000099');

    vi.spyOn(grievanceRepository, 'findTicketById').mockResolvedValueOnce(mockTicket as any);
    vi.spyOn(grievanceRepository, 'getTicketHistory').mockResolvedValueOnce([]);

    const res = await request(app)
      .get(`/api/v1/grievances/${mockTicket.id}`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${otherCitizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.complainant_name).toBe('Village Resident');
    expect(res.body.data.complainant_mobile).toContain('-XXXX-');
  });

  it('GET /api/v1/grievances/:id should NOT mask details for Panchayat Secretary', async () => {
    vi.spyOn(grievanceRepository, 'findTicketById').mockResolvedValueOnce(mockTicket as any);
    vi.spyOn(grievanceRepository, 'getTicketHistory').mockResolvedValueOnce([]);

    const res = await request(app)
      .get(`/api/v1/grievances/${mockTicket.id}`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.complainant_name).toBe('Ramesh Patil');
    expect(res.body.data.complainant_mobile).toBe('9800000006');
  });

  it('PATCH /api/v1/grievances/:id/status should update status when permitted', async () => {
    vi.spyOn(grievanceRepository, 'findTicketById').mockResolvedValueOnce(mockTicket as any);
    vi.spyOn(grievanceRepository, 'updateTicketStatus').mockResolvedValueOnce({
      ...mockTicket,
      status: 'TRIAGED',
    } as any);
    vi.spyOn(grievanceRepository, 'createStatusHistory').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .patch(`/api/v1/grievances/${mockTicket.id}/status`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        status: 'TRIAGED',
        notes: 'Priority verified on site by ward supervisor.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('TRIAGED');
  });

  it('PATCH /api/v1/grievances/:id/status should reject citizen trying to change status', async () => {
    const res = await request(app)
      .patch(`/api/v1/grievances/${mockTicket.id}/status`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ status: 'TRIAGED' });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/grievances/:id/verify should accept resolution and close ticket', async () => {
    const resolvedTicket = { ...mockTicket, status: 'RESOLVED' };

    vi.spyOn(grievanceRepository, 'findTicketById').mockResolvedValueOnce(resolvedTicket as any);
    vi.spyOn(grievanceRepository, 'updateTicketStatus').mockResolvedValueOnce({
      ...resolvedTicket,
      status: 'CITIZEN_VERIFIED',
      citizen_closure_rating: 5,
    } as any);
    vi.spyOn(grievanceRepository, 'createStatusHistory').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/grievances/${mockTicket.id}/verify`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        decision: 'ACCEPT',
        rating: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CITIZEN_VERIFIED');
    expect(res.body.data.citizen_closure_rating).toBe(5);
  });

  it('POST /api/v1/grievances/:id/verify should reopen ticket when citizen rejects resolution', async () => {
    const resolvedTicket = { ...mockTicket, status: 'RESOLVED' };

    vi.spyOn(grievanceRepository, 'findTicketById').mockResolvedValueOnce(resolvedTicket as any);
    vi.spyOn(grievanceRepository, 'updateTicketStatus').mockResolvedValueOnce({
      ...resolvedTicket,
      status: 'REOPENED',
    } as any);
    vi.spyOn(grievanceRepository, 'createStatusHistory').mockResolvedValueOnce({} as any);

    const res = await request(app)
      .post(`/api/v1/grievances/${mockTicket.id}/verify`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        decision: 'REOPEN',
        rejectionReason: 'Leakage persists at the joints; water still seeping onto street.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REOPENED');
  });
});
