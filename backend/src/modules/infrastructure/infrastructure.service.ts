import {
  infrastructureRepository,
  InfrastructureRepository,
} from './infrastructure.repository';
import {
  CreateAssetDto,
  ReportAssetFaultDto,
  AssetFilterQuery,
  VillageAssetEntity,
  AssetMaintenanceEventEntity,
  AssetHealthStatus,
} from './infrastructure.types';
import { RequestContextManager } from '@core/context/request-context';
import { eventBus } from '@core/events/event-bus';
import { NotFoundError, ConflictError } from '@core/errors/app-error';
import { logger } from '@core/utils/logger';

export class InfrastructureService {
  constructor(private repo: InfrastructureRepository = infrastructureRepository) {}

  /**
   * Register a new public asset in the village register.
   */
  async createAsset(dto: CreateAssetDto): Promise<VillageAssetEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();

    const existing = await this.repo.findAssetByUid(dto.assetUid, panchayatId);
    if (existing) {
      throw new ConflictError(`Asset with UID '${dto.assetUid}' already exists in this Panchayat.`);
    }

    const asset = await this.repo.createAsset(dto, panchayatId);
    logger.info(`Registered new asset [${asset.asset_uid}] (${asset.name}) in Panchayat [${panchayatId}]`);
    return asset;
  }

  /**
   * Get asset details by ID along with its maintenance history.
   */
  async getAssetById(
    id: string
  ): Promise<{ asset: VillageAssetEntity; maintenanceHistory: AssetMaintenanceEventEntity[] }> {
    const panchayatId = RequestContextManager.getPanchayatId();

    const asset = await this.repo.findAssetById(id, panchayatId);
    if (!asset) {
      throw new NotFoundError(`Asset with ID '${id}' not found in this Panchayat.`);
    }

    const maintenanceHistory = await this.repo.getMaintenanceEventsByAssetId(id, panchayatId);
    return { asset, maintenanceHistory };
  }

  /**
   * List assets with query filters.
   */
  async listAssets(
    filter: AssetFilterQuery
  ): Promise<{ assets: VillageAssetEntity[]; total: number; page: number; limit: number }> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const { assets, total } = await this.repo.listAssets(filter, panchayatId);

    return {
      assets,
      total,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  /**
   * Report an asset breakdown/fault, update health, log maintenance event,
   * and emit ASSET_DAMAGED event to auto-spawn grievance ticket.
   */
  async reportFault(
    id: string,
    dto: ReportAssetFaultDto
  ): Promise<{ asset: VillageAssetEntity; maintenanceEvent: AssetMaintenanceEventEntity }> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const actor = RequestContextManager.getUser();

    const asset = await this.repo.findAssetById(id, panchayatId);
    if (!asset) {
      throw new NotFoundError(`Asset with ID '${id}' not found in this Panchayat.`);
    }

    // Determine target health status based on severity
    const newHealthStatus: AssetHealthStatus =
      dto.severity === 'CRITICAL' ? 'OUT_OF_SERVICE' : 'MAINTENANCE_REQUIRED';

    // 1. Update asset operational status
    const updatedAsset = await this.repo.updateAssetHealth(id, panchayatId, newHealthStatus);
    if (!updatedAsset) {
      throw new NotFoundError(`Failed to update status for asset '${id}'.`);
    }

    // 2. Insert record in asset_maintenance_events
    const maintenanceEvent = await this.repo.createMaintenanceEvent(
      id,
      panchayatId,
      dto.issueDescription
    );

    logger.info(
      `Asset [${asset.asset_uid}] fault logged: ${asset.health_status} -> ${newHealthStatus} (Severity: ${dto.severity || 'CRITICAL'})`
    );

    // 3. Emit Domain Event ASSET_DAMAGED to auto-spawn Grievance ticket in Module 1
    await eventBus.publish('ASSET_DAMAGED', panchayatId, {
      assetId: asset.id,
      assetUid: asset.asset_uid,
      assetCategory: asset.asset_category,
      wardId: asset.ward_id,
      reportedByUserId: actor?.id || 'anonymous-citizen',
      description: dto.issueDescription,
      geoCoordinates: {
        latitude: Number(asset.geo_latitude),
        longitude: Number(asset.geo_longitude),
      },
      photoUrl: dto.photoUrl,
    });

    return { asset: updatedAsset, maintenanceEvent };
  }
}

export const infrastructureService = new InfrastructureService();
