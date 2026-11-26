export type WorkType =
  | 'ROAD_CONCRETING'
  | 'DRAINAGE_CONSTRUCTION'
  | 'WATER_SUPPLY_NETWORK'
  | 'COMMUNITY_BUILDING'
  | 'SOLAR_LIGHTING'
  | 'SANITATION_FACILITY'
  | 'OTHER';

export type FundingSource =
  | 'FIFTEENTH_FINANCE_COMMISSION'
  | 'STATE_FINANCE_COMMISSION'
  | 'MGNREGS'
  | 'SWACHH_BHARAT_MISSION'
  | 'JAL_JEEVAN_MISSION'
  | 'OWN_SOURCE_REVENUE';

export type ProjectStatus =
  | 'SANCTIONED'
  | 'TENDERING'
  | 'IN_PROGRESS'
  | 'PHYSICALLY_COMPLETED'
  | 'COMPLETED_PENDING_AUDIT'
  | 'AUDITED_AND_CLOSED'
  | 'DELAYED_ALERT';

export type MilestoneStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VERIFIED_COMPLETE'
  | 'FROZEN_VARIANCE';

export type PaymentMode = 'PFMS_DIRECT_TRANSFER' | 'CHEQUE' | 'BANK_NEFT_RTGS';

export interface DevelopmentProjectEntity {
  id: string;
  project_code: string;
  panchayat_id: string;
  ward_id?: string | null;
  ward_name?: string | null;
  title: string;
  work_type: WorkType;
  funding_source: FundingSource;
  sanction_order_number: string;
  sanction_date: Date;
  sanctioned_budget: number;
  total_disbursed?: number;
  contractor_name: string;
  contractor_phone?: string | null;
  target_start_date?: Date | null;
  target_completion_date?: Date | null;
  status: ProjectStatus;
  has_audit_variance_flag: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMilestoneEntity {
  id: string;
  project_id: string;
  sequence_number: number;
  title: string;
  target_date?: Date | null;
  allocated_amount: number;
  status: MilestoneStatus;
  completed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenditureVoucherEntity {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  panchayat_id: string;
  voucher_number: string;
  voucher_date: Date;
  payee_name: string;
  amount: number;
  payment_mode: PaymentMode;
  invoice_scan_url?: string | null;
  authorized_by_sachiv_id: string;
  authorized_by_sachiv_name?: string | null;
  co_signed_by_sarpanch_id: string;
  co_signed_by_sarpanch_name?: string | null;
  created_at: Date;
}

export interface CreateProjectDto {
  wardId?: string;
  title: string;
  workType: WorkType;
  fundingSource: FundingSource;
  sanctionOrderNumber: string;
  sanctionDate: string;
  sanctionedBudget: number;
  contractorName: string;
  contractorPhone?: string;
  targetStartDate?: string;
  targetCompletionDate?: string;
}

export interface CreateMilestoneDto {
  sequenceNumber: number;
  title: string;
  targetDate?: string;
  allocatedAmount: number;
}

export interface CreateVoucherDto {
  milestoneId?: string;
  voucherNumber?: string;
  voucherDate: string;
  payeeName: string;
  amount: number;
  paymentMode: PaymentMode;
  invoiceScanUrl?: string;
  coSignedBySarpanchId: string;
}

export interface ProjectFilterQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  fundingSource?: FundingSource;
  workType?: WorkType;
  wardId?: string;
}

export interface ExpenditureSummaryResponse {
  panchayatId: string;
  totalSanctionedBudget: number;
  totalDisbursedAmount: number;
  remainingBalance: number;
  utilizationRatePercent: number;
  projectCount: number;
}
