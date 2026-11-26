export type AssetCategory =
  | 'TUBE_WELL_BOREWELL'
  | 'OVERHEAD_TANK_WATER'
  | 'WATER_PURIFICATION_RO'
  | 'ROAD_SEGMENT'
  | 'DRAINAGE_CHANNEL'
  | 'TRANSFORMER_POWER'
  | 'COMMUNITY_TOILET'
  | 'PANCHAYAT_BHAWAN'
  | 'ANGNWADI_CENTRE';

export type AssetHealthStatus =
  | 'OPERATIONAL'
  | 'MAINTENANCE_REQUIRED'
  | 'OUT_OF_SERVICE'
  | 'UNDER_REPAIR'
  | 'DECOMMISSIONED';

export type MaintenanceEventStatus = 'OPEN' | 'IN_REPAIR' | 'RESTORED' | 'ABANDONED';

export interface VillageAssetEntity {
  id: string;
  asset_uid: string;
  panchayat_id: string;
  ward_id: string;
  ward_name?: string | null;
  asset_category: AssetCategory;
  name: string;
  geo_latitude: number;
  geo_longitude: number;
  installation_date?: Date | null;
  installed_cost?: number | null;
  installed_by_contractor?: string | null;
  funding_scheme?: string | null;
  health_status: AssetHealthStatus;
  last_inspected_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AssetMaintenanceEventEntity {
  id: string;
  asset_id: string;
  panchayat_id: string;
  issue_description: string;
  reported_at: Date;
  dispatched_grievance_id?: string | null;
  repair_cost: number;
  restored_at?: Date | null;
  status: MaintenanceEventStatus;
  created_at: Date;
}

export interface CreateAssetDto {
  assetUid: string;
  wardId: string;
  assetCategory: AssetCategory;
  name: string;
  geoLatitude: number;
  geoLongitude: number;
  installationDate?: string;
  installedCost?: number;
  installedByContractor?: string;
  fundingScheme?: string;
}

export interface ReportAssetFaultDto {
  issueDescription: string;
  severity?: 'CRITICAL' | 'MODERATE' | 'MINOR';
  photoUrl?: string;
}

export interface AssetFilterQuery {
  page?: number;
  limit?: number;
  assetCategory?: AssetCategory;
  healthStatus?: AssetHealthStatus;
  wardId?: string;
}
