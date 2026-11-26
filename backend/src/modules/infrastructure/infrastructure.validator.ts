import { z } from 'zod';

const ASSET_CATEGORIES = [
  'TUBE_WELL_BOREWELL',
  'OVERHEAD_TANK_WATER',
  'WATER_PURIFICATION_RO',
  'ROAD_SEGMENT',
  'DRAINAGE_CHANNEL',
  'TRANSFORMER_POWER',
  'COMMUNITY_TOILET',
  'PANCHAYAT_BHAWAN',
  'ANGNWADI_CENTRE',
] as const;

const HEALTH_STATUSES = [
  'OPERATIONAL',
  'MAINTENANCE_REQUIRED',
  'OUT_OF_SERVICE',
  'UNDER_REPAIR',
  'DECOMMISSIONED',
] as const;

export const createAssetSchema = z.object({
  assetUid: z.string().min(3).max(40),
  wardId: z.string().uuid('wardId must be a valid UUID'),
  assetCategory: z.enum(ASSET_CATEGORIES),
  name: z.string().min(3).max(150),
  geoLatitude: z.number().min(-90).max(90),
  geoLongitude: z.number().min(-180).max(180),
  installationDate: z.string().date().optional(),
  installedCost: z.number().min(0).optional(),
  installedByContractor: z.string().max(150).optional(),
  fundingScheme: z.string().max(100).optional(),
});

export const reportAssetFaultSchema = z.object({
  issueDescription: z.string().min(10, 'Issue description must be at least 10 characters'),
  severity: z.enum(['CRITICAL', 'MODERATE', 'MINOR']).default('CRITICAL'),
  photoUrl: z.string().url().optional(),
});

export const assetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  assetCategory: z.enum(ASSET_CATEGORIES).optional(),
  healthStatus: z.enum(HEALTH_STATUSES).optional(),
  wardId: z.string().uuid().optional(),
});
