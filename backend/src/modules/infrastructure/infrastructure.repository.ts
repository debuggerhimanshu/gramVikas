import { query } from '@core/database/connection';
import {
  VillageAssetEntity,
  AssetMaintenanceEventEntity,
  CreateAssetDto,
  AssetFilterQuery,
  AssetHealthStatus,
  MaintenanceEventStatus,
} from './infrastructure.types';

export class InfrastructureRepository {
  /**
   * Register a new village infrastructure asset.
   */
  async createAsset(dto: CreateAssetDto, panchayatId: string): Promise<VillageAssetEntity> {
    const text = `
      INSERT INTO village_assets (
        asset_uid, panchayat_id, ward_id, asset_category, name,
        geo_latitude, geo_longitude, installation_date, installed_cost,
        installed_by_contractor, funding_scheme, health_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'OPERATIONAL')
      RETURNING *;
    `;
    const values = [
      dto.assetUid,
      panchayatId,
      dto.wardId,
      dto.assetCategory,
      dto.name,
      dto.geoLatitude,
      dto.geoLongitude,
      dto.installationDate || null,
      dto.installedCost || null,
      dto.installedByContractor || null,
      dto.fundingScheme || null,
    ];

    const res = await query<VillageAssetEntity>(text, values);
    return res.rows[0];
  }

  /**
   * Find an asset by ID within the active tenant.
   */
  async findAssetById(id: string, panchayatId: string): Promise<VillageAssetEntity | null> {
    const text = `
      SELECT a.*, w.ward_name
      FROM village_assets a
      LEFT JOIN wards w ON a.ward_id = w.id
      WHERE a.id = $1 AND a.panchayat_id = $2;
    `;
    const res = await query<VillageAssetEntity>(text, [id, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * Find an asset by its unique asset_uid within the active tenant.
   */
  async findAssetByUid(assetUid: string, panchayatId: string): Promise<VillageAssetEntity | null> {
    const text = `
      SELECT a.*, w.ward_name
      FROM village_assets a
      LEFT JOIN wards w ON a.ward_id = w.id
      WHERE a.asset_uid = $1 AND a.panchayat_id = $2;
    `;
    const res = await query<VillageAssetEntity>(text, [assetUid, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * List assets with filtering and pagination.
   */
  async listAssets(
    filter: AssetFilterQuery,
    panchayatId: string
  ): Promise<{ assets: VillageAssetEntity[]; total: number }> {
    const conditions: string[] = ['a.panchayat_id = $1'];
    const values: any[] = [panchayatId];
    let idx = 2;

    if (filter.assetCategory) {
      conditions.push(`a.asset_category = $${idx++}`);
      values.push(filter.assetCategory);
    }
    if (filter.healthStatus) {
      conditions.push(`a.health_status = $${idx++}`);
      values.push(filter.healthStatus);
    }
    if (filter.wardId) {
      conditions.push(`a.ward_id = $${idx++}`);
      values.push(filter.wardId);
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM village_assets a WHERE ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Paginated records
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const dataText = `
      SELECT a.*, w.ward_name
      FROM village_assets a
      LEFT JOIN wards w ON a.ward_id = w.id
      WHERE ${whereClause}
      ORDER BY a.name ASC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    values.push(limit, offset);

    const dataRes = await query<VillageAssetEntity>(dataText, values);
    return { assets: dataRes.rows, total };
  }

  /**
   * Update the health status of an asset.
   */
  async updateAssetHealth(
    id: string,
    panchayatId: string,
    healthStatus: AssetHealthStatus
  ): Promise<VillageAssetEntity | null> {
    const text = `
      UPDATE village_assets
      SET 
        health_status = $1,
        last_inspected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND panchayat_id = $3
      RETURNING *;
    `;
    const res = await query<VillageAssetEntity>(text, [healthStatus, id, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * Create an asset maintenance/fault log event.
   */
  async createMaintenanceEvent(
    assetId: string,
    panchayatId: string,
    issueDescription: string
  ): Promise<AssetMaintenanceEventEntity> {
    const text = `
      INSERT INTO asset_maintenance_events (
        asset_id, panchayat_id, issue_description, status
      )
      VALUES ($1, $2, $3, 'OPEN')
      RETURNING *;
    `;
    const res = await query<AssetMaintenanceEventEntity>(text, [assetId, panchayatId, issueDescription]);
    return res.rows[0];
  }

  /**
   * Retrieve all maintenance events for an asset.
   */
  async getMaintenanceEventsByAssetId(
    assetId: string,
    panchayatId: string
  ): Promise<AssetMaintenanceEventEntity[]> {
    const text = `
      SELECT *
      FROM asset_maintenance_events
      WHERE asset_id = $1 AND panchayat_id = $2
      ORDER BY reported_at DESC;
    `;
    const res = await query<AssetMaintenanceEventEntity>(text, [assetId, panchayatId]);
    return res.rows;
  }
}

export const infrastructureRepository = new InfrastructureRepository();
