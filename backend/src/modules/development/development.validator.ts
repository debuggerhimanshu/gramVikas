import { z } from 'zod';

const WORK_TYPES = [
  'ROAD_CONCRETING',
  'DRAINAGE_CONSTRUCTION',
  'WATER_SUPPLY_NETWORK',
  'COMMUNITY_BUILDING',
  'SOLAR_LIGHTING',
  'SANITATION_FACILITY',
  'OTHER',
] as const;

const FUNDING_SOURCES = [
  'FIFTEENTH_FINANCE_COMMISSION',
  'STATE_FINANCE_COMMISSION',
  'MGNREGS',
  'SWACHH_BHARAT_MISSION',
  'JAL_JEEVAN_MISSION',
  'OWN_SOURCE_REVENUE',
] as const;

const PROJECT_STATUSES = [
  'SANCTIONED',
  'TENDERING',
  'IN_PROGRESS',
  'PHYSICALLY_COMPLETED',
  'COMPLETED_PENDING_AUDIT',
  'AUDITED_AND_CLOSED',
  'DELAYED_ALERT',
] as const;

const PAYMENT_MODES = ['PFMS_DIRECT_TRANSFER', 'CHEQUE', 'BANK_NEFT_RTGS'] as const;

export const createProjectSchema = z.object({
  wardId: z.string().uuid().optional(),
  title: z.string().min(5).max(250),
  workType: z.enum(WORK_TYPES),
  fundingSource: z.enum(FUNDING_SOURCES),
  sanctionOrderNumber: z.string().min(3).max(100),
  sanctionDate: z.string().date(),
  sanctionedBudget: z.number().positive('sanctionedBudget must be greater than zero'),
  contractorName: z.string().min(3).max(150),
  contractorPhone: z.string().max(15).optional(),
  targetStartDate: z.string().date().optional(),
  targetCompletionDate: z.string().date().optional(),
});

export const createMilestoneSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  title: z.string().min(3).max(150),
  targetDate: z.string().date().optional(),
  allocatedAmount: z.number().min(0, 'allocatedAmount cannot be negative'),
});

export const createVoucherSchema = z.object({
  milestoneId: z.string().uuid().optional(),
  voucherNumber: z.string().max(50).optional(),
  voucherDate: z.string().date(),
  payeeName: z.string().min(3).max(150),
  amount: z.number().positive('Voucher disbursement amount must be greater than zero'),
  paymentMode: z.enum(PAYMENT_MODES),
  invoiceScanUrl: z.string().url().optional(),
  coSignedBySarpanchId: z.string().uuid('coSignedBySarpanchId must be a valid User UUID'),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(PROJECT_STATUSES).optional(),
  fundingSource: z.enum(FUNDING_SOURCES).optional(),
  workType: z.enum(WORK_TYPES).optional(),
  wardId: z.string().uuid().optional(),
});
