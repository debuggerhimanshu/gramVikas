import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { infrastructureRepository } from '../../src/modules/infrastructure/infrastructure.repository';
import { grievanceRepository } from '../../src/modules/grievance/grievance.repository';
import * as dbConnection from '../../src/core/database/connection';
import { env } from '../../src/config/env';

describe('Cross-Module Integration: Asset Fault to Auto-Grievance Spawning', () => {
  const app = createApp();
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const wardId = 'b0000000-0000-0000-0000-000000000001';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';

  const token = jwt.sign({ sub: citizenId, role: 'CITIZEN', panchayatId }, env.JWT_SECRET);

  const mockAsset = {
    id: 'j0000000-0000-0000-0000-000000000001',
    asset_uid: 'AST-W1-BW-001',
    panchayat_id: panchayatId,
    ward_id: wardId,
    asset_category: 'TUBE_WELL_BOREWELL',
    name: 'Community Deep Borewell with Submersible Motor',
    geo_latitude: 18.35415,
    geo_longitude: 73.86128,
    health_status: 'OPERATIONAL',
  };

  const mockMaintenanceEvent = {
    id: 'maint-evt-1',
    asset_id: mockAsset.id,
    panchayat_id: panchayatId,
    issue_description: 'Submersible motor burned out completely; no water pumping.',
    reported_at: new Date(),
    status: 'OPEN',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/infrastructure/assets/:id/faults should update asset health, emit ASSET_DAMAGED, and auto-spawn grievance ticket', async () => {
    // Mock infrastructure repository queries
    vi.spyOn(infrastructureRepository, 'findAssetById').mockResolvedValueOnce(mockAsset as any);
    vi.spyOn(infrastructureRepository, 'updateAssetHealth').mockResolvedValueOnce({
      ...mockAsset,
      health_status: 'OUT_OF_SERVICE',
    } as any);
    vi.spyOn(infrastructureRepository, 'createMaintenanceEvent').mockResolvedValueOnce(mockMaintenanceEvent as any);

    // Spy on grievance creation triggered via subscriber
    const createTicketSpy = vi.spyOn(grievanceRepository, 'createTicket').mockResolvedValueOnce({
      id: 'd-auto-ticket-1',
      ticket_number: 'TKT-202611-AST-42A1',
      panchayat_id: panchayatId,
      ward_id: wardId,
      category: 'DRINKING_WATER',
      title: 'Automated Asset Repair: AST-W1-BW-001 (TUBE_WELL_BOREWELL)',
      priority: 'HIGH',
      status: 'SUBMITTED',
    } as any);

    vi.spyOn(grievanceRepository, 'createStatusHistory').mockResolvedValueOnce({} as any);
    vi.spyOn(dbConnection, 'query').mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app)
      .post(`/api/v1/infrastructure/assets/${mockAsset.id}/faults`)
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${token}`)
      .send({
        issueDescription: 'Submersible motor burned out completely; no water pumping.',
        severity: 'CRITICAL',
      });

    // 1. Verify HTTP Response from Module 7
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.asset.health_status).toBe('OUT_OF_SERVICE');
    expect(res.body.data.maintenanceEvent.issue_description).toContain('motor burned out');

    // 2. Verify Cross-Module Hand-off: Grievance Ticket was auto-created with proper mappings
    expect(createTicketSpy).toHaveBeenCalledTimes(1);
    const createdPayload = createTicketSpy.mock.calls[0][1];
    expect(createdPayload.category).toBe('DRINKING_WATER'); // Mapped from TUBE_WELL_BOREWELL
    expect(createdPayload.priority).toBe('HIGH');
    expect(createdPayload.wardId).toBe(wardId);
    expect(createdPayload.title).toContain('AST-W1-BW-001');
    expect(createdPayload.description).toContain('motor burned out');
  });
});
