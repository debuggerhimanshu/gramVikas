import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { infrastructureRepository } from '../../src/modules/infrastructure/infrastructure.repository';
import { env } from '../../src/config/env';

describe('Module 7: Infrastructure & Water Asset Monitoring Endpoints', () => {
  const app = createApp();
  const panchayatId = 'a0000000-0000-0000-0000-000000000001';
  const wardId = 'b0000000-0000-0000-0000-000000000001';
  const secretaryId = 'c0000000-0000-0000-0000-000000000003';
  const citizenId = 'c0000000-0000-0000-0000-000000000006';

  const makeToken = (role: string, sub: string) => {
    return jwt.sign({ sub, role, panchayatId }, env.JWT_SECRET);
  };

  const secretaryToken = makeToken('PANCHAYAT_SECRETARY', secretaryId);
  const citizenToken = makeToken('CITIZEN', citizenId);

  const mockAsset = {
    id: 'j0000000-0000-0000-0000-000000000001',
    asset_uid: 'AST-W1-BW-001',
    panchayat_id: panchayatId,
    ward_id: wardId,
    asset_category: 'TUBE_WELL_BOREWELL',
    name: 'Community Deep Borewell with Submersible Motor',
    geo_latitude: 18.35415,
    geo_longitude: 73.86128,
    installation_date: new Date('2024-03-10'),
    installed_cost: 185000,
    installed_by_contractor: 'Kisan Drilling Agency',
    funding_scheme: 'JAL_JEEVAN_MISSION',
    health_status: 'OPERATIONAL',
    last_inspected_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/infrastructure/assets should register asset when invoked by Secretary', async () => {
    vi.spyOn(infrastructureRepository, 'findAssetByUid').mockResolvedValueOnce(null);
    vi.spyOn(infrastructureRepository, 'createAsset').mockResolvedValueOnce(mockAsset as any);

    const res = await request(app)
      .post('/api/v1/infrastructure/assets')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({
        assetUid: 'AST-W1-BW-001',
        wardId,
        assetCategory: 'TUBE_WELL_BOREWELL',
        name: 'Community Deep Borewell with Submersible Motor',
        geoLatitude: 18.35415,
        geoLongitude: 73.86128,
        installedCost: 185000,
        fundingScheme: 'JAL_JEEVAN_MISSION',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.asset_uid).toBe('AST-W1-BW-001');
    expect(res.body.data.health_status).toBe('OPERATIONAL');
  });

  it('POST /api/v1/infrastructure/assets should reject registration by Citizen (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/infrastructure/assets')
      .set('X-Panchayat-ID', panchayatId)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        assetUid: 'AST-W1-BW-001',
        wardId,
        assetCategory: 'TUBE_WELL_BOREWELL',
        name: 'Community Borewell',
        geoLatitude: 18.354,
        geoLongitude: 73.861,
      });

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/infrastructure/assets should list assets with filters', async () => {
    vi.spyOn(infrastructureRepository, 'listAssets').mockResolvedValueOnce({
      assets: [mockAsset as any],
      total: 1,
    });

    const res = await request(app)
      .get('/api/v1/infrastructure/assets?assetCategory=TUBE_WELL_BOREWELL&healthStatus=OPERATIONAL')
      .set('X-Panchayat-ID', panchayatId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('GET /api/v1/infrastructure/assets/:id should return asset and maintenance history', async () => {
    vi.spyOn(infrastructureRepository, 'findAssetById').mockResolvedValueOnce(mockAsset as any);
    vi.spyOn(infrastructureRepository, 'getMaintenanceEventsByAssetId').mockResolvedValueOnce([
      {
        id: 'evt-1',
        asset_id: mockAsset.id,
        panchayat_id: panchayatId,
        issue_description: 'Motor rewound and reinstalled',
        reported_at: new Date(),
        repair_cost: 3500,
        restored_at: new Date(),
        status: 'RESTORED',
        created_at: new Date(),
      } as any,
    ]);

    const res = await request(app)
      .get(`/api/v1/infrastructure/assets/${mockAsset.id}`)
      .set('X-Panchayat-ID', panchayatId);

    expect(res.status).toBe(200);
    expect(res.body.data.asset_uid).toBe('AST-W1-BW-001');
    expect(res.body.maintenanceHistory.length).toBe(1);
  });
});
